# CRM Workflow

## The sales lifecycle this system models

```
Lead ──convert──▶ Company + Contact + Opportunity ──pipeline──▶ Won / Lost
```

### 1. Lead

Raw inbound interest — a name, maybe a company, maybe an email — captured before it's qualified as real
business. Leads live at `/leads`, are owned by a rep (or reassigned by a manager/admin), and carry a
manually-set 0–100 `score`, a `status` (New → Contacted → Qualified/Unqualified → Converted/Lost), and a
`source` from a shared taxonomy (Website, LinkedIn, Referral, Email, Phone, Event, Partner, Advertisement,
Direct outreach, Other) used consistently across Leads, Contacts, and Opportunities.

### 2. Conversion

From a Lead's detail page, "Convert to Company/Opportunity" (`convertLead` in
`src/lib/actions/leads.ts`) does three things in one transaction-like sequence:

1. **Reuses an existing Company** if one with the exact same name already exists; otherwise
   creates one.
2. **Reuses an existing Contact** if one with the same email already exists (and links it to the company
   if it wasn't already); otherwise creates one with `status: "QUALIFIED"`.
3. **Always creates a new Opportunity**, linked to that Company and Contact, at stage `NEW`.

The Lead row is never deleted — it's marked `CONVERTED` with `convertedAt` and links to the three records
it produced, so you can always trace "where did this customer come from." This reuse behavior is
deliberate: converting the same company's second lead should never spawn a duplicate Company. The
`/sales/new` form applies the same idea from the other direction: it re-checks for a same-name Company
right before saving (not just at typing time), so a stale in-page company list can't create a duplicate
either.

### 3. Pipeline

The `/opportunities` page lists every Opportunity as its own row — one line per deal — since each one can
be mid-way through a different set of steps and a shared multi-column board can't represent that cleanly.
Every row carries the same progress track: New, then that Opportunity's own custom steps (if it has any) in
order, then Won and Lost — rendered as a small horizontal stepper, current step highlighted. Clicking any
step in that stepper moves the deal there directly (or, for the plain-table alternative, changing Stage on
the edit form does the same thing) — there's no board-level way to create an Opportunity directly (that
only happens through `/sales/new`, since an Opportunity always needs a Contact).

Beyond New/Won/Lost, the System Admin (any Opportunity) or that Opportunity's own owner (their own deals
only) can give it its own extra steps in between — e.g. "Proposal Sent", "Legal Review" — from a small
"Workflow" icon on that Opportunity's own row (the icon only shows up on rows you're allowed to manage; opens
as a popup, not a separate page). These steps belong to that one deal alone: adding, renaming,
reordering, or deleting one never touches, or even appears on, any other Opportunity's row or Stage dropdown.
The moment a step is added, it appears in that Opportunity's own stepper right away — between New and Won,
positioned by the step's own order — the same way New/Won/Lost always show even with nothing moved into them
yet. The Workflow popup itself is purely for managing which steps exist (add, rename, reorder, delete); the
actual moving happens on the row's own stepper, one click away, without opening any popup at all. A step
that's no longer needed (nothing currently sitting in it) can be deleted from the popup, and disappears from
the stepper immediately. Each step (custom or system) carries its own default win-probability that auto-fills
when you change stage (editable per-opportunity). `value × probability` is the weighted forecast shown on the
dashboard. A `LOST` opportunity requires a reason (Price / Competitor / No budget / No response / Not a fit /
Other). An opportunity that sits 14+ days without closing is flagged "stale" on its row and its detail page —
`stageChangedAt` updates on every stage transition specifically to drive this. An Opportunity that came from
converting a Lead carries a small flame-icon badge on its row (board and list view alike, linking to that
Lead), so where it originated is visible at a glance, not just on its own detail page.

