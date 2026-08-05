# Architecture

Companion to [CLAUDE.md](../CLAUDE.md) and [DESIGN.md](DESIGN.md). CLAUDE.md is the short rules
file; this is the structural map — what exists and where. DESIGN.md holds the _why_ behind the
decisions below; read this once and you can navigate the repo without re-exploring.

## Stack

- **Framework**: Next.js 16.2.4 (App Router), React 19.2.4, TypeScript 5 (strict)
- **DB / Auth**: Supabase — `@supabase/ssr ^0.10.2`, `@supabase/supabase-js ^2.104.0`. Postgres + RLS.
- **UI**: Tailwind 4 (`@tailwindcss/postcss`), shadcn/ui (style: `radix-nova`, CSS variables), `radix-ui`, `lucide-react`, `sonner` (toasts)
- **Forms**: `react-hook-form` + `@hookform/resolvers` + `zod ^4`
- **Charts**: `recharts ^3.8.1`
- **Maps**: `@mapbox/search-js-react` + `@mapbox/search-js-core`
- **Date**: `date-fns ^4`
- **Testing**: Vitest (unit), Playwright (e2e)
- **Tooling**: ESLint 9 + `eslint-config-next` + `eslint-config-prettier` + `eslint-plugin-simple-import-sort`, Prettier 3, Husky 9 + lint-staged 17 (pre-commit hook installed)
- **Hosting**: Vercel. **GitHub**: version control.

## Directory map

```
src/
  app/
    (app)/                       authenticated routes — group layout calls requireActiveProfile()
      error.tsx                  generic error boundary for routes without their own
      _layout/
        Sidebar.tsx               nav — items gated per-role via NavItem.isVisible
        MobileSidebarTrigger.tsx
      dashboard/
        page.tsx  loading.tsx  error.tsx
        _components/             DashboardClient, MetricChart, MonthlyBreakdown,
                                 SalespersonBreakdown, SummaryCards, YearOverYearTable
      jobs/
        page.tsx                 filterable + sortable + paginated job table
        new/page.tsx
        [id]/page.tsx  loading.tsx  error.tsx    read-only detail
        [id]/edit/page.tsx       gated by canUserModifyJob()
        loading.tsx
        actions.ts               createJob / updateJob / setJobExcludeFromQuoteMetrics / deleteJob
        _components/             JobTable, JobFilters, JobForm, JobPagination, AddressAutocomplete,
                                 DeleteJobButton, CopyRowButton, QuotedDataToggle
        _lib/                    getJobFormData, jobFormSchema, actualCosts, buildSheetRow (+ tests)
      admin/                     owner-only
        page.tsx  loading.tsx
        actions.ts               updateRole / toggleActive / addWorkType / toggleWorkTypeActive
        _components/             UserTable, WorkTypeManager
      year-end-plan/             manager/owner-only
        page.tsx  loading.tsx
        actions.ts               saveYearEndPlan
        _lib/                    yearEndPlanMath, planSchema (+ tests)
        _components/             YearEndPlanClient, PlanStatFields
    login/
      page.tsx
      LoginPageClient.tsx        Google OAuth button (hd=NEXT_PUBLIC_ALLOWED_DOMAIN) + dev login
    auth/callback/route.ts       OAuth code exchange + domain check + first-login profile creation
    page.tsx                     redirects to /dashboard
    layout.tsx
    not-found.tsx
    globals.css                  Tailwind + shadcn theme variables (light + dark)
  components/
    ui/                          shadcn primitives only — button, card, dialog, input, select,
                                 sheet, skeleton, switch, table, tabs, textarea, tooltip, etc.
    custom/                      AddWorkTypeDialog, BrandLogo, ChartTooltipContent, CurrencyInput,
                                 RoofTypeBadge, SoldBadge
  lib/
    actions.ts                   ServerActionResult, requireActiveAccount, requireRole
    metrics.ts                   METRICS_REGISTRY + computeMetricValue / buildMetricSeries
    dashboardJobs.ts             fetchAllDashboardJobs — pages past PostgREST's "Max rows" limit
    formatters.ts                formatCurrency / formatDate / EMPTY / MONTHS_SHORT / etc.
    env.ts                       validated Supabase env vars (throws with the var name if missing)
    brand.ts  chartColors.ts  workTypes.ts  utils.ts
    authorization/
      roles.ts                   isOwner / isManagerOrOwner (role-only checks)
      jobPermissions.ts          canUserModifyJob / canChangeSalesperson (role + ownership)
    supabase/
      server.ts                  createClient() — server-side, cookie-aware
      client.ts                  createClient() — browser-side
      getProfile.ts              getProfile (cached) + requireActiveProfile
  hooks/use-mobile.ts
  types/
    database.types.ts            generated from Supabase
    index.ts                     type aliases (Profile, Job, JobRow, DashboardJob, YearEndPlan, ...)
                                 + WithRequired wrapper for view-column nullability
  proxy.ts                       Next.js 16 proxy (formerly "middleware") — see "Auth flow" below
e2e/                             Playwright specs — login, create-job, permissions, year-end-plan
scripts/
  seed.ts                        deterministic test/demo data — npm run db:seed
supabase/
  migrations/                    schema, RLS policies, year_end_plans
  seed.sql                       divisions / work_types reference data (applied by `supabase db reset`)
```

