# Database

SQLite (`prisma/dev.db`), managed through Prisma migrations in `prisma/migrations/`. SQLite has no native
enum type, so fields documented as "enum-like" below are plain `String` columns whose allowed values live
in `src/lib/validations.ts` (single source of truth, validated with Zod on every write).

## Entity relationships

```
User ──1:N────────▶ Company, Contact, Lead, Opportunity, Task, Activity, SalesTarget   (ownerId/assigneeId)

Lead ──convertedAccountId─────▶ Company     (nullable, set on conversion)
Lead ──convertedContactId─────▶ Contact     (nullable, set on conversion)
Lead ──convertedOpportunityId─▶ Opportunity (nullable, unique — a Lead converts to at most one Opportunity)

PipelineStage.id ──stored as plain text in──▶ Opportunity.stage   (no FK constraint; NEW/WON/LOST fixed)
PipelineStage ──N:1──▶ Opportunity (optional — null for the 3 system rows, onDelete: Cascade otherwise)

Company (Account) ──1:N──▶ Contact, Opportunity, Task, Activity
Contact ──N:1──▶ Company (optional)
Contact ──N:M──▶ Tag
Contact ──1:N──▶ Opportunity, Task, Activity

Opportunity ──N:1──▶ Contact (required), Company (optional), User (owner)
Opportunity ──1:N──▶ Task, Activity, PipelineStage (its own custom workflow steps)
Opportunity ──1:1──▶ Requirement (optional)

Task, Activity ──optionally attach to──▶ Lead, Company, Contact, and Opportunity simultaneously
  (all four foreign keys are nullable; a given row is normally linked to just one)

SalesTarget ──userId───────▶ User (owner: the Account Manager the target belongs to)
SalesTarget ──createdById──▶ User (the ADMIN who created/assigned it)
SalesTarget ──1:N──────────▶ SalesTargetAudit
```

## Tables

**User** — `role` (`ADMIN`/`ACCOUNT_MANAGER`/`MANAGEMENT`), `title`, `active`. There is no reporting-line
field (`managerId`) — it was dropped along with the Org Chart page it used to feed, since every
`ACCOUNT_MANAGER` is isolated to their own records regardless of who they'd have reported to. See the RBAC
section of `ARCHITECTURE.md` for the full reasoning.

**Company** (the "Account" entity) — `name`, `legalName`, `website`, `industry`, `companySize`,
`country`, `city`, `phone`, `email`, `address`, `accountStatus` (`PROSPECT`/`ACTIVE_CUSTOMER`/
`FORMER_CUSTOMER`/`PARTNER`), `source`, `notes`, `ownerId`. Indexed on `ownerId` and `accountStatus`.

**Contact** — `name`, `jobTitle`, `department`, `email`, `phone`, `linkedIn`,
`isDecisionMaker`, `isPrimary` (booleans), `source`, `preferredContactMethod` (`EMAIL`/`PHONE`/`MOBILE`/
`WHATSAPP`), `status` (`LEAD`/`QUALIFIED`/`CUSTOMER`/`LOST`), `companyId` (optional), `ownerId`, plus an
implicit many-to-many with **Tag**. Indexed on `ownerId`, `status`, `companyId`. There's no separate
`mobile` field — just the one `phone` field, at the user's request to keep the form shorter.

**Lead** — the pre-qualification entity, deliberately separate from Contact/Company so a raw inbound
lead never pollutes real customer records until it's actually qualified. `name`, `companyName` (free
text — not yet a Company FK), `jobTitle`, `email`, `phone`, `industry`, `source`, `status` (`NEW`/
`CONTACTED`/`QUALIFIED`/`UNQUALIFIED`/`CONVERTED`/`LOST`), `score` (0–100, manually set), `notes`,
`lastActivityAt`, `nextFollowUpAt`, `ownerId`. On conversion (`convertLead` in
`src/lib/actions/leads.ts`), `convertedAt`/`convertedAccountId`/`convertedContactId`/
`convertedOpportunityId` are filled in and the row is kept (never deleted) so conversion history and
attribution survive. Indexed on `ownerId`, `status`.

