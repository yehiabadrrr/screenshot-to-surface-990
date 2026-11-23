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

## Finance
- Center metadata and sample actor identity come from `center-config.ts`; compatibility exports must reference it so displayed and recorded identities agree.
- Presentation formatting lives in `format.ts`; `Money` and localization helpers delegate to it, without changing ledger calculations.
- The shell command search uses the ledger store's live students and read-only class catalog; sidebar preference is hydrated after mount to avoid SSR mismatches.
- Every money figure (KPIs, finance cards, method breakdowns, student balances, teacher % payouts) is computed from the ledger in `src/lib/ledger.ts` via `useFinance`/`useLedger`; never hardcode totals. Why: hardcoded KPIs drifted from the transaction list.
- The ledger is append-only: corrections add a Reversal (with reason) and optionally a replacement payment; completed entries are never edited and IDs are never reused. Why: audit trail.
- Overview and Finance share one period + branch filter from `LedgerProvider`. Why: both screens must show the same numbers.
- Until a backend exists, the ledger is in-memory demo data and the UI must say so. Why: never imply a payment reached a real ledger.
