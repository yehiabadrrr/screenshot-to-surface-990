import { describe, expect, it } from "vitest";
import { classWeekdays } from "./billing";
import { daysToString, fromClock, toClock } from "./schedule";

describe("class schedule format", () => {
  it("writes days in school-week order, readable by the billing calendar", () => {
    expect(daysToString(["Tue", "Sat"])).toBe("Sat · Tue");
    expect(classWeekdays(daysToString(["Tue", "Sat"]))).toEqual([6, 2]);
  });
  it("converts between the time input and the catalog's clock", () => {
    expect(toClock("16:30")).toBe("4:30 PM");
    expect(toClock("00:05")).toBe("12:05 AM");
    expect(toClock("12:00")).toBe("12:00 PM");
    expect(fromClock("4:30 PM")).toBe("16:30");
    expect(fromClock("12:05 AM")).toBe("00:05");
    expect(fromClock(toClock("09:15"))).toBe("09:15");
  });
});
