# Salma CRM

A B2B sales CRM: Leads → Companies/Contacts → Opportunities (per-deal pipeline with win-probability
forecasting) → Won, with isolated Account Managers, tasks, a full Sales Targets module, and reporting.

See `ARCHITECTURE.md` for the technical design, `DATABASE.md` for the schema, and `CRM_WORKFLOW.md` for
how the sales lifecycle and roles fit together (including what's intentionally not built yet).

## Tech stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM 7 + SQLite (local database)
- NextAuth v4 (email/password sign-in with role-based permissions)
- Recharts for dashboards and reports

## Features

- **Leads** — pre-qualification pipeline (New → Contacted → Qualified/Unqualified → Converted/Lost) with
  scoring, source tracking, and one-click conversion into a Company + Contact + Opportunity. Conversion
  reuses an existing Company (by name) or Contact (by email) instead of creating duplicates, and keeps the
  Lead's history: the Contact and the Opportunity it produced both show an "Originated from" card linking
  back to that Lead and naming who registered it, so that context is never lost after conversion — a small
  flame icon on the Opportunity's row on the board and list view marks it as Lead-sourced too, with the
  same detail in a tooltip, so that context is visible without opening the deal.
- **Companies & Contacts** — customer/prospect organizations with industry, size, country, status
  (Prospect/Active Customer/Former Customer/Partner), and linked contacts with job title, department,
  decision-maker/primary flags, preferred contact method, and tags. Both have a full activity timeline.
- **New Sales Opportunity (`/sales/new`)** — the one way to create an Opportunity, registering a Company,
  Contact, Opportunity, and structured Requirements in a single submit instead of creating each separately
  (there's no separate quick-add on the Opportunities board, since an Opportunity always needs a Contact and
  this is the only flow that can create one alongside it). Typing an existing company or contact name shows
  a "use existing" notice instead of creating a duplicate (also re-checked server-side right before saving,
  so a stale company list can't create a duplicate). Only the Contact's name is required — Company and
  Opportunity name are both optional and get sensible defaults if left blank. Leaving the page with unsaved
  changes (a nav link, a browser refresh, or closing the tab) prompts for confirmation first.
- **Sales pipeline (Opportunities)** — `/opportunities` lists every deal as its own row (not shared
  columns), each with a small clickable progress track (New → its own steps → Won/Lost, current one
  highlighted) for win probability, weighted forecast, competitor/next-action tracking, a captured reason
  whenever an opportunity is marked Lost, and a "stale" warning once an opportunity sits 14+ days without
  closing. Each opportunity also carries structured discovery **Requirements** (business problem, objective,
  functional/technical requirements, deployment). A plain-table **list view** (`/opportunities/list`) is
  available alongside it for scanning, printing, or exporting everything at once, and editing an opportunity
  happens inline on its own page — no separate edit screen.
- **Per-opportunity workflow steps** — beyond the shared New/Won/Lost steps, the System Admin (for any deal)
  or that Opportunity's own owner (for their own deals) can give it custom in-progress steps (e.g. "Proposal
  Sent", "Legal Review") from a "Workflow" icon on that Opportunity's row on `/opportunities` — no separate
  page; the icon only shows up on rows you're allowed to manage. The moment a step is
  added it appears in that deal's own progress track right away, in its place between New and Won — the same
  way New/Won/Lost always show even before anything moves into them. Each step has its own default win
  probability, and is reorderable and renameable. Clicking any step in the track moves the opportunity there
  immediately, so adding a step isn't just naming one — it takes effect right there on the same row. These
  steps belong to that one deal only — adding one never appears on, or affects, any other Opportunity's row
  or Stage dropdown, and a step can't be deleted while its Opportunity is currently sitting in it.
- **Tasks & Meetings (`/tasks`)** — one place for everything due: due dates *and* times, a type
  (Meeting/Call/Email/Follow-up/Other), priorities, overdue tracking, and a notification badge in the top
  bar; can attach to a Lead, Company, Contact, or Opportunity. A dedicated "Upcoming meetings" card
  surfaces every Meeting-type task with its date/time and the linked contact's name and email, so you don't
  have to open each task to see who you're meeting. Logging a Meeting/Follow-up note in the activity
  timeline can optionally set a reminder date, which auto-creates a linked Task so it shows up for review
  without filling out a separate task form.
- **Reports** — win/loss ratio, top performers by revenue, and a 6-month trend chart.
- **Sales Targets (`/targets`)** — a full module, not a single field: Revenue and Deals Won targets per
  Account Manager, by month/quarter/year, with achievement calculated live from actual Won opportunities
  (never capped at 100%) and every create/edit/archive/delete audited (deletes remove the target outright,
  archiving keeps it around read-only). System Admin creates and manages targets; Account Managers see only
  their own progress; Management sees a company-wide, read-only view.
- **Isolated Account Managers** — every Account Manager sees and edits only their own leads, companies,
  contacts, opportunities, and tasks; there is no tier that sees a "team's" records. System Admin sees and
  edits everything; Management sees everything read-only. The one exception is Opportunities: the System
  Admin can mark a specific deal "Visible to: Everyone" (at registration or later) so every Account Manager
  can see it — read-only, never editable by anyone but its owner — with a small icon on the board marking
  which deals are shared this way. Every Opportunity also records who actually registered it ("Registered
  by" on its detail page), separate from its owner.
- **Add/edit as a popup, not a new page** — every "New X" and "Edit" action (Leads, Contacts, Companies,
  Opportunities, Tasks, Users, Sales Targets) opens in a modal on top of the current page instead of
  navigating away; `/sales/new` is the one exception, since it's a multi-section flow rather than a quick
  add/edit.
- **Global search** — search leads, companies, contacts, and opportunities from the top bar (press `/` to
  focus it).
- **CSV export & import** — export contacts, companies, and opportunities; import contacts from
  a CSV file, with automatic company/tag matching and duplicate-email detection.
- **Roles** — System Admin (full access), Account Manager (isolated to their own records), Management
  (read-only, company-wide) — all enforced server-side, not just hidden in the UI.
- **User profile** — self-service password change.
- **English/Arabic** — a language switcher in the top bar, with real RTL (the layout mirrors, not just the
  text). Covers the entire app: navigation, top bar, Dashboard, Leads, Contacts, Companies, Opportunities
  (pipeline and list views), `/sales/new`, Tasks, Reports, Search, Sales Targets, Users, Profile, and Login.
- **Light/Dark mode** — a toggle in the top bar; defaults to the OS/browser preference, remembers an
  explicit choice per browser, and applies with no flash of the wrong theme on load. Every screen (charts,
  badges, the pipeline rows, both languages) is themed through CSS custom properties, not hardcoded colors.

## Getting started

```bash
npm install
npx prisma migrate dev   # create the database (first time only)
npx prisma db seed       # create the initial admin account
npm run dev
```

Open http://localhost:3000

**Default admin account** (created by `prisma/seed.ts`):
- Email: `admin@company.com`
- Password: `Admin@12345`

Change this password (via the profile page) or create real accounts from the "Users" page after signing in,
then disable this default account.

## Roles & permissions

Three roles, enforced server-side. See `CRM_WORKFLOW.md` for the full breakdown; in short:

- **System Admin**: full access to every record, user management, and Sales Target management
  (create/edit/archive, assigned to any Account Manager).
- **Account Manager**: only sees and edits the leads, companies, contacts, opportunities, tasks, and
  targets they own — isolated from every other Account Manager, with no "sees my team" tier in between.
- **Management**: read-only, company-wide — for executives who need visibility (dashboards, reports, all
  Sales Targets and their progress) without editing anything.

## Useful commands

```bash
npx prisma studio                      # browse the database in a GUI
npx prisma migrate dev --name <name>   # add a new database migration
npm run build                          # production build
```

## Environment variables

Copy `.env.example` to `.env` and fill in the values (especially `NEXTAUTH_SECRET` in production).
