/**
 * Billing rules and attendance → ledger posting.
 *
 * How each attendance status bills, per rule:
 * | Rule          | Present            | Absent                              | Excused   | Unmarked  |
 * |---------------|--------------------|-------------------------------------|-----------|-----------|
 * | Monthly fee   | no session charge  | no session charge                   | none      | none      |
 * | Per session   | charge the rate    | charge only if "charge no-shows"    | none      | none      |
 * | Package       | use 1 session      | use 1 only if "count no-shows"      | none      | none      |
 * Package with 0 sessions left: a billable status is charged at the package unit price.
 * Unmarked never creates a charge, before or after finalization.
 */
import { nextId, reversedIds, type LedgerEntry } from "./ledger";

export type BillingRule =
  | { kind: "monthly"; fee: number }
  | { kind: "per_session"; rate: number; chargeNoShow: boolean }
  | { kind: "package"; sessions: number; price: number; countNoShow: boolean };

export type AttendanceStatus = "Present" | "Absent" | "Excused";
export type Mark = AttendanceStatus | undefined;

export type OutcomeCode =
  | "unmarked"
  | "monthly"
  | "excused"
  | "absent_free"
  | "charge"
  | "no_show_charge"
  | "package_use"
  | "package_exhausted";
export type Outcome =
  | { kind: "none"; code: OutcomeCode }
  | { kind: "charge"; code: OutcomeCode; amount: number }
  | { kind: "package_use"; code: OutcomeCode };

export const unitPrice = (r: Extract<BillingRule, { kind: "package" }>) =>
  Math.round(r.price / r.sessions);

export function sessionOutcome(rule: BillingRule, status: Mark, packageRemaining: number): Outcome {
  if (!status) return { kind: "none", code: "unmarked" };
  if (rule.kind === "monthly") return { kind: "none", code: "monthly" };
  if (status === "Excused") return { kind: "none", code: "excused" };
  if (rule.kind === "per_session") {
    if (status === "Present") return { kind: "charge", code: "charge", amount: rule.rate };
    return rule.chargeNoShow
      ? { kind: "charge", code: "no_show_charge", amount: rule.rate }
      : { kind: "none", code: "absent_free" };
  }
  const billable = status === "Present" || rule.countNoShow;
  if (!billable) return { kind: "none", code: "absent_free" };
  if (packageRemaining > 0) return { kind: "package_use", code: "package_use" };
  return { kind: "charge", code: "package_exhausted", amount: unitPrice(rule) };
}

export const sessionIdFor = (classId: string, date: string) => `SES-${classId}-${date}`;

const live = (entries: LedgerEntry[]) => {
  const rev = reversedIds(entries);
  return (e: LedgerEntry) => !rev.has(e.id);
};

export function packageRemaining(entries: LedgerEntry[], studentId: string, classId: string) {
  const ok = live(entries);
  let left = 0;
  for (const e of entries) {
    if (e.studentId !== studentId || e.classId !== classId || !ok(e)) continue;
    if (e.type === "Charge" && e.packageSessions) left += e.packageSessions;
    if (e.type === "PackageUse") left -= 1;
  }
  return left;
}

/** The live (non-reversed) ledger entry linked to a student in a session, if any. */
export function linkedEntry(entries: LedgerEntry[], sessionId: string, studentId: string) {
  const ok = live(entries);
  return entries.find(
    (e) =>
      e.sessionId === sessionId &&
      e.studentId === studentId &&
      (e.type === "Charge" || e.type === "PackageUse") &&
      ok(e),
  );
}

export interface SessionInput {
  sessionId: string;
  classId: string;
  date: string;
  branch: string;
  marks: Record<string, Mark>;
  enrollments: { studentId: string; rule: BillingRule }[];
  by: string;
  now: string;
}