**PipelineStage** — `label`, `order` (int, board/select position), `isSystem` (boolean),
`defaultProbability` (0–100), `opportunityId` (nullable FK, `onDelete: Cascade`). `NEW`, `WON`, and `LOST`
are seeded as fixed system rows (`id` literally `"NEW"`/`"WON"`/`"LOST"`, `isSystem: true`,
`opportunityId: null`) by migration `20260922142817_add_pipeline_stages` and can't be renamed or
deleted — `id` doubles as the value stored directly in `Opportunity.stage`, and won/lost/forecast logic
throughout the app compares against these two literal strings. Anything else is a custom workflow step
belonging to exactly one Opportunity (`opportunityId` set, `id` an ordinary cuid, `isSystem: false`),
managed by the System Admin from a "Workflow" popup on that Opportunity's own row on `/opportunities` (not a
separate page) — never shared with, copied to, or visible on any other Opportunity's row or Stage dropdown.
Moving the deal between its steps happens on that same row's stepper, not in the popup. A custom step can be renamed, reordered, or
deleted, except it can't be deleted while its own Opportunity currently sits in it. `stageGateCheck`
(`src/lib/validations.ts`) requires a value and a next action before an opportunity can enter any
non-system stage. `createOpportunity`/`updateOpportunity`/`updateOpportunityStage`
(`src/lib/actions/opportunities.ts`) also reject a stage whose `opportunityId` doesn't match the
Opportunity being written to, so one Opportunity's custom step can never be applied to another one.

