# Markezly backend plan

Goal: real accounts and saved data, without changing how any number is calculated.
The public demo (sample data, nothing saved) keeps working for visitors who aren't signed in.

Schema changes are repository-managed SQL migrations (`supabase/migrations/`), not Lovable-managed. See
`docs/database.md` for the workflow and `AGENTS.md` for the rules.

## Phases

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Supabase Auth, centers and membership, the student directory and enrollments, the Demo Center seed, RLS. | Built and verified locally. Hosted verification blocked (see below). |
| 2 | Ledger and attendance in the database; `src/lib/ledger.ts`, `billing.ts` and `finance.ts` stay the only place money is calculated. Re-enable balance sorting. | Not started. |
| 3 | Staff invites and roles (front desk, accountant, teacher), teacher view limited to their classes. | Not started. |

## Phase 1: what exists

- **Switch.** Saved data is used only when `VITE_MARKEZLY_BACKEND=supabase`, `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are all set. Otherwise the app is exactly the in-memory demo.
- **Signed out = demo.** The in-memory sample center with the "Demo data" banner, as before.
- **Sign-up and sign-in** at `/login` (email and password). A new account goes to `/onboarding`, which calls `create_center()`: the user becomes owner of an empty center with one branch.
- **Signed in = your center.** The Students directory, Add student and student profiles read and write that center's rows. A banner states that finance, attendance and classes aren't saved yet.
- **Ledger and attendance are not migrated.** For a real center they start empty in memory, so sample money never appears against real students. Balances and attendance rates show "—".
- **Demo Center.** One `is_demo` center seeded by migration from `src/lib/data.ts`: 300 students, 18 classes, 12 teachers, 3 branches and their enrollments (with the per-student rule overrides). Codes are unchanged (S-1001, C-201, T-101), so the in-memory sample ledger still lines up. Any signed-in user can read it; nobody can write to it.
- **Balance sorting is off** in the Students directory until Phase 2. Sample balances carry a "Demo" tag.

## Phase 1 acceptance criteria

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Migrations apply in order on a fresh Supabase database. | Done (local) | `supabase start` on Supabase CLI 2.122.1 applied both files. |
| 2 | Sign-up → onboarding creates a center with the user as owner and one branch, and no sample data. | Done (local) | PGlite tests; browser E2E against local Supabase. |
| 3 | Signed out, the console is the unchanged in-memory demo. | Done | Browser check with saved data off and on. |
| 4 | Students added in a real center persist across reloads, with database-assigned codes per center. | Done (local) | Browser E2E; PGlite; integration script. |
| 5 | Two users in separate centers can't read or write each other's centers, members, branches or students. | Done (local) | PGlite (15 tests) and `scripts/rls-integration.ts` (20 checks) against local Supabase. |
| 6 | The Demo Center is seeded deterministically, read-only, and customer centers are never seeded. | Done | Seed-matches-source test; PGlite; integration script. |
| 7 | Balance sorting is off and demo-derived balances are labelled. | Done | Students directory; unit test on `DIRECTORY_SORTS`. |
| 8 | Existing behaviour preserved: 54 baseline tests pass, production build succeeds. | Done | `bun run test`, `vite build`. |
| 9 | Migrations pushed to a hosted staging project; `migration list` in sync; `db diff --linked` empty. | **Blocked** | No Supabase project or access token in this environment. |
| 10 | `scripts/rls-integration.ts` passes against the hosted project with two real test users. | **Blocked** | Needs #9. |
| 11 | Hosting configured with the three `VITE_` variables; sign-up works on the deployed site. | **Blocked** | Needs #9 and a decision on where the app is hosted. |

Phase 1 is complete only when 9–11 pass.

### Known gaps (Phase 1)

- Editing a student's details or status has no UI yet (the database allows it for owners, accountants and front desk).
- Classes and teachers: owners create and edit them in the app (migration `20261127000100_catalog_writes.sql`, codes T-101 / C-201 per center). There is no archive or delete yet.
- Changing a per-student billing rule from a profile only changes memory. It's reachable only in centers that already have classes.
- Attendance and Finance use the center's own classes and teachers, but payments and attendance are still kept in memory until Phase 2. The banner says so.
- `joined_on` defaults to the database's UTC date; a center time zone setting comes later.

## Decisions

- **Money is stored as whole piastres** (`bigint`, 1 EGP = 100). The app converts at the edge; calculations stay in TypeScript.
- **The ledger will be append-only in the database**, not just in the UI: no update or delete for any role, enforced by policies and a trigger. Corrections are new rows (Reversal, replacement Payment, Confirmation).
- **One center per account to start.** Every table carries `center_id`; composite foreign keys stop cross-center references; policies only return rows for the caller's centers (plus the read-only Demo Center).
- **Human-readable IDs stay** (`S-…` now; `TX-…`, `INV-…` in Phase 2), numbered per center by the database so two people saving at once never get the same ID.
- **Sign-up is open for the pilot:** the first user creates a center and becomes its owner. Staff invites come in Phase 3.

## Phase 2 design: ledger and attendance

Phase 1 tables are defined in `supabase/migrations/20261126000100_phase1_core_schema.sql`. The ledger and attendance
tables below are the plan for Phase 2.

All tables: `id uuid primary key default gen_random_uuid()`, `center_id uuid not null references centers`, `created_at timestamptz default now()` unless noted.

- `centers` — `name`, `created_by` (auth user).
- `center_members` — `user_id`, `role` (`owner` | `accountant` | `front_desk` | `teacher`), `display_name`, `teacher_id` (nullable). Unique `(center_id, user_id)`.
- `branches` — `name`.
- `teachers` — `name`, `phone`, `subject`, `branch_id`, `pay_model` (`monthly` | `per_session` | `per_student` | `percentage`), `pay_amount_piastres` (nullable), `pay_percent` (nullable).
- `classes` — `name`, `kind` (`tutoring` | `language_course`), `teacher_id`, `branch_id`, `weekdays smallint[]` (0 = Sunday), `start_time time`, `capacity`, plus the default billing rule (below).
- `students` — `code` (`S-1001`, unique per center), `name`, `phone`, `guardian_name`, `guardian_phone`, `branch_id`, `grade`, `status` (`active` | `paused` | `inactive`), `joined_on date`.
- `enrollments` — `student_id`, `class_id`, optional billing-rule override (below). Unique `(student_id, class_id)`.
- Billing rule columns (on `classes`, nullable override on `enrollments`): `rule_kind` (`monthly` | `per_session` | `package`), `fee_piastres`, `rate_piastres`, `charge_no_show bool`, `package_sessions int`, `package_price_piastres`, `count_no_show bool`.
- `attendance_sessions` — `class_id`, `date`, `finalized_at` (nullable), `finalized_by` (nullable). Unique `(class_id, date)`.
- `attendance_marks` — `session_id`, `student_id`, `status` (`present` | `absent` | `excused`). Unique `(session_id, student_id)`. Editable until the session is finalized.
- `attendance_amendments` — append-only: `session_id`, `student_id`, `from_status`, `to_status`, `reason`, `by`, `at`, `ledger_entry_id` (nullable).
- `ledger_entries` — append-only:
  - `code` (`TX-…` / `INV-…`, unique per center, assigned by the database)
  - `type` (`charge` | `payment` | `refund` | `discount` | `reversal` | `package_use` | `confirmation`)
  - `student_id`, `class_id` (nullable), `branch_id`
  - `date` (business date), `amount_piastres bigint` (> 0, except `package_use` = 0)
  - `method` (`cash` | `instapay` | `fawry` | `bank_transfer` | `other`, nullable), `status` (`completed` | `pending`)
  - `reference`, `note`, `reason` (all nullable)
  - `reverses_id`, `replaces_id`, `confirms_id`, `session_id` (nullable), `package_sessions` (nullable)
  - `entered_by` (auth user, default `auth.uid()`), `entered_at` (default `now()`)

### Rules the database will enforce

1. `ledger_entries` and `attendance_amendments`: no UPDATE or DELETE policy for any role, plus a trigger that raises an error on UPDATE/DELETE.
2. A `reversal` must have `reverses_id` and a non-empty `reason`. Only one reversal per entry (unique partial index on `reverses_id`).
3. A `confirmation` must have `confirms_id` pointing at a `pending` `payment` that is not reversed. Only one confirmation per payment (unique partial index on `confirms_id`).
4. `reverses_id`, `replaces_id` and `confirms_id` must point to an entry in the same center.
5. Every read and write is limited to centers the user is a member of.

### Phase 2 code changes

- `LedgerProvider` loads the center's ledger and attendance rows and converts piastres to EGP; the Demo Center keeps the seeded sample ledger.
- Writes (`recordPayment`, `correct`, `confirm`, `finalize`, `amend`, `sellPackage`, rule changes) keep validating with the existing functions, then insert rows. The UI updates from what the database returns.
- Re-enable balance sorting; drop the "Demo" balance tag and the "not saved yet" banner for signed-in users.
