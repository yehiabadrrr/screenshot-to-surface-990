# Markazly database runbook

The database schema is managed in this repository. `AGENTS.md` (section "Database, migrations and secrets")
holds the rules; this file holds the procedures.

## Environments

| Environment | Purpose | Who applies migrations |
| --- | --- | --- |
| Local tests (PGlite) | Every `npm test` run replays all migrations on an in-memory PostgreSQL and checks the RLS policies. | Automatic |
| Supabase **test** project | Live RLS verification with real Supabase Auth users. Disposable data only. | Engineer, before production |
| Supabase **production** project | Customer data. | Engineer, after the test project passes |

## Creating a migration

1. Create `supabase/migrations/<UTC timestamp yyyymmddHHMMSS>_<purpose>.sql`, for example
   `20261201093000_add_enrollments.sql`. With the CLI installed, `supabase migration new add_enrollments`
   creates the file with the right timestamp.
2. Write forward-only SQL. Every new business table:
   - has `center_id uuid not null references public.centers (id) on delete cascade`;
   - runs `alter table … enable row level security` and defines policies `to authenticated`;
   - grants only the privileges the app needs to `authenticated` and nothing to `anon`.
3. Never edit or delete a migration that has been applied to any Supabase project. Fix mistakes with a new
   migration.
4. Run `npm test`. `src/test/rls.test.ts` applies every file in this folder, in order, to PGlite and must pass.
   Add tests there for every new policy.

## Applying migrations

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) and access to the project. The first time
on a checkout without `supabase/config.toml`, run `supabase init` in the repository root (it keeps the existing
`migrations/` folder) and commit the generated `config.toml`.

```sh
supabase login                                   # opens the browser; the token stays on your machine
supabase link --project-ref <test-project-ref>   # asks for the database password; not stored in the repo
supabase migration list                          # local and remote columns must match before pushing
supabase db push                                 # applies pending migrations in order
supabase migration list                          # confirm the new migration is recorded remotely
```

Repeat with the production project ref once the test project passes the live RLS suite.

## Tracking history

- Each Supabase project records applied migrations in `supabase_migrations.schema_migrations`.
- Git history of `supabase/migrations/` is the source of truth for what should be applied.
- `supabase migration list` compares the two. Any remote-only migration means someone changed the database
  outside this workflow; reconcile it into a migration file before doing anything else.
- Never use the dashboard SQL editor or table editor for schema or data changes.

## Verifying a schema change

1. **PGlite (every run):** `npm test`. Checks policies, grants, triggers and functions on a real PostgreSQL
   engine with a minimal stand-in for Supabase's `auth` schema. Not proof of Supabase security on its own.
2. **Live Supabase (before production):** `npm run test:rls-live` against the **test** project.

### Live RLS suite (`src/test/rls-live.test.ts`)

Skipped unless all of these are set (in your shell or `.env.test.local`, never committed):

| Variable | Value |
| --- | --- |
| `SUPABASE_TEST_URL` | Test project URL |
| `SUPABASE_TEST_PUBLISHABLE_KEY` | Test project publishable (anon) key |
| `SUPABASE_TEST_USER_A_EMAIL` / `_PASSWORD` | Confirmed test user A |
| `SUPABASE_TEST_USER_B_EMAIL` / `_PASSWORD` | Confirmed test user B |

Setup, once per test project: create users A and B in Authentication → Users with "Auto confirm" on.
Each user creates its own center the first time the suite runs (through `create_center`), so the users
must not already belong to another center unless that is intended.

The suite signs in as each user with the publishable key only (no service-role key) and proves:

- each user reads only its own center, branches, memberships and students;
- reads of the other center by id return nothing;
- inserts into the other center are rejected by RLS;
- updates and deletes aimed at the other center's students affect zero rows;
- moving a student to another center, or changing its code, is refused;
- an anonymous client reads nothing.

Multi-tenancy is only complete once this suite passes against the test project.

## Demo Center

`20261125120100_demo_center_seed.sql` creates one dedicated Demo Center (`centers.is_demo = true`, fixed id
`d3e00000-0000-4000-8000-000000000001`) with the three sample branches and the 300 deterministic sample
students under their original `S-1001`…`S-1300` codes, so the in-memory demo ledger and attendance still
match them. It is generated from `src/lib/data.ts` by `buildDemoSeedSql()` (`src/lib/demo-seed.ts`).
`src/test/demo-seed.test.ts` fails if the committed file drifts from the generator; regenerate it with
`UPDATE_DEMO_SEED=1 npx vitest run src/test/demo-seed.test.ts` (only before the migration is applied anywhere).

Nobody is a member of the Demo Center by default. To give a user access (test or sales accounts only):

```sql
-- as a new migration, never in the SQL editor
insert into public.memberships (center_id, user_id, role)
values ('d3e00000-0000-4000-8000-000000000001', '<auth user id>', 'admin')
on conflict (center_id, user_id) do nothing;
```

Customer-created centers (`create_center`) are always `is_demo = false` and never receive sample records.

## Database-side limits

- `create_center`: at most 3 new centers per user per day and 10 owned (migration 20261127100000).
- `invite_member`: at most 30 invitations per center per day. Memberships are created only by `create_center` and `accept_invitation`; clients cannot insert them.
- A center always keeps at least one owner (trigger `memberships_keep_an_owner`).

## Auth settings (dashboard, per project)

Authentication settings are not schema and cannot live in a migration; record any change here.

| Setting | Value |
| --- | --- |
| Providers | Email (password). Others disabled. |
| Site URL | The app's public URL, e.g. `https://app.markazly.com` (test project: its deployed preview URL). |
| Redirect URLs | `<site>/onboarding` (email confirmation) and `<site>/reset-password` (password recovery); add `http://localhost:8080/**` on the test project for local development. |
| Confirm email | On for production. The app handles both: without a session after sign-up it asks the user to confirm, then finishes center setup at `/onboarding`. |
| Minimum password length | 8 (matches the app's validation). |
| Rate limits (Authentication → Rate Limits) | Keep Supabase defaults or lower: sign-ups and sign-ins per IP, emails per hour. |
| Bot protection (Authentication → Attack Protection) | Turn on CAPTCHA (Cloudflare Turnstile or hCaptcha) before public launch; the sign-up form then needs the site key (not done yet). |
| SMTP (Authentication → Emails) | Your own sender (e.g. Resend, Postmark). The built-in Supabase mailer is limited to a few emails per hour and is not for production. |

## Secrets

| Value | Where it lives |
| --- | --- |
| Project URL, publishable key | `.env.local` (gitignored) locally; `.env.production` (committed) for the Lovable build, which cannot set build variables. Public by design. Production project: `woyazulvvgxilsawkved`. |
| Service-role key | Supabase dashboard only. Not used by the app. Never in the repo, `.env.example`, CI logs or client code. |
| Database password, CLI access token | Your machine (`supabase link` / `supabase login`). Never in the repo. |
| Test user passwords | Your shell or `.env.test.local` (gitignored). |
