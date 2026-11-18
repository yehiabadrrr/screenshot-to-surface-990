import type { Lang } from "./i18n";
import { egp } from "./format";
import type { BillingRule, Outcome } from "./billing";

type T = (k: string, v?: Record<string, string | number>) => string;
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export const fmtNum = (n: number, lang: Lang) => n.toLocaleString(lang === "ar" ? "ar-EG" : "en-US");
export const localTime = (s: string, lang: Lang) =>
  lang === "ar" ? s.replace("PM", "م").replace("AM", "ص").replace(/\d/g, (d) => AR_DIGITS[+d]!) : s;
export const localDays = (days: string, t: T) => days.split(" · ").map((d) => t(d)).join(" · ");
export const longDate = (date: string, lang: Lang) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
export const shortDateL = (iso: string, lang: Lang) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
export const timeOfDay = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" });

export const ruleKindLabel = (r: BillingRule, t: T) =>
  t(r.kind === "monthly" ? "Monthly fee" : r.kind === "per_session" ? "Per attended session" : "Session package");

export function ruleSummary(r: BillingRule, t: T, lang: Lang) {
  if (r.kind === "monthly") return t("{amount} / month", { amount: egp(r.fee, lang) });
  if (r.kind === "per_session") return t("{amount} per attended session", { amount: egp(r.rate, lang) }) + (r.chargeNoShow ? ` · ${t("no-shows charged")}` : "");
  return t("{n} sessions for {amount}", { n: fmtNum(r.sessions, lang), amount: egp(r.price, lang) }) + (r.countNoShow ? ` · ${t("no-shows use a session")}` : "");
}

export function outcomeText(o: Outcome, t: T, lang: Lang) {
  switch (o.code) {
    case "unmarked": return t("Unmarked · no charge");
    case "monthly": return t("Covered by monthly fee");
    case "excused": return t("Excused · no charge");
    case "absent_free": return t("Absent · no charge");
    case "charge": return t("Charge {amount}", { amount: egp(o.kind === "charge" ? o.amount : 0, lang) });
    case "no_show_charge": return t("No-show charge {amount}", { amount: egp(o.kind === "charge" ? o.amount : 0, lang) });
    case "package_use": return t("Uses 1 package session");
    case "package_exhausted": return t("Package used up · charge {amount}", { amount: egp(o.kind === "charge" ? o.amount : 0, lang) });
  }
}
