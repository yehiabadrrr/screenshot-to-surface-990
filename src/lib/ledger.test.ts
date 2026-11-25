import { describe, expect, it } from "vitest";
import { appendPayment, comparisonFilter, computeMetrics, confirmPayment, correctEntry, displayStatus, ledgerIndex, periodFilter, type LedgerEntry } from "./ledger";
import { formatMoney } from "./format";

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
  it("keeps whole-pound and piastre collections reconciled in display", () => {
    const entries: LedgerEntry[] = [
      { ...base, id: "TX-101", type: "Payment", studentId: "A", date: "2026-11-03", amount: 1000, method: "Cash" },
      { ...base, id: "TX-102", type: "Payment", studentId: "A", date: "2026-11-03", amount: 250.25, method: "InstaPay" },
      { ...base, id: "TX-103", type: "Refund", studentId: "A", date: "2026-11-03", amount: 20.5, method: "Cash" },
    ];
    const metrics = computeMetrics(entries, nov);
    expect(metrics.byMethod.reduce((sum, item) => sum + item.amount, 0)).toBe(1250.25);
    expect(metrics.grossCollections).toBe(1250.25);
    expect(metrics.netCollections).toBe(1229.75);
    expect(formatMoney(metrics.grossCollections)).toBe("EGP 1,250.25");
    expect(formatMoney(metrics.netCollections, "ar")).toBe("1,229.75 ج.م");
  });
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

describe("confirming pending payments", () => {
  const confirm = (entries: LedgerEntry[], id: string, date = "2026-12-02") => confirmPayment(entries, id, { by: "Karim", date });

  it("counts the payment on its original date without editing it", () => {
    const before = computeMetrics(fixture, nov);
    expect(before.grossCollections).toBe(1400);
    expect(before.pendingCount).toBe(1);

    // Confirmed in December, but the transfer was dated 5 Nov, so November's collections include it.
    const { entries, confirmation } = confirm(fixture, "TX-4");
    const after = computeMetrics(entries, nov);
    expect(after.grossCollections).toBe(1700);
    expect(after.pending).toBe(0);
    expect(after.pendingCount).toBe(0);
    expect(after.byMethod.find((b) => b.method === "Fawry")!.amount).toBe(300);
    expect(after.outstanding).toBe(0);

    expect(entries.find((e) => e.id === "TX-4")!.status).toBe("Pending");
    expect(displayStatus(entries.find((e) => e.id === "TX-4")!, ledgerIndex(entries))).toBe("Completed");
    expect(confirmation).toMatchObject({ id: "TX-9", type: "Confirmation", confirmsId: "TX-4", enteredBy: "Karim", date: "2026-12-02" });
  });
  it("only confirms pending payments, once", () => {
    expect(() => confirm(fixture, "TX-2")).toThrow("Only pending payments");
    expect(() => confirm(fixture, "TX-6")).toThrow("Only pending payments");
    expect(() => confirm(fixture, "TX-404")).toThrow("not found");
    const { entries } = confirm(fixture, "TX-4");
    expect(() => confirm(entries, "TX-4")).toThrow("Already confirmed");
  });
  it("cannot confirm a payment that was reversed as not received", () => {
    const { entries } = correctEntry(fixture, "TX-4", { reason: "Transfer never arrived", by: "Owner", date: "2026-11-10" });
    expect(() => confirm(entries, "TX-4")).toThrow("reversed");
    expect(computeMetrics(entries, nov).pendingCount).toBe(0);
  });
  it("a confirmed payment can still be reversed later, and the confirmation itself cannot", () => {
    const confirmed = confirm(fixture, "TX-4").entries;
    expect(() => correctEntry(confirmed, "TX-9", { reason: "x", by: "Owner", date: "2026-12-03" })).toThrow();
    const { entries } = correctEntry(confirmed, "TX-4", { reason: "Bank recalled it", by: "Owner", date: "2026-12-03" });
    expect(computeMetrics(entries, nov).grossCollections).toBe(1400);
    expect(computeMetrics(entries, nov).pendingCount).toBe(0);
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
