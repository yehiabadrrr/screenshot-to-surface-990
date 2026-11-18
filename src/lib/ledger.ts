/**
 * CenterOS ledger: the single source for every financial figure.
 *
 * Definitions (all amounts in EGP, filtered by period + branch of the entry):
 * - Billed revenue (gross): tuition charges issued in the period.
 * - Discounts: reductions granted on charges in the period.
 * - Net billed: billed revenue − discounts.
 * - Gross collections: completed, non-reversed payments dated in the period.
 * - Refunds: completed, non-reversed money returned to students in the period.
 * - Net collections: gross collections − refunds.
 * - Pending: payments awaiting confirmation. Excluded from collections and balances.
 * - Reversed: entries cancelled by a Reversal record. Excluded from every total;
 *   the original and the reversal both stay in the ledger as the audit trail.
 * - Student balance (as of a date): charges − discounts − payments + refunds.
 *   Positive = owes (outstanding receivable). Negative = prepaid credit.
 * - Outstanding receivables: sum of positive balances as of period end.
 * - Prepaid balances: sum of negative balances (shown positive) as of period end.
 */
export const METHODS = ["Cash", "InstaPay", "Fawry", "Bank transfer", "Other"] as const;
export type Method = (typeof METHODS)[number];
export type EntryType = "Charge" | "Payment" | "Refund" | "Discount" | "Reversal";

export interface LedgerEntry {
  id: string;
  type: EntryType;
  studentId: string;
  classId?: string | undefined;
  branch: string;
  /** Business date, YYYY-MM-DD. */
  date: string;
  /** Always positive; the type decides the direction. */
  amount: number;
  method?: Method | undefined;
  status: "Completed" | "Pending";
  reference?: string | undefined;
  note?: string | undefined;
  enteredBy: string;
  /** ISO timestamp of when it was entered. */
  enteredAt: string;
  /** Reversal → the entry it cancels. */
  reversesId?: string | undefined;
  /** Replacement payment → the entry it corrects. */
  replacesId?: string | undefined;
  reason?: string | undefined;
}

export interface Filter { from: string; to: string; branch: string | "all" }
export type DisplayStatus = "Completed" | "Pending" | "Reversed";

export const reversedIds = (entries: LedgerEntry[]) =>
  new Set(entries.filter((e) => e.type === "Reversal" && e.reversesId).map((e) => e.reversesId!));

export function displayStatus(e: LedgerEntry, reversed: Set<string>): DisplayStatus {
  if (reversed.has(e.id)) return "Reversed";
  return e.status;
}

/** Counts toward totals: completed and not reversed. Reversal rows themselves never count. */
const counts = (e: LedgerEntry, reversed: Set<string>) =>
  e.type !== "Reversal" && e.status === "Completed" && !reversed.has(e.id);

const inBranch = (e: LedgerEntry, branch: Filter["branch"]) => branch === "all" || e.branch === branch;
const inRange = (e: LedgerEntry, f: Filter) => e.date >= f.from && e.date <= f.to && inBranch(e, f.branch);
const sum = (xs: LedgerEntry[]) => xs.reduce((s, e) => s + e.amount, 0);

export function balancesAsOf(entries: LedgerEntry[], asOf: string, branch: Filter["branch"] = "all") {
  const reversed = reversedIds(entries);
  const map = new Map<string, number>();
  for (const e of entries) {
    if (e.date > asOf || !inBranch(e, branch) || !counts(e, reversed)) continue;
    const sign = e.type === "Charge" || e.type === "Refund" ? 1 : -1; // Payment, Discount reduce
    map.set(e.studentId, (map.get(e.studentId) ?? 0) + sign * e.amount);
  }
  return map;
}

export interface Metrics {
  billed: number; discounts: number; netBilled: number;
  grossCollections: number; refunds: number; netCollections: number;
  pending: number; pendingCount: number; reversed: number; reversedCount: number;
  outstanding: number; prepaid: number; studentsOwing: number;
  byMethod: { method: Method; amount: number; count: number }[];
  refundsByMethod: { method: Method; amount: number }[];
}

