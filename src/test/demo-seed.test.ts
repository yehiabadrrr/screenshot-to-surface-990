// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildDemoSeedSql } from "@/lib/demo-seed";
import { students } from "@/lib/data";

const file = path.resolve(__dirname, "../../supabase/migrations/20261125120100_demo_center_seed.sql");

describe("Demo Center seed migration", () => {
  it("matches the deterministic sample data in data.ts", () => {
    const expected = buildDemoSeedSql();
    if (process.env["UPDATE_DEMO_SEED"] === "1") writeFileSync(file, expected);
    expect(readFileSync(file, "utf8").replace(/\r\n/g, "\n")).toBe(expected);
  });
  it("keeps every original student code, so the demo ledger still matches", () => {
    const sql = buildDemoSeedSql();
    expect(students).toHaveLength(300);
    for (const s of students) expect(sql).toContain(`'${s.id}'`);
  });
});
