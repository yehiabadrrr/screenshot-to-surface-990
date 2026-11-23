import { describe, it, expect } from "vitest";
import { greetingKey, attendanceLabel, hasPriorData } from "./overview-display";

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