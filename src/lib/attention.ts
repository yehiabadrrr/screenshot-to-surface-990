import { useEffect, useMemo, useState } from "react";
import { balancesAsOf, computeMetrics } from "./ledger";
import { packageRemaining, classWeekdays, weekdayOf, sessionIdFor } from "./billing";
import { useLedger } from "./ledger-store";
import { attendanceLabel, cairoNow, classStartMinutes } from "./overview-display";

/** Current time, set after mount (so SSR and hydration agree) and refreshed every minute. */
export function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export const LOW_PACKAGE_THRESHOLD = 1;

/**
 * Items that need someone's attention, derived from live store state only. Shared by the header
 * notifications and the Overview so both always list the same things. Money figures come from
 * the ledger helpers; this file only selects and counts.
 */
export function useAttention() {
  const { entries, students, classes, sessions, filter, branch, ruleFor } = useLedger();
  const now = useNow();
  return useMemo(() => {
    const clock = now ? cairoNow(now) : null;
    const today = clock?.date ?? "";
    const inBranch = (b: string) => branch === "all" || b === branch;

    const todaysClasses = today
      ? classes
          .filter((c) => inBranch(c.branch) && classWeekdays(c.days).includes(weekdayOf(today)))
          .sort((a, b) => classStartMinutes(a.time) - classStartMinutes(b.time))
      : [];
    /** Classes that have started today and are not finalized yet. */
    const unfinalized = clock
      ? todaysClasses.filter(
          (c) =>
            classStartMinutes(c.time) <= clock.minutes &&
            attendanceLabel(sessions[sessionIdFor(c.id, today)]) !== "Finalized",
        )
      : [];

    const lowPackages: { studentId: string; classId: string; remaining: number }[] = [];
    for (const s of students) {
      if (s.status !== "Active" || !inBranch(s.branch)) continue;
      for (const cid of s.classIds) {
        if (ruleFor(s.id, cid).rule.kind !== "package") continue;
        const remaining = packageRemaining(entries, s.id, cid);
        if (remaining <= LOW_PACKAGE_THRESHOLD)
          lowPackages.push({ studentId: s.id, classId: cid, remaining });
      }
    }
    lowPackages.sort((a, b) => a.remaining - b.remaining);

    const metrics = computeMetrics(entries, filter);
    const owing = [...balancesAsOf(entries, filter.to, filter.branch)]
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const count =
      unfinalized.length +
      lowPackages.length +
      (metrics.pendingCount > 0 ? 1 : 0) +
      (owing.length > 0 ? 1 : 0);
    return {
      ready: !!clock,
      today,
      todaysClasses,
      unfinalized,
      lowPackages,
      pending: { count: metrics.pendingCount, amount: metrics.pending },
      owing,
      count,
    };
  }, [entries, students, classes, sessions, filter, branch, ruleFor, now]);
}
