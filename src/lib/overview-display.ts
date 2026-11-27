import type { LedgerEntry, Filter } from "./ledger";
import type { SessionRecord } from "./ledger-seed";

export function greetingKey(hour: number) {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export function hasPriorData(entries: LedgerEntry[], compare: Filter, previous: number) {
  return (
    previous !== 0 &&
    entries.some(
      (e) =>
        e.date >= compare.from &&
        e.date <= compare.to &&
        (compare.branch === "all" || e.branch === compare.branch),
    )
  );
}

/** Business date in Cairo (YYYY-MM-DD) and the minutes since Cairo midnight. */
export function cairoNow(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (key: string) => parts.find((item) => item.type === key)?.value ?? "0";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
    minutes: Number(part("hour")) * 60 + Number(part("minute")),
  };
}

/** Minutes after midnight for a catalog time such as "4:30 PM". */
export function classStartMinutes(time: string) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!m) return 0;
  const h = (Number(m[1]) % 12) + (m[3]!.toUpperCase() === "PM" ? 12 : 0);
  return h * 60 + Number(m[2]);
}

/** Counts of recorded attendance marks (not money). `branchOf` maps a class to its branch. */
export function attendanceStats(
  sessions: Record<string, SessionRecord>,
  branchOf: (classId: string) => string,
  f: Filter,
) {
  let present = 0,
    absent = 0,
    excused = 0,
    sessionCount = 0;
  for (const s of Object.values(sessions)) {
    if (
      s.date < f.from ||
      s.date > f.to ||
      (f.branch !== "all" && branchOf(s.classId) !== f.branch)
    )
      continue;
    let any = false;
    for (const m of Object.values(s.marks)) {
      if (m === "Present") present++;
      else if (m === "Absent") absent++;
      else if (m === "Excused") excused++;
      else continue;
      any = true;
    }
    if (any) sessionCount++;
  }
  const marked = present + absent + excused;
  return { present, absent, excused, marked, sessions: sessionCount };
}

/** Saturday that starts the Egyptian week containing `date` (YYYY-MM-DD). */
export function weekStart(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 1) % 7));
  return d.toISOString().slice(0, 10);
}
export function addDays(date: string, n: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Recorded attendance by week (Saturday start), oldest first. Only weeks with marks. */
export function weeklyAttendance(
  sessions: Record<string, SessionRecord>,
  branchOf: (classId: string) => string,
  branch: string,
) {
  const weeks = new Map<string, { present: number; marked: number }>();
  for (const s of Object.values(sessions)) {
    if (branch !== "all" && branchOf(s.classId) !== branch) continue;
    const key = weekStart(s.date);
    const w = weeks.get(key) ?? { present: 0, marked: 0 };
    for (const m of Object.values(s.marks)) {
      if (!m) continue;
      w.marked++;
      if (m === "Present") w.present++;
    }
    weeks.set(key, w);
  }
  return [...weeks]
    .filter(([, w]) => w.marked > 0)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, w]) => ({
      week,
      present: w.present,
      marked: w.marked,
      rate: Math.round((w.present / w.marked) * 1000) / 10,
    }));
}

/** Registrations by join month and the running total, from each student's `joined` date. */
export function enrollmentTrend(
  students: { joined: string; branch: string }[],
  branch: string,
  lastMonth: string,
) {
  const scoped = students.filter((s) => branch === "all" || s.branch === branch);
  if (!scoped.length) return [];
  const first = scoped.reduce(
    (m, s) => (s.joined.slice(0, 7) < m ? s.joined.slice(0, 7) : m),
    lastMonth,
  );
  const months: string[] = [];
  for (let ym = first; ym <= lastMonth;) {
    months.push(ym);
    const [y, m] = ym.split("-").map(Number) as [number, number];
    ym = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  return months.map((ym) => ({
    m: ym,
    joined: scoped.filter((s) => s.joined.slice(0, 7) === ym).length,
    total: scoped.filter((s) => s.joined.slice(0, 7) <= ym).length,
  }));
}

export function attendanceLabel(session: SessionRecord | undefined) {
  if (session?.finalized) return "Finalized";
  return Object.values(session?.marks ?? {}).some(Boolean)
    ? "In progress"
    : "Attendance not recorded";
}
