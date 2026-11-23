import { describe, it, expect } from "vitest";
import { balanceLabel, selectStudents, contactErrors, type StudentRow } from "./student-display";
const base = { phone: "01012345678", guardian: "Parent", guardianPhone: "", branch: "Maadi" as const, classIds: ["C-201"], grade: "Adult", status: "Active" as const, joined: "2026-11-23" };
const rows: StudentRow[] = [
  { ...base, id: "S-1", name: "Ziad", balance: 100.5, attendance: 80 },
  { ...base, id: "S-2", name: "Ahmed", balance: -50, attendance: 90 },
  { ...base, id: "S-3", name: "Nour", balance: 0, attendance: 70 },
];
const filters = { query: "", grade: "all", branch: "all", balance: "all", status: "all" };
describe("student directory display", () => {
  it("labels balances without color dependence", () => { expect(balanceLabel(100.5)).toBe("Owing"); expect(balanceLabel(-50)).toBe("Credit"); expect(balanceLabel(0)).toBe("Settled"); });
  it("sorts name, balance and attendance without mutating rows", () => {
    expect(selectStudents(rows, filters, "name", false).map((s) => s.id)).toEqual(["S-2", "S-3", "S-1"]);
    expect(selectStudents(rows, filters, "balance", true).map((s) => s.id)).toEqual(["S-1", "S-3", "S-2"]);
    expect(selectStudents(rows, filters, "attendance", true).map((s) => s.id)).toEqual(["S-2", "S-1", "S-3"]);
    expect(rows[0]?.id).toBe("S-1");
  });
  it("filters by name/phone/ID, grade, branch and balance", () => {
    expect(selectStudents(rows, { ...filters, query: "S-2", balance: "Credit" }, "name", false).map((s) => s.id)).toEqual(["S-2"]);
    expect(selectStudents(rows, { ...filters, grade: "Prep 3" }, "name", false)).toEqual([]);
    expect(selectStudents(rows, { ...filters, branch: "Nasr City" }, "name", false)).toEqual([]);
    expect(selectStudents(rows, { ...filters, query: "01012345678" }, "name", false)).toHaveLength(3);
  });
  it("preserves the existing contact validation rules", () => {
    expect(contactErrors("Al", "123", "123").name).toBe("Enter the student's full name.");
    expect(contactErrors("Ahmed", "01012345678", "")).toEqual({ name: "", phone: "", guardianPhone: "" });
  });
});