import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RuleEditor, ruleIsValid } from "./rule-editor";
import { useLedger } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import type { BillingRule } from "@/lib/billing";
import type { ClassItem } from "@/lib/data";
import { cn } from "@/lib/utils";
import { WEEK, daysToString, fromClock, toClock } from "@/lib/schedule";

const NO_TEACHER = "__none";

export function ClassEditor({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: ClassItem | null;
}) {
  const { t, lang } = useI18n();
  const { teachers, branches, saveClass, source } = useLedger();
  const saved = source.kind === "center";
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ClassItem["kind"]>("Tutoring");
  const [teacherId, setTeacherId] = useState(NO_TEACHER);
  const [branch, setBranch] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [time, setTime] = useState("16:00");
  const [capacity, setCapacity] = useState("30");
  const [fee, setFee] = useState("");
  const [rule, setRule] = useState<BillingRule>({ kind: "monthly", fee: 0 });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setName(initial?.name ?? "");
    setKind(initial?.kind ?? "Tutoring");
    setTeacherId(initial?.teacherId || NO_TEACHER);
    setBranch(initial?.branch ?? branches[0] ?? "");
    setDays(initial ? initial.days.split(" · ").filter(Boolean) : []);
    setTime(initial ? fromClock(initial.time) : "16:00");
    setCapacity(String(initial?.capacity ?? 30));
    setFee(initial ? String(initial.fee) : "");
    setRule(initial?.rule ?? { kind: "monthly", fee: 0 });
  }, [open, initial, branches]);

  const num = (s: string) => Number(s.replace(/\D/g, "")) || 0;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const feeN = num(fee);
    const finalRule: BillingRule =
      rule.kind === "monthly" && rule.fee === 0 ? { kind: "monthly", fee: feeN } : rule;
    if (name.trim().length < 2) return setError(t("Enter the class name."));
    if (!days.length) return setError(t("Choose at least one day."));
    if (!(num(capacity) > 0)) return setError(t("Capacity must be at least 1."));
    if (!ruleIsValid(finalRule))
      return setError(t("Every amount in a billing rule must be greater than zero."));
    setBusy(true);
    try {
      const c = await saveClass({
        ...(initial ? { id: initial.id } : {}),
        name: name.trim(),
        kind,
        teacherId: teacherId === NO_TEACHER ? "" : teacherId,
        branch: branch as ClassItem["branch"],
        days: daysToString(days),
        time: toClock(time),
        capacity: num(capacity),
        fee: feeN,
        rule: finalRule,
      });
      toast.success(
        t(initial ? "{name} updated" : "{name} added as {id}", { name: c.name, id: c.id }),
        saved ? undefined : { description: t("Demo only, not saved.") },
      );
      onOpenChange(false);
    } catch (err) {
      setError(
        t("Couldn't save the class: {reason}", {
          reason: err instanceof Error ? err.message : String(err),
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const dir = lang === "ar" ? "rtl" : "ltr";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t(initial ? "Edit class" : "New class")}
            {initial && (
              <>
                {" "}
                · <bdi>{initial.name}</bdi>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {saved
              ? t("Saved to {center}.", {
                  center: source.kind === "center" ? source.centerName : "",
                })
              : t("Demo only: changes stay in this tab and disappear on refresh.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cl-name">{t("Class name")}</Label>
            <Input
              id="cl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              placeholder={t("e.g. Physics · Thanaweya 3")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Type")}</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ClassItem["kind"])} dir={dir}>
              <SelectTrigger aria-label={t("Type")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tutoring">{t("Tutoring")}</SelectItem>
                <SelectItem value="Language course">{t("Language course")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Teacher")}</Label>
            <Select
              value={teacherId}
              onValueChange={(v) => {
                if (v) setTeacherId(v);
              }}
              dir={dir}
            >
              <SelectTrigger aria-label={t("Teacher")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEACHER}>{t("No teacher yet")}</SelectItem>
                {teachers.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Branch")}</Label>
            <Select
              value={branch}
              onValueChange={(v) => {
                if (v) setBranch(v);
              }}
              dir={dir}
            >
              <SelectTrigger aria-label={t("Branch")}>
                <SelectValue placeholder={t("Choose branch")} />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>
                    {t(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-time">{t("Start time")}</Label>
            <Input
              id="cl-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              dir="ltr"
            />
          </div>
          <fieldset className="space-y-1.5 sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">{t("Days")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEK.map((d) => {
                const on = days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])}
                    className={cn(
                      "h-9 min-w-12 rounded-md border px-3 text-sm font-medium transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:bg-muted",
                    )}
                  >
                    {t(d)}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="cl-cap">{t("Capacity")}</Label>
            <Input
              id="cl-cap"
              inputMode="numeric"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))}
              dir="ltr"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-fee">
              {t("Monthly fee")} ({t("EGP")})
            </Label>
            <Input
              id="cl-fee"
              inputMode="numeric"
              value={fee}
              onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))}
              dir="ltr"
            />
          </div>
          <fieldset className="space-y-3 border-t pt-4 sm:col-span-2">
            <legend className="sr-only">{t("Billing rule")}</legend>
            <RuleEditor
              value={
                rule.kind === "monthly" && rule.fee === 0
                  ? { kind: "monthly", fee: num(fee) }
                  : rule
              }
              onChange={setRule}
              fallbackFee={num(fee)}
            />
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "…" : t(initial ? "Save changes" : "Add class")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
