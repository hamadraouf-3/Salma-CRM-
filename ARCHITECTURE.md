# Architecture

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Interaction model**: Server Actions (`"use server"`), not a separate REST API. Every mutation is a
  typed function called directly from a form or client component — no request/response schema layer to
  keep in sync, no API versioning surface. A handful of Route Handlers exist only where a raw HTTP
  response is required (CSV export, NextAuth's callback routes).
- **Database**: SQLite via Prisma ORM 7 (`prisma-client` generator + `@prisma/adapter-better-sqlite3`
  driver adapter). Single file (`prisma/dev.db`), zero external services to provision or host.
- **Auth**: NextAuth v4, credentials provider, JWT sessions, bcrypt password hashing.
- **UI**: Tailwind CSS v4 with logical properties (`ps-`, `text-start`, …) so the layout mirrors
  automatically under `dir="rtl"`, a small custom component kit (`Card`, `Button`, `Badge`, `Input`),
  Recharts for dashboards, one row per Opportunity with a clickable per-deal stage stepper on `/opportunities`.
- **i18n**: English/Arabic, cookie-based locale (no `/en`/`/ar` URL prefix) with real RTL — see
  "Internationalization" below.

This is a deliberate choice, not a placeholder: a modular monolith on Server Actions is simpler to secure
correctly (every mutation re-checks auth server-side, see below) and cheaper to operate than a
microservice split, and nothing in the current feature set needs the two justify decomposing it further.

## Layers

```
Browser
  │
  ├─ Server Components (data reads: Prisma queries scoped per-request)
  ├─ Server Actions   (data writes: validated with Zod, authorized, then a Prisma call)
  │
  ▼
src/lib/
  ├─ session.ts   — getCurrentUser / requireUser / requireRole / requireActionUser / canViewTeam
  ├─ scope.ts     — org-chart-aware row-level visibility (see RBAC below)
  ├─ validations.ts — Zod schemas + shared enums/labels, single source of truth for allowed values
  ├─ actions/*.ts — one file per domain (leads, contacts, companies, opportunities, tasks, activities, users)
  └─ prisma.ts    — PrismaClient singleton (cached on globalThis in dev to survive HMR)
  │
  ▼
prisma/schema.prisma → SQLite (prisma/dev.db)
```

## RBAC and data visibility

Three roles: `ADMIN`, `ACCOUNT_MANAGER`, `MANAGEMENT`. There is deliberately no middle "sees my team's
records" tier — every Account Manager is isolated from every other one, full stop. This replaced an
earlier five-role model (`ADMIN`/`MANAGER`/`SALES_REP`/`MANAGEMENT`/`VIEWER`) where `MANAGER` and `VIEWER`
could see their org-chart reports' records; that hierarchy-based visibility was removed entirely, not just
relabeled, per an explicit business requirement that Account Managers must never see each other's work.

- **Write access** is enforced once, centrally: `requireActionUser(...roles)` in `src/lib/session.ts`
  defaults to `WRITE_ROLES = [ADMIN, ACCOUNT_MANAGER]` when called with no explicit role list. This means
  `MANAGEMENT` can never mutate data even if a call site forgets to restrict roles explicitly — the safe
  default is read-only, not "any signed-in user."
- **Row-level visibility** is a flat, three-way split — `src/lib/scope.ts`'s `visibleUserIds(user)`:
  - `ADMIN` / `MANAGEMENT` → unrestricted (`null`, meaning "no filter").
  - `ACCOUNT_MANAGER` → always just `[user.id]`. No recursion, no hierarchy — this used to be a recursive
    SQL CTE walking `User.managerId` for the old `MANAGER`/`VIEWER` roles; that code path is gone.

  Every list query and every per-record permission check (`ownedScope`, `canAccessOwner`) is built on
  this one function, so there is a single place that defines "who can see what." `resolveOwnerId` follows
  the same rule for writes: an Account Manager can never set a record's owner to anyone but themselves —
  a client-supplied owner id is silently ignored, not merely hidden in the UI — only `ADMIN` may assign or
  reassign a record to a different Account Manager.
- **There is no Org Chart / reporting-line feature.** `managerId` fed nothing but that page once
  `visibleUserIds` stopped depending on it, so both the page and the column were removed outright
  (migration `20260922075803_remove_org_chart_and_contact_mobile`) rather than left as dead weight.
- **Frontend hiding** (e.g. not rendering a "New Company" button for `MANAGEMENT`) is a UX nicety
  layered on top, never the security boundary. The pages that create/edit records also redirect away
  server-side for read-only roles (`if (!canWrite(user.role)) redirect(...)`), and the action itself
  re-validates regardless of what the client sent. This was specifically verified end-to-end with a second
  real Account Manager test account: direct-URL access to another Account Manager's opportunity 404s,
  `/sales/new` redirects a `MANAGEMENT` user away rather than just hiding the link, and a forged owner id
  in a submitted form is silently overridden server-side.
- **Opportunity visibility is the one deliberate exception** to the flat "yourself or everyone" split
  above — Leads, Contacts, Companies, and Tasks have no equivalent and never will (confirmed explicitly:
  Tasks in particular must stay visible only to the assignee they're registered to, no sharing). An
  `Opportunity.visibility` column (`"OWNER"` default, or `"EVERYONE"`) lets the System Admin make one
  specific deal visible to every Account Manager, not just its own owner. `opportunityScope(user)`
  (`src/lib/scope.ts`) is the Opportunity-only counterpart to `ownedScope`: for an Account Manager it
  resolves to `{ OR: [{ ownerId: { in: ids } }, { visibility: "EVERYONE" }] }` instead of a plain
  `{ ownerId: { in: ids } }`, and every Opportunity list query (the board, list view, dashboard, reports,
  search, CSV export) uses it in place of `ownedScope`. `canViewOpportunity` is the matching extension of
  `canAccessOwner`, used to gate the detail page (`notFound()` if neither owned nor shared). Critically,
  visibility only ever grants **read** access — `canEdit` on the detail page, and every write action
  (`updateOpportunity`, `updateOpportunityStage`, `deleteOpportunity`), still call the unmodified
  `canAccessOwner`, so a non-owner can open and read a shared deal but never edit or delete it. Only
  `ADMIN` may set `visibility` at all: `resolveVisibility(user, requested, existingVisibility?)`
  (`src/lib/scope.ts`) mirrors `resolveOwnerId`'s pattern exactly — a non-admin's submitted value is
  ignored — but with one addition `resolveOwnerId` doesn't need: on an *update*, a non-admin's ignored
  submission falls back to the record's own current visibility (passed as `existingVisibility`) rather than
  hardcoding `"OWNER"`, so an Account Manager saving an unrelated field on a deal an Admin already shared
  can't accidentally revert that sharing.
- **Related-record pickers must be scoped too, not just the primary list.** `/sales/new`'s company
  `<datalist>` and its server-side "reuse an existing company by name"/"duplicate contact email" safety
  nets (`src/lib/actions/sales.ts`) used to query every Company/Contact in the system unscoped — meaning an
  Account Manager could see, and get silently matched against, another Account Manager's company or
  contact while registering a deal. Fixed by running the same `ownedScope(user)` every other query uses,
  plus a `canAccessOwner` check wherever a hidden `companyId`/`contactId` field is accepted directly (so a
  forged id from a stale/tampered form can't attach a new deal to a company the submitter doesn't own
  either). The Opportunity and Contact edit forms had the same gap in their company/contact reassignment
  dropdowns; fixed the same way, with one nuance — the query is `{ OR: [ownedScope(user), { id: <the
  record's current company/contact id> }] }` rather than a plain scope, so editing an Admin-registered
  record whose linked company belongs to someone else doesn't silently drop that selection from the
  dropdown and reassign it on save.
- **Managing an Opportunity's own workflow steps (`src/lib/actions/pipeline-stages.ts`) follows the same
  ownership rule as editing the Opportunity itself**, not a separate admin-only gate: every action there
  calls `requireActionUser()` (defaults to `WRITE_ROLES`) then `canAccessOwner(user, opportunity.ownerId)`,
  so the System Admin can manage any Opportunity's steps and an Account Manager can manage their own
  deals' steps, but never someone else's. The board only renders the "Workflow" icon on a row when
  `isAdmin || opportunity.owner.id === currentUserId` (`OpportunityBoard`), so the affordance itself tracks
  the same rule the server enforces — but as always, the server check is what actually matters.

## Request flow for a typical write

1. Server Component renders a form, passing only the data the current user is allowed to see
   (`visibleTeamUsers(user)` for an owner/assignee dropdown, `ownedScope(user)` for related-record
   pickers).
2. The form's `action` is a Server Action bound with `useActionState`.
3. The action calls `requireActionUser(...)` first — this is the actual authorization boundary.
4. Input is parsed with a Zod schema from `validations.ts`; on failure the action returns `{ error }`
   without touching the database.
5. Ownership/hierarchy is re-checked for updates/deletes (`canAccessOwner`) before any write.
6. On success: a Prisma write, `revalidatePath(...)` for the affected routes, then `redirect(...)` with a
   `?flash=` message the client reads once and clears from the URL.

## Sales Targets

`/targets` is a first-class module (`src/lib/actions/targets.ts`, `src/lib/targets.ts`, `SalesTarget` +
`SalesTargetAudit` in the schema — see `DATABASE.md`), not a field bolted onto `User`. A target is **owned**
by the `ACCOUNT_MANAGER` it's assigned to (drives what they see) but only ever **created/edited/archived by
`ADMIN`** — `createTarget`/`updateTarget`/`setTargetStatus` all call `requireActionUser("ADMIN")` directly
rather than the default `WRITE_ROLES`, and the `/targets/new` and `/targets/[id]/edit` pages redirect away
non-admins server-side. The three roles see different things on the same `/targets` route (one page,
branching on `user.role`, rather than three separate routes):

- **Account Manager**: their own targets only (`prisma.salesTarget.findMany({ where: { userId: user.id } })`
  — filtered server-side, never fetched-then-hidden), rendered as progress cards, no edit controls.
- **Management**: every target, company-wide, in a read-only table — no create/edit/archive UI, and the
  underlying actions reject them anyway if they somehow reached the mutation.
- **Admin**: the same table plus a "Create Target" button and per-row Edit/Archive controls.

**Achievement is always computed, never stored** (`computeTargetAchievement` in `src/lib/targets.ts`): it
sums (`REVENUE`) or counts (`DEALS_WON`) that Account Manager's own `Opportunity` rows where
`stage === "WON"` and `closedAt` falls inside `[periodStart, periodEnd)` — the same currency as the target,
for `REVENUE`. It is **not** capped at 100%, since exceeding a target is meaningful information, not an
error. `periodStart`/`periodEnd` are derived server-side from `(periodType, year, periodNumber)` rather than
entered as raw dates, so "September 2026" always means the same unambiguous range no matter who created it.

This surfaced one real bug: `createSalesOpportunity` (`/sales/new`'s unified intake form) never set
`closedAt` when an opportunity was created directly at the `WON` stage — every other opportunity-mutating
action (`createOpportunity`, `updateOpportunity`, `updateOpportunityStage`) already did. Since target
achievement depends entirely on `closedAt`, an opportunity created WON through `/sales/new` would have
silently never counted toward anyone's target. Fixed by adding the same `closedAt` logic there.

**Duplicate targets are prevented at the database level**: `@@unique([userId, targetType, periodType,
periodStart])` on `SalesTarget`. `createTarget`/`updateTarget` catch that constraint's error code (`P2002`)
and return a translated, friendly message instead of a raw Prisma error.

**Target changes are audited** in `SalesTargetAudit` — one row per `CREATED`/`UPDATED`/`STATUS_CHANGED`
event, with the acting admin, timestamp, and (for updates/status changes) the field, previous, and new
value. This is scoped to targets specifically, not a general system-wide audit log (that remains
unimplemented — see "What's intentionally out of scope right now" below).

## Internationalization (i18n)

English and Arabic, switched from a control in the Topbar, with no `/en`/`/ar` URL prefix — the locale is
a cookie (`locale`), not part of the route. This was a deliberate choice over Next's own recommended
`app/[lang]/` routing convention (see `node_modules/next/dist/docs/01-app/02-guides/internationalization.md`,
which every Next-16-specific decision in this app is checked against, per `AGENTS.md`): this is an
internal dashboard tool, not a site that needs per-language crawlable URLs, and restructuring every route
under `app/[lang]/` would mean touching every `href`/`redirect()` call in the codebase in one pass. The
cookie approach gets a real language switch with no routing blast radius.

```
src/i18n/
  ├─ locale.ts           — Locale type ("en" | "ar"), getLocale() reads the cookie server-side, isRtl()
  ├─ en.json / ar.json   — flat-ish nested dictionaries, one key per UI string
  ├─ dictionaries.ts     — getDictionary(locale); "server-only" since it's a static import, not fetched
  ├─ plural.ts           — plural(locale, count, forms) using the built-in Intl.PluralRules — no library
  │                         needed, and it gets Arabic's six plural categories (zero/one/two/few/many/other)
  │                         right, not just English's two
  └─ locale-context.tsx  — LocaleProvider + useLocale()/useDict(), mounted once in the root layout so any
                            Client Component can read the active locale/dictionary without prop-drilling
```

`src/app/layout.tsx` reads the cookie once per request, sets `<html lang dir>` (`dir="rtl"` for Arabic),
and wraps everything in `LocaleProvider`. `setLocale` (`src/lib/actions/locale.ts`) is a Server Action that
just writes the cookie; the `LanguageSwitcher` component calls it then `router.refresh()`, which re-runs
the root layout server-side and re-renders with the new `dir`/dictionary — no client-side i18n library,
no page reload.

Translation now covers the whole app: the shell (Sidebar, Topbar, MobileNav, sign-out), the Dashboard home
page, and every other page and Client Component — Leads, Contacts, Companies, Opportunities (pipeline rows,
list view, and detail page), `/sales/new`, Tasks, Reports, Search, Sales Targets, Users, Profile, and
Login. Each page follows the same pattern: a Server Component page calls
`getDictionary(await getLocale())` and reads `dict.<page>.xxx`; a Client Component calls `useDict()`.

Enum-backed labels (lead status, account status, source, role, activity type, etc.) are a special case: the
underlying enum keys (`"NEW"`, `"WON"`, ...) are stored in the database and must never change, only the
displayed label. `src/lib/validations.ts` still exports the original English-only `*_LABELS` maps (kept as
the source of the enum key lists and as a fallback), but every call site now goes through
`src/i18n/enum-labels.ts`, which exports one small typed helper per enum family (`leadStatusLabel(dict,
status)`, `roleLabel(dict, role)`, ...) reading from a new `enums` namespace in `en.json`/`ar.json`
(`enums.leadStatus.NEW`, `enums.role.ADMIN`, ...). A `fields` namespace holds generic form-field labels
(Name, Email, Owner, Notes, ...) reused across the many forms that share them, and a `common` namespace
holds generic action words (Save, Cancel, Delete, ...).

Opportunity stage is the one exception, since it's no longer a fixed enum — see "Configurable pipeline
stages" below. `stageLabel(dict, stage)` still exists and still translates the three fixed system keys
(`NEW`/`WON`/`LOST`) through `enums.opportunityStage`, but every call site that can encounter an
admin-added stage uses `resolveStageLabel(dict, stageId, stages)` instead, which falls back to the
`PipelineStage` row's own free-text `label` (never translated — the admin typed it) when the id isn't one
of the three system keys.

## Per-opportunity workflow steps

`OPPORTUNITY_STAGES` used to be a hardcoded six-value Zod enum (`NEW`/`CONTACTED`/`PROPOSAL`/
`NEGOTIATION`/`WON`/`LOST`) shared by every Opportunity. It's now a `PipelineStage` database table: `NEW`,
`WON`, and `LOST` are fixed system rows (seeded by migration, `id` literally `"NEW"`/`"WON"`/`"LOST"`,
`isSystem: true`, `opportunityId: null`, can't be renamed or deleted, shared by every Opportunity), and
anything else is a custom workflow step scoped to exactly **one** Opportunity (`opportunityId` set to that
Opportunity's id). The System Admin (any Opportunity) or that Opportunity's own owner (their own deals)
manages an Opportunity's own steps from a small "Workflow" icon on that Opportunity's own row on
`/opportunities` (`OpportunityBoard` opens it in a `Modal` — `OpportunityWorkflow` in
`src/components/opportunities/opportunity-workflow.tsx` renders inside it; actions in
`src/lib/actions/pipeline-stages.ts`, `requireActionUser()` plus a `canAccessOwner(user, opportunity.ownerId)`
check on every action), never a separate settings page or the Opportunity's own detail page. Adding a step to one deal never appears on, or is
selectable for, any other deal: `createOpportunity`/`updateOpportunity`/`updateOpportunityStage`
(`src/lib/actions/opportunities.ts`) and `createSalesOpportunity` (`src/lib/actions/sales.ts`) all reject a
submitted stage whose `opportunityId` isn't either `null` (a system stage) or the exact Opportunity being
written to — and a brand-new Opportunity (created via `/sales/new`, or the compact quick-add on a
Contact/Company page) can only start in a system stage, since no custom step can exist for it yet.
`getPipelineStages(opportunityId?)` (`src/lib/pipeline-stages.ts`) returns the 3 system stages plus, when
given an id, that one Opportunity's own steps — used by the Opportunity detail page's Stage dropdown.
`getPipelineStagesForOpportunities(ids[])` is the bulk form: the `/opportunities` page fetches it once for
every Opportunity currently visible, so each row's own stepper and "Workflow" modal have what they need
without a per-row round trip, and the list view / CSV export use it the same way to resolve several
different Opportunities' own labels in one query.

Two behaviors that used to key off specific hardcoded stage names now key off `isSystem` instead:
`stageGateCheck` (`src/lib/validations.ts`) requires a value and a next action before an opportunity can
enter any non-system stage (previously just `PROPOSAL`/`NEGOTIATION`), and every `stage === "WON" ||
stage === "LOST"` check across the codebase (closedAt, stale-deal warnings, SalesTarget achievement) still
works unchanged, since those two ids are permanently fixed. A step can't be deleted while its own
Opportunity currently sits in it (`deletePipelineStage` counts before deleting).

`OpportunityBoard` (`src/components/opportunities/opportunity-board.tsx`) renders one row per Opportunity —
not a shared multi-column board — since two different Opportunities can be mid-way through two entirely
different sets of custom steps, which a single set of shared columns can't represent. Each row computes its
own `ownStages = stages.filter((s) => s.isSystem || s.opportunityId === opportunity.id)` and hands it to
`OpportunityStepper` (`src/components/opportunities/opportunity-stepper.tsx`), which sorts it
`[...stages].sort((a, b) => a.order - b.order)` and renders it as a small horizontal track of pills
connected by lines — one pill per stage, current one highlighted. This is why the seed migration gave NEW
order `0` and WON/LOST orders `900`/`901` (see its comment): every custom step an admin adds gets an `order`
between `1` and `899` (`createPipelineStage` computes it, capped below WON's), so sorting by `order` alone
always places New first, every custom step in between, and Won/Lost last — no special-casing needed. A
step's pill appears the moment it exists, whether or not the Opportunity currently sits in it yet (same as
New/Won/Lost, which always show), and disappears when the step is deleted.

Clicking a pill is how the deal actually moves — `OpportunityStepper` calls the same
`updateOpportunityStage` the old drag-and-drop board used to, via an `onMoveStage(stageId, gateFix?)`
callback that traces back to `OpportunityBoard`'s `moveOpportunity(opportunityId, stage, gateFix?)`, which
optimistically updates that one row's local state (stage, probability, `stageChangedAt`, and — when a
`gateFix` was supplied — `value`/`nextAction` too) before the server call, and rolls it back with the
server's error message if the call fails. `resolveStageLabel(dict, stageId, stages)`
(`src/i18n/enum-labels.ts`) resolves either kind of stage id against whichever `stages` list the caller
fetched — system stages translate through the dictionary, custom ones show their own free-text label
untranslated. The `OpportunityWorkflow` modal (opened from the same row's "Workflow" icon) is now purely for
managing which steps exist — add, rename, reorder, delete — and shows the current step only as a read-only
indicator; it no longer has its own way to move the deal, since that's what the row's stepper is for.

Rather than click a pill, wait for a rejection, and stop, `OpportunityStepper` checks the gate client-side
first — it imports the same `stageGateCheck` (a pure function, safe in a client component) and runs it
against the props already passed down (`currentValue`, `currentNextAction`) before ever calling
`onMoveStage`. When it's not satisfied, it renders a small `GateFixForm` inline, right under that row's
track, asking for whichever one field is missing; submitting it calls `onMoveStage(stageId, { value })` or
`onMoveStage(stageId, { nextAction })`. That `gateFix` argument threads all the way to
`updateOpportunityStage(id, stage, gateFix?)` (`src/lib/actions/opportunities.ts`), which merges it onto the
existing row before re-running the same `stageGateCheck` server-side and, if it now passes, persists the
patched field and the stage change together in one `prisma.opportunity.update`. The client-side check is
only ever a shortcut to avoid a round trip for the common case — the server always re-validates before
writing, so nothing trusts the client's own gate check for correctness. The dashboard's own "Pipeline by
stage" chart is unrelated code (a Prisma `groupBy` in `src/app/(dashboard)/page.tsx`) and still buckets any
non-WON/LOST row into a single "New" bucket for that aggregate — it's a separate page, and this rework of
the `/opportunities` page didn't change it.

Nothing about the infrastructure changed to get here — each page just needed its own dictionary keys and a
`getDictionary(await getLocale())` (or `useDict()`) call, following the exact Phase 1 pattern.

RTL itself needed **no layout changes** in the shell: the app already used Tailwind's logical properties
(`ps-`/`pe-`, `start-`/`end-`, `border-s`/`border-e`) throughout instead of `pl-`/`pr-`/`left-`/`right-`,
so flipping `dir` to `rtl` mirrors the sidebar, cards, badges, and forms correctly with zero extra CSS.
Any new component should keep using logical properties for the same reason — a hardcoded `ml-`/`pr-`
class is the one thing that won't auto-mirror.

**Server Actions** (flash messages, validation errors) can't call `useDict()` — that's a Client Component
hook. They use `getServerDict()` (`src/i18n/server-dict.ts`, shorthand for `getDictionary(await getLocale())`)
instead. Two small helpers in `src/i18n/messages.ts` cover the two shapes these strings come in:
- `translateMessage(dict, text)` looks the exact English literal up in a flat `messages` dictionary
  namespace (e.g. `translateMessage(dict, "Lead not found")`) and falls back to the English text itself if
  no translation is registered, so a missed string degrades gracefully instead of showing a raw key.
- `stageGateMessage(dict, failure)` formats the one templated, dynamic message (the value/next-action gate
  on moving an Opportunity into Proposal or Negotiation) from the locale-agnostic `{ stage, missing }` result
  `stageGateCheck` returns (`src/lib/validations.ts` — deliberately returns structured data, not a string, so
  that file doesn't need to depend on the i18n dictionaries).

A few other dynamic strings (the duplicate-contact-email error, the CSV import's pluralized success message)
interpolate directly against `dict.messages.<key>` with `.replace("{placeholder}", value)`, the same
convention used throughout the rest of the dictionaries. CSV export column headers (`src/app/api/export/*`)
pull from the existing `fields` namespace and `enum-labels.ts` helpers rather than a separate set of labels.

Two things are deliberately **not** localized: freeform text persisted to the database (an Activity's
logged content, an auto-generated Opportunity title) and the CSV data rows' non-enum values — only UI
chrome, flash/error messages, and enum labels are translated, never data a user typed or that's stored
permanently in one language.

## Theming (light/dark mode)

Every color in the app is a CSS custom property (`--background`, `--surface`, `--foreground`, `--muted`,
`--border`, `--primary`, `--success`/`--success-bg`, etc.) declared once on `:root` in `src/app/globals.css`
and re-exposed to Tailwind via `@theme inline` (`--color-background: var(--background)`, and so on). Every
component styles itself with the resulting utilities (`bg-surface`, `text-muted`, `border-border`, ...)
instead of literal Tailwind palette colors, so a component almost never needs its own dark-mode variant —
redefining the tokens is enough to re-theme the whole app.

Three states, resolved in this order:
1. An explicit choice stamps `data-theme="light"` or `data-theme="dark"` on `<html>` and always wins.
2. With no explicit choice, `@media (prefers-color-scheme: dark)` (guarded by `:root:not([data-theme="light"])`)
   follows the OS/browser preference — pure CSS, no JS involved, so this case never flashes.
3. The explicit choice (`ThemeToggle` in `src/components/theme-toggle.tsx`) is read from `localStorage` via
   `useSyncExternalStore` (not `useEffect` + `useState`, to avoid both a hydration-mismatch flash and the
   "setState synchronously in an effect" lint rule) and written back to `localStorage` plus
   `document.documentElement` on click.

Since `localStorage` isn't available during server rendering, an explicit choice would otherwise flash the
wrong theme for a frame before client JS runs. `src/app/layout.tsx` avoids that with a `next/script
strategy="beforeInteractive"` inline script that reads `localStorage` and sets `data-theme` on `<html>`
before the browser paints anything — the standard no-flash-theme pattern. That script intentionally
mutates the DOM outside of React's own render output, so `<html>` carries `suppressHydrationWarning` to
stop React from (correctly, but noisily) flagging the mismatch it can't reconcile.

A handful of spots use literal colors instead of tokens because they're not a "surface" (a kanban column's
top-border stripe, a leaderboard rank badge) — those get their own light/dark pair of CSS variables
(`--rank-gold`/`--rank-gold-bg`, etc.) defined the same way, rather than a one-off Tailwind `dark:` variant.

## What's intentionally out of scope right now

Documented here so it's a visible decision, not an oversight:

- **PostgreSQL / Redis / object storage** — the project intentionally stays on SQLite with local-disk
  storage for the current single-instance deployment. The schema has no Postgres-specific assumptions,
  so migrating later is a Prisma provider change plus a data migration, not a rewrite.
- **A public REST API** (`/api/v1/...`) — not built, since nothing external consumes this app yet. If a
  future integration needs one, it would sit as a thin layer calling the same `src/lib/actions/*`
  functions, reusing all the authorization logic described above.
- **Background job queue, structured request-scoped logging, health-check endpoints, a document/
  file-storage module, a Proposal/Quotation entity, a distinct Meeting entity (a meeting is logged as an
  Activity with `type: "MEETING"`, same as a call or email — not its own table), Products/Services, and an
  automated test suite** are not yet implemented. A **general, system-wide audit log is also still not
  built** — the one audit log that exists (`SalesTargetAudit`) is scoped specifically to Sales Target
  changes, per an explicit requirement for that one feature, not a broader logging system. See
  `CRM_WORKFLOW.md` for what *is* implemented end-to-end.