Moving a deal into one of its own custom steps (anything other than New/Won/Lost) requires a value and a
next action already set — `stageGateCheck` in `src/lib/validations.ts`, enforced everywhere a stage can
change (the edit form, the inline edit on the detail page, and the row's own stepper, all of which show the
error and snap back to the previous stage if the gate fails). On the stepper specifically, a blocked click
doesn't just show the error and stop — a small inline field (a value, or a next action, whichever is
missing) opens right under that row's stepper, and submitting it saves the field and completes the move in
one step, without leaving the page for the Opportunity's own edit form. This came out of the CRM benchmark
research (see the published "CRM Benchmark" document): Zoho's Blueprint and HubSpot's stage approvals both
block this same way, and it was cheap enough to add without any new UI system. Since the gate keys off "is
this a system stage" rather than a hardcoded stage name, it automatically covers every custom step an admin
adds later — nothing to update in code when a deal's workflow changes.

### 4. Activity and tasks

Leads, Companies, Contacts, and Opportunities each have an activity timeline (calls, emails, meetings,
demos, follow-ups, notes) and can each have Tasks with due dates and priorities. Stage changes on an
Opportunity are logged to its timeline automatically.

When the note you're logging is a **Meeting** or **Follow-up**, the activity form reveals an optional
"Remind me on" date. Filling it in also creates a linked Task (`addActivity` in
`src/lib/actions/activities.ts`, wrapped in the same transaction as the note) with that due date, so the
reminder shows up in the record's own Tasks box — with overdue tracking and the top-bar notification badge
— instead of being buried in the activity feed. Leaving the date blank just logs a plain note, same as
before.

Every Task also carries a **type** (Meeting/Call/Email/Follow-up/Other, shown as an icon on every task row)
and its due date is a real date-and-time, not just a date — the `/tasks` page's due-date field is a
`datetime-local` input, so a meeting can carry an actual time, not just a day. `/tasks` puts an "Upcoming
meetings" card above the regular task list: every non-done Meeting-type task, soonest first, showing who
it's with and their email (a `mailto:` link straight from the linked Contact) alongside the date/time — the
one place to see every meeting on the calendar without opening each task individually.

### 5. The 360° view

The Company, Contact, and Opportunity detail pages are a single scrollable page showing everything tied
to that record — deliberately not split into tabs, to keep it simple. From top to bottom: a stat strip
(pipeline value, won value, win rate, open tasks), where it originated (the Lead it was converted from and
who registered that Lead, if any — shown on both the Contact and the Opportunity it produced), the full
activity log (with the add-note form), the full list of related
contacts/opportunities/tasks, and an info sidecard.

Logging a new Contact, Opportunity, or Task never requires leaving the page: each of those lists has a
compact quick-add form inline (name/title + a couple of essential fields, with a small "More fields" link
to the full form for anything beyond that). After saving, the quick-add form redirects back to the same
360 page instead of jumping to the new record's own page — a rep working a company can add a contact,
log an opportunity against it, and note an activity without ever navigating away.

Editing an existing Opportunity works the same way: its "Edit" button (`OpportunityHeader` in
`src/components/opportunities/opportunity-header.tsx`) toggles the full edit form in place on the same
360 page instead of navigating to a separate `/edit` route — that standalone route was removed since the
inline toggle replaced it.

### 6. Unified sales intake

