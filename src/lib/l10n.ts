import type { Lang } from "./i18n";
import { egp, formatNumber, formatPercent } from "./format";
import type { BillingRule, Outcome } from "./billing";

type T = (k: string, v?: Record<string, string | number>) => string;

export const fmtNum = formatNumber;
export const localTime = (s: string, lang: Lang) =>
  lang === "ar" ? s.replace("PM", "م").replace("AM", "ص") : s;
export const localDays = (days: string, t: T) => days.split(" · ").map((d) => t(d)).join(" · ");
export const longDate = (date: string, lang: Lang) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
export const shortDateL = (iso: string, lang: Lang) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
export const timeOfDay = (iso: string, lang: Lang) =>
  new Date(iso).toLocaleString(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Cairo" });

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

/** Percent with locale digits and the Arabic percent sign in Arabic mode. */
export const pct = formatPercent;
export const monthShort = (ym: string, lang: Lang) =>
  new Date(`${ym}-15T00:00:00Z`).toLocaleDateString(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { month: "short", timeZone: "UTC" });
/** Compact axis label: 12k / ١٢ ألف. */
export const kAxis = (v: number, lang: Lang) => (lang === "ar" ? `${fmtNum(Math.round(v / 1000), lang)} ألف` : `${Math.round(v / 1000)}k`);

/** Sample-ledger notes and reasons follow a few fixed patterns; translate them for display. Free text a user typed is shown as-is. */
export function noteText(s: string | undefined, t: T, lang: Lang): string | undefined {
  if (!s) return s;
  let m = /^Tuition (\d{4}-\d{2})$/.exec(s);
  if (m) return t("Tuition · {month}", { month: monthShort(m[1]!, lang) });
  m = /^Package · (\d+) sessions$/.exec(s);
  if (m) return t("Package · {n} sessions", { n: fmtNum(Number(m[1]), lang) });
  m = /^Session (\d{4}-\d{2}-\d{2}) · 1 package session$/.exec(s);
  if (m) return t("Session {date} · 1 package session", { date: shortDateL(m[1]!, lang) });
  m = /^Session (\d{4}-\d{2}-\d{2})$/.exec(s);
  if (m) return t("Session {date}", { date: shortDateL(m[1]!, lang) });
  return t(s);
}

/** Errors thrown by the ledger/billing helpers carry English keys; show them in the current language. */
export const errText = (e: unknown, t: T) => t(e instanceof Error ? e.message : String(e));
