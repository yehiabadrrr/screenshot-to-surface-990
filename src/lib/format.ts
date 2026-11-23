type Locale = "en" | "ar";

export function formatNumber(n: number, _lang: Locale = "en") {
  return n.toLocaleString("en-US", { maximumFractionDigits: 20 });
}

/** Presentation only: money has two minor-unit digits; integral amounts retain their existing output. */
export function formatMoney(n: number, lang: Locale = "en", signed = false) {
  const negative = n < 0 && Math.round(Math.abs(n) * 100) > 0;
  const sign = negative ? "−" : signed && n > 0 ? "+" : "";
  const amount = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  return lang === "ar" ? `${sign}${amount} ج.م` : `${sign}EGP ${amount}`;
}

export function formatPercent(n: number, lang: Locale = "en") {
  return `${formatNumber(n, lang)}${lang === "ar" ? "٪" : "%"}`;
}

/** Compatibility alias: existing screens keep their integer English currency output. */
export const egp = formatMoney;
export function compactEgp(n: number) {
  return n >= 1000 ? `EGP ${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `EGP ${n}`;
}
export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