`/sales/new` ("New Sales Opportunity") registers an entire deal in one submit instead of forcing a rep
through separate Company → Contact → Opportunity screens: Company, Contact, Opportunity, Requirements,
and an initial activity/follow-up task all go into one transaction (`createSalesOpportunity` in
`src/lib/actions/sales.ts`). Typing a company or contact name that exactly matches an existing record
shows a "Using existing company/contact" notice and reuses it instead of creating a duplicate at
submit-time too — live in the form via a `<datalist>` as you type, and re-checked server-side right before
saving as a safety net against a stale in-page company list (same principle as Lead conversion). Both the
in-page list and the server-side re-check are scoped the same way everything else is: an Account Manager
only ever sees and matches against their own companies/contacts here (Admin sees and matches against
everyone's, same as elsewhere) — so this can never surface, or silently attach a new deal to, another
Account Manager's data. On
success it redirects to the new Opportunity's page, which is also where Requirements are edited afterward
(its own inline "Edit" toggle — same single-page, no-tabs approach as the rest of the app).

The Requirements section deliberately covers only business problem, customer objective, required
solution, functional/technical requirements, deployment, and infrastructure notes — it started out with
several more fields (AI requirements, integrations, user/site counts, security/compliance, timeline,
budget, risks) but those were removed at the user's request to keep the form shorter, along with the
entire Commercial section, Product/service line items, and the separate "Proposed Solution" section.

The only field this form actually requires is the Contact's name — an Opportunity always needs a linked
Contact at the database level. Company name and the Opportunity name are both optional: an empty company
name just means no Company gets linked (`companyId` stays null), and an empty Opportunity name is
auto-filled server-side as `"<contact name> - Opportunity"` (`createSalesOpportunity` in
`src/lib/actions/sales.ts`) so nothing blocks submission.

The form's five sections (Company, Contact, Opportunity, Requirements, Activity & Notes) are laid out as
an accordion, stacked one under the other — opening one section closes whichever was open before it
(`AccordionSection` in `src/components/sales/sales-opportunity-form.tsx`, animated with a CSS
`grid-template-rows` transition rather than JS height measurement), so the page never shows more than one
section's worth of fields at a time no matter how far into the form you are. All five still submit as one
`<form>` with a single button — nothing about the accordion is separate per-section state, so switching
which section is open never discards anything already typed in another one. Since Contact is the only
required field, submission is validated in JavaScript rather than relying on the native `required`
attribute, so a blank Contact name shows an inline message and focuses the field instead of a plain browser
validation popup. A live breadcrumb ("Company / Contact / Opportunity name") sits above the cards so the
page reflects what's being built as you fill it in, and leaving the page with anything filled in — a nav
link, a browser refresh, closing the tab — prompts for confirmation first, so a rep can't lose a half-typed
deal by clicking away. Every `Textarea` in the app (`src/components/ui/input.tsx`) auto-grows
to fit its content as you type — no manual resize handle, and no fixed height that clips a long paragraph.

There's also a simple list view of every opportunity at `/opportunities/list` (linked from the pipeline
page's "List view" button, and vice versa) — a plain table (title, company, contact, stage, value,
probability, owner, expected close date) for scanning everything at once, printing (`window.print()`,
with the sidebar/topbar hidden via `print:hidden` in `src/app/(dashboard)/layout.tsx` and the nav
components), or exporting to CSV. Each row's title links straight to that opportunity's detail page, where
editing is one click away via the inline "Edit" toggle — no separate edit screen to navigate through.

### 6b. Adding and editing records happens in a popup, not a new page

