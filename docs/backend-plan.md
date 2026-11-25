# Markezly backend plan

Goal: real accounts and saved data, without changing how any number is calculated.
The public demo (sample data, nothing saved) keeps working for visitors who are not signed in.

## Who does what

| Phase | Owner | Scope |
| --- | --- | --- |
| 1 | Lovable | Lovable Cloud database, email sign-in, schema below, security rules, first-sign-in onboarding. |
| 2 | Code (this repo) | Load and save through the database in `LedgerProvider`; keep `src/lib/ledger.ts`, `billing.ts` and `finance.ts` as the only place money is calculated. |
| 3 | Lovable + code | Staff invites and roles (front desk, accountant, teacher), teacher view limited to their classes. |

The project rules say database schema changes go through Lovable, so phase 1 is a request to Lovable, not hand-written migrations.

## Decisions

- **Money is stored as whole piastres** (`bigint`, 1 EGP = 100). The app converts at the edge; calculations stay in TypeScript.
- **The ledger is append-only in the database**, not just in the UI: no update or delete is possible for any role, enforced by both security policies and a trigger. Corrections are new rows (Reversal, replacement Payment, Confirmation).
- **One center per account to start.** Every table carries `center_id`, and security rules only return rows for centers the signed-in user belongs to.
- **Human-readable IDs stay** (`TX-…`, `INV-…`), numbered per center by the database so two people saving at once never get the same ID.
- **Signed out = demo.** Visitors who are not signed in keep the in-memory sample center and the "Demo data" banner. Signed-in users see only their center and no demo banner.
- **Sign-up is open for the pilot:** the first user to sign up creates a center and becomes its owner. Staff invites come in phase 3.

## Schema

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

## Rules the database enforces

1. `ledger_entries` and `attendance_amendments`: no UPDATE or DELETE policy for any role, plus a trigger that raises an error on UPDATE/DELETE.
2. A `reversal` must have `reverses_id` and a non-empty `reason`. Only one reversal per entry (unique partial index on `reverses_id`).
3. A `confirmation` must have `confirms_id` pointing at a `pending` `payment` that is not reversed. Only one confirmation per payment (unique partial index on `confirms_id`).
4. `reverses_id`, `replaces_id` and `confirms_id` must point to an entry in the same center.
5. Every read and write is limited to centers the user is a member of.

## Phase 1 acceptance check

- Sign up at `/login` → a new center with one branch exists and the user is its owner.
- Signed out, `/overview` still shows the sample center with the "Demo data" banner.
- In the database editor, updating or deleting a `ledger_entries` row fails.
- A second account cannot see the first account's center.

## Phase 2 (code, after phase 1 exists)

- `LedgerProvider` chooses its source: signed out → current in-memory seed; signed in → load the center's rows and convert piastres to EGP.
- Writes (`recordPayment`, `correct`, `confirm`, `finalize`, `amend`, `addStudent`, rule changes) keep validating with the existing functions, then insert rows. The UI updates from what the database returns.
- Hide the demo banner and "Demo only, not saved" copy for signed-in users.
- Add a sign-out item, and an empty state for a new center with no students yet.
