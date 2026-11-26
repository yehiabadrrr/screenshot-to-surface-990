/**
 * PGlite harness for policy tests. It emulates the parts of Supabase the migrations rely on
 * (auth.users, auth.uid(), the anon/authenticated roles and Supabase's default grants).
 * Passing here is necessary, not sufficient: real Supabase RLS is verified by scripts/rls-integration.ts.
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = join(__dirname, "../../../supabase/migrations");

const SUPABASE_STUB = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated;
-- Supabase's defaults: new public tables/functions are fully granted to the API roles.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

export const migrationFiles = () =>
  readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();

export async function freshDb() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const f of migrationFiles()) await db.exec(readFileSync(join(MIGRATIONS, f), "utf8"));
  return db;
}

export async function createUser(db: PGlite, id: string, email: string) {
  await db.exec("reset role");
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
}

/** Run as a signed-in user (or anon when id is null), exactly as PostgREST would. */
export async function as(db: PGlite, id: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id ?? ""]);
  await db.exec(id ? "set role authenticated" : "set role anon");
}

export async function asAdmin(db: PGlite) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', false)");
}
