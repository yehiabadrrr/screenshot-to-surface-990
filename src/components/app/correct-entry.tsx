import { useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { LedgerEntry } from "@/lib/ledger";
import { useLedger } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { egp } from "@/lib/format";
import { shortDateL } from "@/lib/l10n";
import { cn } from "@/lib/utils";

/** Corrections never edit the original: they append a reversal (and optionally a corrected replacement). */
export function CorrectEntryDialog({
  entry,
  onClose,
}: {
  entry: LedgerEntry | null;
  onClose: () => void;
}) {
  const { correct, students, currentUser: CURRENT_USER } = useLedger();
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<"reverse" | "adjust">("reverse");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const close = () => {
    setReason("");
    setAmount("");
    setError("");
    setMode("reverse");
    onClose();
  };
  const option = (value: "reverse" | "adjust", title: string, hint: string) => (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-sm transition-colors",
        mode === value ? "border-primary bg-accent" : "hover:bg-muted/50",
      )}
    >
      <RadioGroupItem value={value} className="mt-0.5" />
      <span>
        <b className="font-medium">{title}</b>
        <br />
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md" dir={lang === "ar" ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle>{t("Correct {id}", { id: entry?.id ?? "" })}</DialogTitle>
          <DialogDescription>
            {t(
              "The original stays unchanged. A reversal with your reason is added, so the history shows what happened. Demo only, not saved.",
            )}
          </DialogDescription>
        </DialogHeader>
        {entry && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(amount);
              if (!reason.trim()) return setError(t("A reason is required."));
              if (mode === "adjust" && !(n > 0)) return setError(t("Enter the corrected amount."));
              if (mode === "adjust" && n === entry.amount)
                return setError(t("The corrected amount is the same as the original."));
              try {
                const r = correct(entry.id, {
                  reason,
                  ...(mode === "adjust" ? { correctedAmount: n } : {}),
                });
                toast.success(
                  r.replacement
                    ? t("{id} reversed by {rev}, replaced by {rep}", {
                        id: entry.id,
                        rev: r.reversal.id,
                        rep: r.replacement.id,
                      })
                    : t("{id} reversed by {rev}", { id: entry.id, rev: r.reversal.id }),
                  { description: t("Added to demo data only.") },
                );
                close();
              } catch (err) {
                setError(err instanceof Error ? t(err.message) : t("Could not correct"));
              }
            }}
          >
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="font-medium">
                {t(entry.type)} · <bdi className="num">{egp(entry.amount, lang)}</bdi> ·{" "}
                {entry.method ? t(entry.method) : "—"}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                <bdi>{students.find((s) => s.id === entry.studentId)?.name ?? entry.studentId}</bdi>{" "}
                · {shortDateL(entry.date, lang)} ·{" "}
                {t("entered by {name}", { name: t(entry.enteredBy) })}
              </div>
            </div>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "reverse" | "adjust")}
              className="gap-2"
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              {option("reverse", t("Reverse only"), t("e.g. bounced transfer, duplicate entry"))}
              {entry.type === "Payment" &&
                option(
                  "adjust",
                  t("Reverse and re-enter the correct amount"),
                  t("Keeps the date, student, method and reference"),
                )}
            </RadioGroup>
            {mode === "adjust" && (
              <div className="space-y-1.5">
                <Label htmlFor="corr-amount">{t("Correct amount (EGP)")}</Label>
                <Input
                  id="corr-amount"
                  dir="ltr"
                  className="font-medium num"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="corr-reason">{t("Reason")}</Label>
              <Textarea
                id="corr-reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("Typed 1,500 instead of 1,050")}
                maxLength={200}
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Info className="size-3.5" />
              {t("Recorded by {by}.", { by: CURRENT_USER.name })}
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={close}>
                {t("Cancel")}
              </Button>
              <Button type="submit" variant="destructive">
                {t("Add reversal")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
