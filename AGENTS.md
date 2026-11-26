<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Not managed by Lovable any more: schema changes are
  repository-managed SQL migrations. Follow "Database" below. Do not add `drizzle/`.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Do not put secret values in the repo. Database secrets: see "Database" below.
<!-- LOVABLE:END -->

## Database (repository-managed migrations)
Decision, 26 Nov 2026: schema changes no longer go through Lovable. Full guide: `docs/database.md`.
- **Source of truth.** `supabase/migrations/*.sql`, applied in filename order. Never change a shared database by hand (dashboard SQL editor, table editor): every schema change, and every change to shared reference rows such as the Demo Center, is a new migration file. Why: an untracked change can't be reviewed, reproduced or rolled forward.
- **Create.** `npx supabase migration new <snake_case_name>` adds `supabase/migrations/<UTC timestamp>_<name>.sql`. Never edit, rename or delete a migration once it has been applied to staging or production; add a new one.
- **Apply.** Locally: `npx supabase start` (first run) or `npx supabase db reset` (rebuild from zero). Hosted: `npx supabase link --project-ref <ref>`, then `npx supabase db push --dry-run`, then `npx supabase db push`. Staging first, production after the checks below pass.
- **History.** Each database records applied migrations in `supabase_migrations.schema_migrations`. `npx supabase migration list` compares the repo with a linked project. Git (one reviewed commit or PR per migration) is the change log.
- **Verify.** Before merging: `bun run test` (PGlite policy tests) and `npx supabase db reset` locally. After applying to a hosted project: `bun scripts/rls-integration.ts` with two real test users in separate centers, `npx supabase migration list` (repo and remote match), and `npx supabase db diff --linked` (must be empty, so nothing untracked exists).
- **Every table** enables row-level security in the migration that creates it, with explicit grants, PGlite tests in `src/lib/db/rls.test.ts` and checks in `scripts/rls-integration.ts`.
- **Secrets.** The browser only gets `VITE_MARKEZLY_BACKEND=supabase`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (public by design; RLS protects data). The service-role/secret key, database password and `SUPABASE_ACCESS_TOKEN` never go in the repo, in any `VITE_` variable, or in browser code: they stay in the Supabase dashboard and the maintainers' password manager (CI secrets if migrations are ever deployed from CI). Local values go in `.env.local` (git-ignored); see `.env.example`.
- **Demo seed.** `20261126000200_demo_center_seed.sql` is generated from `src/lib/data.ts` by `bun scripts/gen-demo-seed.ts`, and a test fails if they differ. Once it is applied to a shared database, changing the sample data needs a new migration, not a regenerated seed. Customer centers are never seeded: `create_center()` adds no sample rows.
- **Not yet in the database (Phase 2):** the ledger and attendance. Don't migrate them without a plan update in `docs/backend-plan.md`.

## Finance
- Overview display selectors stay in `overview-display.ts` and never calculate money; attendance deep links select an existing class/date without changing posting rules.
- Center metadata and sample actor identity come from `center-config.ts` in the demo; a signed-in member's center and name come from `useWorkspace`. Screens read both through `useLedger()` (`centerName`, `currentUser`) so displayed and recorded identities agree.
- Presentation formatting lives in `format.ts`; `Money` and localization helpers delegate to it, without changing ledger calculations.
- The shell command search uses the ledger store's live students and read-only class catalog; sidebar preference is hydrated after mount to avoid SSR mismatches.
- Every money figure (KPIs, finance cards, method breakdowns, student balances, teacher % payouts) is computed from the ledger in `src/lib/ledger.ts` via `useFinance`/`useLedger`; never hardcode totals. Why: hardcoded KPIs drifted from the transaction list.
- The ledger is append-only: corrections add a Reversal (with reason) and optionally a replacement payment; completed entries are never edited and IDs are never reused. Why: audit trail.
- Overview and Finance share one period + branch filter from `LedgerProvider`. Why: both screens must show the same numbers.
- Until the ledger is saved to the database, it is in-memory data and the UI must say so. A real center's ledger starts empty (never the sample ledger), and balance sorting stays off. Why: never imply a payment reached a real ledger, and never show sample money against real students.