function entryFor(
  entries: LedgerEntry[],
  o: Outcome,
  s: Omit<SessionInput, "marks" | "enrollments">,
  studentId: string,
  date: string,
  extra: Partial<LedgerEntry> = {},
): LedgerEntry | null {
  const base = {
    studentId,
    classId: s.classId,
    branch: s.branch,
    date,
    status: "Completed" as const,
    enteredBy: s.by,
    enteredAt: s.now,
    sessionId: s.sessionId,
    ...extra,
  };
  if (o.kind === "charge")
    return {
      ...base,
      id: nextId(entries, "INV-"),
      type: "Charge",
      amount: o.amount,
      note:
        extra.note ??
        (o.code === "package_exhausted"
          ? `Session ${s.date} · package used up, unit price`
          : `Session ${s.date}`),
    };
  if (o.kind === "package_use")
    return {
      ...base,
      id: nextId(entries, "TX-"),
      type: "PackageUse",
      amount: 0,
      note: extra.note ?? `Session ${s.date} · 1 package session`,
    };
  return null;
}

/**
 * Post a finalized session: one linked entry per billable student. Idempotent per
 * student (an existing live linked entry is never duplicated).
 */
export function finalizeSession(entries: LedgerEntry[], s: SessionInput) {
  let next = [...entries];
  const created: LedgerEntry[] = [];
  for (const { studentId, rule } of s.enrollments) {
    if (linkedEntry(next, s.sessionId, studentId)) continue;
    const o = sessionOutcome(
      rule,
      s.marks[studentId],
      rule.kind === "package" ? packageRemaining(next, studentId, s.classId) : 0,
    );
    const e = entryFor(next, o, s, studentId, s.date);
    if (e) {
      next = [...next, e];
      created.push(e);
    }
  }
  return { entries: next, created };
}

export interface AmendInput {
  sessionId: string;
  classId: string;
  date: string;
  branch: string;
  studentId: string;
  rule: BillingRule;
  from: Mark;
  to: Mark;
  reason: string;
  by: string;
  now: string;
  today: string;
}

/**
 * Change a mark after finalization. Never edits posted entries: reverses the linked
 * entry (with reason) and posts a new one only when the billing effect changes.
 */
export function amendAttendance(entries: LedgerEntry[], a: AmendInput) {
  if (!a.reason.trim()) throw new Error("A reason is required");
  if (a.from === a.to) throw new Error("Status is unchanged");
  const existing = linkedEntry(entries, a.sessionId, a.studentId);
  const remainingIfReversed =
    a.rule.kind === "package"
      ? packageRemaining(entries, a.studentId, a.classId) +
        (existing?.type === "PackageUse" ? 1 : 0)
      : 0;
  const o = sessionOutcome(a.rule, a.to, remainingIfReversed);
  const same = existing
    ? (o.kind === "charge" && existing.type === "Charge" && existing.amount === o.amount) ||
      (o.kind === "package_use" && existing.type === "PackageUse")
    : o.kind === "none";
  if (same) return { entries, reversal: undefined, created: undefined };
  let next = [...entries];
  let reversal: LedgerEntry | undefined;
  if (existing) {
    reversal = {
      id: nextId(next, "TX-"),
      type: "Reversal",
      studentId: a.studentId,
      classId: a.classId,
      branch: a.branch,
      date: a.today,
      amount: existing.amount,
      status: "Completed",
      enteredBy: a.by,
      enteredAt: a.now,
      reversesId: existing.id,
      sessionId: a.sessionId,
      reason: `${a.reason.trim()} (attendance ${a.from ?? "unmarked"} → ${a.to ?? "unmarked"})`,
    };
    next = [...next, reversal];
  }
  const created =
    entryFor(next, o, a, a.studentId, a.today, {
      reason: a.reason.trim(),
      note: `Adjustment · session ${a.date} · ${a.from ?? "unmarked"} → ${a.to ?? "unmarked"}`,
    }) ?? undefined;
  if (created) next = [...next, created];
  return { entries: next, reversal, created };
}

/* ---------- weekdays ---------- */
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const classWeekdays = (days: string) =>
  days
    .split(" · ")
    .map((d) => WEEKDAYS.indexOf(d as (typeof WEEKDAYS)[number]))
    .filter((n) => n >= 0);
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
