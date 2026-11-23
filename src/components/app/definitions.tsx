const DEFS: [string, string][] = [
  ["Billed revenue", "Tuition charges issued in the period, before discounts."],
  ["Discounts", "Reductions granted on charges (e.g. sibling discount). Net billed = billed revenue − discounts."],
  ["Gross collections", "Completed payments dated in the period. Pending and reversed payments are not included."],
  ["Refunds", "Completed money returned to students in the period."],
  ["Net collections", "Gross collections − refunds."],
  ["Pending", "Payments awaiting confirmation (e.g. bank transfer not yet cleared). Shown separately; not collected and not applied to balances."],
  ["Reversed", "Transactions cancelled by a reversal record with a reason. Excluded from every total; both records stay in the history."],
  ["Outstanding receivables", "Sum of what students owe at the end of the period: charges − discounts − payments + refunds, where positive."],
  ["Prepaid balances", "Credit students have paid ahead, at the end of the period (the same formula, where negative)."],
  ["Teacher payables", "Accrued for the period from each teacher's pay model. Percentage models use gross collections for that teacher's classes."],
];

import { useI18n } from "@/lib/i18n";

export function FinanceDefinitions() {
  const { t } = useI18n();
  return (
    <dl className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">
      {DEFS.map(([k, v]) => (
        <div key={k}><dt className="font-medium text-foreground">{t(k)}</dt><dd className="text-muted-foreground">{t(v)}</dd></div>
      ))}
      <div className="md:col-span-2 text-xs text-muted-foreground">{t("Every figure follows the month and branch selected above. A month in progress runs to today and is compared with the same days of the previous month.")}</div>
    </dl>
  );
}
