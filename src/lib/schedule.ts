/** The Egyptian school week, Saturday first; stored as "Sat · Tue" like the rest of the catalog. */
export const WEEK = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export const daysToString = (days: string[]) => WEEK.filter((d) => days.includes(d)).join(" · ");
/** "16:30" (time input) ↔ "4:30 PM" (catalog). */
export const toClock = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
export const fromClock = (clock: string) => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(clock.trim());
  if (!m) return "16:00";
  const h = (Number(m[1]) % 12) + (m[3] === "PM" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${m[2]}`;
};