## Routes

| Path              | Auth                                | Notes                                                                                                                                                                                                                |
| ----------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`               | none                                | [redirects to /dashboard](../src/app/page.tsx)                                                                                                                                                                       |
| `/login`          | none                                | Google OAuth via [LoginPageClient.tsx](../src/app/login/LoginPageClient.tsx)                                                                                                                                         |
| `/auth/callback`  | none                                | [route.ts](../src/app/auth/callback/route.ts) — exchanges OAuth code, validates domain, creates profile on first login                                                                                               |
| `/dashboard`      | active profile                      | [page.tsx](<../src/app/(app)/dashboard/page.tsx>)                                                                                                                                                                    |
| `/jobs`           | active profile                      | [page.tsx](<../src/app/(app)/jobs/page.tsx>) — filters/sort/pagination via URL params: `sort`, `dir`, `per_page`, `page`, `sold`, `division_id`, `salesperson_id`, `work_type_id`, `date_from`, `date_to`, `address` |
| `/jobs/new`       | active profile                      | [page.tsx](<../src/app/(app)/jobs/new/page.tsx>)                                                                                                                                                                     |
| `/jobs/[id]`      | active profile                      | [page.tsx](<../src/app/(app)/jobs/%5Bid%5D/page.tsx>) — read-only detail                                                                                                                                             |
| `/jobs/[id]/edit` | active profile + `canUserModifyJob` | [page.tsx](<../src/app/(app)/jobs/%5Bid%5D/edit/page.tsx>)                                                                                                                                                           |
| `/admin`          | `role === "owner"`                  | [page.tsx](<../src/app/(app)/admin/page.tsx>)                                                                                                                                                                        |
| `/year-end-plan`  | `isManagerOrOwner`                  | [page.tsx](<../src/app/(app)/year-end-plan/page.tsx>)                                                                                                                                                                |

The `(app)` group layout at [src/app/(app)/layout.tsx](<../src/app/(app)/layout.tsx>) calls `requireActiveProfile()` so every authenticated route is guarded by it.

## Server actions

All mutations go through server actions. No API routes. Every action returns
`ServerActionResult` from [src/lib/actions.ts](../src/lib/actions.ts) — see "Shared helpers" below
for the shape and the two shared guards every action calls first.

**[src/app/(app)/jobs/actions.ts](<../src/app/(app)/jobs/actions.ts>)**

```ts
createJob(payload: JobInsert & { pending_work_type: PendingWorkType | null }): Promise<ServerActionResult>
updateJob(payload: JobUpdate & { pending_work_type: PendingWorkType | null }, id: string): Promise<ServerActionResult>
setJobExcludeFromQuoteMetrics(jobId: string, exclude: boolean): Promise<ServerActionResult>
deleteJob(jobId: string): Promise<ServerActionResult>
```

Internal helpers in the same file: `getAuthContext()`, `requireJobModifyPermission()` (wraps
`canUserModifyJob`, called by `updateJob`/`setJobExcludeFromQuoteMetrics`/`deleteJob`),
`insertPendingWorkType()` (inserts a new work_type inline when the job form submits one alongside
the job, revalidates `/admin`). `createJob`/`updateJob` stamp/preserve `entered_by` server-side so
it can't be spoofed.

**[src/app/(app)/admin/actions.ts](<../src/app/(app)/admin/actions.ts>)**

```ts
updateRole(userId: string, role: Role): Promise<ServerActionResult>
toggleActive(userId: string, isActive: boolean): Promise<ServerActionResult>
addWorkType(name: string, is_roof_type_required: boolean): Promise<ServerActionResult>
toggleWorkTypeActive(id: string, isActive: boolean): Promise<ServerActionResult>
```

All gated by `requireRole(isOwner, "...")`. `updateRole` validates the role value against the
real enum with `zod` before writing.

**[src/app/(app)/year-end-plan/actions.ts](<../src/app/(app)/year-end-plan/actions.ts>)**

```ts
saveYearEndPlan(input: unknown): Promise<ServerActionResult>
```

Gated by `requireRole(isManagerOrOwner, "...")`. Input is `unknown` and re-validated with `zod`
server-side (`planSchema.ts`) — unlike other actions, which trust the client's declared TS type —
because this writes to a single shared company row. See [DESIGN.md](DESIGN.md) for why.

## Data model

Generated types live in [src/types/database.types.ts](../src/types/database.types.ts). Convenience aliases in [src/types/index.ts](../src/types/index.ts).

**Tables**

- `profiles` — `id` (uuid, from auth), `email`, `full_name`, `is_active`, `role` (`salesperson | manager | owner`), `created_at`
- `divisions` — `id`, `name`, `is_active`, `created_at`
- `work_types` — `id`, `name`, `is_active`, `is_roof_type_required`, `created_at`
- `jobs` — `id`, `job_address`, `notes`, `division_id` → divisions, `work_type_id` → work_types, `salesperson_id` → profiles, `entered_by` → profiles, `roof_type` (`reroof | newroof`, nullable), `date_quoted` (NOT NULL), `date_sold` (nullable), `sold`, `exclude_from_quote_metrics`, `squares`, `days`, `materials`, `labour`, `disposal`, `warranty`, `other`, `gutters`, `actual_materials`, `actual_labour`, `actual_disposal`, `actual_warranty`, `actual_other`, `actual_gutters`, `sales_price`, `total_job_cost`, `mgn`, `markup_pct`, `date_entered`, `updated_at`
- `year_end_plans` — `year` (int, PK), `target_revenue`, `revenue_override`, `jobs_sold_override`, `avg_job_value_override`, `conversion_pct_override`, `months_remaining_override` (int, 1–12), `created_at`, `updated_at`, `updated_by` → profiles. All six value columns nullable — see [DESIGN.md](DESIGN.md) for the sparse-override design.

**View — `jobs_with_calculations`**

All `jobs` columns plus joined names (`division_name`, `salesperson_name`, `entered_by_name`, `work_type_name`, `is_roof_type_required`) plus computed (`dollar_per_square`, `mgn_per_day`, `ee_mgn_per_day`, `total_cost_percent`, `actual_total_job_cost`).

**Always query this view, never the raw `jobs` table.**

Postgres views cannot carry NOT NULL constraints, so every column comes back nullable in the generated types even when the base column is NOT NULL. The fix: [src/types/index.ts](../src/types/index.ts) exports `WithRequired<T, K>` and a `JobWithCalculations` alias that re-applies the NOT NULL guarantees for the columns that actually are. Cast at the query boundary:

```ts
const jobs = (rawJobs ?? []) as JobRow[]
```

See [src/app/(app)/jobs/page.tsx](<../src/app/(app)/jobs/page.tsx>) for the canonical example. Subset aliases already defined: `JobRow` (jobs table UI), `DashboardJob` (dashboard + year-end-plan), `JobFormDefaults` (edit form prefill, from the raw `Job` table type — already accurate, no cast needed there).

**Enums**

- `user_role` — `"salesperson" | "manager" | "owner"`
- `job_roof_type` — `"reroof" | "newroof"`

**RLS helper functions (in DB)** — used by policies, not called from app code: `is_active_user()`, `is_manager()`, `is_manager_or_owner()`, `is_owner()`. Mirrored on the app side (name-for-name) by `src/lib/authorization/roles.ts`, so a page gate reads the same as the policy backing it.

## Shared helpers

**Server action contract & guards** — [src/lib/actions.ts](../src/lib/actions.ts)

```ts
type ServerActionResult = { success: true; id: string } | { success: false; error: string }

