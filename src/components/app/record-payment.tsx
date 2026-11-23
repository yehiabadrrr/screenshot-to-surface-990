import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { branches, classById } from "@/lib/data";
import { METHODS, balancesAsOf, type Method } from "@/lib/ledger";
import { useLedger, CURRENT_USER, todayIso } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { egp } from "@/lib/format";

const NO_CLASS = "none";

export function RecordPaymentDialog({ trigger, studentId, controlledOpen, onOpenChange }: { trigger: ReactNode; studentId?: string; controlledOpen?: boolean; onOpenChange?: (open: boolean) => void }) {
  const { t } = useI18n();
  const { entries, students, recordPayment, filter } = useLedger();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (value: boolean) => { setInternalOpen(value); onOpenChange?.(value); };
  const [sid, setSid] = useState(studentId ?? "");
  const initialStudent = students.find((student) => student.id === studentId);
  const [classId, setClassId] = useState(initialStudent?.classIds[0] ?? NO_CLASS);
  const [branch, setBranch] = useState<string>(initialStudent?.branch ?? "");
  const [method, setMethod] = useState<Method>("Cash");
  const [status, setStatus] = useState<"Completed" | "Pending">("Completed");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const s = students.find((x) => x.id === sid);
  const balance = useMemo(() => (s ? balancesAsOf(entries, todayIso()).get(s.id) ?? 0 : 0), [entries, s]);

  const pickStudent = (id: string) => {
    setSid(id);
    const st = students.find((x) => x.id === id);
    if (st) { setBranch(st.branch); setClassId(st.classIds[0] ?? NO_CLASS); }
  };
  const reset = () => { setAmount(""); setReference(""); setNote(""); setError(""); setStatus("Completed"); setDate(todayIso()); };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) { reset(); if (studentId) pickStudent(studentId); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Record payment")}</DialogTitle>
          <DialogDescription>Demo only: this adds the payment to the sample data in this tab. It is not saved to a real ledger and disappears on refresh.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(amount);
            if (!s) return setError("Choose a student.");
            if (!(n > 0)) return setError("Enter an amount greater than zero.");
            if (!date || date > todayIso()) return setError("Choose a transaction date that is not in the future.");
            if (!branch) return setError("Choose a branch.");
            try {
              const entry = recordPayment({
                studentId: s.id, branch, date, amount: n, method, status,
                ...(classId !== NO_CLASS ? { classId } : {}),
                ...(reference.trim() ? { reference: reference.trim() } : {}),
                ...(note.trim() ? { note: note.trim() } : {}),
              });
              const outside = date < filter.from || date > filter.to || (filter.branch !== "all" && filter.branch !== branch);
              toast.success(`${entry.id} added to demo data`, {
                description: `${egp(n)} · ${method} · ${status === "Pending" ? "pending, not counted as collected" : "counted in collections"}${outside ? " · outside the current filter" : ""}. Not saved to a real ledger.`,
              });
              setOpen(false);
            } catch (err) { setError(err instanceof Error ? err.message : "Could not add payment"); }
          }}
        >
          <div className="space-y-1.5 sm:col-span-2">
            <Label>{t("Student")}</Label>
            <Select value={sid} onValueChange={pickStudent}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent className="max-h-64">{students.filter((x) => x.status !== "Inactive").map((x) => <SelectItem key={x.id} value={x.id}>{x.name} · {x.id}</SelectItem>)}</SelectContent>
            </Select>
            {s && <p className="text-xs text-muted-foreground">Balance today: {balance > 0 ? `${egp(balance)} due` : balance < 0 ? `${egp(-balance)} prepaid credit` : "settled"}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{t("Amount")} (EGP)</Label>
            <Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder={balance > 0 ? String(balance) : "0"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pay-date">{t("Date")}</Label>
            <Input id="pay-date" type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Method")}</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as Method)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Status")}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "Completed" | "Pending")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Completed">Completed (money received)</SelectItem><SelectItem value="Pending">Pending (awaiting confirmation)</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Branch")}</Label>
            <Select value={branch} onValueChange={setBranch}><SelectTrigger><SelectValue placeholder="Choose branch" /></SelectTrigger><SelectContent>{branches.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Class")} <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CLASS}>Not linked to a class</SelectItem>
                {s?.classIds.map((c) => <SelectItem key={c} value={c}>{classById(c).name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pay-ref">Receipt / reference <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={method === "InstaPay" ? "InstaPay transaction ID" : method === "Fawry" ? "Fawry reference" : "Receipt no."} maxLength={60} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pay-note">Note <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">Entered by <b className="font-medium text-foreground">{CURRENT_USER.name}</b> ({CURRENT_USER.role}). A new transaction ID is assigned on save; existing IDs never change.</p>
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button><Button type="submit">Add to demo data</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
