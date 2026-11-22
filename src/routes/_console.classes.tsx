import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Pill, Money } from "@/components/app/ui";
import { RuleEditor, ruleIsValid } from "@/components/app/rule-editor";
import { RuleEffects } from "@/components/app/rule-effects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { classes, teacherById, type ClassItem } from "@/lib/data";
import type { BillingRule } from "@/lib/billing";
import { useLedger } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { fmtNum, localDays, localTime, ruleKindLabel, ruleSummary } from "@/lib/l10n";
import { pageHead } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/classes")({
  head: pageHead("Classes & Courses", "Tutoring groups and language courses with teachers, schedules, capacity and billing rules."),
  component: ClassesPage,
});

function ClassesPage() {
  const { t, lang } = useI18n();
  const { classRule, setClassRule, students } = useLedger();
  const [kind, setKind] = useState("all");
  const [edit, setEdit] = useState<ClassItem | null>(null);
  const [draft, setDraft] = useState<BillingRule | null>(null);
  const [error, setError] = useState("");
  const rows = classes.filter((c) => kind === "all" || c.kind === kind);
  const enrolledIn = (id: string) => students.filter((s) => s.status === "Active" && s.classIds.includes(id)).length;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("Classes & Courses")} subtitle={t("{n} active classes · {e} enrollments", { n: fmtNum(classes.length, lang), e: fmtNum(classes.reduce((s, c) => s + enrolledIn(c.id), 0), lang) })}
        actions={<TooltipProvider><Tooltip><TooltipTrigger asChild><span tabIndex={0}><Button disabled><Plus className="size-4" />{t("New class")}</Button></span></TooltipTrigger><TooltipContent>{t("Creating classes needs saved data, which isn't set up yet.")}</TooltipContent></Tooltip></TooltipProvider>} />
      <Tabs value={kind} onValueChange={setKind} className="mb-4"><TabsList><TabsTrigger value="all">{t("All")}</TabsTrigger><TabsTrigger value="Tutoring">{t("Tutoring")}</TabsTrigger><TabsTrigger value="Language course">{t("Language courses")}</TabsTrigger></TabsList></Tabs>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((c) => {
          const n = enrolledIn(c.id);
          const fill = n / c.capacity;
          const rule = classRule(c.id);
          return (
            <div key={c.id} className="surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-semibold">{c.name}</div><div className="mt-0.5 text-xs text-muted-foreground">{teacherById(c.teacherId).name}</div></div>
                <button aria-label={t("Edit billing rule")} onClick={() => { setEdit(c); setDraft(rule); setError(""); }} className="rounded p-1.5 text-muted-foreground hover:bg-muted"><Pencil className="size-3.5" /></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5"><Pill tone={c.kind === "Tutoring" ? "brand" : "positive"}>{t(c.kind)}</Pill><Pill>{t(c.branch)}</Pill></div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div><div className="text-muted-foreground">{t("Schedule")}</div><div className="mt-0.5 font-medium">{localDays(c.days, t)}</div><div className="num">{localTime(c.time, lang)}</div></div>
                <div><div className="text-muted-foreground">{t("Billing rule")}</div><div className="mt-0.5 font-medium">{ruleKindLabel(rule, t)}</div><div>{ruleSummary(rule, t, lang)}</div></div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs"><span className="text-muted-foreground">{t("Capacity")}</span><span className="num font-medium">{fmtNum(n, lang)}/{fmtNum(c.capacity, lang)}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className={cn("h-full rounded-full", fill > 0.9 ? "bg-warning" : "bg-brand")} style={{ width: `${Math.min(100, fill * 100)}%` }} /></div>
              </div>
            </div>
          );
        })}
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("Billing rule")} · {edit?.name}</DialogTitle>
            <DialogDescription>{t("Applies to future finalized sessions for students without their own rule. Posted charges are not recalculated. Demo only, not saved.")}</DialogDescription>
          </DialogHeader>
          {edit && draft && (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              if (!ruleIsValid(draft)) { setError(t("Every amount in a billing rule must be greater than zero.")); return; }
              setClassRule(edit.id, draft);
              toast.success(t("Billing rule updated in demo data"), { description: `${edit.name} · ${ruleSummary(draft, t, lang)}` });
              setEdit(null);
            }}>
              <RuleEditor value={draft} onChange={setDraft} fallbackFee={edit.fee} />
              <RuleEffects rule={draft} />
              <p className="text-xs text-muted-foreground">{t("Other class details (name, teacher, schedule) can't be edited until saved data is set up.")} <Money value={edit.fee} /> · {localDays(edit.days, t)}</p>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <DialogFooter><Button type="button" variant="outline" onClick={() => setEdit(null)}>{t("Cancel")}</Button><Button type="submit">{t("Save rule")}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
