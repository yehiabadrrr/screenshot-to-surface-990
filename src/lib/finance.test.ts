import { describe, expect, it } from "vitest";
import { attendanceRate, studentBalance, teacherPayout } from "./finance";

const inputs = { sessions: 12, attendingStudentSessions: 180, collectedTuition: 36000 };

describe("teacher payouts", () => {
  it("fixed monthly salary ignores activity", () => {
    expect(teacherPayout({ type: "monthly", amount: 9000 }, inputs)).toBe(9000);
  });
  it("per session multiplies by sessions taught", () => {
    expect(teacherPayout({ type: "per_session", amount: 400 }, inputs)).toBe(4800);
  });
  it("per attending student multiplies by attendances", () => {
    expect(teacherPayout({ type: "per_student", amount: 35 }, inputs)).toBe(6300);
  });
  it("percentage applies to collected tuition only", () => {
    expect(teacherPayout({ type: "percentage", percent: 40 }, inputs)).toBe(14400);
  });
});

describe("student balance", () => {
  it("owes charges minus discounts and payments", () => {
    expect(studentBalance(1500, 900, 100)).toBe(500);
  });
  it("goes negative when prepaid", () => {
    expect(studentBalance(800, 1000)).toBe(-200);
  });
});

describe("attendance rate", () => {
  it("returns percent with one decimal", () => {
    expect(attendanceRate(17, 18)).toBe(94.4);
  });
  it("is zero when no sessions", () => {
    expect(attendanceRate(0, 0)).toBe(0);
  });
});
