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

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Database, migrations and secrets (repository-managed)
This section **supersedes the Lovable "Database" and "Secrets" rules above** (decision of 2026-11-25). The schema is owned by this repository, not by the Lovable editor. Full runbook: `supabase/README.md`.
- **Create** a migration as a new file `supabase/migrations/<UTC yyyymmddHHMMSS>_<snake_case_purpose>.sql`. Never edit a migration that has been applied anywhere; fix forward with a new one. Every table gets `center_id`, RLS enabled and policies `TO authenticated` only, in the same migration that creates it.
- **Apply** with the Supabase CLI against a linked project (`supabase link --project-ref <ref>`, then `supabase db push`). Apply to the test project first, production second. Do not use the dashboard SQL editor or table editor for schema or data changes: the database must never contain changes that are not in a migration.
- **History** is the `supabase_migrations.schema_migrations` table on each project plus git history of `supabase/migrations/`. `supabase migration list` must show local and remote in sync before and after every push.
- **Verify** every schema change with `npm test` (PGlite policy tests in `src/test/rls.test.ts` run every migration on a real PostgreSQL engine) and, before production, with the live RLS suite against the test project (`npm run test:rls-live`, see the runbook). PGlite results are not proof of Supabase security on their own.
- **Secrets**: only the project URL and the publishable (anon) key may reach the browser, as `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (gitignored) or the host's environment settings. Because Lovable cannot set build variables, these two public values are also committed in `.env.production` (read by `vite build`); nothing else may go in that file. The service-role key, database password and access tokens never enter the repo, `.env.example`, logs or client code. App code uses only the publishable key plus the signed-in user's JWT, so RLS applies to every query.
- **Tenancy**: users reach data only through `memberships`. Security-definer helpers (`is_center_member`, `has_center_role`, `create_center`) pin `search_path = public`. Customer centers are never seeded; sample data lives only in the dedicated Demo Center (`centers.is_demo`).

## Finance
- Overview display selectors stay in `overview-display.ts` and never calculate money; attendance deep links select an existing class/date without changing posting rules.
- Center name, branches and the signed-in user come from the center context (`src/lib/center-context.tsx`), loaded from Supabase; `center-config.ts` remains only for helpers and sample identity used by the demo seed.
- Students are persistent (Supabase) since Phase 1; classes, ledger and attendance are still in-memory demo data. The Demo Center reproduces the original sample students with their original `S-` codes so the demo ledger still matches them.
- Presentation formatting lives in `format.ts`; `Money` and localization helpers delegate to it, without changing ledger calculations.
- The shell command search uses the ledger store's live students and read-only class catalog; sidebar preference is hydrated after mount to avoid SSR mismatches.
- Every money figure (KPIs, finance cards, method breakdowns, student balances, teacher % payouts) is computed from the ledger in `src/lib/ledger.ts` via `useFinance`/`useLedger`; never hardcode totals. Why: hardcoded KPIs drifted from the transaction list.
- The ledger is append-only: corrections add a Reversal (with reason) and optionally a replacement payment; completed entries are never edited and IDs are never reused. Why: audit trail.
- Overview and Finance share one period + branch filter from `LedgerProvider`. Why: both screens must show the same numbers.
- Until the ledger is migrated, it is in-memory demo data and the UI must say so. Balances and attendance shown beside persistent students are demo-derived and must be labelled as such; sorting students by balance stays disabled until the ledger persists. Why: never imply a payment reached a real ledger.
