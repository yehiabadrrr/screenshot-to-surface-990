import { Clock3, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { branches } from "@/lib/data";
import { useLedger, monthLabel } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { shortDateL } from "@/lib/l10n";

/** True when the selected month is still in progress (the window ends today, not at month end). */
export function usePartialPeriod() {
  const { period, filter } = useLedger();
  return filter.to.slice(0, 7) === period && filter.to !== `${period}-${new Date(Date.UTC(+period.slice(0, 4), +period.slice(5), 0)).getUTCDate()}`;
}

/** Period + branch filter shared by Overview and Finance (same state, same calculations). */
export function PeriodBranchFilter() {
  const { period, setPeriod, branch, setBranch, months, filter } = useLedger();
  const { t, lang } = useI18n();
  const partial = usePartialPeriod();
  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={period} onValueChange={setPeriod} dir={dir}>
        <SelectTrigger className="h-9 w-auto min-w-40 gap-1.5 bg-card" aria-label={t("Period")}><Clock3 className="size-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
        <SelectContent>{[...months].reverse().map((m) => <SelectItem key={m} value={m}>{monthLabel(m, lang)}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={branch} onValueChange={setBranch} dir={dir}>
        <SelectTrigger className="h-9 w-auto min-w-36 gap-1.5 bg-card" aria-label={t("Branch")}><MapPin className="size-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("All branches")}</SelectItem>
          {branches.map((b) => <SelectItem key={b} value={b}>{t(b)}</SelectItem>)}
        </SelectContent>
      </Select>
      {partial && <span className="text-xs text-muted-foreground">{t("Month to date · through {date}", { date: shortDateL(filter.to, lang) })}</span>}
    </div>
  );
}
