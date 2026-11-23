import type { LedgerEntry, Filter } from "./ledger";
import type { SessionRecord } from "./ledger-seed";

export function greetingKey(hour: number) {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export function hasPriorData(entries: LedgerEntry[], compare: Filter, previous: number) {
  return previous !== 0 && entries.some((e) => e.date >= compare.from && e.date <= compare.to && (compare.branch === "all" || e.branch === compare.branch));
}

export function attendanceLabel(session: SessionRecord | undefined) {
  if (session?.finalized) return "Finalized";
  return Object.values(session?.marks ?? {}).some(Boolean) ? "In progress" : "Attendance not recorded";
}