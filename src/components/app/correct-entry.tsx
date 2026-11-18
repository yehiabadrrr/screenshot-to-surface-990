import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { LedgerEntry } from "@/lib/ledger";
import { useLedger, CURRENT_USER } from "@/lib/ledger-store";
import { studentById } from "@/lib/data";
import { egp } from "@/lib/format";

/** Corrections never edit the original: they append a reversal (and optionally a corrected replacement). */
export function CorrectEntryDialog({ entry, onClose }: { entry: LedgerEntry | null; onClose: () => void }) {
  const { correct } = useLedger();
  const [mode, setMode] = useState<"reverse" | "adjust">("reverse");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const close = () => { setReason(""); setAmount(""); setError(""); setMode("reverse"); onClose(); };
  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Correct {entry?.id}</DialogTitle>
          <DialogDescription>The original stays unchanged. A reversal with your reason is added, so the history shows what happened. Demo only, not saved.</DialogDescription>
        </DialogHeader>
        {entry && (
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const n = Number(amount);
            if (!reason.trim()) return setError("A reason is required.");
            if (mode === "adjust" && !(n > 0)) return setError("Enter the corrected amount.");
            if (mode === "adjust" && n === entry.amount) return setError("The corrected amount is the same as the original.");
            try {
              const r = correct(entry.id, { reason, ...(mode === "adjust" ? { correctedAmount: n } : {}) });
              toast.success(r.replacement ? `${entry.id} reversed by ${r.reversal.id}, replaced by ${r.replacement.id}` : `${entry.id} reversed by ${r.reversal.id}`, { description: "Added to demo data only." });
              close();
            } catch (err) { setError(err instanceof Error ? err.message : "Could not correct"); }
          }}>
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="font-medium">{entry.type} · {egp(entry.amount)} · {entry.method ?? "—"}</div>
              <div className="text-xs text-muted-foreground">{studentById(entry.studentId)?.name} · {entry.date} · entered by {entry.enteredBy}</div>
            </div>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as "reverse" | "adjust")} className="gap-2">
              <label className="flex items-start gap-2 text-sm"><RadioGroupItem value="reverse" className="mt-0.5" /><span><b className="font-medium">Reverse only</b><br /><span className="text-muted-foreground">e.g. bounced transfer, duplicate entry</span></span></label>
              {entry.type === "Payment" && <label className="flex items-start gap-2 text-sm"><RadioGroupItem value="adjust" className="mt-0.5" /><span><b className="font-medium">Reverse and re-enter the correct amount</b><br /><span className="text-muted-foreground">Keeps the date, student, method and reference</span></span></label>}
            </RadioGroup>
            {mode === "adjust" && <div className="space-y-1.5"><Label>Correct amount (EGP)</Label><Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} /></div>}
            <div className="space-y-1.5"><Label htmlFor="corr-reason">Reason</Label><Textarea id="corr-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Typed 1,500 instead of 1,050" maxLength={200} /></div>
            <p className="text-xs text-muted-foreground">Recorded by {CURRENT_USER.name}.</p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" variant="destructive">Add reversal</Button></DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
