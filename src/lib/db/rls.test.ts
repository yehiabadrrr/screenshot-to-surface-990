// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { as, asAdmin, createUser, freshDb } from "./test-db";
import { DEMO_CENTER_ID, demoSeedSql } from "./demo-seed-sql";
import {
  students as sampleStudents,
  classes as sampleClasses,
  teachers as sampleTeachers,
  seedEnrollmentRules,
} from "../data";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const T = "cccccccc-0000-4000-8000-000000000003";

let db: PGlite;
let centerA = "";
let centerB = "";
const one = async <R>(sql: string, params: unknown[] = []) =>
  (await db.query<R>(sql, params)).rows[0]!;
const count = async (sql: string, params: unknown[] = []) =>
  Number((await one<{ n: number }>(sql, params)).n);

beforeAll(async () => {
  db = await freshDb();
  await createUser(db, A, "owner-a@test.local");
  await createUser(db, B, "owner-b@test.local");
  await createUser(db, T, "teacher-a@test.local");
  await as(db, A);
  centerA = (
    await one<{ id: string }>("select public.create_center('Center A', 'Dokki', 'Owner A') as id")
  ).id;
  await as(db, B);
  centerB = (
    await one<{ id: string }>("select public.create_center('Center B', 'Zamalek', 'Owner B') as id")
  ).id;
  await asAdmin(db);
  await db.query(
    "insert into public.center_members (center_id, user_id, role) values ($1, $2, 'teacher')",
    [centerA, T],
  );
}, 60_000);

describe("migrations", () => {
  it("the committed demo seed matches src/lib/data.ts", () => {
    const committed = readFileSync(
      join(__dirname, "../../../supabase/migrations/20261126000200_demo_center_seed.sql"),
      "utf8",
    );
    expect(committed).toBe(demoSeedSql());
  });

  it("seeds exactly one demo center with the sample data, codes intact", async () => {
    await asAdmin(db);
    expect(await count("select count(*) n from public.centers where is_demo")).toBe(1);
    expect(
      await count("select count(*) n from public.students where center_id = $1", [DEMO_CENTER_ID]),
    ).toBe(sampleStudents.length);
    expect(
      await count("select count(*) n from public.classes where center_id = $1", [DEMO_CENTER_ID]),
    ).toBe(sampleClasses.length);
    expect(
      await count("select count(*) n from public.teachers where center_id = $1", [DEMO_CENTER_ID]),
    ).toBe(sampleTeachers.length);
    const enrollments = sampleStudents.reduce((n, s) => n + s.classIds.length, 0);
    expect(
      await count("select count(*) n from public.enrollments where center_id = $1", [
        DEMO_CENTER_ID,
      ]),
    ).toBe(enrollments);
    const first = sampleStudents[0]!;
    const row = await one<{ name: string; phone: string; status: string }>(
      "select name, phone, status from public.students where code = $1",
      [first.id],
    );
    expect(row).toEqual({
      name: first.name,
      phone: first.phone,
      status: first.status.toLowerCase(),
    });
    expect(
      await count("select count(*) n from public.enrollments where rule_kind is not null"),
    ).toBe(Object.keys(seedEnrollmentRules).length);
  });

  it("a demo enrollment links the same student and class codes as the app", async () => {
    await asAdmin(db);
    const s = sampleStudents.find((x) => x.classIds.length > 1)!;
    const codes = (
      await db.query<{ code: string }>(
        "select c.code from public.enrollments e join public.students s on s.id = e.student_id join public.classes c on c.id = e.class_id where s.code = $1 order by c.code",
        [s.id],
      )
    ).rows.map((r) => r.code);
    expect(codes).toEqual([...s.classIds].sort());
  });
});

