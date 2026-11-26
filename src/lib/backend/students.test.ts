import { describe, expect, it } from "vitest";
import {
  addStudentArgs,
  classFromRow,
  enrollmentRulesFromRows,
  studentFromRow,
  type StudentRowDb,
} from "./students";
import { columnsToRule, ruleToColumns } from "../db/rules";
import type { BillingRule } from "../billing";
import { DIRECTORY_SORTS } from "../student-display";

const noRule = {
  rule_kind: null,
  rule_fee_piastres: null,
  rule_rate_piastres: null,
  rule_charge_no_show: null,
  rule_package_sessions: null,
  rule_package_price_piastres: null,
  rule_count_no_show: null,
};
const row: StudentRowDb = {
  id: "uuid-1",
  code: "S-1001",
  name: "Salma Fathy",
  phone: "01012345678",
  guardian_name: "",
  guardian_phone: "",
  grade: "Prep 3",
  status: "paused",
  joined_on: "2026-11-20",
  demo_attendance_pct: null,
  branches: { name: "Dokki" },
  enrollments: [
    { ...noRule, classes: { code: "C-201" } },
    {
      ...ruleToColumns({ kind: "per_session", rate: 70, chargeNoShow: true }),
      classes: { code: "C-202" },
    },
  ],
};

describe("billing rule columns", () => {
  it("round-trips every rule kind through piastres", () => {
    const rules: BillingRule[] = [
      { kind: "monthly", fee: 450 },
      { kind: "per_session", rate: 70.5, chargeNoShow: false },
      { kind: "package", sessions: 8, price: 1200, countNoShow: true },
    ];
    for (const r of rules) expect(columnsToRule(ruleToColumns(r))).toEqual(r);
    expect(
      ruleToColumns({ kind: "per_session", rate: 70.5, chargeNoShow: false }).rule_rate_piastres,
    ).toBe(7050);
    expect(columnsToRule(ruleToColumns(null))).toBeNull();
  });
});

describe("student rows", () => {
  it("map to the app's Student shape, keeping the human-readable code as the ID", () => {
    expect(studentFromRow(row)).toEqual({
      id: "S-1001",
      name: "Salma Fathy",
      phone: "01012345678",
      guardian: "—",
      guardianPhone: "",
      classIds: ["C-201", "C-202"],
      attendance: 0,
      status: "Paused",
      branch: "Dokki",
      grade: "Prep 3",
      joined: "2026-11-20",
    });
  });

  it("collect only per-student rule overrides, keyed like the in-memory store", () => {
    expect(enrollmentRulesFromRows([row])).toEqual({
      "S-1001|C-202": { kind: "per_session", rate: 70, chargeNoShow: true },
    });
  });

  it("build add_student arguments with database class IDs and piastre amounts", () => {
    const args = addStudentArgs(
      "center-1",
      {
        name: "Salma Fathy",
        phone: "01012345678",
        guardian: "—",
        guardianPhone: "",
        grade: "Prep 3",
        classIds: ["C-201", "C-202"],
      },
      { "C-202": { kind: "monthly", fee: 300 } },
      new Map([
        ["C-201", "uuid-c1"],
        ["C-202", "uuid-c2"],
      ]),
    );
    expect(args.guardian).toBe("");
    expect(args.enrollment_rows).toEqual([
      { class_id: "uuid-c1", ...noRule },
      { class_id: "uuid-c2", ...noRule, rule_kind: "monthly", rule_fee_piastres: 30000 },
    ]);
    expect(() =>
      addStudentArgs(
        "c",
        {
          name: "X Y Z",
          phone: "01012345678",
          guardian: "",
          guardianPhone: "",
          grade: "",
          classIds: ["C-999"],
        },
        {},
        new Map(),
      ),
    ).toThrow(/Unknown class/);
  });
});

describe("class rows", () => {
  it("convert fees from piastres and fall back to a monthly rule from the fee", () => {
    const c = classFromRow(
      {
        id: "u",
        code: "C-1",
        name: "Algebra",
        kind: "tutoring",
        days: "Sat · Tue",
        start_time: "3:00 PM",
        capacity: 20,
        fee_piastres: "40000",
        teachers: null,
        branches: null,
        ...noRule,
      },
      3,
    );
    expect(c).toMatchObject({
      id: "C-1",
      kind: "Tutoring",
      fee: 400,
      enrolled: 3,
      teacherId: "",
      rule: { kind: "monthly", fee: 400 },
    });
  });
});

describe("students directory", () => {
  it("does not offer balance sorting until the ledger is saved", () => {
    expect(DIRECTORY_SORTS).not.toContain("balance");
  });
});