requireActiveAccount(profile: Profile | null): { ok: true; profile: Profile } | { ok: false; result: ServerActionResult }
requireRole(predicate: (profile: Profile) => boolean, message: string): same shape as above
```

Every server action calls one of these first. See [DESIGN.md](DESIGN.md) for why actions never throw.

**Profile / auth** — [src/lib/supabase/getProfile.ts](../src/lib/supabase/getProfile.ts)

```ts
getProfile(): Promise<Profile | null>          // React.cache()-wrapped; deduped per request
requireActiveProfile(): Promise<Profile>       // redirects to /login or /login?reason=deactivated
```

Never query the `profiles` table directly from a page — always go through `getProfile()` so the request-scoped cache works.

**Authorization** — [src/lib/authorization/roles.ts](../src/lib/authorization/roles.ts) and [jobPermissions.ts](../src/lib/authorization/jobPermissions.ts)

```ts
isOwner(profile: Pick<Profile,"role">): boolean
isManagerOrOwner(profile: Pick<Profile,"role">): boolean

canUserModifyJob(profile: Profile, salespersonId: string | null): boolean
  // true if profile.role is owner|manager, or profile.id === salespersonId
canChangeSalesperson(profile: Profile): boolean
  // delegates to isManagerOrOwner
```

`canUserModifyJob` is called both before showing edit/delete UI **and** server-side inside `updateJob`/`setJobExcludeFromQuoteMetrics`/`deleteJob` (via `requireJobModifyPermission`). RLS enforces the identical rule at the DB layer as a second, independent gate.

**Metrics** — [src/lib/metrics.ts](../src/lib/metrics.ts)

```ts
METRICS_REGISTRY                                              // single source of truth — see DESIGN.md
computeMetricValue(jobs, metric, year): number                // one scalar, for summary cards
buildMetricSeries(jobs, metric, mode): MetricSeries            // month-by-year rows, for the chart
isCrossYearCarryover(job): boolean
isIncludedInDashboard(job): boolean
```

**Dashboard job fetch** — [src/lib/dashboardJobs.ts](../src/lib/dashboardJobs.ts)

```ts
fetchAllDashboardJobs(supabase): Promise<DashboardJob[]>
```

Pages through `jobs_with_calculations` in 1000-row batches — PostgREST's "Max rows" setting (default 1000, project-level, not part of a DB dump/clone) silently truncates a single unpaged `.select()`, which would skew every dashboard and year-end-plan number. Shared by both consumers; don't hand-roll a second query.

**Env vars** — [src/lib/env.ts](../src/lib/env.ts)

```ts
SUPABASE_URL: string
SUPABASE_PUBLISHABLE_KEY: string
```

Validated at import time — throws naming the missing var, rather than the generic crash a bare `process.env.X!` assertion produces.

**Styling** — [src/lib/utils.ts](../src/lib/utils.ts)

```ts
cn(...inputs: ClassValue[]): string            // clsx + tailwind-merge
```

**Error surfacing** — server actions currently return `error.message` from Supabase's error object directly, unwrapped. No `parseSupabaseError()` or similar exists (and nothing in the codebase references one).

## Auth flow

1. User hits `/login` → clicks the Google button in [LoginPageClient.tsx](../src/app/login/LoginPageClient.tsx). The button passes `hd=$NEXT_PUBLIC_ALLOWED_DOMAIN` to scope the OAuth picker to the company domain.
2. Google redirects to `/auth/callback?code=…`. The [route handler](../src/app/auth/callback/route.ts) exchanges the code for a session, re-validates the email domain server-side, and creates a `profiles` row on first login.
3. Redirect to `/dashboard`. From here every `(app)` route is guarded by `requireActiveProfile()` in the group layout.
4. **Deactivation**: an owner sets `is_active = false`. On the deactivated user's next request, `requireActiveProfile()` calls `supabase.auth.signOut()` and redirects to `/login?reason=deactivated`.

`/auth/callback` is reached **only** via a Google OAuth redirect. The dev login form
(`NEXT_PUBLIC_DEV_MODE=true`, hard-gated off `NODE_ENV`) signs in directly with
`signInWithPassword` and never touches this route. See [DESIGN.md](DESIGN.md) for the two-layer
domain check rationale.

### Proxy (`src/proxy.ts`)

Next.js 16 renamed the `middleware.ts` file convention to [`proxy.ts`](https://nextjs.org/docs/messages/middleware-to-proxy) — same idea, runs on every matched request before pages or route handlers. Exported function is `proxy` (was `middleware`); matcher config unchanged. Node.js runtime only (no edge support in proxy).

Does three things every request: refreshes the session via `supabase.auth.getUser()` (never
`getSession()` — see DESIGN.md for why), redirects unauthenticated users to `/login`, and bounces
logged-in users away from `/login`/`/auth`. The matcher excludes `_next/static`, `_next/image`,
`favicon.ico`, and image extensions so static assets bypass it. This is the first line of defense
— `requireActiveProfile()` in the `(app)` layout is the second, and is the only one of the two
that also handles deactivation.

## Conventions

From [CLAUDE.md](../CLAUDE.md), with details:

- **Server components by default**, `"use client"` only when interactivity demands it
- **All mutations via server actions** — no API routes
- **All job queries hit `jobs_with_calculations`** — never the raw `jobs` table
- **`getProfile()` is the only entry point for the current user's profile** — never query `profiles` directly in a page
- **`requireActiveProfile()` in every authenticated page or layout**
- **`canUserModifyJob()` before showing edit/delete UI and again inside the server action itself**
- **Dropdowns**: filter `is_active = true` for divisions, work_types, and profiles
- **Inactive-but-referenced dropdown items**: [`getJobFormData(opts)`](<../src/app/(app)/jobs/_lib/getJobFormData.ts>) accepts optional IDs and uses `.or()` to also include the legacy item the job currently references, so the form can display deactivated values without breaking
- **Component prop types**: `Pick<Type, "col">` only — never redefine an interface that duplicates a DB type
- **Errors**: inline toast state via `sonner`. No `alert()`. Server actions surface `error.message` directly (no wrapper).

**Code style** (from [.prettierrc.json](../.prettierrc.json) + [eslint.config.mjs](../eslint.config.mjs))

- No semicolons, double quotes, trailing commas, `(x) =>` parens, 100-col line width
- `simple-import-sort` orders imports/exports
- Pre-commit hook via husky + lint-staged

## Testing

- **Vitest**: `*.test.ts` co-located with the code it covers — e.g.
  `src/app/(app)/year-end-plan/_lib/yearEndPlanMath.test.ts`,
  `src/app/(app)/jobs/_lib/jobFormSchema.test.ts`, `src/lib/metrics.test.ts`,
  `src/lib/authorization/jobPermissions.test.ts`. Pure logic only — no DOM, no network.
- **Playwright** (`e2e/`): `login.spec.ts`, `create-job.spec.ts`, `permissions.spec.ts` (the
  role-access matrix), `year-end-plan.spec.ts`. Runs against a local Supabase instance seeded by
  `npm run db:seed`.
- See [DESIGN.md](DESIGN.md) § Testing strategy for why the suite is organized this way.

## CI/CD & backups

- `.github/workflows/ci.yml` — on every PR and push to `main`: `lint`, `typecheck`,
  `format:check`, `test`, `build` in one job; a second job boots local Supabase and runs
  `test:e2e`.
- Deploys are handled by Vercel's GitHub integration, which builds and promotes `main`.
- Production database backups run nightly in a separate private repo, not this one.

## Env vars

All public; no service-role key in this repo (the seed script uses one, kept in a
git-ignored `scripts/.env.local` — see `scripts/.env.example`).

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ALLOWED_DOMAIN` — used by the callback server check
- `NEXT_PUBLIC_DEV_MODE` — enables the dev email/password login form (also hard-gated off `NODE_ENV`)
- `NEXT_PUBLIC_MAPBOX_TOKEN`

