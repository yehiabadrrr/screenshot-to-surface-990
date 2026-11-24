import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, BookOpen, CalendarDays, Users, MapPin, GraduationCap, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Pill, Money } from "@/components/app/ui";
import { RuleEditor, ruleIsValid } from "@/components/app/rule-editor";
import { RuleEffects } from "@/components/app/rule-effects";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const { classRule, setClassRule, students, branch } = useLedger();
  const [kind, setKind] = useState("all");
  const [edit, setEdit] = useState<ClassItem | null>(null);
  const [draft, setDraft] = useState<BillingRule | null>(null);
  const [error, setError] = useState("");
  const rows = classes.filter((c) => (kind === "all" || c.kind === kind) && (branch === "all" || c.branch === branch));
  const enrolledIn = (id: string) => students.filter((s) => s.status === "Active" && s.classIds.includes(id)).length;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("Classes & Courses")} subtitle={t("{n} active classes · {e} enrollments", { n: fmtNum(classes.length, lang), e: fmtNum(classes.reduce((s, c) => s + enrolledIn(c.id), 0), lang) })}
        />
      <p className="mb-5 text-xs text-muted-foreground">{t("Creating classes needs saved data, which isn't set up yet.")}</p>
      <Tabs value={kind} onValueChange={setKind} className="mb-4"><TabsList className="workspace-tabs"><TabsTrigger value="all">{t("All")}</TabsTrigger><TabsTrigger value="Tutoring">{t("Tutoring")}</TabsTrigger><TabsTrigger value="Language course">{t("Language courses")}</TabsTrigger></TabsList></Tabs>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((c) => {
          const n = enrolledIn(c.id);

          const rule = classRule(c.id);
          return (
            <article key={c.id} className="surface flex min-w-0 flex-col overflow-hidden transition-shadow hover:shadow-pop">
              <div className={cn("h-1.5", c.kind === "Tutoring" ? "bg-brand" : "bg-teal")} />
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-4 flex items-center justify-between gap-3"><span className={cn("grid size-11 place-items-center rounded-lg", c.kind === "Tutoring" ? "bg-accent text-brand" : "bg-teal-soft text-teal")}><BookOpen className="size-5" /></span><Pill tone={c.kind === "Tutoring" ? "brand" : "neutral"}>{t(c.kind)}</Pill></div>
                <h2 className="min-h-12 break-words text-base font-semibold"><bdi>{c.name}</bdi></h2>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><GraduationCap className="size-4 shrink-0" /><bdi>{teacherById(c.teacherId).name}</bdi></div>
                <div className="my-4 grid gap-2 border-y py-4 text-xs"><div className="flex items-start gap-2"><CalendarDays className="size-4 shrink-0 text-muted-foreground" /><span>{localDays(c.days, t)} · <bdi>{localTime(c.time, lang)}</bdi></span></div><div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />{t(c.branch)}</div></div>
                <div className="mb-4 min-h-12"><div className="text-[11px] text-muted-foreground">{t("Billing rule")}</div><div className="mt-1 text-sm font-medium">{ruleKindLabel(rule, t)}</div><div className="mt-1 text-xs text-muted-foreground">{ruleSummary(rule, t, lang)}</div></div>
                <div className="mt-auto"><div className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-1.5 text-muted-foreground"><Users className="size-3.5" />{t("Enrolled students")}</span><span className="num font-medium">{fmtNum(n, lang)} / {fmtNum(c.capacity, lang)}</span></div><progress max={c.capacity} value={Math.min(c.capacity, n)} className="mt-2 h-1.5 w-full accent-primary" aria-label={t("Capacity")} /><div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t pt-4"><Button variant="outline" size="sm" asChild><Link to="/attendance" search={{ classId: c.id }}><CalendarCheck />{t("Attendance")}</Link></Button><Button variant="ghost" size="icon" title={t("Edit billing rule")} aria-label={`${t("Edit billing rule")} · ${c.name}`} onClick={() => { setEdit(c); setDraft(rule); setError(""); }}><Pencil /></Button></div></div>
              </div>
            </article>
          );
        })}
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent dir={lang === "ar" ? "rtl" : "ltr"} className="max-h-[92vh] overflow-y-auto">
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
