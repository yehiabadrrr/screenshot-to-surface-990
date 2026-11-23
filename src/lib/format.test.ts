import { describe, expect, it } from "vitest";
import { egp, formatMoney, formatNumber, formatPercent } from "./format";

describe("shared presentation formatters", () => {
  it("preserves existing integral English currency output", () => {
    expect(egp(1250)).toBe("EGP 1,250");
    expect(egp(185000, "en")).toBe("EGP 185,000");
    expect(egp(0)).toBe("EGP 0");
  });
  it("uses Western digits and the Arabic currency label", () => {
    expect(formatMoney(1250, "ar")).toBe("1,250 ج.م");
    expect(formatNumber(1250, "ar")).toBe("1,250");
    expect(formatPercent(92.6, "ar")).toBe("92.6٪");
  });
  it("preserves piastres rather than rounding to whole pounds", () => {
    expect(formatMoney(1250.25)).toBe("EGP 1,250.25");
    expect(formatMoney(1250.5, "ar")).toBe("1,250.50 ج.م");
    expect(formatMoney(0.01)).toBe("EGP 0.01");
    expect(formatMoney(10.25 + 20.5)).toBe("EGP 30.75");
  });
  it("shows explicit signs without relying on colors", () => {
    expect(formatMoney(-1250.25)).toBe("−EGP 1,250.25");
    expect(formatMoney(1250, "en", true)).toBe("+EGP 1,250");
    expect(formatMoney(-1250, "ar", true)).toBe("−1,250 ج.م");
    expect(formatMoney(0, "en", true)).toBe("EGP 0");
  });
  it("retains English percentage output", () => {
    expect(formatPercent(92.6)).toBe("92.6%");
    expect(formatNumber(1250.25)).toBe("1,250.25");
  });
});
