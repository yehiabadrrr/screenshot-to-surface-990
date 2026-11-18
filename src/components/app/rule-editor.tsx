import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BillingRule } from "@/lib/billing";
import { useI18n } from "@/lib/i18n";

export function RuleEditor({ value, onChange, fallbackFee }: { value: BillingRule; onChange: (r: BillingRule) => void; fallbackFee: number }) {
  const { t } = useI18n();
  const num = (s: string) => Number(s.replace(/\D/g, "")) || 0;
  const setKind = (k: string) => {
    if (k === "monthly") onChange({ kind: "monthly", fee: fallbackFee });
    if (k === "per_session") onChange({ kind: "per_session", rate: Math.round(fallbackFee / 8 / 5) * 5 || 50, chargeNoShow: false });
    if (k === "package") onChange({ kind: "package", sessions: 8, price: fallbackFee, countNoShow: true });
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>{t("Billing rule")}</Label>
        <Select value={value.kind} onValueChange={setKind}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">{t("Monthly fee")}</SelectItem>
            <SelectItem value="per_session">{t("Per attended session")}</SelectItem>
            <SelectItem value="package">{t("Session package")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {value.kind === "monthly" && (
        <div className="space-y-1.5"><Label>{t("Monthly fee (EGP)")}</Label><Input inputMode="numeric" value={value.fee} onChange={(e) => onChange({ ...value, fee: num(e.target.value) })} /></div>
      )}
      {value.kind === "per_session" && (<>
        <div className="space-y-1.5"><Label>{t("Rate per session (EGP)")}</Label><Input inputMode="numeric" value={value.rate} onChange={(e) => onChange({ ...value, rate: num(e.target.value) })} /></div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><Checkbox checked={value.chargeNoShow} onCheckedChange={(c) => onChange({ ...value, chargeNoShow: c === true })} />{t("Charge unexcused absences")}</label>
      </>)}
      {value.kind === "package" && (<>
        <div className="space-y-1.5"><Label>{t("Sessions in package")}</Label><Input inputMode="numeric" value={value.sessions} onChange={(e) => onChange({ ...value, sessions: Math.max(1, num(e.target.value)) })} /></div>
        <div className="space-y-1.5"><Label>{t("Package price (EGP)")}</Label><Input inputMode="numeric" value={value.price} onChange={(e) => onChange({ ...value, price: num(e.target.value) })} /></div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox checked={value.countNoShow} onCheckedChange={(c) => onChange({ ...value, countNoShow: c === true })} />{t("Unexcused absence uses a session")}</label>
      </>)}
    </div>
  );
}

export const ruleIsValid = (r: BillingRule) =>
  r.kind === "monthly" ? r.fee > 0 : r.kind === "per_session" ? r.rate > 0 : r.sessions > 0 && r.price > 0;
