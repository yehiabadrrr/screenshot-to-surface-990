// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildDemoRenameSql, buildDemoSeedSql } from "@/lib/demo-seed";
import { demoRenames, students } from "@/lib/data";

const file = path.resolve(__dirname, "../../supabase/migrations/20261125120100_demo_center_seed.sql");
const renameFile = path.resolve(__dirname, "../../supabase/migrations/20261126120000_demo_unique_student_names.sql");

describe("Demo Center seed migration", () => {
  it("matches the deterministic sample data in data.ts", () => {
    const expected = buildDemoSeedSql();
    if (process.env["UPDATE_DEMO_SEED"] === "1") writeFileSync(file, expected);
    expect(readFileSync(file, "utf8").replace(/\r\n/g, "\n")).toBe(expected);
  });
  it("rename migration brings the seeded names to the current, unique sample names", () => {
    const expected = buildDemoRenameSql();
    if (process.env["UPDATE_DEMO_SEED"] === "1") writeFileSync(renameFile, expected);
    expect(readFileSync(renameFile, "utf8").replace(/\r\n/g, "\n")).toBe(expected);
    const names = new Map(students.map((s) => [s.id, s.name]));
    for (const r of demoRenames) expect(names.get(r.id)).toBe(r.to);
    expect(new Set(students.map((s) => s.name)).size).toBe(students.length);
  });
  it("keeps every original student code, so the demo ledger still matches", () => {
    const sql = buildDemoSeedSql();
    expect(students).toHaveLength(300);
    for (const s of students) expect(sql).toContain(`'${s.id}'`);
  });
});
