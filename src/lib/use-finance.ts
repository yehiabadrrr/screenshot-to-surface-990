import { useMemo } from "react";
import { classes, teachers, payableOf } from "./data";
import { computeMetrics, collectionsForClasses, periodFilter, reversedIds, type Filter, type LedgerEntry } from "./ledger";
import { useLedger } from "./ledger-store";

/** Accrued teacher payables for a window (percentage models use ledger collections for their classes). */
export function teacherPayables(entries: LedgerEntry[], f: Filter) {
  return teachers
    .filter((t) => f.branch === "all" || t.branch === f.branch)
    .reduce((s, t) => s + payableOf(t, collectionsForClasses(entries, f, new Set(classes.filter((c) => c.teacherId === t.id).map((c) => c.id)))), 0);
}

/** Students billed in the window = active students for the period. */
export function billedStudents(entries: LedgerEntry[], f: Filter) {
  const rev = reversedIds(entries);
  const ids = new Set<string>();
  for (const e of entries) if (e.type === "Charge" && !rev.has(e.id) && e.date >= f.from && e.date <= f.to && (f.branch === "all" || e.branch === f.branch)) ids.add(e.studentId);
  return ids.size;
}

/** Every financial number on Overview and Finance comes from here. */
export function useFinance() {
  const { entries, filter, compare, months, branch, today } = useLedger();
  return useMemo(() => {
    const current = computeMetrics(entries, filter);
    const previous = computeMetrics(entries, compare);
    const series = months.map((m) => {
      const f = periodFilter(m, branch, today);
      const x = computeMetrics(entries, f);
      return { m, label: new Date(`${m}-15T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }), billed: x.billed, gross: x.grossCollections, net: x.netCollections, outstanding: x.outstanding, students: billedStudents(entries, f), payables: teacherPayables(entries, f) };
    });
    return {
      current, previous, series,
      payables: teacherPayables(entries, filter), payablesPrev: teacherPayables(entries, compare),
      students: billedStudents(entries, filter), studentsPrev: billedStudents(entries, compare),
    };
  }, [entries, filter, compare, months, branch, today]);
}
