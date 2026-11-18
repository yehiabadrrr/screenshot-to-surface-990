import { describe, expect, it } from "vitest";
import { appendPayment, comparisonFilter, computeMetrics, correctEntry, periodFilter, type LedgerEntry } from "./ledger";

const base = { branch: "Maadi", enteredBy: "Test", enteredAt: "2026-11-01T00:00:00Z", status: "Completed" as const };
const fixture: LedgerEntry[] = [
  { ...base, id: "INV-1", type: "Charge", studentId: "A", date: "2026-11-01", amount: 1000 },
  { ...base, id: "INV-2", type: "Charge", studentId: "B", date: "2026-11-01", amount: 500 },
  { ...base, id: "TX-1", type: "Discount", studentId: "A", date: "2026-11-01", amount: 100 },
  { ...base, id: "TX-2", type: "Payment", studentId: "A", date: "2026-11-03", amount: 600, method: "Cash" },
  { ...base, id: "TX-3", type: "Payment", studentId: "B", date: "2026-11-04", amount: 800, method: "InstaPay" },
  { ...base, id: "TX-4", type: "Payment", studentId: "A", date: "2026-11-05", amount: 300, method: "Fawry", status: "Pending" },
  { ...base, id: "TX-5", type: "Payment", studentId: "A", date: "2026-11-06", amount: 200, method: "Bank transfer" },
  { ...base, id: "TX-6", type: "Reversal", studentId: "A", date: "2026-11-07", amount: 200, reversesId: "TX-5", reason: "Bounced" },
  { ...base, id: "TX-7", type: "Refund", studentId: "B", date: "2026-11-08", amount: 50, method: "Cash" },
  { ...base, id: "TX-8", type: "Payment", studentId: "A", date: "2026-11-09", amount: 999, method: "Cash", branch: "Heliopolis" },
];
const nov = { from: "2026-11-01", to: "2026-11-30", branch: "Maadi" };

describe("collections", () => {
  const m = computeMetrics(fixture, nov);
  it("excludes pending and reversed payments from gross collections", () => {
    expect(m.grossCollections).toBe(1400);
    expect(m.pending).toBe(300);
    expect(m.reversed).toBe(200);
  });
  it("net collections = gross − refunds", () => {
    expect(m.refunds).toBe(50);
    expect(m.netCollections).toBe(1350);
  });
  it("payment-method breakdown adds up to gross collections", () => {
    expect(m.byMethod.reduce((s, x) => s + x.amount, 0)).toBe(m.grossCollections);
  });
  it("branch filter excludes other branches", () => {
    expect(computeMetrics(fixture, { ...nov, branch: "Heliopolis" }).grossCollections).toBe(999);
  });
});

describe("billing and balances", () => {
  const m = computeMetrics(fixture, nov);
  it("net billed = billed − discounts", () => {
    expect(m.billed).toBe(1500);
    expect(m.netBilled).toBe(1400);
  });
  it("splits balances into outstanding and prepaid", () => {
    // A: 1000 − 100 − 600 = 300 owed. B: 500 − 800 + 50 = −250 credit.
    expect(m.outstanding).toBe(300);
    expect(m.prepaid).toBe(250);
  });
});

describe("corrections", () => {
  it("reverses instead of overwriting, and keeps the original", () => {
    const { entries, reversal, replacement } = correctEntry(fixture, "TX-2", { reason: "Wrong amount", by: "Owner", date: "2026-11-10", correctedAmount: 650 });
    expect(entries.find((e) => e.id === "TX-2")!.amount).toBe(600);
    expect(reversal.reversesId).toBe("TX-2");
    expect(replacement!.replacesId).toBe("TX-2");
    expect(computeMetrics(entries, nov).grossCollections).toBe(1450);
  });
  it("requires a reason", () => {
    expect(() => correctEntry(fixture, "TX-2", { reason: " ", by: "Owner", date: "2026-11-10" })).toThrow();
  });
  it("cannot reverse the same entry twice", () => {
    expect(() => correctEntry(fixture, "TX-5", { reason: "Again", by: "Owner", date: "2026-11-10" })).toThrow();
  });
});

describe("new payments", () => {
  it("get the next transaction ID and record who entered them", () => {
    const { entry } = appendPayment(fixture, { studentId: "B", branch: "Maadi", date: "2026-11-10", amount: 100, method: "Cash", status: "Completed", enteredBy: "Reem" });
    expect(entry.id).toBe("TX-9");
    expect(entry.enteredBy).toBe("Reem");
  });
  it("reject zero amounts", () => {
    expect(() => appendPayment(fixture, { studentId: "B", branch: "Maadi", date: "2026-11-10", amount: 0, status: "Completed", enteredBy: "Reem" })).toThrow();
  });
});

describe("periods", () => {
  it("current month runs to today and compares to the same days last month", () => {
    const f = periodFilter("2026-11", "all", "2026-11-18");
    expect(f).toEqual({ from: "2026-11-01", to: "2026-11-18", branch: "all" });
    expect(comparisonFilter(f)).toEqual({ from: "2026-10-01", to: "2026-10-18", branch: "all" });
  });
});