Outside of `/sales/new` (which stays a full page — it's the one multi-section flow, not a quick add/edit),
every other "New X" and "Edit" action across the app opens as a modal on top of the current page instead of
navigating to a separate `/x/new` or `/x/id/edit` route: Leads, Contacts, Companies, editing an existing
Opportunity, Tasks, Users, and Sales Targets. (There's deliberately no standalone "New Opportunity" modal —
an Opportunity always needs a Contact, so `/sales/new` is the only way to create one.) The shared
`Modal`/`ModalFormTrigger` components (`src/components/ui/modal.tsx`,
`src/components/ui/modal-form-trigger.tsx`) wrap the exact same form components the old standalone pages
used, so validation and Server Actions are unchanged — only the navigation is gone. A "More fields" link on
a compact quick-add form (e.g. adding a Contact from a Company's page) now opens the full form in a nested
modal instead of navigating away, and correctly keeps the record it was scoped to (e.g. the Company) fixed
via a hidden field when that field isn't offered as a dropdown. For the few actions whose Server Action
redirects back to the *same* list URL on success (Users, Sales Targets, and editing a Task from `/tasks`),
the modal closes itself when that redirect's `?flash=` query param changes, since only a route change (not
a same-page redirect) unmounts the modal on its own.

### 7. Saved views and the "needs attention" nudge

The Opportunities list page also has three one-click view presets — All, My open deals (your own
opportunities, excluding Won/Lost), and Closing this month (open opportunities with an expected close
date in the current calendar month) — as plain `?view=` links rather than a user-configurable saved-view
feature, since three fixed presets covered what was actually asked for.

An Opportunity's detail page shows a "No activity logged in N days" nudge once 7+ days have passed since
its last logged activity (or since creation, if it has none), as long as it isn't Won or Lost. This is
deliberately based on last-activity, not `stageChangedAt` — a deal can sit in the same stage a long time
and still be actively worked, but one with no logged activity in a week genuinely needs a nudge. It's
rule-based, not AI — the benchmark research found this to be the common thread across the leaders, not a
model call.

## Roles and what they can do

Three user-facing roles — **Account Manager**, **System Admin**, **Management** — replacing an earlier
five-role model (`MANAGER`/`SALES_REP` merged into `ACCOUNT_MANAGER`, `VIEWER` merged into `MANAGEMENT`).
The business terms "Sales" and "Sales Manager" don't appear as role names anywhere in the UI.

| Role | Sees | Can write |
|---|---|---|
| System Admin (`ADMIN`) | everything | everything, including Users, role assignment, and Sales Targets |
| Account Manager (`ACCOUNT_MANAGER`) | only their own records — isolated from every other Account Manager, not just from other roles | only their own records |
| Management (`MANAGEMENT`) | everything (read-only, for company-wide reporting) | nothing |

There is deliberately no "sees my team's records" tier: an Account Manager who used to be a `MANAGER` and
had reports under them no longer sees those reports' records — visibility is now strictly "yourself" or
"everyone," nothing in between. There is no Org Chart / reporting-line feature anymore — it was removed
along with the `managerId` field, since it no longer served any purpose once visibility stopped depending
on it.

Only `ADMIN` may set a record's owner to someone other than themselves — an Account Manager creating
anything (an Opportunity via `/sales/new`, a Lead, a Task, ...) always gets it assigned to themselves,
enforced server-side (`resolveOwnerId` in `src/lib/scope.ts`) regardless of what a form field might claim.

**Opportunities are the one deliberate exception to "yourself or everyone, nothing in between."** Leads,
Contacts, Companies, and Tasks stay strictly isolated with no exception — but when the System Admin
registers an Opportunity (or edits one later), they can mark it visible to every Account Manager instead of
just its owner, with a "Visible to" choice next to the owner picker on `/sales/new` and the edit form (only
`ADMIN` sees this field at all — same pattern as the owner picker, and just as strictly enforced server-side
by `resolveVisibility`, not merely hidden in the UI). This only ever grants **read** access: an Account
Manager who isn't the owner can open a shared deal and see everything on it, but can't edit its fields, move
its stage, or delete it — that still requires actually owning it, or being Admin/Management. A small "shared
with everyone" icon marks such a deal on the board so it's clear at a glance why it's showing up outside its
owner's own view. Every Opportunity also records who actually registered it (`createdById`, shown as
"Registered by" on its detail page) — distinct from its owner, since the Admin who registers a deal usually
assigns a different Account Manager to own it going forward.

See `ARCHITECTURE.md` for how this is enforced (short version: centrally, server-side, independent of
what the UI shows).

## Sales Targets

`/targets` is a real module (not a single amount on the dashboard): a target has a **type** (Revenue, or
Deals Won), a **period** (Monthly/Quarterly/Yearly — picked as year + period number, e.g. "September
2026" or "Q3 2026," rather than raw start/end dates someone could enter inconsistently), a **value**, and a
**status** (Draft/Active/Completed/Archived). Only System Admin creates, edits, archives, or deletes a
target (`/targets/new`, `/targets/[id]/edit`) — the Account Manager it belongs to can only view it.
Archiving keeps the target around (still visible, marked Archived, still audited); deleting removes it
and its audit trail outright — two different "I don't need this anymore" actions for two different
intents.

What each role sees on the same `/targets` page:
- **Account Manager**: their own target(s) as progress cards — period, target value, actual achieved,
  remaining, achievement %, no edit controls at all.
- **Management**: every Account Manager's targets in one table, plus a company-wide summary (total target,
  total achieved, overall achievement %, number of Account Managers) — read-only.