export function computeMetrics(entries: LedgerEntry[], f: Filter): Metrics {
  const reversed = reversedIds(entries);
  const period = entries.filter((e) => inRange(e, f));
  const live = period.filter((e) => counts(e, reversed));
  const of = (t: EntryType) => live.filter((e) => e.type === t);
  const payments = of("Payment");
  const refundsL = of("Refund");
  const billed = sum(of("Charge"));
  const discounts = sum(of("Discount"));
  const grossCollections = sum(payments);
  const refunds = sum(refundsL);
  const pendingL = period.filter((e) => e.type === "Payment" && e.status === "Pending" && !reversed.has(e.id));
  const reversedL = period.filter((e) => reversed.has(e.id));
  const balances = balancesAsOf(entries, f.to, f.branch);
  let outstanding = 0, prepaid = 0, studentsOwing = 0;
  for (const b of balances.values()) {
    if (b > 0) { outstanding += b; studentsOwing++; } else prepaid -= b;
  }
  return {
    billed, discounts, netBilled: billed - discounts,
    grossCollections, refunds, netCollections: grossCollections - refunds,
    pending: sum(pendingL), pendingCount: pendingL.length,
    reversed: sum(reversedL), reversedCount: reversedL.length,
    outstanding, prepaid, studentsOwing,
    byMethod: METHODS.map((m) => {
      const xs = payments.filter((e) => e.method === m);
      return { method: m, amount: sum(xs), count: xs.length };
    }),
    refundsByMethod: METHODS.map((m) => ({ method: m, amount: sum(refundsL.filter((e) => e.method === m)) })),
  };
}

/** Gross collections attributed to a set of classes (used for % teacher payouts). */
export function collectionsForClasses(entries: LedgerEntry[], f: Filter, classIds: Set<string>) {
  const reversed = reversedIds(entries);
  return sum(entries.filter((e) => e.type === "Payment" && e.classId && classIds.has(e.classId) && inRange(e, f) && counts(e, reversed)));
}

export function billedByClass(entries: LedgerEntry[], f: Filter) {
  const reversed = reversedIds(entries);
  const map = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "Charge" || !e.classId || !inRange(e, f) || !counts(e, reversed)) continue;
    map.set(e.classId, (map.get(e.classId) ?? 0) + e.amount);
  }
  return map;
}

/* ---------- periods ---------- */
export const monthEnd = (ym: string) => {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return `${ym}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
};
export const prevMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

/** Period window; a current month runs to `today` (month to date). */
export function periodFilter(ym: string, branch: Filter["branch"], today: string): Filter {
  const end = monthEnd(ym);
  return { from: `${ym}-01`, to: end < today ? end : today, branch };
}

/** Comparison window: same number of days in the previous month. */
export function comparisonFilter(current: Filter): Filter {
  const ym = current.from.slice(0, 7);
  const pm = prevMonth(ym);
  const day = current.to.slice(8, 10);
  const pEnd = monthEnd(pm);
  const to = `${pm}-${day}` < pEnd ? `${pm}-${day}` : pEnd;
  return { from: `${pm}-01`, to, branch: current.branch };
}

/* ---------- writes (append-only) ---------- */
export function nextTxnId(entries: LedgerEntry[]) {
  const max = entries.reduce((m, e) => (e.id.startsWith("TX-") ? Math.max(m, Number(e.id.slice(3)) || 0) : m), 0);
  return `TX-${max + 1}`;
}

export type NewPayment = Omit<LedgerEntry, "id" | "type" | "enteredAt"> & { type?: "Payment" };

export function appendPayment(entries: LedgerEntry[], p: NewPayment, now = new Date().toISOString()) {
  if (!(p.amount > 0)) throw new Error("Amount must be greater than zero");
  const entry: LedgerEntry = { ...p, type: "Payment", id: nextTxnId(entries), enteredAt: now };
  return { entries: [...entries, entry], entry };
}

/**
 * Correct a completed entry without editing it: append a Reversal (with reason),
 * and optionally a replacement payment with the corrected amount.
 */
export function correctEntry(
  entries: LedgerEntry[],
  id: string,
  opts: { reason: string; by: string; date: string; correctedAmount?: number },
  now = new Date().toISOString(),
) {
  const original = entries.find((e) => e.id === id);
  if (!original) throw new Error("Transaction not found");
  if (original.type === "Charge" || original.type === "Reversal") throw new Error("This entry cannot be corrected here");
  if (reversedIds(entries).has(id)) throw new Error("Already reversed");
  if (!opts.reason.trim()) throw new Error("A reason is required");
  let next = [...entries];
  const reversal: LedgerEntry = {
    id: nextTxnId(next), type: "Reversal", studentId: original.studentId, classId: original.classId, branch: original.branch,
    date: opts.date, amount: original.amount, method: original.method, status: "Completed",
    enteredBy: opts.by, enteredAt: now, reversesId: id, reason: opts.reason.trim(),
  };
  next.push(reversal);
  let replacement: LedgerEntry | undefined;
  if (opts.correctedAmount && opts.correctedAmount > 0) {
    replacement = {
      ...original, id: nextTxnId(next), date: original.date, amount: opts.correctedAmount,
      enteredBy: opts.by, enteredAt: now, replacesId: id, reason: opts.reason.trim(),
      note: `Corrects ${id}${original.note ? ` · ${original.note}` : ""}`,
    };
    next = [...next, replacement];
  }
  return { entries: next, reversal, replacement };
}
