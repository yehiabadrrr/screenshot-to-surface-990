import { sessionOutcome, type BillingRule, type Mark } from "@/lib/billing";
import { outcomeText } from "@/lib/l10n";
import { useI18n } from "@/lib/i18n";

/** How each status bills under a rule, shown before attendance is finalized. */
export function RuleEffects({ rule }: { rule: BillingRule }) {
  const { t, lang } = useI18n();
  const rows: [string, Mark][] = [["Present", "Present"], ["Absent", "Absent"], ["Excused", "Excused"], ["Unmarked", undefined]];
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
      {rows.map(([label, m]) => (
        <div key={label} className="rounded-md bg-muted/60 px-2.5 py-2">
          <dt className="font-medium text-foreground">{t(label)}</dt>
          <dd className="text-muted-foreground">{outcomeText(sessionOutcome(rule, m, 1), t, lang)}</dd>
        </div>
      ))}
      {rule.kind === "package" && <p className="col-span-2 text-muted-foreground sm:col-span-4">{t("When a package has no sessions left, a billable status is charged at the unit price.")}</p>}
    </dl>
  );
}
