import { Money } from "./ui";
import { balanceLabel } from "@/lib/student-display";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function StudentBalance({ value }: { value: number }) {
  const { t } = useI18n();
  return <div className={cn("text-end num", value > 0 ? "text-destructive" : value < 0 ? "text-positive" : "text-muted-foreground")}>
    <div className="whitespace-nowrap font-medium"><Money value={Math.abs(value)} /></div><div className="text-meta font-medium opacity-80">{t(balanceLabel(value))}</div>
  </div>;
}