import { sessionOutcome, type BillingRule, type Mark } from "@/lib/billing";
import { outcomeText } from "@/lib/l10n";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** How each status bills under a rule, shown before attendance is finalized. */
export function RuleEffects({ rule, columns = 4 }: { rule: BillingRule; columns?: 2 | 4 }) {
  const { t, lang } = useI18n();
  const rows: [string, Mark, string][] = [
    ["Present", "Present", "bg-positive"],
    ["Absent", "Absent", "bg-destructive"],
    ["Excused", "Excused", "bg-warning"],
    ["Unmarked", undefined, "bg-muted-foreground"],
  ];
  return (
    <dl className={cn("grid grid-cols-2 gap-2 text-xs", columns === 4 && "sm:grid-cols-4")}>
      {rows.map(([label, m, dot]) => (
        <div key={label} className="rounded-lg border bg-muted/40 px-2.5 py-2">
          <dt className="flex items-center gap-1.5 font-medium text-foreground">
            <span className={cn("size-1.5 rounded-full", dot)} />
            {t(label)}
          </dt>
          <dd className="mt-0.5 text-muted-foreground">
            {outcomeText(sessionOutcome(rule, m, 1), t, lang)}
          </dd>
        </div>
      ))}
      {rule.kind === "package" && (
        <p className={cn("col-span-2 text-muted-foreground", columns === 4 && "sm:col-span-4")}>
          {t(
            "When a package has no sessions left, a billable status is charged at the unit price.",
          )}
        </p>
      )}
    </dl>
  );
}
