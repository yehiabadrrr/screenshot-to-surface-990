import { describe, expect, it } from "vitest";
import { amendAttendance, finalizeSession, linkedEntry, packageRemaining, sessionOutcome, type BillingRule } from "./billing";
import type { LedgerEntry } from "./ledger";

const monthly: BillingRule = { kind: "monthly", fee: 450 };
const perSession: BillingRule = { kind: "per_session", rate: 70, chargeNoShow: false };
const perSessionNoShow: BillingRule = { kind: "per_session", rate: 70, chargeNoShow: true };
const pkg: BillingRule = { kind: "package", sessions: 8, price: 1200, countNoShow: true };

describe("status → charge rules", () => {
  it("unmarked never charges under any rule", () => {
    for (const r of [monthly, perSession, perSessionNoShow, pkg]) expect(sessionOutcome(r, undefined, 0).kind).toBe("none");
  });
  it("monthly fee never creates a session charge", () => {
    expect(sessionOutcome(monthly, "Present", 0).kind).toBe("none");
  });
  it("per session charges Present at the rate", () => {
    expect(sessionOutcome(perSession, "Present", 0)).toEqual({ kind: "charge", code: "charge", amount: 70 });
  });
  it("per session charges Absent only when no-shows are charged", () => {
    expect(sessionOutcome(perSession, "Absent", 0).kind).toBe("none");
    expect(sessionOutcome(perSessionNoShow, "Absent", 0).kind).toBe("charge");
  });
  it("Excused is never charged", () => {
    expect(sessionOutcome(perSessionNoShow, "Excused", 0).kind).toBe("none");
    expect(sessionOutcome(pkg, "Excused", 3).kind).toBe("none");
  });
  it("package uses a session, then charges the unit price when empty", () => {
    expect(sessionOutcome(pkg, "Present", 2).kind).toBe("package_use");
    expect(sessionOutcome(pkg, "Present", 0)).toEqual({ kind: "charge", code: "package_exhausted", amount: 150 });
  });
});

const base = { branch: "Maadi", status: "Completed" as const, enteredBy: "T", enteredAt: "2026-11-01T00:00:00Z" };
const seed: LedgerEntry[] = [{ ...base, id: "INV-1", type: "Charge", studentId: "B", classId: "C1", date: "2026-11-01", amount: 1200, packageSessions: 8 }];
const session = { sessionId: "SES-C1-2026-11-10", classId: "C1", date: "2026-11-10", branch: "Maadi", by: "Teacher", now: "2026-11-10T18:00:00Z" };

describe("finalizing a session", () => {
  const r = finalizeSession(seed, { ...session, marks: { A: "Present", B: "Present", C: undefined, D: "Excused" },
    enrollments: [{ studentId: "A", rule: perSession }, { studentId: "B", rule: pkg }, { studentId: "C", rule: perSession }, { studentId: "D", rule: perSession }] });
  it("creates one linked entry per billable student only", () => {
    expect(r.created.map((e) => [e.studentId, e.type])).toEqual([["A", "Charge"], ["B", "PackageUse"]]);
    expect(r.created.every((e) => e.sessionId === session.sessionId && e.enteredBy === "Teacher")).toBe(true);
  });
  it("does not duplicate when run again", () => {
    const again = finalizeSession(r.entries, { ...session, marks: { A: "Present", B: "Present" }, enrollments: [{ studentId: "A", rule: perSession }, { studentId: "B", rule: pkg }] });
    expect(again.created).toHaveLength(0);
  });
  it("package balance drops by one", () => {
    expect(packageRemaining(r.entries, "B", "C1")).toBe(7);
  });
});

describe("changes after finalizing", () => {
  const posted = finalizeSession(seed, { ...session, marks: { A: "Present" }, enrollments: [{ studentId: "A", rule: perSession }] }).entries;
  type M = "Excused" | "Present" | undefined;
  const amend = (o: { to: M; from?: M | "unmarked"; entries?: LedgerEntry[]; reason?: string }) =>
    amendAttendance(o.entries ?? posted, { ...session, studentId: "A", rule: perSession, from: o.from === "unmarked" ? undefined : o.from ?? "Present", to: o.to,
      reason: o.reason ?? "Teacher corrected", by: "Owner", now: "2026-11-12T09:00:00Z", today: "2026-11-12" });
  it("reverses the posted charge with person, time and reason", () => {
    const r = amend({ to: "Excused" });
    expect(r.reversal?.reversesId).toBe(linkedEntry(posted, session.sessionId, "A")!.id);
    expect(r.reversal?.enteredBy).toBe("Owner");
    expect(r.reversal?.enteredAt).toBe("2026-11-12T09:00:00Z");
    expect(r.reversal?.reason).toContain("Teacher corrected");
    expect(r.created).toBeUndefined();
    expect(posted.find((e) => e.id === r.reversal?.reversesId)?.amount).toBe(70);
  });
  it("marking a previously unmarked student later posts a new charge", () => {
    const blank = finalizeSession(seed, { ...session, marks: {}, enrollments: [{ studentId: "A", rule: perSession }] }).entries;
    const r = amend({ to: "Present", from: "unmarked", entries: blank });
    expect(r.created?.amount).toBe(70);
    expect(r.created?.reason).toBe("Teacher corrected");
  });
  it("requires a reason", () => {
    expect(() => amend({ to: "Excused", reason: "  " })).toThrow();
  });
});
