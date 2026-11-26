/**
 * Two-tenant RLS check against a real Supabase project (Decision 4). Uses only the publishable key and two
 * ordinary user accounts, exactly like the app, so it exercises Supabase Auth, PostgREST and RLS together.
 *
 *   SUPABASE_URL=… SUPABASE_PUBLISHABLE_KEY=… \
 *   RLS_USER_A_EMAIL=… RLS_USER_A_PASSWORD=… RLS_USER_B_EMAIL=… RLS_USER_B_PASSWORD=… \
 *   bun scripts/rls-integration.ts
 *
 * Use a staging project or dedicated test accounts: each run adds two test students to each test center
 * (students cannot be deleted through the API by design). Set RLS_SIGN_UP=1 to create the accounts when the
 * project allows sign-up without email confirmation (as `supabase start` does locally).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing ${k}`);
  return v;
};
const url = env("SUPABASE_URL");
const key = env("SUPABASE_PUBLISHABLE_KEY");
const client = () =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
};

async function signIn(label: string, email: string, password: string) {
  const sb = client();
  let r = await sb.auth.signInWithPassword({ email, password });
  if (r.error && process.env.RLS_SIGN_UP === "1") {
    const up = await sb.auth.signUp({ email, password });
    if (up.error) throw new Error(`${label} sign-up: ${up.error.message}`);
    r = await sb.auth.signInWithPassword({ email, password });
  }
  if (r.error) throw new Error(`${label} sign-in: ${r.error.message}`);
  return { sb, userId: r.data.user.id };
}

async function ownCenter(sb: SupabaseClient, userId: string, name: string) {
  const m = await sb.from("center_members").select("center_id").eq("user_id", userId).limit(1);
  if (m.error) throw new Error(m.error.message);
  if (m.data[0]) return m.data[0].center_id as string;
  const c = await sb.rpc("create_center", {
    center_name: name,
    branch_name: "Main branch",
    owner_name: name,
  });
  if (c.error) throw new Error(c.error.message);
  return c.data as string;
}

const phone = () => `010${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
const addStudent = (sb: SupabaseClient, center: string, name: string) =>
  sb
    .rpc("add_student", { target_center: center, student_name: name, student_phone: phone() })
    .single<{ id: string; code: string; center_id: string }>();

async function main() {
  const run = Date.now().toString(36);
  const a = await signIn("A", env("RLS_USER_A_EMAIL"), env("RLS_USER_A_PASSWORD"));
  const b = await signIn("B", env("RLS_USER_B_EMAIL"), env("RLS_USER_B_PASSWORD"));
  check("two distinct users", a.userId !== b.userId);
  const centerA = await ownCenter(a.sb, a.userId, "RLS Test Center A");
  const centerB = await ownCenter(b.sb, b.userId, "RLS Test Center B");
  check("separate centers", centerA !== centerB);

  const sa = await addStudent(a.sb, centerA, `Test Student A ${run}`);
  check(
    "A adds a student to its own center",
    !sa.error && sa.data?.center_id === centerA,
    sa.error?.message ?? sa.data?.code,
  );
  const sb_ = await addStudent(b.sb, centerB, `Test Student B ${run}`);
  check(
    "B adds a student to its own center",
    !sb_.error && sb_.data?.center_id === centerB,
    sb_.error?.message ?? sb_.data?.code,
  );

  // Reads
  const centersA = await a.sb.from("centers").select("id, is_demo");
  check(
    "A sees only its center (and the demo center)",
    !centersA.error && centersA.data.every((c) => c.id === centerA || c.is_demo),
    JSON.stringify(centersA.data?.length),
  );
  const leakA = await a.sb.from("students").select("id").eq("center_id", centerB);
  check(
    "A reads none of B's students",
    !leakA.error && leakA.data.length === 0,
    `${leakA.data?.length ?? leakA.error?.message}`,
  );
  const leakB = await b.sb.from("students").select("id").eq("center_id", centerA);
  check(
    "B reads none of A's students",
    !leakB.error && leakB.data.length === 0,
    `${leakB.data?.length ?? leakB.error?.message}`,
  );
  const membersB = await a.sb.from("center_members").select("user_id").eq("center_id", centerB);
  check("A reads none of B's members", !membersB.error && membersB.data.length === 0);
  const branchesB = await a.sb.from("branches").select("id").eq("center_id", centerB);
  check("A reads none of B's branches", !branchesB.error && branchesB.data.length === 0);

  // Writes across tenants
  const rpcIntoB = await addStudent(a.sb, centerB, `Intruder ${run}`);
  check("A cannot add a student to B's center (RPC)", !!rpcIntoB.error, rpcIntoB.error?.code);
  const insertIntoB = await a.sb
    .from("students")
    .insert({ center_id: centerB, name: `Intruder ${run}`, phone: phone() });
  check("A cannot insert into B's center (REST)", !!insertIntoB.error, insertIntoB.error?.code);
  const updateB = await a.sb
    .from("students")
    .update({ name: "Hijacked" })
    .eq("id", sb_.data!.id)
    .select("id");
  check(
    "A cannot update B's student",
    !updateB.error && updateB.data.length === 0,
    updateB.error?.message,
  );
  const stillB = await b.sb.from("students").select("name").eq("id", sb_.data!.id).single();
  check("B's student is unchanged", stillB.data?.name === `Test Student B ${run}`);
  const moveB = await a.sb
    .from("students")
    .update({ center_id: centerA })
    .eq("id", sa.data!.id)
    .select("id");
  check("A cannot move its student to another center", !!moveB.error, moveB.error?.code);
  const del = await a.sb.from("students").delete().eq("id", sa.data!.id).select("id");
  check("students cannot be deleted", !!del.error || del.data.length === 0, del.error?.code);
  const second = await a.sb.rpc("create_center", { center_name: "Second center" });
  check("one center per account", !!second.error, second.error?.code);

  // Demo center: readable, never writable
  const demo = centersA.data?.find((c) => c.is_demo);
  if (demo) {
    const demoCount = await a.sb
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("center_id", demo.id);
    check("demo center students are readable", (demoCount.count ?? 0) > 0, String(demoCount.count));
    const demoWrite = await addStudent(a.sb, demo.id, `Demo Writer ${run}`);
    check("demo center is read-only", !!demoWrite.error, demoWrite.error?.code);
  } else check("demo center is seeded", false);

  // Signed out
  const anon = client();
  const anonRead = await anon.from("students").select("id").limit(1);
  check(
    "signed-out requests read no students",
    !!anonRead.error || anonRead.data.length === 0,
    anonRead.error?.code,
  );
  const anonCreate = await anon.rpc("create_center", { center_name: "Anon center" });
  check("signed-out requests cannot create centers", !!anonCreate.error, anonCreate.error?.code);

  console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
