export function egp(n: number, lang: "en" | "ar" = "en") {
  const v = Math.round(n);
  if (lang === "ar") return `${v.toLocaleString("ar-EG")} ج.م`;
  return `EGP ${v.toLocaleString("en-US")}`;
}
export function compactEgp(n: number) {
  return n >= 1000 ? `EGP ${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : `EGP ${n}`;
}
export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
