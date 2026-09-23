# Database

PostgreSQL, managed through Prisma migrations in `prisma/migrations/`. The project ran on SQLite through
its first few weeks of development (see "Migration history of note" below for that era, and the move to
Postgres); fields documented as "enum-like" below stayed plain `String` columns rather than becoming native
Postgres enums after the move, so their allowed values still live in one place — `src/lib/validations.ts`
(single source of truth, validated with Zod on every write) — and adding a new value never needs a schema
migration.

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

The project ran on SQLite for its first few weeks (local file at `prisma/dev.db`, no real hosting), then
moved to PostgreSQL to deploy for real use. SQLite and Postgres migrations aren't portable — SQLite's
`ALTER TABLE` support is narrow enough that Prisma re-creates the whole table for most non-trivial changes
(`RedefineTables`), which has no equivalent or need in Postgres — so rather than hand-translating a dozen
SQLite-era migrations, the entire history was squashed into one fresh `prisma migrate dev` run against
Postgres, generated straight from the schema as it stood at the time of the move. `prisma/migrations/`
now starts from that single initial migration; the detailed SQLite-era changelog that used to live in this
section (hand-edited renames, `RedefineTables` quirks, and the schema decisions behind each one — the
`Deal`→`Opportunity` rename, the five-role-to-three collapse, dropping the Commercial/Solution sections,
adding `PipelineStage`/`Opportunity.visibility`/`createdById`, etc.) is preserved in git history rather
than here; the "Tables" section above documents where each of those decisions landed in the current
schema.

Going forward, new migrations are plain `prisma migrate dev --name <name>` like any Postgres project —
Postgres's `ALTER TABLE` handles adding/dropping columns, tables, and foreign keys directly, so the
hand-editing this section used to describe for SQLite's table-recreate behavior shouldn't be needed again.
