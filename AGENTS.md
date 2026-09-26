<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Floss

A dental practice's front desk: Dashboard, Calendar, Appointments, Patients, Staff, Payments and
Settings, every sheet and form writing to Postgres. Synthetic data only, never real patient information. If
`NOTES.local.md` exists, read it first: it holds the working notes and decisions that aren't committed.

## Commands

- `pnpm bootstrap`: sets the app up on a Mac with Postgres.app (env, database, migrations, seed, browsers).
- `pnpm dev`: http://localhost:3001. One dev server at a time.
- `pnpm check`: typecheck, lint, format, unused code, unit tests. Run it before every commit.
- `pnpm test:e2e`: every page in Playwright with axe, desktop and phone, against a production build on :3101.
- `pnpm db:generate` after a schema change, read the SQL in `drizzle/`, then `pnpm db:migrate`. Never
  `drizzle-kit push`. `pnpm db:seed` wipes and reseeds the practice around today.

## How the code is laid out

- `src/app/(app)/<page>/`: the pages, each with its context panel in the parallel `@panel` slot. The layout loads
  the practice (`components/shell/practice.tsx`) and draws the rail, Search, the bell and the sheet host.
- `src/app/actions/<area>.ts`: server actions, built from `authActionClient` (`lib/safe-action.ts`). Writes go
  through `writeAndRefresh` (`actions/shared.ts`): one transaction behind an advisory lock, a `Refused` comes back as
  `{ ok: false, error }`, then the layout revalidates. The page reads results with `outcome()` (`lib/action-result.ts`).
- `src/db/`: `schema.ts`, `index.ts` (`pg` with `attachDatabasePool`), `queries/<area>.ts` for reads, the seed.
- `src/lib/`: pure logic, a `.test.ts` beside every module. `env.ts` holds every env
  var; add new ones there and to `.env.example`.
- `src/components/ui/`: shadcn's components and the vendored ones built on them (data grid, filters, event
  calendar, kanban, stepper, timeline, frame). `components/shell/`: the app frame. `components/shared/`: pieces
  used across pages. One folder per page for the rest. `components/sheets/`: every sheet and dialog, opened from
  anywhere with `openSheet({ kind, … })` (`hooks/use-sheet.ts`).
- Tests: `*.test.ts` beside the code (Vitest on real Postgres: each file gets its own copy of a migrated
  template); `e2e/*.spec.ts` (Playwright; add a page to `e2e/routes.ts`).

## Rules

- **Auth is checked where data is read or written**, never only in `proxy.ts`: queries and pages call
  `requireUser()`, every action comes from `authActionClient` with a Zod input schema. Refusals the user should
  read are returned, never thrown.
- **One clock.** Dates only through `src/lib/dates.ts`, which reckons in the practice's zone (America/Denver)
  whatever zone the server or browser runs in. "Now" is `await clinicNow()` on the server or `useNow()` in the
  browser, never `Date.now()`. A seeded day starts at 11:24 and runs in real time.
- **UI from components.** Compose screens from `components/ui/` (shadcn on Base UI: custom triggers use `render`,
  not `asChild`). Color through the theme tokens in `src/app/globals.css`; raw Tailwind hues live only in
  `src/lib/tones.ts`. Contrast meets WCAG AA.
- The React Compiler memoizes: no `useMemo`/`useCallback` except where an effect needs a stable value. Vendored
  files that wrap TanStack Table or dnd-kit keep `"use no memo"`.
- A new table's migration adds `select watch_writes('<table>')`, so open pages refresh after a write.

## Working

- Before calling UI work done, look at it in the browser at 1440 wide and on a phone, light and dark, and try every
  control. Before any commit, `pnpm check` passes.
- Conventional Commits (`feat(calendar): …`), one change per commit, staged by path. Never push or deploy:
  the owner does both (Vercel with Neon, `docs/deployment.md`).