describe("onboarding", () => {
  it("creates a center with an owner and one branch, and no sample data", async () => {
    await as(db, A);
    expect(
      await one("select role, display_name from public.center_members where center_id = $1", [
        centerA,
      ]),
    ).toEqual({ role: "owner", display_name: "Owner A" });
    expect(
      await count("select count(*) n from public.branches where center_id = $1", [centerA]),
    ).toBe(1);
    await asAdmin(db);
    for (const table of ["students", "classes", "teachers", "enrollments"])
      expect(
        await count(`select count(*) n from public.${table} where center_id = $1`, [centerA]),
      ).toBe(0);
  });

  it("one center per account, and signed-out callers cannot create one", async () => {
    await as(db, A);
    await expect(db.query("select public.create_center('Second', 'X', '')")).rejects.toThrow(
      /already belongs/,
    );
    await as(db, null);
    await expect(db.query("select public.create_center('Anon', 'X', '')")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("nobody can insert centers or memberships directly", async () => {
    await as(db, A);
    await expect(
      db.query("insert into public.centers (name, is_demo) values ('Sneaky', true)"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query(
        "insert into public.center_members (center_id, user_id, role) values ($1, $2, 'owner')",
        [centerB, A],
      ),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("tenant isolation", () => {
  beforeAll(async () => {
    await as(db, A);
    await db.query(
      "select public.add_student($1, 'Salma Fathy', '01012345678', 'Hany Fathy', '01112345678', 'Prep 3')",
      [centerA],
    );
    await as(db, B);
    await db.query("select public.add_student($1, 'Omar Zaki', '01212345678', '', '', 'Adult')", [
      centerB,
    ]);
  });

  it("each owner sees only their own center (plus the read-only demo center)", async () => {
    await as(db, A);
    const centers = (
      await db.query<{ id: string }>("select id from public.centers order by is_demo")
    ).rows.map((r) => r.id);
    expect(centers).toEqual([centerA, DEMO_CENTER_ID]);
    expect(
      (await db.query("select name from public.students where center_id <> $1", [DEMO_CENTER_ID]))
        .rows,
    ).toEqual([{ name: "Salma Fathy" }]);
    expect(
      await count("select count(*) n from public.students where center_id = $1", [centerB]),
    ).toBe(0);
    expect(
      await count("select count(*) n from public.center_members where center_id = $1", [centerB]),
    ).toBe(0);
    expect(
      await count("select count(*) n from public.branches where center_id = $1", [centerB]),
    ).toBe(0);
  });

  it("student codes are assigned per center", async () => {
    await as(db, A);
    expect(
      (
        await one<{ code: string }>("select code from public.students where center_id = $1", [
          centerA,
        ])
      ).code,
    ).toBe("S-1001");
    await as(db, B);
    expect(
      (
        await one<{ code: string }>("select code from public.students where center_id = $1", [
          centerB,
        ])
      ).code,
    ).toBe("S-1001");
    await as(db, A);
    const next = await one<{ code: string }>(
      "select (public.add_student($1, 'Rana Saleh', '01512345678')).code",
      [centerA],
    );
    expect(next.code).toBe("S-1002");
  });

  it("cannot write into another center or the demo center", async () => {
    await as(db, A);
    await expect(
      db.query("select public.add_student($1, 'Intruder One', '01012345670')", [centerB]),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.query(
        "insert into public.students (center_id, name, phone) values ($1, 'Intruder Two', '01012345671')",
        [centerB],
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      db.query("select public.add_student($1, 'Demo Writer', '01012345672')", [DEMO_CENTER_ID]),
    ).rejects.toThrow(/row-level security/);
    const updated = await db.query(
      "update public.students set name = 'Hijacked' where center_id in ($1, $2)",
      [centerB, DEMO_CENTER_ID],
    );
    expect(updated.affectedRows).toBe(0);
  });

  it("cannot enroll a student in another center's class", async () => {
    await as(db, A);
    const demoClass = (
      await one<{ id: string }>("select id from public.classes where center_id = $1 limit 1", [
        DEMO_CENTER_ID,
      ])
    ).id;
    await expect(
      db.query(
        "select public.add_student($1, 'Cross Enroll', '01012345673', '', '', '', $2::jsonb)",
        [centerA, JSON.stringify([{ class_id: demoClass }])],
      ),
    ).rejects.toThrow(/foreign key|violates/);
  });

  it("students cannot be deleted, re-coded or moved to another center", async () => {
    await as(db, A);
    await expect(
      db.query("delete from public.students where center_id = $1", [centerA]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("update public.students set code = 'S-9999' where center_id = $1", [centerA]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("update public.students set center_id = $2 where center_id = $1", [
        centerA,
        centerB,
      ]),
    ).rejects.toThrow(/permission denied/);
    expect(
      (
        await db.query(
          "update public.students set status = 'paused' where code = 'S-1002' and center_id = $1",
          [centerA],
        )
      ).affectedRows,
    ).toBe(1);
  });

  it("a teacher member can read but not add students", async () => {
    await as(db, T);
    expect(
      await count("select count(*) n from public.students where center_id = $1", [centerA]),
    ).toBe(2);
    await expect(
      db.query("select public.add_student($1, 'Teacher Added', '01012345674')", [centerA]),
    ).rejects.toThrow(/row-level security/);
  });

  it("signed-out (anon) requests read nothing", async () => {
    await as(db, null);
    for (const table of ["centers", "students", "classes", "enrollments", "center_members"])
      await expect(db.query(`select * from public.${table}`)).rejects.toThrow(/permission denied/);
  });
});

describe("enrollments", () => {
  it("stores a per-student billing rule override in piastres", async () => {
    await asAdmin(db);
    const classId = (
      await one<{ id: string }>(
        "insert into public.classes (center_id, code, name, kind, capacity, fee_piastres, rule_kind, rule_fee_piastres) values ($1, 'C-1', 'Algebra', 'tutoring', 20, 40000, 'monthly', 40000) returning id",
        [centerA],
      )
    ).id;
    await as(db, A);
    const s = await one<{ id: string }>(
      "select (public.add_student($1, 'Ali Gamal', '01112223334', '', '', '', $2::jsonb)).id",
      [
        centerA,
        JSON.stringify([
          {
            class_id: classId,
            rule_kind: "per_session",
            rule_rate_piastres: 7000,
            rule_charge_no_show: true,
          },
        ]),
      ],
    );
    expect(
      await one(
        "select rule_kind, rule_rate_piastres::int as rate, rule_charge_no_show from public.enrollments where student_id = $1",
        [s.id],
      ),
    ).toEqual({ rule_kind: "per_session", rate: 7000, rule_charge_no_show: true });
  });

  it("rejects an incomplete billing rule", async () => {
    await as(db, A);
    const classId = (
      await one<{ id: string }>("select id from public.classes where center_id = $1", [centerA])
    ).id;
    await expect(
      db.query("select public.add_student($1, 'Bad Rule', '01112223335', '', '', '', $2::jsonb)", [
        centerA,
        JSON.stringify([{ class_id: classId, rule_kind: "package" }]),
      ]),
    ).rejects.toThrow(/enrollments_rule_complete/);
  });
});
