# Phase 1–2 checkpoint

## Implemented
- Semantic tokens, compact radii, type and page-spacing tokens, tabular numerals, shared page headers and RTL dialog spacing.
- Shared `formatMoney`, `formatNumber`, and `formatPercent`; compatibility aliases preserve existing positive/integral English output. Piastres remain visible and negatives always carry a minus; signed positives carry a plus.
- Central sample center profile/branches/user; existing data exports and ledger actor reference that config, without changing financial calculations or ledger fields.
- Grouped existing navigation, remembered desktop collapse, four mobile destinations and More sheet.
- Search students/classes via the ledger store, mobile search icon, Ctrl/Cmd+K and RTL. Exact substring matching avoids misleading fuzzy ID matches.
- Payment recipient dropdown now includes newly added in-memory students.
- Read-only Settings with center identity, branches and active language.
- Hidden Import; removed inert notification bell, forgotten-password link and remember checkbox. Removed hardcoded login metrics and explicitly identified simulated sign-in.
- No added packages, backend, ledger fields/types or WhatsApp module.

## Actual verification
- Ran `bunx vitest run`: 38 tests passed across five suites (all 33 existing tests plus five formatter tests).
- Read automatic build output: `build OK`. Did not manually invoke a second build or typecheck; the project harness runs builds.
- Playwright: Add Student → S-1301 profile → search finds new student → record EGP 1,250 → read amount back in Finance using normal navigation.
- Verified read-only Settings, keyboard class search, sidebar persistence across reload, Arabic phone search, More sheet navigation, and Settings RTL.
- Inspected desktop payment/Settings and Arabic phone search/More/Settings screenshots.
- Overview document-width checks passed at 360, 768 and 1440px. No page runtime errors in completed browser run.
- This was not an exhaustive QA pass of every existing screen or a new attendance-correction verification.

## Remaining direct sample-data imports
Payment recipients were fixed now; the following consumers remain intentionally unchanged:
- `src/routes/_console.overview.tsx`: static students/classes and student/class/teacher lookup helpers; sample attendance series. Newly added students can still be missing from lookup-driven lists.
- `src/routes/_console.finance.tsx`: static `studentById`; new student labels may be missing from ledger rows.
- `src/components/app/correct-entry.tsx`: static `studentById`; new student labels may be missing in correction dialogs.
- `src/routes/_console.students.index.tsx`: static classes/class lookup for enrollment selection and export (student roster already uses the store).
- `src/routes/_console.students.$id.tsx`: static class/teacher helpers (student lookup already uses the store).
- `src/routes/_console.classes.tsx`: static class catalog/teacher lookup (billing rules and enrollment counts already use the store).
- `src/routes/_console.attendance.tsx`: static classes/teacher lookup (students and attendance already use the store).
- `src/lib/use-finance.ts`: static class/teacher catalog for payout calculations; left untouched because it is financial logic.
- `src/lib/ledger-seed.ts` and `src/lib/ledger-store.tsx`: intentional sample seed/catalog imports, not stale UI student rosters.
- `src/components/app/filters.tsx` and payment dialog: branch export only, now backed by central config.

The class/teacher catalog is read-only; catalog imports do not currently diverge from store catalog references. Static student helpers are the meaningful outstanding risk.

## Deferred
Phase 3 dashboard work; full legacy Arabic coverage; existing narrow table/profile-tab issues; Teachers/Reports/Communications placeholders; real accounts and persistent data; WhatsApp adapter (Phase 6).

## Files
Added: `src/lib/center-config.ts`, `src/lib/format.test.ts`, `src/components/app/command-search.tsx`.
Updated: `src/styles.css`; app `shell`, `ui`, `record-payment`; UI `button`, `command`, `dialog`, `sheet`; lib `format`, `l10n`, `i18n-ar`, `data`, `ledger-store`; routes `index`, `_console.settings`, `_console.students.index`; `AGENTS.md`, `roadmap.md`.