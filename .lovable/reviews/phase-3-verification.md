# Phase 3 checkpoint

## Scope completed
- Overview, Finance CSV/rows and correction dialogs use live store students, with student ID fallback if a record is missing.
- Demo marker, mobile search icon and reusable PageHeader were already present and retained.
- Finance amount header/cells and recent activity amounts are right-aligned with tabular numerals, including RTL.
- Overview consolidated from six KPIs and multiple charts/widgets to four financial groups, reconciliation, one chart, today's classes, attention and compact activity.
- Cairo-time greeting; store-backed class/teacher labels; selected class/date attendance deep links; WhatsApp guardian links match existing profile links.
- Skeleton on hydration/route pending and empty states for chart, schedule, attention and activity.
- Prior deltas are suppressed for absent data or zero prior denominators.
- Settlement statuses and due dates do not exist; therefore attention says accrued payables / outstanding balance, not invented pending payout or contractual overdue status.
- Enrollment/attendance trends, top classes and class-revenue widgets were removed from Overview only; Reports implementation is deferred.

## Verification actually executed
- `bunx vitest run`: 42 tests passed, six test files; includes all existing tests, three Overview display-selector tests and one whole-pound/piastre reconciliation regression.
- `/node_modules/.bin/tsgo -b --noEmit`: exit 0, no diagnostics. This was the actual TypeScript checker used, **not** `tsc --noEmit`.
- Automatic build log: `build OK` at 2026-11-23T15:40:09Z. **No manual production build was run**: this environment requires the platform harness to run builds and prohibits manually invoking the project's build command. A separately executed production build is therefore not claimed.
- Playwright completed Add Student → payment → Overview recent name → Finance row name → reversal dialog name. EGP 1,250 read back; Finance amount CSS verified right alignment/tabular numerals.
- Attendance link opened `/attendance?classId=C-203&date=2026-11-23`; date read back matched.
- One chart verified; Arabic tooltip displayed 261,940 ج.م billed and 277,350 ج.م collections for June; RTL axes inspected.
- English 890×674 and Arabic 360/390/890/1440px document-width checks passed; inspected screenshots and lower activity section. No captured page runtime errors.
- `git diff` confirms no changes to `ledger.ts`, `finance.ts`, `billing.ts` or `use-finance.ts` calculations.

## Remaining risks
- Separate manual production build not performed (environment restriction).
- Catalog migration review is in `static-catalog-before-backend.md`.
- Existing payment/correction inputs accept whole pounds; regression verifies piastres already present in ledger values are preserved by formatting/reconciliation. Decimal-entry form changes were not included.
- Full legacy Finance/payment/correction translation pass remains deferred. New Overview text is translated.
- No real sign-in, saved data, teacher payout settlement or contractual due-date tracking was added.
- Phase 4 not started.