/**
 * Business dates. Every financial date in Markazly is a calendar date in Africa/Cairo (YYYY-MM-DD), never
 * the UTC date: a payment taken at 1 a.m. in Cairo belongs to that Cairo day.
 */
export const BUSINESS_TIME_ZONE = "Africa/Cairo";

/** Today's business date in Cairo. */
export function cairoToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (key: string) => parts.find((p) => p.type === key)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** The `count` reporting months ending with the month of `today` (YYYY-MM), oldest first. */
export function reportingMonths(today: string, count = 12): string[] {
  const [y, m] = today.split("-").map(Number) as [number, number];
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const idx = y * 12 + (m - 1) - i;
    out.push(`${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`);
  }
  return out;
}
