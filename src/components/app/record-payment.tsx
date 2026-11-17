import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { methods, students } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

export function RecordPaymentDialog({ trigger, studentId }: { trigger: ReactNode; studentId?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [sid, setSid] = useState(studentId ?? "");
  const [method, setMethod] = useState<string>("Cash");
  const [amount, setAmount] = useState("");
  const s = students.find((x) => x.id === sid);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{t("Record payment")}</DialogTitle><DialogDescription>Log money received from a student or guardian.</DialogDescription></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!s || !Number(amount)) return toast.error("Choose a student and enter an amount.");
            toast.success(`Payment of EGP ${Number(amount).toLocaleString()} recorded for ${s.name}`, { description: `${method} · receipt ready` });
            setOpen(false); setAmount("");
          }}
        >
          <div className="space-y-1.5">
            <Label>{t("Student")}</Label>
            <Select value={sid} onValueChange={setSid}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent className="max-h-64">{students.slice(0, 284).map((x) => <SelectItem key={x.id} value={x.id}>{x.name} · {x.id}</SelectItem>)}</SelectContent>
            </Select>
            {s && <p className="text-xs text-muted-foreground">Current balance: {s.balance > 0 ? `EGP ${s.balance} due` : s.balance < 0 ? `EGP ${-s.balance} prepaid` : "settled"}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>{t("Amount")} (EGP)</Label><Input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder={s && s.balance > 0 ? String(s.balance) : "0"} /></div>
            <div className="space-y-1.5"><Label>{t("Method")}</Label>
              <Select value={method} onValueChange={setMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{methods.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button><Button type="submit">{t("Save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
