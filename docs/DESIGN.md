# Design

Companion to [ARCHITECTURE.md](ARCHITECTURE.md). ARCHITECTURE.md is the structural map — what
exists and where. This is the _why_ — the product context and design decisions behind it, plus
the longer explanations that used to live as comment blocks in the code.

## Product overview

Vantage Roofing's sales tracker replaces a spreadsheet-based workflow for tracking roofing
quotes and sold jobs. A job starts as a **quote** (`date_quoted` set, `date_sold` empty) and
becomes **sold** once `date_sold` is set. The dashboard aggregates quoted vs. sold jobs into
revenue, conversion, and margin metrics per year.

Three roles, increasingly privileged:

- **Salesperson** — can view and edit their own jobs.
- **Manager** — can view and edit every job, plus the dashboard and the Year-End Activity Plan.
- **Owner** — everything a manager can do, plus `/admin` (user roles, active status, work types).

## Auth & session model

Login is Google OAuth only, restricted to the company domain **twice**: the `hd` query param on
the client narrows Google's own account picker (cosmetic — a technically savvy user could strip
it from the OAuth request), and `auth/callback/route.ts` re-validates the email domain
server-side after the session exists. The server-side check is the real enforcement; the `hd`
param just makes the common path pleasant.

Two Supabase clients exist because browser and server session persistence work differently:
`lib/supabase/client.ts` for Client Components (the browser handles cookies automatically), and
`lib/supabase/server.ts` for Server Components/Actions (cookies must be read/written manually via
`next/headers`, since there's no browser to do it).

`proxy.ts` runs on every request and validates the session with `supabase.auth.getUser()` —
never `getSession()`, which only reads the local cookie without re-verifying it against
Supabase's servers. It redirects unauthenticated users to `/login` and bounces authenticated
users away from `/login`/`/auth`. **Deactivation is not handled here** — the proxy only knows
"is there a valid session," not "is this account still active." That's `requireActiveProfile()`
in the `(app)` group layout: it signs out and redirects any user whose profile has
`is_active = false`, on their next request after being deactivated.

**Dev login** is an email/password form gated by `NEXT_PUBLIC_DEV_MODE=true`, additionally
hard-gated off `NODE_ENV !== "production"` so it can never appear in a production build
regardless of how the flag is set on Vercel. It signs in directly with `signInWithPassword` and
never touches `/auth/callback` — that route is reached only via a Google OAuth redirect.

## Server actions over API routes

All mutations go through Next.js Server Actions (`"use server"` files), not API routes.
`await createJob(data)` reads like a normal function call from a client component, but Next.js
handles the network round-trip, and Supabase credentials never reach the browser.

The shared contract is `ServerActionResult = { success: true; id: string } | { success: false;
error: string }`. Actions never throw to the client — a thrown error doesn't reach a client
component cleanly, so every action catches and returns `{ success: false }` instead.

`requireActiveAccount()` and `requireRole()` (`src/lib/actions.ts`) are the two shared guards
every action calls first: the former checks there's a logged-in, active account; the latter adds
a role predicate (`isOwner`, `isManagerOrOwner`) on top. Every action re-checks these
**server-side**, even though the UI already hides the button that would trigger it — a server
action is directly callable over the network regardless of what's rendered, so the UI gate is
convenience, not security. RLS policies back up the same rules at the database layer as a second,
independent gate (see `jobs`' insert/update/delete policies for the ownership check that mirrors
`canUserModifyJob()`).

## Authorization: role vs. ownership

Two separate questions get asked in different places: "what can this _role_ do" (`isOwner`,
`isManagerOrOwner` in `lib/authorization/roles.ts`, mirroring the SQL RLS helpers name-for-name)
and "can this _specific person_ touch this _specific record_" (`canUserModifyJob` in
`lib/authorization/jobPermissions.ts`: true for any manager/owner, or for the job's own
salesperson). Keeping these separate means a role check never has to smuggle in ownership logic,
and vice versa.

## The metrics registry

`METRICS_REGISTRY` in `src/lib/metrics.ts` is the single source of truth for every dashboard
metric — the `MetricId` union, the summary cards, and the chart's metric picker are all derived
from its keys. Adding a metric here is the only step needed; there is no second place to keep in
sync.

Each metric is one or two `MetricSpec`s (a numerator, optionally a denominator). A spec is
self-contained: which jobs count (`includes`), how much each contributes (`amount`), and which
date column buckets it (`dateField`). Because the two specs of a ratio can use different date
columns, `conversion_jobs` reads exactly as it should: numerator = sold jobs bucketed by
`date_sold`, denominator = quoted jobs bucketed by `date_quoted`.

**Worked example — why `avg_job_value` can't drift from `sold_revenue` / `sold_jobs`:**

```
avg_job_value:
  numerator:   { dateField: "date_sold", includes: isSold, amount: salesPrice }
  denominator: { dateField: "date_sold", includes: isSold, amount: countOne }
```

These are the _exact same specs_ `sold_revenue` and `sold_jobs` use. `resolveValue()` divides
numerator by denominator, so `avg_job_value` is `sold_revenue ÷ sold_jobs` by construction — not
two independently-maintained numbers that happen to agree today, but one metric defined as the
other two's quotient. They cannot drift apart without a code change that would affect all three
identically.

**The cross-year carry-over rule.** Historical spreadsheet data was migrated in as pairs of rows
for any job quoted in one year and sold in the next: a prior-year quote-side row and a same-year
sold-side row, both flagged `exclude_from_quote_metrics`. `isCrossYearCarryover()` identifies
these (sold + flagged + quote year before sold year) so the migrated quote-side row isn't
double-counted on the quote side — it still counts on the sold side.

The flag is what keeps _future_ data correct, not the date comparison alone. A job entered
through the app today, quoted in December and sold the following January, has the flag **FALSE**
by default (only the one-time migration ever set it TRUE) — so it keeps counting in its quote
year normally, and `isCrossYearCarryover` correctly returns `false` for it. Without the flag
gate, a bare "quote year < sold year" check would misclassify every genuine forward-entered
cross-year deal as a carry-over and silently drop it from the quote side.

Longer term, if jobs are ever grouped by property/address, the twin rows could be combined into
a single job with history instead — at which point the carry-over concept goes away entirely.

## Year-End Activity Plan

Stakeholders ran year-end planning in a spreadsheet: a "Current Performance" block (Revenue,
Jobs Sold, Avg Job $, Conversion Rate) and a target block that back-solves how much quoting
activity is needed to hit a revenue goal. `/year-end-plan` (manager/owner only) brings this into
the app.

- **Sparse overrides.** `year_end_plans` has six nullable value columns; `null` means "keep
  tracking the live computed value," anything else is a frozen override. In the UI, an _empty
  input is the null_ — there's no parallel "is this overridden" flag that could drift out of
  sync with the value, because the field's own emptiness is the source of truth.
- **One shared company row per year**, keyed by `year`, not per-user — last write wins, made
  visible via a "last saved by X at Y" stamp rather than hidden.
- **Four gate layers**: nav visibility (`Sidebar`'s `NavItem.isVisible`), the page's own
  `requireActiveProfile()` + `isManagerOrOwner()` redirect, the server action's
  `requireRole(isManagerOrOwner, …)` check, and RLS policies on `year_end_plans`. The first two
  are UI convenience; the last two are the actual enforcement — either one alone still blocks a
  request that skips the UI entirely.
- **Explicit Save, not autosave.** The row is shared across every manager/owner, so autosave
  would broadcast every keystroke to whoever else has the page open, and blur the line between
  exploring a what-if and committing the company's plan. Save is the commit boundary.
- **`monthsRemainingInYear(today)` takes `today` as a parameter**, not `new Date()` internally —
  dependency injection so tests can pin the calendar at Jan/Aug/Dec boundaries instead of only
  being correct on the day they happen to run. `monthRangeLabel` counts _forward_ from today,
  clamped at December (never wrapping into next year), so overriding "months remaining" down to
  2 reads as "what pace do I need over just the next two months" without ever silently
  describing a different year.

## Testing strategy

- **Vitest** owns pure logic: co-located `*.test.ts` next to the code it covers
  (`yearEndPlanMath.test.ts`, `planSchema.test.ts`, `metrics.test.ts`, `jobPermissions.test.ts`,
  and others) — no DOM, no network, fast.
- **Playwright** (`e2e/`) owns cross-cutting flows that only make sense against a running app and
  a real database: login, job CRUD, and the role-permission matrix.
- `e2e/permissions.spec.ts`'s access tests log in **once per role** and check every gated surface
  in that one session, rather than a role × surface matrix of independent tests — signing in is
  the slowest part of an E2E run, and a matrix would pay that cost per cell. Each gated surface is
  checked two ways: the nav link is hidden (convenience, proves nothing alone) _and_ a direct
  `page.goto()` to the URL is turned away (the actual gate).
- `scripts/seed.ts` seeds with a **fixed faker seed**, so the same run produces the same data
  every time. E2E assertions rely on relative behavior (a value changes when overridden) rather
  than exact numbers that would drift with wall-clock time; exact-number assertions live in
  Vitest instead, pinned against a fixed `today`.
- A `database rules` describe block in `permissions.spec.ts` runs a small number of **cheap,
  non-exhaustive** RLS/server-action sanity checks directly against Supabase, bypassing the UI —
  confirming the shared year-end plan really is manager/owner-only at the database layer, and
  that a salesperson genuinely cannot write another salesperson's job. These are a fast tripwire
  for policy regressions, not a complete RLS audit.

## Known trade-offs, accepted

- **Dec 31 UTC boundary on the year-end plan.** Vercel runs UTC; for a few hours around New
  Year's Eve (Pacific time), the page would show the next year's empty plan. Accepted — it's a
  handful of hours once a year on a page nobody opens that night, and the fix (a fixed company
  timezone) is more code than the bug is worth.
- **Concurrent edits on the shared year-end plan are last-write-wins**, made visible via the
  "last saved by / at" stamp rather than prevented. Acceptable for a small team; optimistic
  concurrency (reject the write on an `updated_at` mismatch, ask the user to reload) is the cheap
  upgrade if it ever actually causes a problem.