**Opportunity** (originally called `Deal`; renamed in migration `20260917094453_crm_core_expansion` via
hand-written `ALTER TABLE ... RENAME TO` rather than the drop/recreate Prisma would generate by default,
specifically to preserve existing rows) — `title`, `value`, `currency`, `stage` (a free-text foreign key
onto `PipelineStage.id` — see below; always `NEW`, `WON`, or `LOST` unless this specific Opportunity's own
custom workflow step is in play), `probability` (0–100, defaults to the stage's `defaultProbability`), `lostReason`,
`stageChangedAt` (updated whenever `stage` changes; drives the "stale deal" warning at 14+ days),
`source`, `competitor`, `nextAction`, `notes`, `priority` (`LOW`/`MEDIUM`/`HIGH`/`URGENT`),
`opportunityType` (`NEW_BUSINESS`/`UPSELL`/`RENEWAL`/`OTHER`), `companyId` (optional), `contactId`
(required), `ownerId`, `visibility` (`OWNER` default, or `EVERYONE` — only the System Admin can set this;
see "Opportunity visibility" below), `createdById` (nullable FK to `User`, who actually registered the
row — distinct from `ownerId`, since an Admin can register a deal and assign someone else as its owner;
nullable only because rows from before this field existed have no creator to backfill), `expectedCloseDate`,
`closedAt`. Indexed on `ownerId`, `stage`, `contactId`, `companyId`.

**Opportunity visibility** — every other record in the app (Leads, Contacts, Companies, Tasks) is strictly
isolated to its owner/assignee, with no exception. Opportunities are the one deliberate exception:
`visibility` defaults to `OWNER` (isolated exactly like everything else), but the System Admin can mark one
`EVERYONE`, making it visible (read-only, not editable) to every Account Manager, not just its own owner
and Admin/Management. `opportunityScope(user)` (`src/lib/scope.ts`) is the Opportunity-only version of the
generic `ownedScope` — for an Account Manager it resolves to `{ OR: [{ ownerId: { in: ids } }, { visibility:
"EVERYONE" }] }` instead of a plain `{ ownerId: { in: ids } }` — and `canViewOpportunity` is the equivalent
extension of `canAccessOwner` used to gate the detail page. `resolveVisibility` mirrors `resolveOwnerId`'s
existing pattern: a non-admin's submitted value is ignored (falling back to the record's current visibility
on an update, so an Account Manager editing their own already-shared deal can't accidentally revert it), and
only an ADMIN's choice is ever honored.

**Requirement** — structured discovery data, at most one per Opportunity (`opportunityId` unique FK,
`onDelete: Cascade`). Business problem, customer objective, functional/technical requirements,
`deployment` (`CLOUD`/`ON_PREMISE`/`HYBRID`/`UNKNOWN`), infrastructure notes. Created lazily — all fields
are optional, and the row only exists once at least one field is filled in (from `/sales/new` or the
Opportunity page's inline editor). Started out with more fields (AI requirements, integrations,
user/site counts, security/compliance, timeline, budget, risks) — trimmed back to this shorter set at
the user's request, since the extra fields weren't needed.

**Task** — `title`, `description`, `dueDate` (holds a time-of-day too — the form uses a `datetime-local`
input, not just a date), `done`, `priority` (`LOW`/`MEDIUM`/`HIGH`), `type`
(`MEETING`/`CALL`/`EMAIL`/`FOLLOW_UP`/`OTHER`, default `OTHER`), `assigneeId`, plus optional
`leadId`/`companyId`/`contactId`/`opportunityId`. Indexed on `assigneeId`, `done`. `type` drives the icon
shown per task and the `/tasks` page's "Upcoming meetings" card (every non-done `MEETING` task, sorted by
`dueDate`, showing the linked Contact's name and email inline).

**Activity** — the shared timeline entity for Leads, Accounts, Contacts, and Opportunities. `type`
(`CALL`/`EMAIL`/`MEETING`/`DEMO`/`FOLLOW_UP`/`NOTE`/`PROPOSAL`/`STAGE_CHANGE`), `content`, `userId`
(who logged it), plus the same four optional relation columns as Task. Indexed on `contactId`,
`opportunityId`. There's no `remindAt` column on Activity itself — logging a `MEETING`/`FOLLOW_UP` note
with a reminder date (`addActivity` in `src/lib/actions/activities.ts`) creates the Activity row as normal
and, in the same transaction, a linked **Task** with that due date, reusing Task's existing due-date/
overdue/notification machinery instead of adding reminder fields to Activity.

**Tag** — `name` (unique), implicit many-to-many with Contact.

**SalesTarget** — never soft-deleted: the System Admin can either archive a target (`status: ARCHIVED`,
kept for history) or delete it outright (removes the row and its audit trail via cascade). A performance
target assigned to one Account Manager (`userId`) for one period:
`targetType` (`REVENUE`/`DEALS_WON`), `periodType` (`MONTHLY`/`QUARTERLY`/`YEARLY`), `periodStart`
(inclusive) / `periodEnd` (exclusive — computed from period type + year + period number, not entered
directly), `targetValue` (an amount for `REVENUE`, a plain count for `DEALS_WON`), `currency` (only
meaningful for `REVENUE`), `status` (`DRAFT`/`ACTIVE`/`COMPLETED`/`ARCHIVED`), `createdById` (the ADMIN who
created/last assigned it — a second FK to `User`, distinct from the owning `userId`). Unique on
`(userId, targetType, periodType, periodStart)` to prevent duplicate targets for the same person/type/
period. Achievement is never stored — always computed from the owning Account Manager's own `WON`
Opportunities whose `closedAt` falls inside `[periodStart, periodEnd)`, same currency for `REVENUE`
targets (`computeTargetAchievement` in `src/lib/targets.ts`), and is not capped at 100%.

**SalesTargetAudit** — one row per change to a `SalesTarget` (`action`: `CREATED`/`UPDATED`/
`STATUS_CHANGED`, plus `field`/`previousValue`/`newValue` for the latter two), `actorId` (the ADMIN who
made the change), `onDelete: Cascade` from its `SalesTarget`. Scoped to targets only — not a general,
system-wide audit log.

## Migration history of note

`20260917094453_crm_core_expansion` is a hand-edited migration (see `prisma/migrations/<ts>_crm_core_expansion/migration.sql`).
Prisma's own `migrate diff` would have generated a `DROP TABLE "Deal"` + `CREATE TABLE "Opportunity"`,
which loses every existing row. It was rewritten to `ALTER TABLE "Deal" RENAME TO "Opportunity"` (SQLite
automatically repoints dependent foreign keys on a table rename) plus `ALTER TABLE ... ADD COLUMN` for
the new fields, and applied via `prisma db execute` + `prisma migrate resolve --applied` so Prisma's
migration history stays accurate without Prisma re-running the destructive version. If you ever need to
do a similar rename, generate the migration with `--create-only`, hand-edit the SQL the same way, then
resolve it as applied — never let `migrate dev` run its default drop/recreate against a database with
real data in it.

`20260920081757_sales_opportunity_workspace` added `Requirement`, `Solution`, `OpportunityProduct`, and
the new `Opportunity`/`Contact` columns. This one ran through the normal `prisma migrate dev` (no
hand-editing needed) because it's purely additive — new tables and nullable columns don't risk existing
rows the way a rename does.

`20260920090303_trim_commercial_and_products` dropped `OpportunityProduct` entirely and removed the
Commercial fields from `Opportunity` (`paymentTerms`, `pricingModel`, `discountPercent`, `taxPercent`,
`proposalRequired`, `proposalDueDate`, `deliveryDate`, `commercialNotes`) and several fields from
`Requirement` (`aiRequirements`, `integrations`, `numberOfUsers`, `numberOfSites`,
`securityRequirements`, `complianceRequirements`, `timeline`, `budget`, `risks`) — all unused just a few
minutes after being added, at the user's request to keep the sales-entry form shorter. Also ran through
plain `migrate dev` since the database had zero opportunities at the time.

`20260920090949_drop_solution` dropped the `Solution` model entirely (and its `SolutionTechnicalOwner`
relation on `User`), for the same reason and in the same session as the previous migration — the user
asked for that section gone right after seeing it. If a "proposed solution" concept is wanted again
later, its original field list (proposed solution, type, architecture/technical notes, deployment
approach, integrations, dependencies, estimated effort/duration, technical owner, risks) is preserved in
this migration's `migration.sql`.

`20260921193644_account_manager_roles_and_sales_targets` collapsed the role model from five roles
(`ADMIN`/`MANAGER`/`SALES_REP`/`MANAGEMENT`/`VIEWER`) to three (`ADMIN`/`ACCOUNT_MANAGER`/`MANAGEMENT`) and
replaced the old single-field `SalesTarget` (`userId`, `month`, `targetAmount`) with the richer
period/type/status model plus the new `SalesTargetAudit` table described above. Ran through plain
`migrate dev` since `SalesTarget` had zero rows at the time; existing `User` rows with the old role values
were migrated separately with a one-off data script (`VIEWER` → `MANAGEMENT`, `MANAGER`/`SALES_REP` →
`ACCOUNT_MANAGER`) since role is a plain string column, not a schema-level enum.

`20260922075803_remove_org_chart_and_contact_mobile` dropped `User.managerId` (and its self-relation/index)
along with the Org Chart page it fed, and dropped `Contact.mobile` (the form kept only `phone`) — both at
the user's request. Ran through plain `migrate dev` since no `User` row had `managerId` set and no `Contact`
row had `mobile` set at the time, so nothing was lost.

`20260922105003_add_task_type` added `Task.type` (default `OTHER`) so a task can be categorized as a
Meeting, Call, Email, or Follow-up — the piece the `/tasks` page's "Upcoming meetings" card and per-task
type icon are built on. Purely additive (a new column with a default), so it ran through plain
`migrate dev` with no data migration needed.

`20260922142817_add_pipeline_stages` added the `PipelineStage` table backing the configurable stages
described above, and hand-edited the generated migration to `INSERT` the three fixed system rows
(`NEW`/`WON`/`LOST`) as part of the same migration rather than a separate seed step, so every environment
that applies migrations ends up with them — `prisma migrate dev --create-only` followed by hand-editing
`migration.sql`, same pattern as `20260917094453_crm_core_expansion`'s hand-edit, but adding rows instead
of renaming a table. `Opportunity.stage` itself stayed a plain `String` column (no schema change, no data
migration) — it went from being validated against a hardcoded Zod enum to being checked against this new
table at the application layer instead.

`20260922151853_scope_pipeline_stages_to_opportunity` added the nullable `PipelineStage.opportunityId`
column (FK to `Opportunity`, `onDelete: Cascade`), changing custom stages from a single list shared by
every Opportunity to one list per Opportunity — a deal's own workflow steps are managed from a "Workflow"
popup on that Opportunity's own row instead of a separate global settings page (originally admin-only,
later opened up to that Opportunity's own owner as well — see `ARCHITECTURE.md`), and adding a
step there never affects any other Opportunity's row or Stage dropdown. SQLite recreates the table to add a column
with a foreign key (`RedefineTables` in the generated SQL), but this only ever ran against the three
existing system rows (`opportunityId` stayed `null` for them, which is exactly what a system stage should
be), so no hand-editing was needed — a plain `prisma migrate dev` handled it.

`20260922201002_add_opportunity_visibility_and_creator` added `Opportunity.visibility` (`String`, defaults
to `"OWNER"` — every existing row got this default, so nothing was previously isolated becomes visible to
everyone by surprise) and the nullable `Opportunity.createdById` FK to `User`. Both are additive with no
required backfill, but SQLite still ran this through `RedefineTables` (a new FK column, same as the
migration above) rather than a plain `ALTER TABLE ADD COLUMN` — a plain `prisma migrate dev` handled it with
no hand-editing, and every pre-existing Opportunity row came through with `visibility = "OWNER"` and
`createdById = null` (no creator to attribute retroactively).
