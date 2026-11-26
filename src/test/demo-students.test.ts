// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createLocalStudents, queryStudents, sampleStudentRows } from "@/lib/students/source";
import { DEMO_BRANCH_IDS } from "@/lib/demo-seed";
import { LOCAL_DEMO_CENTER_ID } from "@/lib/demo-mode";

const C = LOCAL_DEMO_CENTER_ID;
const base = { centerId: C, q: "", page: 0, pageSize: 15 };

describe("in-browser demo student store", () => {
  const rows = sampleStudentRows(C);

  it("seeds the 300 sample students with their S- codes and demo branch ids", () => {
    expect(rows).toHaveLength(300);
    expect(new Set(rows.map((r) => r.student_code)).size).toBe(300);
    const branchIds = new Set(Object.values(DEMO_BRANCH_IDS));
    for (const r of rows) {
      expect(r.student_code).toMatch(/^S-\d+$/);
      expect(branchIds.has(r.branch_id)).toBe(true);
    }
  });

  it("filters like listStudents: search on name, code and phone, plus grade, branch and status", () => {
    const one = rows[17]!;
    expect(queryStudents(rows, { ...base, q: one.student_code.toLowerCase() }).rows.map((r) => r.student_code)).toContain(one.student_code);
    expect(queryStudents(rows, { ...base, q: one.phone }).rows.map((r) => r.id)).toContain(one.id);
    const byStatus = queryStudents(rows, { ...base, status: "Paused", pageSize: 100 });
    expect(byStatus.total).toBe(rows.filter((r) => r.status === "Paused").length);
    const byBranch = queryStudents(rows, { ...base, branchId: DEMO_BRANCH_IDS.Maadi, pageSize: 100 });
    expect(byBranch.rows.every((r) => r.branch_id === DEMO_BRANCH_IDS.Maadi)).toBe(true);
    expect(queryStudents(rows, { ...base, codes: [] })).toEqual({ rows: [], total: 0 });
  });

  it("sorts and pages: name with code as tie-breaker, code, newest", () => {
    const byName = queryStudents(rows, { ...base, pageSize: 100 }).rows;
    for (let i = 1; i < byName.length; i++) expect(byName[i - 1]!.name <= byName[i]!.name).toBe(true);
    const byCode = queryStudents(rows, { ...base, sort: "code", descending: true, pageSize: 100 }).rows;
    expect(byCode[0]!.student_code >= byCode[1]!.student_code).toBe(true);
    const newest = queryStudents(rows, { ...base, sort: "newest", pageSize: 100 }).rows;
    expect(newest[0]!.joined_on >= newest[99]!.joined_on).toBe(true);
    const p2 = queryStudents(rows, { ...base, page: 1 });
    expect(p2.rows[0]!.id).toBe(byName[15]!.id);
    expect(p2.total).toBe(300);
  });

  it("creates with the next S- code and updates in memory; a new store starts from the seed again", async () => {
    const store = createLocalStudents(C);
    const made = await store.create({ centerId: C, branchId: DEMO_BRANCH_IDS["Nasr City"], name: "Test Student", phone: "01000000000", guardianName: "", guardianPhone: "", grade: "Grade 10", status: "Active", classCodes: [] });
    expect(made.student_code).toBe(`S-${Math.max(...rows.map((r) => Number(r.student_code.slice(2)))) + 1}`);
    const edited = await store.update({ centerId: C, code: made.student_code, patch: { name: "Renamed" } });
    expect(edited.name).toBe("Renamed");
    expect((await store.get(C, made.student_code))?.name).toBe("Renamed");
    expect(await createLocalStudents(C).get(C, made.student_code)).toBeNull();
  });

  it("refuses writes to any other center", async () => {
    const store = createLocalStudents(C);
    await expect(store.create({ centerId: "d3e00000-0000-4000-8000-000000000001", branchId: DEMO_BRANCH_IDS.Maadi, name: "X Y", phone: "01000000000", guardianName: "", guardianPhone: "", grade: "Grade 10", status: "Active", classCodes: [] })).rejects.toThrow();
  });
});