See [.env.example](../.env.example) for the app and [scripts/.env.example](../scripts/.env.example) for
the seed script.

## Commands

```bash
npm run dev                    # local dev server
npm run build                  # production build
npm run lint                   # eslint
npm run typecheck              # tsc --noEmit
npm run test                   # vitest run
npm run test:watch             # vitest, watch mode
npm run test:e2e               # playwright test
npm run db:seed                # seed local Supabase — see scripts/seed.ts
npm run format                 # prettier --write .
npm run format:check           # prettier --check .

supabase gen types typescript --project-id <id> > src/types/database.types.ts
```

## Where to put new code

| You're adding...                     | Goes in                                                              |
| ------------------------------------ | -------------------------------------------------------------------- |
| A new authenticated route            | `src/app/(app)/<feature>/page.tsx`                                   |
| A new public route                   | `src/app/<feature>/page.tsx`                                         |
| A server action for that route       | `src/app/(app)/<feature>/actions.ts` (colocated)                     |
| A component used only by one route   | `src/app/(app)/<feature>/_components/`                               |
| A data loader used only by one route | `src/app/(app)/<feature>/_lib/`                                      |
| A shared UI primitive (shadcn-style) | `src/components/ui/`                                                 |
| A shared helper across features      | `src/lib/<area>/`                                                    |
| A new derived type                   | `src/types/index.ts` (alias on top of generated `database.types.ts`) |