- **System Admin**: the same table, plus "Create Target" and per-row Edit/Archive.

Achievement is always **calculated from real Opportunity data**, never entered manually: it sums (Revenue)
or counts (Deals Won) that Account Manager's own Won opportunities whose close date falls inside the
target's period — nobody else's deals count toward it, and a deal that's still Open, in Negotiation, or
Lost never counts, no matter how large. Achievement is not capped at 100% — beating a target shows e.g.
"250%," since that's meaningful information, not an error to hide. A Revenue and a Deals Won target for the
same Account Manager and the same period can coexist; two targets of the *same* type for the same person
and period cannot — the second attempt shows an inline error instead of silently duplicating.

Every create/edit/archive is recorded (who, when, what changed, old value, new value), viewable by System
Admin — scoped specifically to target changes, not a general audit log (see "What's not built yet" below).

The Account Manager's home Dashboard shows a "My Target" section with the same progress cards when they
have one; Management/Admin see a compact company-wide summary card there instead, mirroring the full page.

## What's not built yet

Tracked here rather than silently dropped. In the spec's own phase numbering, this project currently
covers **Phase 2 (Foundation)**, **Phase 3 (CRM Core: Accounts/Contacts/Leads/conversion)**, and **Phase
4 (Opportunities/Pipeline/Activities/Tasks, plus a trimmed structured Requirements section)**. Not yet
implemented:

- **Products/Services and Commercial terms** — a `Product`/line-item model and Commercial fields
  (payment terms, pricing model, discount/tax, proposal due date...) were built and briefly shipped, then
  removed at the user's request to keep the sales-entry form and Opportunity page shorter. If they come
  back, the migration history in `DATABASE.md` shows the exact fields to re-add.
- **A structured Solution/technical-approach section** — also built and then removed the same way, right
  after Commercial/Products. An Opportunity's technical approach today lives only as free text in
  `nextAction`/`notes`.
- **Proposals/Quotations** as a distinct entity with an approval workflow, and a **distinct Meeting
  entity** — a meeting is logged as an Activity (`type: "MEETING"`) alongside calls, emails, and notes, not
  its own table with its own page.
- **Document/file storage** — no object storage exists yet (the database itself moved from SQLite to
  PostgreSQL to support a real deployment, but nothing analogous to S3 was added), so there's nowhere to
  attach RFPs, technical docs, or signed proposals yet.
- **Multi-channel notifications**, a **general system-wide audit log** (the one audit log that exists —
  `SalesTargetAudit`, see the Sales Targets section above — is scoped specifically to target changes, not
  every record type), a **duplicate-review workflow** for already-existing records (today's duplicate
  protection only fires at Contact/Company-create time, at Lead-conversion time, and live in the
  `/sales/new` form — not retroactively for records already in the database), and **Project Handover** —
  Phase 7.
- A background-job runner, structured logging, health-check endpoints, Docker/deployment docs, and an
  automated test suite — Phase 8 (Hardening). Every feature so far has instead been verified manually with
  a real browser (Playwright) against the real database during development, then the test script and
  Playwright itself removed — there's no *standing* automated suite yet.
- **AI follow-up suggestions, forecast rollups by team/territory, and bulk edit on list pages** — the
  "consider later" tier from a September 2026 benchmark against Salesforce, HubSpot, Microsoft Dynamics
  365, Zoho, and Pipedrive (published as the "CRM Benchmark" document). Its "do now" items (stage-gated
  required fields, saved list views, the activity-based attention nudge) are already implemented — see
  Section 7 above. Its "skip" tier (CPQ, omnichannel messaging, marketing automation, customer portals,
  a native mobile app) is a deliberate no, not an open question, matching the Products/Commercial and
  Solution sections above that were already tried and removed once.
