# Static class and teacher catalog: review before backend work

No backend or catalog migration was performed. The ledger store currently exposes the same read-only class/teacher arrays used by these imports.

| File | Current dependency | Review risk |
| --- | --- | --- |
| `src/routes/_console.classes.tsx` | `classes`, `teacherById` | Replace catalog reads when classes/teachers become persistent; preserve billing-rule overrides. |
| `src/routes/_console.attendance.tsx` | `classes`, `teacherById` | Teacher filter, selected class and URL validation depend on the static catalog. |
| `src/routes/_console.students.index.tsx` | `classes`, `classById` | Enrollment options, branch assignment and CSV class labels. |
| `src/routes/_console.students.$id.tsx` | `classById`, `teacherById` | Enrollment and attendance history labels. |
| `src/components/app/record-payment.tsx` | `classById` | Optional class labels; student list already comes from the store. |
| `src/lib/use-finance.ts` | `classes`, `teachers`, `payableOf` | Financial dependency: collections by teacher/class and accrued payout calculations. Requires explicit review, not a UI-only replacement. |
| `src/lib/ledger-store.tsx` | `classes`, `classById`, `teachers` | Class rule defaults, posting context, package creation and demo teacher actors. |
| `src/lib/ledger-seed.ts` | `classes`, `classById`, `teacherById` | Intentional deterministic sample seeding; retire separately when persistent data exists. |
| `src/lib/data.ts` | catalog definitions and lookup exports | Source catalog and compensation inputs; not an authorization source. |

Overview and command search now read class/teacher catalogs from the store. Overview, Finance (including CSV export), payment and correction dialogs read live students. Branch-only imports use the central profile compatibility export.

Payout settlement is not recorded in this model. Overview shows **accrued teacher payables**, not invented pending/paid status. Likewise balances have no contractual due-date field: the attention list says **Outstanding balance**, not a fabricated overdue date.