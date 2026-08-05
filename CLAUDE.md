## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run test` / `npm run test:watch` — Vitest
- `npm run test:e2e` — Playwright (needs local Supabase running + seeded)
- `npm run db:seed` — seed local Supabase with test data
- `supabase gen types typescript --project-id <id> > src/types/database.types.ts` — regenerate types

## Stack

- Next.js 16.3 App Router, TypeScript, Supabase (PostgreSQL), Tailwind, shadcn/ui
- Vercel hosting, GitHub version control

## Architecture

- View docs/ARCHITECTURE.md for the structural map, docs/DESIGN.md for the why

## Conventions

- Pick<Type, "col"> for component prop types, never redefine interfaces
- Dropdowns filter is_active = true for divisions, work_types, and profiles
- No alert() — all errors as inline toast state

## Code style

Write code that already passes lint + Prettier — don't rely on auto-fixing after the fact. The configs are the source of truth; read them when in doubt rather than guessing:

- Prettier rules: `.prettierrc.json` (e.g. no semicolons, double quotes, trailing commas, `(x) =>` parens, 100-col)
- ESLint setup: `eslint.config.mjs` (`eslint-config-next` core-web-vitals + typescript, `eslint-config-prettier` last, `simple-import-sort` for import/export order)
- Check: `npm run lint`, `npm run typecheck`, `npm run format:check`
- Apply: `npm run format` (Prettier), `npx eslint --fix <file>` (import sort + fixable lint)
- Naming: explicit, descriptive identifiers; boolean state/props read as predicates (e.g. `isManualMode`)
- Avoid `any`; prefer the library's documented type. Don't add `// eslint-disable` to silence a fixable issue.
