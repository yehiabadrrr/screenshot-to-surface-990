# Database guide

Markezly's database is Supabase Postgres, and its schema lives in this repository. Lovable does not manage it.
The short rules are in `AGENTS.md` under "Database". This page covers the how.

## Layout

| Path | What it is |
| --- | --- |
| `supabase/config.toml` | Supabase CLI config for the local stack. Nothing secret. |
| `supabase/migrations/*.sql` | Every schema change, applied in filename order. |
| `scripts/gen-demo-seed.ts` | Writes the Demo Center seed migration from `src/lib/data.ts`. |
| `scripts/rls-integration.ts` | Two-user RLS check against a real Supabase project. |
| `src/lib/db/` | PGlite test harness, seed builder, piastre/rule conversions. |
| `src/lib/backend/` | Browser client, sign-in state (`useWorkspace`), student reads and writes. |
| `.env.example` | The three browser variables. Copy to `.env.local`. |

## Creating a migration

```bash
npx supabase migration new add_student_notes   # supabase/migrations/<UTC timestamp>_add_student_notes.sql
```

- Each file is one reviewed change. Write plain SQL: tables, constraints, RLS policies, grants and functions together.
- A new table enables RLS and gets explicit `grant`s in the same file. Supabase's defaults grant everything to the API roles, so revoke first (see `20261126000100_phase1_core_schema.sql`).
- A file that has reached staging or production is never edited, renamed or deleted. Fix forward with a new file.
- Data changes to shared reference rows (the Demo Center) are migrations too.

## Applying migrations

Local (needs Docker):

```bash
npx supabase start                  # first time: starts Postgres, Auth, REST and applies every migration
npx supabase db reset               # rebuild from zero; proves the migrations apply cleanly in order
npx supabase start -x studio,imgproxy,mailpit,edge-runtime,logflare,vector,realtime,storage-api,supavisor,postgres-meta  # lighter stack
```

Hosted (staging first, then production):

```bash
npx supabase login                               # uses SUPABASE_ACCESS_TOKEN or a browser login; never commit the token
npx supabase link --project-ref <project-ref>    # prompts for the database password; never commit it
npx supabase db push --dry-run                   # lists the migrations that would run
npx supabase db push                             # applies them and records each one
```

## Migration history

- Every database records applied files in `supabase_migrations.schema_migrations`.
- `npx supabase migration list` shows local files next to what the linked project has applied. They must match after a push.
- Git history is the audit trail. Each migration arrives in its own commit with the code that uses it.

## Verifying a change

| When | Check | Proves |
| --- | --- | --- |
| Every change | `bun run test` | PGlite: migrations apply, policies isolate tenants, the demo seed matches `data.ts`. |
| Every change | `npx supabase db reset` | The full chain applies on real Supabase Postgres. |
| Every change | `bun scripts/rls-integration.ts` against local | Auth + PostgREST + RLS with two real users. |
| After a hosted push | Same script against staging, then production test accounts | The hosted project enforces isolation. |
| After a hosted push | `npx supabase migration list` | Repo and database agree. |
| After a hosted push | `npx supabase db diff --linked` | Empty output: nobody changed the schema by hand. |

PGlite tests are necessary but not sufficient: they emulate `auth.uid()` and the API roles. Multi-tenancy only
counts as verified once `scripts/rls-integration.ts` passes against the hosted project.

### Running the integration check

```bash
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_PUBLISHABLE_KEY=<publishable key> \
RLS_USER_A_EMAIL=… RLS_USER_A_PASSWORD=… RLS_USER_B_EMAIL=… RLS_USER_B_PASSWORD=… \
bun scripts/rls-integration.ts
```

- Create the two users first (Dashboard → Authentication → Add user), or add `RLS_SIGN_UP=1` where sign-up needs no email confirmation.
- Each user gets its own test center on first run. Each run adds one test student per center. Students can't be deleted through the API, so use dedicated test accounts.
- 20 checks cover cross-center reads, writes, updates, moves and deletes, one center per account, the read-only Demo Center, and signed-out access.

## Secrets

| Value | Where it lives | In the browser? |
| --- | --- | --- |
| `VITE_MARKEZLY_BACKEND=supabase` | Hosting build variables, `.env.local` | Yes (a switch, not a secret) |
| `VITE_SUPABASE_URL` | Hosting build variables, `.env.local` | Yes (public) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Hosting build variables, `.env.local` | Yes (public; RLS protects the data) |
| Secret / service-role key | Supabase dashboard only | **Never** |
| Database password | Password manager; typed at `supabase link` | **Never** |
| `SUPABASE_ACCESS_TOKEN` | Password manager, or CI secrets if CI ever deploys | **Never** |

The app only uses saved data when all three `VITE_` variables are set. A Supabase URL that a platform injects on
its own (Lovable Cloud does) doesn't switch the app over, because that database hasn't had these migrations.

## What's in the schema (Phase 1)

- `centers` (one `is_demo` center at most), `center_members` (owner, accountant, front_desk, teacher), `branches`.
- `teachers`, `classes` (billing rule as columns, amounts in piastres), `students` (code `S-1001` per center, assigned by
  a trigger), `enrollments` (optional per-student rule).
- Composite foreign keys `(center_id, id)` stop rows pointing into another center, even for a superuser.
- `create_center()` is the only way to create a center (security definer: the caller becomes owner, one branch, no sample data).
- `add_student()` inserts a student and their enrollments in one transaction (security invoker: RLS applies).
- Policies: members read their own center, and every signed-in user can read the Demo Center. Owners, accountants and front desk add students; teachers only read. Nobody writes to the Demo Center. Signed-out requests read nothing.
- Students are never deleted (set `status`), and their code and center never change (column-level grants).
