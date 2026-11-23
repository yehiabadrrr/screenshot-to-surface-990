import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RuleEditor, ruleIsValid } from "./rule-editor";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLedger } from "@/lib/ledger-store";
import type { BillingRule } from "@/lib/billing";
import { useI18n } from "@/lib/i18n";
import { ruleKindLabel, ruleSummary } from "@/lib/l10n";
import { contactErrors } from "@/lib/student-display";

export const GRADES = ["Thanaweya 3", "Thanaweya 2", "Thanaweya 1", "Prep 3", "Adult"];
export function AddStudent() {
  const { t, lang } = useI18n();
  const { addStudent, classRule, classes } = useLedger();
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [guardian, setGuardian] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [grade, setGrade] = useState("Thanaweya 3");
  const [picked, setPicked] = useState<string[]>([]);
  const [own, setOwn] = useState<Record<string, BillingRule>>({});
  const [attempted, setAttempted] = useState(false);
  const [error, setError] = useState("");
  const errors = contactErrors(name, phone, guardianPhone);
  const reset = () => { setStep(0); setName(""); setPhone(""); setGuardian(""); setGuardianPhone(""); setGrade("Thanaweya 3"); setPicked([]); setOwn({}); setAttempted(false); setError(""); };
  const validate = () => {
    setAttempted(true);
    if (Object.values(errors).some(Boolean)) { setStep(0); return false; }
    if (!picked.length) { setError(t("Choose at least one class.")); setStep(1); return false; }
    if (Object.values(own).some((rule) => !ruleIsValid(rule))) { setError(t("Every amount in a billing rule must be greater than zero.")); setStep(1); return false; }
    return true;
  };
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (step === 0) { setAttempted(true); if (Object.values(errors).some(Boolean)) return; setStep(1); return; }
    if (!validate()) return;
    if (step === 1) { setStep(2); return; }
    const firstClass = classes.find((item) => item.id === picked[0]);
    if (!firstClass) return;
    const student = addStudent({ name: name.trim(), phone, guardian: guardian.trim() || "—", guardianPhone, grade, classIds: picked, branch: firstClass.branch }, own);
    toast.success(t("{name} added to demo data as {id}", { name: student.name, id: student.id }), { description: t("Not saved to a real database.") });
    setOpen(false); void navigate({ to: "/students/$id", params: { id: student.id } });
  };
  const field = (id: string, label: string, value: string, change: (value: string) => void, errorKey = "", tel = false) => <div className="space-y-1.5"><Label htmlFor={id}>{t(label)}</Label><Input id={id} value={value} onChange={(e) => change(tel ? e.target.value.replace(/\D/g, "").slice(0, 11) : e.target.value)} maxLength={tel ? 11 : 80} inputMode={tel ? "tel" : "text"} dir={tel ? "ltr" : undefined} aria-invalid={attempted && !!errorKey} aria-describedby={attempted && errorKey ? `${id}-error` : undefined} />{attempted && errorKey && <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{t(errorKey)}</p>}</div>;
  const content = <form onSubmit={submit} className="space-y-5">
    <ol className="grid grid-cols-3 gap-2 border-b pb-3 text-xs">{["Contact details", "Enrollments", "Review"].map((label, index) => <li key={label} aria-current={step === index ? "step" : undefined} className={step === index ? "font-semibold text-brand" : "text-muted-foreground"}>{index + 1}. {t(label)}</li>)}</ol>
    {step === 0 && <>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 text-sm font-semibold">{t("Student")}</legend>{field("st-name", "Full name", name, setName, errors.name)}{field("st-phone", "Phone", phone, setPhone, errors.phone, true)}<div className="space-y-1.5"><Label>{t("Grade")}</Label><Select value={grade} onValueChange={setGrade}><SelectTrigger aria-label={t("Grade")}><SelectValue /></SelectTrigger><SelectContent>{GRADES.map((item) => <SelectItem key={item} value={item}>{t(item)}</SelectItem>)}</SelectContent></Select></div></fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 text-sm font-semibold">{t("Guardian")}</legend>{field("st-g", "Guardian name", guardian, setGuardian)}{field("st-gp", "Guardian phone", guardianPhone, setGuardianPhone, errors.guardianPhone, true)}</fieldset>
    </>}
    {step === 1 && <>
      <fieldset><legend className="mb-2 text-sm font-semibold">{t("Classes")}</legend><div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">{classes.map((item) => <label key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded p-2 text-sm hover:bg-muted"><Checkbox checked={picked.includes(item.id)} onCheckedChange={(on) => { setPicked((previous) => on === true ? [...previous, item.id] : previous.filter((id) => id !== item.id)); if (on !== true) setOwn(({ [item.id]: _drop, ...rest }) => rest); }} /><span className="min-w-0"><bdi className="block break-words">{item.name}</bdi><span className="text-xs text-muted-foreground">{ruleKindLabel(classRule(item.id), t)}</span></span></label>)}</div></fieldset>
      {picked.map((id) => { const item = classes.find((c) => c.id === id); if (!item) return null; const rule = own[id]; return <fieldset key={id} className="space-y-3 border-t pt-3"><legend className="text-sm font-medium"><bdi>{item.name}</bdi></legend><label className="flex items-start gap-2 text-xs"><Checkbox checked={!!rule} onCheckedChange={(on) => setOwn((previous) => { const next = { ...previous }; if (on === true) next[id] = classRule(id); else delete next[id]; return next; })} />{t("Own billing rule for this student")}</label>{rule ? <RuleEditor value={rule} onChange={(next) => setOwn((previous) => ({ ...previous, [id]: next }))} fallbackFee={item.fee} /> : <p className="text-xs text-muted-foreground">{t("Uses the class rule")} · {ruleSummary(classRule(id), t, lang)}</p>}</fieldset>; })}
    </>}
    {step === 2 && <div className="space-y-4"><h3 className="text-sm font-semibold">{t("Final summary")}</h3><dl className="grid grid-cols-2 gap-3 text-sm">{[["Full name", name], ["Phone", phone], ["Grade", t(grade)], ["Guardian name", guardian || "—"], ["Guardian phone", guardianPhone || "—"]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{t(label ?? "")}</dt><dd className="break-words"><bdi>{value}</bdi></dd></div>)}</dl><ul className="space-y-3 border-t pt-3">{picked.map((id) => <li key={id} className="text-sm"><bdi>{classes.find((item) => item.id === id)?.name}</bdi><p className="mt-1 text-xs text-muted-foreground">{t(own[id] ? "own rule" : "class rule")} · {ruleSummary(own[id] ?? classRule(id), t, lang)}</p></li>)}</ul></div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>{step > 0 && <Button type="button" variant="outline" onClick={() => { setStep(step - 1); setError(""); }}>{t("Back")}</Button>}<Button type="submit">{t(step === 2 ? "Add to demo data" : "Continue")}</Button></div>
  </form>;
  const description = t("Demo only: the student is added to the sample data in this tab and disappears on refresh.");
  const wrap = (children: ReactNode) => <div className="mx-auto w-full max-w-2xl space-y-5">{children}</div>;
  return <><Button onClick={() => { reset(); setOpen(true); }}><UserPlus />{t("Add student")}</Button>{mobile ? <Sheet open={open} onOpenChange={setOpen}><SheetContent side="bottom" dir={lang === "ar" ? "rtl" : "ltr"} className="h-dvh w-full overflow-y-auto px-4 pb-6 pt-12">{wrap(<><SheetTitle>{t("Add student")}</SheetTitle><SheetDescription>{description}</SheetDescription>{content}</>)}</SheetContent></Sheet> : <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" dir={lang === "ar" ? "rtl" : "ltr"}><DialogHeader><DialogTitle>{t("Add student")}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>{content}</DialogContent></Dialog>}</>;
}
