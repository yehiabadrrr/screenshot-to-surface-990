import { useMemo } from "react";
import { payableOf, type ClassItem, type Teacher } from "./data";
import {
  computeMetrics,
  collectionsForClasses,
  periodFilter,
  reversedIds,
  type Filter,
  type LedgerEntry,
} from "./ledger";
import { useLedger } from "./ledger-store";

/**
 * Accrued teacher payables for a window (percentage models use ledger collections for their classes).
 * Only the Demo Center has a teacher catalog; its session and attendance counts are sample figures, so these
 * payables are illustrative there. Customer centers have no teachers yet and therefore no payables.
 */
export function teacherPayables(
  entries: LedgerEntry[],
  f: Filter,
  teachers: Teacher[],
  classes: ClassItem[],
) {
  return teachers
    .filter((t) => f.branch === "all" || t.branch === f.branch)
    .reduce(
      (s, t) =>
        s +
        payableOf(
          t,
          collectionsForClasses(
            entries,
            f,
            new Set(classes.filter((c) => c.teacherId === t.id).map((c) => c.id)),
          ),
        ),
      0,
    );
}

/** Students billed in the window = active students for the period. */
export function billedStudents(entries: LedgerEntry[], f: Filter) {
  const rev = reversedIds(entries);
  const ids = new Set<string>();
  for (const e of entries)
    if (
      e.type === "Charge" &&
      !rev.has(e.id) &&
      e.date >= f.from &&
      e.date <= f.to &&
      (f.branch === "all" || e.branch === f.branch)
    )
      ids.add(e.studentId);
  return ids.size;
}

/** Every financial number on Overview and Finance comes from here. */
export function useFinance() {
  const { entries, filter, compare, months, branch, today, teachers, classes } = useLedger();
  return useMemo(() => {
    const current = computeMetrics(entries, filter);
    const previous = computeMetrics(entries, compare);
    // The trend chart shows the last six of the selectable months.
    const series = months.slice(-6).map((m) => {
      const f = periodFilter(m, branch, today);
      const x = computeMetrics(entries, f);
      return {
        m,
        label: new Date(`${m}-15T00:00:00Z`).toLocaleDateString("en-GB", {
          month: "short",
          timeZone: "UTC",
        }),
        billed: x.billed,
        gross: x.grossCollections,
        net: x.netCollections,
        outstanding: x.outstanding,
        students: billedStudents(entries, f),
        payables: teacherPayables(entries, f, teachers, classes),
      };
    });
    return {
      current,
      previous,
      series,
      payables: teacherPayables(entries, filter, teachers, classes),
      payablesPrev: teacherPayables(entries, compare, teachers, classes),
      students: billedStudents(entries, filter),
      studentsPrev: billedStudents(entries, compare),
    };
  }, [entries, filter, compare, months, branch, today, teachers, classes]);
}
