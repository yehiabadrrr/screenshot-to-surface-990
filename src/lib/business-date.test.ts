import { describe, expect, it } from "vitest";
import { cairoToday, reportingMonths } from "./business-date";

describe("business dates", () => {
  it("uses the Cairo calendar day, not the UTC day", () => {
    // 23:30 UTC on 30 Nov is already 1 Dec in Cairo (UTC+2).
    expect(cairoToday(new Date("2026-11-30T23:30:00Z"))).toBe("2026-12-01");
    expect(cairoToday(new Date("2026-11-30T12:00:00Z"))).toBe("2026-11-30");
  });
  it("lists the reporting months ending with the current month, across a year boundary", () => {
    const months = reportingMonths("2026-12-03", 12);
    expect(months).toHaveLength(12);
    expect(months.at(-1)).toBe("2026-12");
    expect(months[0]).toBe("2026-01");
    expect(reportingMonths("2027-02-10", 4)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });
});
