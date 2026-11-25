/**
 * Builds the SQL that seeds the dedicated Demo Center from the deterministic sample data in data.ts.
 * Student codes (S-1001…), branches and sample class ids are kept so the in-memory demo ledger and
 * attendance (keyed by those codes) still match. Customer centers are never seeded.
 */
import { students, branches } from "./data";

export const DEMO_CENTER_ID = "d3e00000-0000-4000-8000-000000000001";
export const DEMO_CENTER_NAME = "Nile Academy (Demo)";
export const DEMO_BRANCH_IDS: Record<(typeof branches)[number], string> = {
  "Nasr City": "d3e00000-0000-4000-8000-000000000101",
  Heliopolis: "d3e00000-0000-4000-8000-000000000102",
  Maadi: "d3e00000-0000-4000-8000-000000000103",
};

const lit = (v: string | null | undefined) => (v == null || v === "" ? "null" : `'${v.replace(/'/g, "''")}'`);
const arr = (xs: string[]) => `array[${xs.map(lit).join(", ")}]::text[]`;

export function buildDemoSeedSql(): string {
  const lines: string[] = [
    "-- Demo Center: the 300 deterministic sample students with their original S- codes.",
    "-- GENERATED from src/lib/data.ts by src/test/demo-seed.test.ts (UPDATE_DEMO_SEED=1). Do not edit by hand.",
    "-- Nobody is a member by default; grant access with a membership migration (see supabase/README.md).",
    "",
    `insert into public.centers (id, name, is_demo, created_by) values (${lit(DEMO_CENTER_ID)}, ${lit(DEMO_CENTER_NAME)}, true, null)`,
    "on conflict (id) do nothing;",
    "",
    "insert into public.branches (id, center_id, name) values",
    branches.map((b, i) => `  (${lit(DEMO_BRANCH_IDS[b])}, ${lit(DEMO_CENTER_ID)}, ${lit(b)})${i === branches.length - 1 ? "" : ","}`).join("\n"),
    "on conflict (id) do nothing;",
    "",
    "insert into public.students (center_id, branch_id, student_code, name, phone, guardian_name, guardian_phone, grade, status, joined_on, class_codes, created_by) values",
    students.map((s, i) => `  (${[lit(DEMO_CENTER_ID), lit(DEMO_BRANCH_IDS[s.branch as keyof typeof DEMO_BRANCH_IDS]), lit(s.id), lit(s.name), lit(s.phone), lit(s.guardian), lit(s.guardianPhone), lit(s.grade), lit(s.status), lit(s.joined), arr(s.classIds), "null"].join(", ")})${i === students.length - 1 ? "" : ","}`).join("\n"),
    "on conflict (center_id, student_code) do nothing;",
    "",
  ];
  return lines.join("\n");
}
