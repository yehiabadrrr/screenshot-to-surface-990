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
import { useLedger } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import type { CompensationModel } from "@/lib/finance";
import type { Teacher } from "@/lib/data";

const MODELS: { type: CompensationModel["type"]; label: string; amountLabel: string }[] = [
  { type: "percentage", label: "Revenue share", amountLabel: "Share of collected tuition (%)" },
  { type: "monthly", label: "Monthly salary", amountLabel: "Monthly salary (EGP)" },
  { type: "per_session", label: "Per session", amountLabel: "Per session taught (EGP)" },
  { type: "per_student", label: "Per student", amountLabel: "Per attending student (EGP)" },
];

export function TeacherEditor({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Teacher | null;
}) {
  const { t, lang } = useI18n();
  const { branches, saveTeacher, source } = useLedger();
  const saved = source.kind === "center";
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [phone, setPhone] = useState("");
  const [branch, setBranch] = useState("");
  const [model, setModel] = useState<CompensationModel["type"]>("percentage");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    setName(initial?.name ?? "");
    setSubject(initial?.subject ?? "");
    setPhone(initial?.phone ?? "");
    setBranch(initial?.branch ?? branches[0] ?? "");
    setModel(initial?.model.type ?? "percentage");
    setAmount(
      initial
        ? String(initial.model.type === "percentage" ? initial.model.percent : initial.model.amount)
        : "",
    );
  }, [open, initial, branches]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (name.trim().length < 2) return setError(t("Enter the teacher's name."));
    if (phone && !/^01[0125]\d{8}$/.test(phone))
      return setError(
        t("Enter an 11-digit Egyptian mobile number starting with 010, 011, 012 or 015."),
      );
    if (!(n > 0) || (model === "percentage" && n > 100))
      return setError(
        t(
          model === "percentage"
            ? "The share must be between 1 and 100%."
            : "Enter an amount greater than zero.",
        ),
      );
    const m: CompensationModel =
      model === "percentage" ? { type: "percentage", percent: n } : { type: model, amount: n };
    setBusy(true);
    try {
      const x = await saveTeacher({
        ...(initial ? { id: initial.id } : {}),
        name: name.trim(),
        subject: subject.trim(),
        phone,
        branch: branch as Teacher["branch"],
        model: m,
      });
      toast.success(
        t(initial ? "{name} updated" : "{name} added as {id}", { name: x.name, id: x.id }),
        saved ? undefined : { description: t("Demo only, not saved.") },
      );
      onOpenChange(false);
    } catch (err) {
      setError(
        t("Couldn't save the teacher: {reason}", {
          reason: err instanceof Error ? err.message : String(err),
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const dir = lang === "ar" ? "rtl" : "ltr";
  const current = MODELS.find((x) => x.type === model)!;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(initial ? "Edit teacher" : "Add teacher")}
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
            <Label htmlFor="te-name">{t("Full name")}</Label>
            <Input
              id="te-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="te-subject">{t("Subject")}</Label>
            <Input
              id="te-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="te-phone">{t("Phone")}</Label>
            <Input
              id="te-phone"
              inputMode="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
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
            <Label>{t("Pay model")}</Label>
            <Select
              value={model}
              onValueChange={(v) => {
                if (v) setModel(v as CompensationModel["type"]);
              }}
              dir={dir}
            >
              <SelectTrigger aria-label={t("Pay model")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((x) => (
                  <SelectItem key={x.type} value={x.type}>
                    {t(x.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="te-amount">{t(current.amountLabel)}</Label>
            <Input
              id="te-amount"
              inputMode="decimal"
              dir="ltr"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {t("Pay is calculated from the ledger for each period; this sets the agreement only.")}
          </p>
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
              {busy ? "…" : t(initial ? "Save changes" : "Add teacher")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
