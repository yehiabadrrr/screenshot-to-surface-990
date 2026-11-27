// @vitest-environment node
/**
 * Row-level security on a real PostgreSQL engine (PGlite). Applies every migration in
 * supabase/migrations, in order, on top of a minimal stand-in for Supabase's auth schema, then
 * acts as different users through the `authenticated` / `anon` roles exactly as PostgREST does.
 *
 * This proves the SQL policies, grants, triggers and functions. It is NOT final proof of Supabase
 * security: see src/test/rls-live.test.ts, which repeats the tenant checks against a real project.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DEMO_CENTER_ID } from "@/lib/demo-seed";

const MIGRATIONS = path.resolve(__dirname, "../../supabase/migrations");
const U = {
  a: "aaaaaaaa-0000-4000-8000-00000000000a",
  b: "bbbbbbbb-0000-4000-8000-00000000000b",
  frontDesk: "cccccccc-0000-4000-8000-00000000000c",
  teacher: "dddddddd-0000-4000-8000-00000000000d",
  invitee: "eeeeeeee-0000-4000-8000-00000000000e",
  unconfirmed: "ffffffff-0000-4000-8000-00000000000f",
} as const;

let db: PGlite;

/** Stand-in for Supabase: auth.users, auth.uid() from the request JWT claims, and the API roles. */
const AUTH_SHIM = `
  create schema auth;
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(coalesce(
      current_setting('request.jwt.claim.sub', true),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

async function asRole(role: "authenticated" | "anon", sub: string | null) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    sub ? JSON.stringify({ sub, role }) : "",
  ]);
  await db.exec(`set role ${role}`);
}
async function asSuperuser() {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', '', false)");
}
const as = (sub: string) => asRole("authenticated", sub);
const rows = async <T = Record<string, unknown>>(sql: string, params: unknown[] = []) =>
  (await db.query<T>(sql, params)).rows;
const affected = async (sql: string, params: unknown[] = []) =>
  (await db.query(sql, params)).affectedRows ?? 0;

let centerA = "",
  centerB = "",
  branchA = "",
  branchB = "",
  studentA = "",
  studentB = "";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(AUTH_SHIM);
  for (const f of readdirSync(MIGRATIONS)
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(path.join(MIGRATIONS, f), "utf8"));
  }
  for (const [name, id] of Object.entries(U))
    await db.query("insert into auth.users (id, email, email_confirmed_at) values ($1, $2, $3)", [
      id,
      `${name}@test.local`,
      name === "unconfirmed" ? null : new Date().toISOString(),
    ]);

  await as(U.a);
  centerA = (
    await rows<{ id: string }>(
      "select public.create_center('Center A', array['Main','Annex']) as id",
    )
  )[0]!.id;
  branchA = (
    await rows<{ id: string }>(
      "select id from public.branches where center_id = $1 and name = 'Main'",
      [centerA],
    )
  )[0]!.id;
  studentA = (
    await rows<{ id: string }>(
      "insert into public.students (center_id, branch_id, name, phone, grade) values ($1, $2, 'Alice Student', '01012345678', 'Prep 3') returning id",
      [centerA, branchA],
    )
  )[0]!.id;
  // Staff for Center A (fixture; the invitation flow itself is tested below).
  await asSuperuser();
  await db.query(
    "insert into public.memberships (center_id, user_id, role) values ($1, $2, 'front_desk'), ($1, $3, 'teacher')",
    [centerA, U.frontDesk, U.teacher],
  );

  await as(U.b);
  centerB = (
    await rows<{ id: string }>("select public.create_center('Center B', array['Downtown']) as id")
  )[0]!.id;
  branchB = (
    await rows<{ id: string }>("select id from public.branches where center_id = $1", [centerB])
  )[0]!.id;
  studentB = (
    await rows<{ id: string }>(
      "insert into public.students (center_id, branch_id, name, phone, grade) values ($1, $2, 'Bob Student', '01112345678', 'Adult') returning id",
      [centerB, branchB],
    )
  )[0]!.id;
  await asSuperuser();
});

afterAll(async () => {
  await db?.close();
});

describe("tenancy setup", () => {
  it("create_center makes the caller owner of a non-demo center with its branches", async () => {
    await as(U.a);
    expect(await rows("select name, is_demo from public.centers")).toEqual([
      { name: "Center A", is_demo: false },
    ]);
    expect(
      (await rows<{ name: string }>("select name from public.branches order by name")).map(
        (r) => r.name,
      ),
    ).toEqual(["Annex", "Main"]);
    expect(await rows("select role from public.memberships where user_id = $1", [U.a])).toEqual([
      { role: "owner" },
    ]);
  });
  it("create_center refuses unauthenticated callers and centers without branches", async () => {
    await asRole("authenticated", null);
    await expect(db.query("select public.create_center('X', array['Main'])")).rejects.toThrow(
      /Not authenticated/,
    );
    await as(U.a);
    await expect(db.query("select public.create_center('X', array['Main'])")).rejects.toThrow(
      /Center name is required/,
    );
    await expect(
      db.query("select public.create_center('Center X', array[]::text[])"),
    ).rejects.toThrow(/At least one branch/);
    await asSuperuser();
    expect(
      await rows("select count(*)::int as n from public.centers where name = 'Center X'"),
    ).toEqual([{ n: 0 }]); // rolled back, no orphan
  });
  it("assigns student codes per center", async () => {
    await as(U.a);
    expect(
      await rows("select student_code from public.students where id = $1", [studentA]),
    ).toEqual([{ student_code: "S-1001" }]);
    await as(U.b);
    expect(
      await rows("select student_code from public.students where id = $1", [studentB]),
    ).toEqual([{ student_code: "S-1001" }]);
  });
});

describe("isolation between Center A and Center B", () => {
  it("each user reads only its own center, branches, memberships and students", async () => {
    await as(U.a);
    expect(await rows("select id from public.centers")).toEqual([{ id: centerA }]);
    expect(await rows("select id from public.students")).toEqual([{ id: studentA }]);
    expect(
      (await rows<{ center_id: string }>("select distinct center_id from public.memberships")).map(
        (r) => r.center_id,
      ),
    ).toEqual([centerA]);
    await as(U.b);
    expect(await rows("select id from public.centers")).toEqual([{ id: centerB }]);
    expect(await rows("select id from public.students")).toEqual([{ id: studentB }]);
    expect(await rows("select id from public.branches")).toEqual([{ id: branchB }]);
  });
  it("direct reads of the other center by id return nothing", async () => {
    await as(U.a);
    expect(await rows("select * from public.students where id = $1", [studentB])).toEqual([]);
    expect(await rows("select * from public.centers where id = $1", [centerB])).toEqual([]);
    expect(await rows("select * from public.branches where center_id = $1", [centerB])).toEqual([]);
  });
  it("inserting a student into the other center is rejected by RLS", async () => {
    await as(U.a);
    await expect(
      db.query(
        "insert into public.students (center_id, branch_id, name, phone, grade) values ($1, $2, 'Intruder', '01012345678', 'Adult')",
        [centerB, branchB],
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("a student cannot be attached to another center's branch", async () => {
    await as(U.a);
    await expect(
      db.query(
        "insert into public.students (center_id, branch_id, name, phone, grade) values ($1, $2, 'Mixed', '01012345678', 'Adult')",
        [centerA, branchB],
      ),
    ).rejects.toThrow(/foreign key/);
  });
  it("updates aimed at the other center affect zero rows", async () => {
    await as(U.a);
    expect(
      await affected("update public.students set name = 'Hijacked' where id = $1", [studentB]),
    ).toBe(0);
    expect(
      await affected("update public.centers set name = 'Hijacked' where id = $1", [centerB]),
    ).toBe(0);
    await as(U.b);
    expect(await rows("select name from public.students where id = $1", [studentB])).toEqual([
      { name: "Bob Student" },
    ]);
  });
  it("students cannot be moved between centers, re-coded or deleted through the API roles", async () => {
    await as(U.a);
    await expect(
      db.query("update public.students set center_id = $1 where id = $2", [centerB, studentA]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("update public.students set student_code = 'S-9' where id = $1", [studentA]),
    ).rejects.toThrow(/permission denied/);
    await expect(db.query("delete from public.students where id = $1", [studentA])).rejects.toThrow(
      /permission denied/,
    );
    await expect(
      db.query(
        "insert into public.students (center_id, branch_id, student_code, name, phone, grade) values ($1, $2, 'S-5', 'Coded', '01012345678', 'Adult')",
        [centerA, branchA],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("a user cannot add itself to another center or flag a center as demo", async () => {
    await as(U.a);
    await expect(
      db.query(
        "insert into public.memberships (center_id, user_id, role) values ($1, $2, 'owner')",
        [centerB, U.a],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("update public.centers set is_demo = true where id = $1", [centerA]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("update public.centers set next_student_number = 1 where id = $1", [centerA]),
    ).rejects.toThrow(/permission denied/);
    expect(
      await affected("update public.centers set name = 'Center A renamed' where id = $1", [
        centerA,
      ]),
    ).toBe(1);
  });
  it("the anonymous role reads and writes nothing", async () => {
    await asRole("anon", null);
    await expect(db.query("select * from public.students")).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.centers")).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.create_center('Anon', array['Main'])")).rejects.toThrow(
      /permission denied/,
    );
  });
});

describe("roles inside a center", () => {
  it("front desk can create and edit students", async () => {
    await as(U.frontDesk);
    const code = (
      await rows<{ student_code: string }>(
        "insert into public.students (center_id, branch_id, name, phone, grade) values ($1, $2, 'Desk Added', '01212345678', 'Adult') returning student_code",
        [centerA, branchA],
      )
    )[0]!.student_code;
    expect(code).toBe("S-1002");
    expect(
      await affected("update public.students set status = 'Paused' where id = $1", [studentA]),
    ).toBe(1);
  });
  it("a teacher can read students but not create or edit them", async () => {
    await as(U.teacher);
    expect((await rows("select id from public.students")).length).toBeGreaterThanOrEqual(2);
    await expect(
      db.query(
        "insert into public.students (center_id, branch_id, name, phone, grade) values ($1, $2, 'Teacher Added', '01212345678', 'Adult')",
        [centerA, branchA],
      ),
    ).rejects.toThrow(/row-level security/);
    expect(
      await affected("update public.students set name = 'Changed' where id = $1", [studentA]),
    ).toBe(0);
  });
});

describe("Demo Center", () => {
  it("is invisible to customers until an operator grants membership", async () => {
    await as(U.a);
    expect(
      await rows("select * from public.students where center_id = $1", [DEMO_CENTER_ID]),
    ).toEqual([]);
    await asSuperuser();
    await db.query(
      "insert into public.memberships (center_id, user_id, role) values ($1, $2, 'admin')",
      [DEMO_CENTER_ID, U.a],
    );
    await as(U.a);
    const demo = await rows<{ n: number; first: string; last: string }>(
      "select count(*)::int as n, min(student_code) as first, max(student_code) as last from public.students where center_id = $1",
      [DEMO_CENTER_ID],
    );
    expect(demo[0]).toEqual({ n: 300, first: "S-1001", last: "S-1300" });
    expect(
      await rows("select is_demo from public.centers where id = $1", [DEMO_CENTER_ID]),
    ).toEqual([{ is_demo: true }]);
    await asSuperuser();
    await db.query("delete from public.memberships where center_id = $1 and user_id = $2", [
      DEMO_CENTER_ID,
      U.a,
    ]);
  });
  it("new demo students continue after the seeded codes, and customer centers stay unseeded", async () => {
    await asSuperuser();
    expect(
      await rows("select next_student_number from public.centers where id = $1", [DEMO_CENTER_ID]),
    ).toEqual([{ next_student_number: 1301 }]);
    expect(
      await rows("select count(*)::int as n from public.students where center_id in ($1, $2)", [
        centerA,
        centerB,
      ]),
    ).toEqual([{ n: 3 }]);
  });
  it("only the Demo Center may hold sample class codes", async () => {
    await as(U.a);
    await expect(
      db.query(
        "insert into public.students (center_id, branch_id, name, phone, grade, class_codes) values ($1, $2, 'Fake Class', '01012345670', 'Adult', array['C-201'])",
        [centerA, branchA],
      ),
    ).rejects.toThrow(/only allowed in the Demo Center/);
    await expect(
      db.query("update public.students set class_codes = array['C-201'] where id = $1", [studentA]),
    ).rejects.toThrow(/only allowed in the Demo Center/);
    await asSuperuser();
    const demoWithClasses = await rows<{ n: number }>(
      "select count(*)::int as n from public.students where center_id = $1 and cardinality(class_codes) > 0",
      [DEMO_CENTER_ID],
    );
    expect(demoWithClasses[0]!.n).toBeGreaterThan(0);
  });
  it("re-applying the seed is idempotent", async () => {
    await asSuperuser();
    const seed = readdirSync(MIGRATIONS).find((n) => n.includes("demo_center_seed"))!;
    await db.exec(readFileSync(path.join(MIGRATIONS, seed), "utf8"));
    expect(
      await rows("select count(*)::int as n from public.students where center_id = $1", [
        DEMO_CENTER_ID,
      ]),
    ).toEqual([{ n: 300 }]);
  });
});

describe("memberships and invitations", () => {
  it("an owner cannot insert memberships directly", async () => {
    await as(U.a);
    await expect(
      db.query(
        "insert into public.memberships (center_id, user_id, role) values ($1, $2, 'admin')",
        [centerA, U.invitee],
      ),
    ).rejects.toThrow(/permission denied/);
  });
  it("only the invited, email-confirmed user can accept, once", async () => {
    await as(U.a);
    const token = (
      await rows<{ t: string }>(
        "select public.invite_member($1, 'Invitee@Test.local', 'front_desk') as t",
        [centerA],
      )
    )[0]!.t;
    await as(U.b);
    await expect(db.query("select public.accept_invitation($1)", [token])).rejects.toThrow(
      /different email/,
    );
    await as(U.invitee);
    expect(
      (await rows<{ c: string }>("select public.accept_invitation($1) as c", [token]))[0]!.c,
    ).toBe(centerA);
    expect(
      await rows("select role from public.memberships where center_id = $1 and user_id = $2", [
        centerA,
        U.invitee,
      ]),
    ).toEqual([{ role: "front_desk" }]);
    await expect(db.query("select public.accept_invitation($1)", [token])).rejects.toThrow(
      /no longer valid/,
    );
  });
  it("refuses unconfirmed accounts, expired and revoked invitations", async () => {
    await as(U.a);
    const t1 = (
      await rows<{ t: string }>(
        "select public.invite_member($1, 'unconfirmed@test.local', 'teacher') as t",
        [centerA],
      )
    )[0]!.t;
    await as(U.unconfirmed);
    await expect(db.query("select public.accept_invitation($1)", [t1])).rejects.toThrow(
      /different email/,
    );
    await asSuperuser();
    await db.query(
      "update public.invitations set expires_at = now() - interval '1 minute' where token = $1",
      [t1],
    );
    await db.query("update auth.users set email_confirmed_at = now() where id = $1", [
      U.unconfirmed,
    ]);
    await as(U.unconfirmed);
    await expect(db.query("select public.accept_invitation($1)", [t1])).rejects.toThrow(
      /no longer valid/,
    );
    await as(U.a);
    const token2 = (
      await rows<{ t: string }>(
        "select public.invite_member($1, 'later@test.local', 'teacher') as t",
        [centerA],
      )
    )[0]!.t;
    const t2 = (
      await rows<{ id: string }>("select id from public.invitations where token = $1", [token2])
    )[0]!;
    await db.query("select public.revoke_invitation($1)", [t2.id]);
    await asSuperuser();
    expect(
      (
        await rows<{ r: boolean }>(
          "select revoked_at is not null as r from public.invitations where id = $1",
          [t2.id],
        )
      )[0]!.r,
    ).toBe(true);
  });
  it("only owners and admins invite, admins cannot invite admins, and other centers see nothing", async () => {
    await as(U.frontDesk);
    await expect(
      db.query("select public.invite_member($1, 'x@test.local', 'teacher')", [centerA]),
    ).rejects.toThrow(/permission/);
    await as(U.b);
    await expect(
      db.query("select public.invite_member($1, 'x@test.local', 'teacher')", [centerA]),
    ).rejects.toThrow(/permission/);
    expect(await rows("select id from public.invitations")).toEqual([]);
    await as(U.a);
    await expect(
      db.query("select public.invite_member($1, 'boss@test.local', 'owner')", [centerA]),
    ).rejects.toThrow(/check constraint|violates/);
    await asSuperuser();
    await db.query(
      "update public.memberships set role = 'admin' where center_id = $1 and user_id = $2",
      [centerA, U.invitee],
    );
    await as(U.invitee);
    await expect(
      db.query("select public.invite_member($1, 'admin2@test.local', 'admin')", [centerA]),
    ).rejects.toThrow(/permission/);
    expect(
      await rows<{ t: string }>(
        "select public.invite_member($1, 'desk2@test.local', 'front_desk') as t",
        [centerA],
      ),
    ).toHaveLength(1);
  });
  it("a center keeps at least one owner", async () => {
    await as(U.a);
    await expect(
      db.query("delete from public.memberships where center_id = $1 and user_id = $2", [
        centerA,
        U.a,
      ]),
    ).rejects.toThrow(/at least one owner/);
    await expect(
      db.query(
        "update public.memberships set role = 'admin' where center_id = $1 and user_id = $2",
        [centerA, U.a],
      ),
    ).rejects.toThrow(/at least one owner/);
    // With a second owner, the first may step down.
    await db.query(
      "update public.memberships set role = 'owner' where center_id = $1 and user_id = $2",
      [centerA, U.invitee],
    );
    expect(
      await affected(
        "update public.memberships set role = 'admin' where center_id = $1 and user_id = $2",
        [centerA, U.a],
      ),
    ).toBe(1);
    await as(U.invitee);
    expect(
      await affected(
        "update public.memberships set role = 'owner' where center_id = $1 and user_id = $2",
        [centerA, U.a],
      ),
    ).toBe(1);
    expect(
      await affected(
        "update public.memberships set role = 'admin' where center_id = $1 and user_id = $2",
        [centerA, U.invitee],
      ),
    ).toBe(1);
  });
  it("limits center creation to three per user per day", async () => {
    await as(U.teacher);
    for (const n of [1, 2, 3])
      await db.query("select public.create_center($1, array['Main'])", [`Teacher Center ${n}`]);
    await expect(
      db.query("select public.create_center('Teacher Center 4', array['Main'])"),
    ).rejects.toThrow(/Too many centers/);
  });
});
