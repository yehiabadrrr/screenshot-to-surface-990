import type { BillingRule } from "../billing";

/** Billing rule as stored in `classes` / `enrollments` (amounts in piastres). */
export interface RuleColumns {
  rule_kind: BillingRule["kind"] | null;
  rule_fee_piastres: number | null;
  rule_rate_piastres: number | null;
  rule_charge_no_show: boolean | null;
  rule_package_sessions: number | null;
  rule_package_price_piastres: number | null;
  rule_count_no_show: boolean | null;
}

export const toPiastres = (egp: number) => Math.round(egp * 100);
export const toEgp = (piastres: number | string) => Number(piastres) / 100;

const empty: RuleColumns = {
  rule_kind: null,
  rule_fee_piastres: null,
  rule_rate_piastres: null,
  rule_charge_no_show: null,
  rule_package_sessions: null,
  rule_package_price_piastres: null,
  rule_count_no_show: null,
};

export function ruleToColumns(rule: BillingRule | null | undefined): RuleColumns {
  if (!rule) return { ...empty };
  switch (rule.kind) {
    case "monthly":
      return { ...empty, rule_kind: "monthly", rule_fee_piastres: toPiastres(rule.fee) };
    case "per_session":
      return {
        ...empty,
        rule_kind: "per_session",
        rule_rate_piastres: toPiastres(rule.rate),
        rule_charge_no_show: rule.chargeNoShow,
      };
    case "package":
      return {
        ...empty,
        rule_kind: "package",
        rule_package_sessions: rule.sessions,
        rule_package_price_piastres: toPiastres(rule.price),
        rule_count_no_show: rule.countNoShow,
      };
  }
}

export function columnsToRule(c: RuleColumns): BillingRule | null {
  switch (c.rule_kind) {
    case "monthly":
      return { kind: "monthly", fee: toEgp(c.rule_fee_piastres ?? 0) };
    case "per_session":
      return {
        kind: "per_session",
        rate: toEgp(c.rule_rate_piastres ?? 0),
        chargeNoShow: !!c.rule_charge_no_show,
      };
    case "package":
      return {
        kind: "package",
        sessions: c.rule_package_sessions ?? 0,
        price: toEgp(c.rule_package_price_piastres ?? 0),
        countNoShow: !!c.rule_count_no_show,
      };
    default:
      return null;
  }
}
