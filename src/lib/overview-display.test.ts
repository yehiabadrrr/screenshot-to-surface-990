import { describe, it, expect } from "vitest";
import { greetingKey, attendanceLabel, hasPriorData, attendanceStats, weeklyAttendance, enrollmentTrend, classStartMinutes, weekStart, addDays, cairoNow } from "./overview-display";
import type { SessionRecord } from "./ledger-seed";

const session = (id: string, classId: string, date: string, marks: SessionRecord["marks"]): SessionRecord => ({ sessionId: id, classId, date, marks, audit: [] });
const branchOf = (classId: string) => (classId === "C-1" ? "Maadi" : "Heliopolis");
const sessions: Record<string, SessionRecord> = {
  a: session("a", "C-1", "2026-11-02", { s1: "Present", s2: "Absent", s3: undefined }),
  b: session("b", "C-1", "2026-11-09", { s1: "Present", s2: "Excused" }),
  c: session("c", "C-2", "2026-11-03", { s1: "Present" }),
  d: session("d", "C-2", "2026-10-20", { s1: "Absent" }),
};

describe("Overview attendance and enrollment selectors", () => {
  it("counts only recorded marks inside the period and branch, never unmarked students", () => {
    expect(attendanceStats(sessions, branchOf, { from: "2026-11-01", to: "2026-11-30", branch: "all" })).toEqual({ present: 3, absent: 1, excused: 1, marked: 5, sessions: 3 });
    expect(attendanceStats(sessions, branchOf, { from: "2026-11-01", to: "2026-11-30", branch: "Maadi" })).toEqual({ present: 2, absent: 1, excused: 1, marked: 4, sessions: 2 });
    expect(attendanceStats(sessions, branchOf, { from: "2026-12-01", to: "2026-12-31", branch: "all" }).marked).toBe(0);
  });
  it("groups attendance by Egyptian week (Saturday start) and computes the rate from marks", () => {
    expect(weekStart("2026-11-02")).toBe("2026-10-31"); // Monday → previous Saturday
    expect(weekStart("2026-10-31")).toBe("2026-10-31"); // Saturday stays
    expect(addDays("2026-10-31", 7)).toBe("2026-11-07");
    const weeks = weeklyAttendance(sessions, branchOf, "all");
    expect(weeks.map((w) => w.week)).toEqual(["2026-10-17", "2026-10-31", "2026-11-07"]);
    expect(weeks[1]).toMatchObject({ present: 2, marked: 3, rate: 66.7 });
  });
  it("derives registrations and running totals from join dates only", () => {
    const students = [{ joined: "2026-09-10", branch: "Maadi" }, { joined: "2026-09-20", branch: "Heliopolis" }, { joined: "2026-11-01", branch: "Maadi" }];
    expect(enrollmentTrend(students, "all", "2026-11")).toEqual([{ m: "2026-09", joined: 2, total: 2 }, { m: "2026-10", joined: 0, total: 2 }, { m: "2026-11", joined: 1, total: 3 }]);
    expect(enrollmentTrend(students, "Maadi", "2026-11").at(-1)).toEqual({ m: "2026-11", joined: 1, total: 2 });
    expect(enrollmentTrend([], "all", "2026-11")).toEqual([]);
  });
  it("reads catalog class times and Cairo business dates", () => {
    expect(classStartMinutes("3:00 PM")).toBe(15 * 60);
    expect(classStartMinutes("12:30 PM")).toBe(12 * 60 + 30);
    expect(classStartMinutes("9:00 AM")).toBe(9 * 60);
    expect(cairoNow(new Date("2026-11-24T22:30:00Z")).date).toBe("2026-11-25"); // Cairo is ahead of UTC
  });
});

describe("Overview display rules", () => {
  it("selects the greeting for the current hour", () => {
    expect(greetingKey(9)).toBe("Good morning");
    expect(greetingKey(14)).toBe("Good afternoon");
    expect(greetingKey(19)).toBe("Good evening");
  });
  it("does not show comparison deltas without a nonzero prior value and prior data", () => {
    expect(hasPriorData([], { from: "2026-10-01", to: "2026-10-31", branch: "all" }, 100)).toBe(false);
    const entry = { id: "TEST", type: "Payment" as const, amount: 100, studentId: "S-1", branch: "Maadi", status: "Completed" as const, date: "2026-10-15", enteredBy: "Test", enteredAt: "2026-10-15T00:00:00Z" };
    expect(hasPriorData([entry], { from: "2026-10-01", to: "2026-10-31", branch: "all" }, 100)).toBe(true);
    expect(hasPriorData([entry], { from: "2026-10-01", to: "2026-10-31", branch: "all" }, 0)).toBe(false);
  });
  it("does not invent attendance completion", () => {
    expect(attendanceLabel(undefined)).toBe("Attendance not recorded");
    expect(attendanceLabel({ sessionId: "s", classId: "c", date: "2026-11-23", marks: { a: "Present" }, audit: [] })).toBe("In progress");
    expect(attendanceLabel({ sessionId: "s", classId: "c", date: "2026-11-23", marks: {}, audit: [], finalized: { by: "Test", at: "2026-11-23" } })).toBe("Finalized");
  });
});