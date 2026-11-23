import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { branches } from "@/lib/data";
import { useLedger, monthLabel } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { shortDateL } from "@/lib/l10n";

/** Period + branch filter shared by Overview and Finance (same state, same calculations). */
export function PeriodBranchFilter() {
  const { period, setPeriod, branch, setBranch, months, filter } = useLedger();
  const { t, lang } = useI18n();
  const partial = filter.to.slice(0, 7) === period && filter.to !== `${period}-${new Date(Date.UTC(+period.slice(0, 4), +period.slice(5), 0)).getUTCDate()}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger className="h-9 w-44" aria-label={t("Period")}><SelectValue /></SelectTrigger>
        <SelectContent>{[...months].reverse().map((m) => <SelectItem key={m} value={m}>{monthLabel(m, lang)}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={branch} onValueChange={setBranch}>
        <SelectTrigger className="h-9 w-40" aria-label={t("Branch")}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("All branches")}</SelectItem>
          {branches.map((b) => <SelectItem key={b} value={b}>{t(b)}</SelectItem>)}
        </SelectContent>
      </Select>
      {partial && <span className="text-xs text-muted-foreground">{t("Month to date · through {date}", { date: shortDateL(filter.to, lang) })}</span>}
    </div>
  );
}
