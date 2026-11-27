// @vitest-environment node
/**
 * Live tenant-isolation suite against a real Supabase TEST project (Decision 4). Runs only when the
 * SUPABASE_TEST_* variables are set (shell or .env.test.local); otherwise it is skipped.
 *
 * Signs in two real users with the publishable key only (no service-role key), exactly as the app does,
 * gives each its own center, and proves that neither can read or modify the other's data through RLS.
 * Run: npm run test:rls-live. Setup: supabase/README.md → "Live RLS suite".
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadEnv } from "vite";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const env = { ...loadEnv("test", process.cwd(), ""), ...process.env } as Record<
  string,
  string | undefined
>;
const cfg = {
  url: env["SUPABASE_TEST_URL"],
  key: env["SUPABASE_TEST_PUBLISHABLE_KEY"],
  a: { email: env["SUPABASE_TEST_USER_A_EMAIL"], password: env["SUPABASE_TEST_USER_A_PASSWORD"] },
  b: { email: env["SUPABASE_TEST_USER_B_EMAIL"], password: env["SUPABASE_TEST_USER_B_PASSWORD"] },
};
const configured = Boolean(
  cfg.url && cfg.key && cfg.a.email && cfg.a.password && cfg.b.email && cfg.b.password,
);

type Client = SupabaseClient<Database>;
type Tenant = {
  client: Client;
  userId: string;
  centerId: string;
  branchId: string;
  studentId: string;
};

const newClient = (): Client =>
  createClient<Database>(cfg.url!, cfg.key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Signs in and makes sure the user owns one customer (non-demo) center with one probe student. */
async function tenant(who: "a" | "b"): Promise<Tenant> {
  const client = newClient();
  const { data: auth, error } = await client.auth.signInWithPassword({
    email: cfg[who].email!,
    password: cfg[who].password!,
  });
  if (error || !auth.user)
    throw new Error(`Sign-in failed for test user ${who.toUpperCase()}: ${error?.message}`);
  const userId = auth.user.id;
  const { data: owned } = await client
    .from("memberships")
    .select("center_id, role")
    .eq("user_id", userId)
    .eq("role", "owner");
  const { data: centers } = await client
    .from("centers")
    .select("id, is_demo")
    .in(
      "id",
      (owned ?? []).map((m) => m.center_id),
    );
  let centerId = centers?.find((c) => !c.is_demo)?.id;
  if (!centerId) {
    const { data: id, error: e } = await client.rpc("create_center", {
      p_name: `RLS test center ${who.toUpperCase()}`,
      p_branches: ["Main"],
    });
    if (e || !id) throw new Error(`create_center failed for ${who}: ${e?.message}`);
    centerId = id;
  }
  const { data: branches } = await client
    .from("branches")
    .select("id")
    .eq("center_id", centerId)
    .limit(1);
  const branchId = branches?.[0]?.id;
  if (!branchId) throw new Error(`Center for ${who} has no branch`);
  const probe = `RLS Probe ${who.toUpperCase()}`;
  let { data: student } = await client
    .from("students")
    .select("id")
    .eq("center_id", centerId)
    .eq("name", probe)
    .maybeSingle();
  if (!student) {
    const ins = await client
      .from("students")
      .insert({
        center_id: centerId,
        branch_id: branchId,
        name: probe,
        phone: who === "a" ? "01000000001" : "01100000002",
        grade: "Adult",
      })
      .select("id")
      .single();
    if (ins.error) throw new Error(`Probe insert failed for ${who}: ${ins.error.message}`);
    student = ins.data;
  }
  return { client, userId, centerId, branchId, studentId: student.id };
}

describe.skipIf(!configured)("live Supabase RLS: two users, two centers", () => {
  let A: Tenant, B: Tenant;
  beforeAll(async () => {
    A = await tenant("a");
    B = await tenant("b");
  }, 60_000);

  it("uses two different users and centers", () => {
    expect(A.userId).not.toBe(B.userId);
    expect(A.centerId).not.toBe(B.centerId);
  });

  for (const [self, other] of [
    ["A", "B"],
    ["B", "A"],
  ] as const) {
    describe(`${self} against ${other}`, () => {
      const me = () => (self === "A" ? A : B);
      const them = () => (self === "A" ? B : A);

      it("reads only its own centers, branches, memberships and students", async () => {
        const { client } = me();
        const [c, b, m, s] = await Promise.all([
          client.from("centers").select("id"),
          client.from("branches").select("center_id"),
          client.from("memberships").select("center_id"),
          client.from("students").select("center_id"),
        ]);
        for (const r of [c, b, m, s]) expect(r.error).toBeNull();
        expect(c.data!.map((x) => x.id)).not.toContain(them().centerId);
        for (const rows of [b.data!, m.data!, s.data!])
          expect(rows.map((x) => x.center_id)).not.toContain(them().centerId);
        expect(s.data!.length).toBeGreaterThan(0);
      });

      it("gets nothing when reading the other center's rows by id", async () => {
        const { client } = me();
        expect(
          (await client.from("students").select("id").eq("id", them().studentId)).data,
        ).toEqual([]);
        expect((await client.from("centers").select("id").eq("id", them().centerId)).data).toEqual(
          [],
        );
        expect(
          (await client.from("branches").select("id").eq("center_id", them().centerId)).data,
        ).toEqual([]);
      });

      it("cannot insert a student into the other center", async () => {
        const { error } = await me().client.from("students").insert({
          center_id: them().centerId,
          branch_id: them().branchId,
          name: "Cross-tenant insert",
          phone: "01200000003",
          grade: "Adult",
        });
        expect(error).not.toBeNull();
        expect(error!.code).toBe("42501");
      });

      it("updates and deletes aimed at the other center change nothing", async () => {
        const upd = await me()
          .client.from("students")
          .update({ name: "Hijacked" })
          .eq("id", them().studentId)
          .select("id");
        expect(upd.data ?? []).toEqual([]);
        const del = await me()
          .client.from("students")
          .delete()
          .eq("id", them().studentId)
          .select("id");
        expect(del.data ?? []).toEqual([]);
        const check = await them()
          .client.from("students")
          .select("name")
          .eq("id", them().studentId)
          .single();
        expect(check.data?.name).toBe(`RLS Probe ${other}`);
      });

      it("cannot move its own student into the other center or add itself to it", async () => {
        const move = await me()
          .client.from("students")
          .update({ center_id: them().centerId } as never)
          .eq("id", me().studentId);
        expect(move.error).not.toBeNull();
        const join = await me()
          .client.from("memberships")
          .insert({ center_id: them().centerId, user_id: me().userId, role: "owner" });
        expect(join.error).not.toBeNull();
      });
    });
  }

  it("an anonymous client reads no tenant data", async () => {
    const anon = newClient();
    for (const table of ["centers", "branches", "memberships", "students"] as const) {
      const { data, error } = await anon.from(table).select("*").limit(1);
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    }
  });
});
