# Vantage Roofing — Sales Tracker

A Next.js + Supabase app for tracking roofing quotes and sold jobs, replacing a spreadsheet
workflow. Salespeople log jobs; managers and owners get a dashboard of quoted/sold metrics and a
Year-End Activity Plan that back-solves how much quoting activity is needed to hit a revenue
target.

For the full structural map (routes, data model, server actions) see [ARCHITECTURE.md](docs/ARCHITECTURE.md).
For the _why_ behind auth, the metrics registry, and the year-end plan design, see [DESIGN.md](docs/DESIGN.md).

## Stack

Next.js 16 (App Router) · TypeScript · Supabase (Postgres + RLS) · Tailwind + shadcn/ui ·
react-hook-form + zod · Vitest + Playwright · Vercel

## Getting started

Requires Node 22 and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
git clone https://github.com/vikramsodhan/Vantage-Roofing-Project-Demo.git
cd Vantage-Roofing-Project-Demo
npm install

cp .env.example .env.local
cp scripts/.env.example scripts/.env.local
```

Fill in `.env.local` with a Supabase project's URL/key and a Mapbox token. For local development
against a Supabase instance running on your machine instead of a hosted project:

```bash
supabase start          # boots local Postgres + Auth + API, applies migrations + seed.sql
npm run db:seed         # deterministic test data — owner/manager/salesperson users + ~400 jobs
npm run dev
```

`supabase start` prints local API URL and keys — use those in `.env.local` for local dev.

## Commands

| Command                | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Start the dev server                          |
| `npm run build`        | Production build                              |
| `npm run start`        | Start a production build                      |
| `npm run lint`         | ESLint                                        |
| `npm run typecheck`    | `tsc --noEmit`                                |
| `npm run test`         | Run the Vitest suite once                     |
| `npm run test:watch`   | Vitest in watch mode                          |
| `npm run test:e2e`     | Run Playwright end-to-end tests               |
| `npm run db:seed`      | Seed a local Supabase instance with test data |
| `npm run format`       | Prettier — write                              |
| `npm run format:check` | Prettier — check only                         |

## Testing

Unit tests (`npm run test`) are pure logic — no database or browser needed. End-to-end tests
(`npm run test:e2e`) need a local Supabase instance running and seeded first:

```bash
supabase start
npm run db:seed
npm run test:e2e
```

See [DESIGN.md](docs/DESIGN.md) § Testing strategy for how the suite is organized and why.

## CI/CD

Every PR and push to `main` runs lint, typecheck, format check, unit tests, a build, and the
Playwright suite against a local Supabase instance — see
[ci.yml](.github/workflows/ci.yml). Deploys are handled by Vercel's GitHub integration on `main`.
