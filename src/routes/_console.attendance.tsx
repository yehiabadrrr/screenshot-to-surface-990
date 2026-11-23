import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, X, Clock3, CheckCheck, Lock, History } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Pill } from "@/components/app/ui";
import { RuleEffects } from "@/components/app/rule-effects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { classes, teacherById } from "@/lib/data";
import { classWeekdays, weekdayOf, sessionIdFor, sessionOutcome, packageRemaining, linkedEntry, type AttendanceStatus, type Mark } from "@/lib/billing";
import { useLedger, todayIso, teacherActors, CURRENT_USER } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { egp } from "@/lib/format";
import { fmtNum, localDays, localTime, longDate, outcomeText, ruleKindLabel, ruleSummary, timeOfDay } from "@/lib/l10n";
import { pageHead } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/attendance")({
  validateSearch: (search: Record<string, unknown>): { classId?: string; date?: string } => ({
    ...(typeof search['classId'] === "string" && classes.some((c) => c.id === search['classId']) ? { classId: search['classId'] } : {}),
    ...(typeof search['date'] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search['date']) && search['date'] <= todayIso() ? { date: search['date'] } : {}),
  }),
  head: pageHead("Attendance", "Mark Present, Absent or Excused, see how each student is billed, and finalize the session."),
  component: AttendancePage,
});

const opts: { v: AttendanceStatus; icon: typeof Check; cls: string }[] = [
  { v: "Present", icon: Check, cls: "data-[on=true]:bg-positive data-[on=true]:text-positive-foreground data-[on=true]:border-positive" },
  { v: "Absent", icon: X, cls: "data-[on=true]:bg-destructive data-[on=true]:text-destructive-foreground data-[on=true]:border-destructive" },
  { v: "Excused", icon: Clock3, cls: "data-[on=true]:bg-warning data-[on=true]:text-primary-foreground data-[on=true]:border-warning" },
];

function AttendancePage() {
  const search = Route.useSearch();
  const { t, lang } = useI18n();
  const L = useLedger();
  const { actor, setActor, entries } = L;
  const visible = actor.kind === "teacher" ? classes.filter((c) => c.teacherId === actor.teacherId) : classes;
  const [pickedClass, setPickedClass] = useState(search.classId ?? classes[0]?.id ?? "");
  const classId = visible.some((c) => c.id === pickedClass) ? pickedClass : visible[0]?.id;
  const [date, setDate] = useState(search.date ?? todayIso());
  const [amending, setAmending] = useState<{ studentId: string; to: Mark } | null>(null);
  const [reason, setReason] = useState("");
  const [amendError, setAmendError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const cls = classes.find((c) => c.id === classId);
  const sid = cls ? sessionIdFor(cls.id, date) : "";
  const rec = L.sessions[sid];
  const marks = rec?.marks ?? {};
  const finalized = rec?.finalized;
  const roster = useMemo(() => (cls ? L.students.filter((s) => s.status === "Active" && s.classIds.includes(cls.id) && s.joined <= date) : []), [L.students, cls, date]);
  const rows = useMemo(() => roster.map((s) => {
    const { rule, source } = L.ruleFor(s.id, cls!.id);
    const remaining = rule.kind === "package" ? packageRemaining(entries, s.id, cls!.id) : 0;
    const posted = finalized ? linkedEntry(entries, sid, s.id) : undefined;
    return { s, rule, source, remaining, posted, outcome: sessionOutcome(rule, marks[s.id], remaining) };
  }), [roster, L, cls, entries, finalized, sid, marks]);

  if (!cls) {
    return <div className="mx-auto max-w-3xl"><PageHeader title={t("Attendance")} /><p className="surface p-6 text-sm text-muted-foreground">{t("No classes are assigned to this teacher.")}</p></div>;
  }

  const counts = { Present: 0, Absent: 0, Excused: 0 } as Record<AttendanceStatus, number>;
  roster.forEach((s) => { const v = marks[s.id]; if (v) counts[v]++; });
  const marked = counts.Present + counts.Absent + counts.Excused;
  const unmarked = roster.length - marked;
  const scheduled = classWeekdays(cls.days).includes(weekdayOf(date));
  const overrides = rows.filter((r) => r.source === "enrollment").length;
  const willCharge = rows.filter((r) => r.outcome.kind === "charge").length;
  const willUse = rows.filter((r) => r.outcome.kind === "package_use").length;

  const tap = (studentId: string, v: AttendanceStatus) => {
    if (!finalized) { L.setMark(cls.id, date, studentId, marks[studentId] === v ? undefined : v); return; }
    if (marks[studentId] === v) return;
    setReason(""); setAmendError(""); setAmending({ studentId, to: v });
  };
  const doFinalize = () => {
    try {
      const { created } = L.finalize(cls.id, date);
      const charges = created.filter((e) => e.type === "Charge").length;
      const uses = created.filter((e) => e.type === "PackageUse").length;
      toast.success(t("Session finalized in demo data"), { description: t("{c} charges and {u} package sessions posted. Not saved to a real ledger.", { c: fmtNum(charges, lang), u: fmtNum(uses, lang) }) });
    } catch (e) { toast.error(e instanceof Error ? e.message : String(e)); }
    setConfirmOpen(false);
  };
  const amendRow = amending ? rows.find((r) => r.s.id === amending.studentId) : undefined;
  const amendPreview = amendRow && amending
    ? sessionOutcome(amendRow.rule, amending.to, amendRow.remaining + (amendRow.posted?.type === "PackageUse" ? 1 : 0)) : undefined;

  return (
    <div className="mx-auto max-w-4xl pb-28">
      <PageHeader
        title={actor.kind === "teacher" ? t("My classes · attendance") : t("Attendance")}
        subtitle={t("Tap a status for each student. Unmarked students are never charged.")}
        actions={
          <Select value={actor.kind === "admin" ? "admin" : actor.teacherId} onValueChange={(v) => setActor(v === "admin" ? { kind: "admin", name: CURRENT_USER.name } : teacherActors.find((a) => a.teacherId === v)!)}>
            <SelectTrigger className="h-9 w-56" aria-label={t("Viewing as")}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">{t("Viewing as")}: {CURRENT_USER.name} ({t("Owner")})</SelectItem>
              {teacherActors.map((a) => <SelectItem key={a.teacherId} value={a.teacherId}>{t("Viewing as")}: {a.name} ({t("Teacher")})</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      {actor.kind === "teacher" && <p className="-mt-3 mb-4 text-xs text-muted-foreground">{t("Teacher view shows only this teacher's classes. It is a demo preview, not access control: there are no real sign-ins yet.")}</p>}

      <div className="surface mb-4 space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Select value={cls.id} onValueChange={setPickedClass}>
            <SelectTrigger className="h-11" aria-label={t("Class")}><SelectValue /></SelectTrigger>
            <SelectContent>{visible.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" className="h-11" value={date} max={todayIso()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label={t("Date")} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{longDate(date, lang)}</span>
          <span>{t("Teacher")}: <b className="font-medium text-foreground">{teacherById(cls.teacherId).name}</b></span>
          <span>{localDays(cls.days, t)} · {localTime(cls.time, lang)}</span><span>{t(cls.branch)}</span>
          <span className="ms-auto">{finalized ? <Pill tone="positive">{t("Finalized")}</Pill> : <Pill tone="warning">{t("Draft")}</Pill>}</span>
        </div>
        {!scheduled && <p className="rounded-md bg-warning-soft px-3 py-2 text-xs text-foreground">{t("This class is not scheduled on this weekday. You can still record a make-up session.")}</p>}
        <div className="border-t pt-3">
          <div className="mb-2 flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium">{t("Class billing rule")}: {ruleKindLabel(L.classRule(cls.id), t)}</span>
            <span className="text-muted-foreground">{ruleSummary(L.classRule(cls.id), t, lang)}</span>
          </div>
          <RuleEffects rule={L.classRule(cls.id)} />
          {overrides > 0 && <p className="mt-2 text-xs text-muted-foreground">{t("{n} students have their own billing rule, shown on their row.", { n: fmtNum(overrides, lang) })}</p>}
        </div>
        {finalized && (
          <p className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground"><Lock className="size-3.5" />
            {t("Finalized by {by} on {at}. Changing a status now asks for a reason and posts an adjustment.", { by: finalized.by, at: timeOfDay(finalized.at, lang) })}
          </p>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <Pill tone="positive">{t("Present")} {fmtNum(counts.Present, lang)}</Pill>
        <Pill tone="negative">{t("Absent")} {fmtNum(counts.Absent, lang)}</Pill>
        <Pill tone="warning">{t("Excused")} {fmtNum(counts.Excused, lang)}</Pill>
        <Pill tone={unmarked ? "brand" : "neutral"}>{t("Unmarked")} {fmtNum(unmarked, lang)}</Pill>
        {!finalized && (
          <Button size="sm" variant="outline" className="ms-auto h-9" onClick={() => L.setMarks(cls.id, date, Object.fromEntries(roster.filter((s) => !marks[s.id]).map((s) => [s.id, "Present" as const])))} disabled={!unmarked}>
            <CheckCheck className="size-4" />{t("Mark all unmarked present")}
          </Button>
        )}
      </div>

      <div className="surface divide-y">
        {rows.map(({ s, rule, source, remaining, posted, outcome }) => (
          <div key={s.id} className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate font-medium">{s.name}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[11px]", source === "enrollment" ? "bg-accent text-brand" : "bg-muted text-muted-foreground")}>{ruleKindLabel(rule, t)}{source === "enrollment" ? ` · ${t("own rule")}` : ""}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {rule.kind === "package" && <>{t("{n} sessions left", { n: fmtNum(remaining, lang) })} · </>}
                {finalized
                  ? posted ? (posted.type === "Charge" ? t("Posted {id} · {amount}", { id: posted.id, amount: egp(posted.amount, lang) }) : t("Posted {id} · 1 package session", { id: posted.id })) : t("No charge posted")
                  : outcomeText(outcome, t, lang)}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-1.5">
              {opts.map((o) => (
                <button key={o.v} type="button" data-on={marks[s.id] === o.v} onClick={() => tap(s.id, o.v)} aria-pressed={marks[s.id] === o.v} aria-label={`${t(o.v)} · ${s.name}`}
                  className={cn("flex h-12 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:h-10 sm:text-xs", o.cls)}>
                  <o.icon className="size-5 sm:size-4" /><span>{t(o.v)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{t("No active students are enrolled in this class on this date.")}</p>}
      </div>

      {rec && rec.audit.length > 0 && (
        <div className="surface mt-4 p-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><History className="size-4" />{t("Changes after finalization")}</h2>
          <ul className="space-y-2 text-sm">
            {[...rec.audit].reverse().map((a, i) => (
              <li key={i} className="rounded-md bg-muted/50 px-3 py-2">
                <div><b className="font-medium">{L.findStudent(a.studentId)?.name}</b>: {t(a.from ?? "Unmarked")} → {t(a.to ?? "Unmarked")}</div>
                <div className="text-xs text-muted-foreground">{t("{by} · {at} · reason: {reason}", { by: a.by, at: timeOfDay(a.at, lang), reason: a.reason })}</div>
                <div className="text-xs text-muted-foreground">{a.reversalId || a.createdId ? [a.reversalId && t("reversed by {id}", { id: a.reversalId }), a.createdId && t("new entry {id}", { id: a.createdId })].filter(Boolean).join(" · ") : t("No billing change")}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 py-3 shadow-pop backdrop-blur md:sticky md:bottom-4 md:mt-4 md:rounded-xl md:border">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-medium num">{t("{m} marked · {u} unmarked", { m: fmtNum(marked, lang), u: fmtNum(unmarked, lang) })}</div>
            <div className="truncate text-xs text-muted-foreground">
              {finalized ? t("Finalized · demo data, not saved") : t("On finalize: {c} charges, {u} package sessions · demo only", { c: fmtNum(willCharge, lang), u: fmtNum(willUse, lang) })}
            </div>
          </div>
          <Button size="lg" className="h-12 px-5" disabled={!!finalized || marked === 0} onClick={() => (unmarked ? setConfirmOpen(true) : doFinalize())}>
            {finalized ? t("Finalized") : t("Finalize")}
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("{n} students are unmarked", { n: fmtNum(unmarked, lang) })}</AlertDialogTitle>
            <AlertDialogDescription>{t("Unmarked students will not be charged. If you mark them later, an adjustment with a reason will be posted.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("Keep marking")}</AlertDialogCancel><AlertDialogAction onClick={doFinalize}>{t("Finalize anyway")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!amending} onOpenChange={(o) => !o && setAmending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Change finalized attendance")}</DialogTitle>
            <DialogDescription>{t("Posted entries are not edited. If billing changes, the posted entry is reversed and a new one is added, with your name, the time and the reason.")}</DialogDescription>
          </DialogHeader>
          {amending && amendRow && (
            <form className="space-y-3" onSubmit={(e) => {
              e.preventDefault();
              if (!reason.trim()) { setAmendError(t("A reason is required.")); return; }
              try {
                const a = L.amend(cls.id, date, amending.studentId, amending.to, reason);
                toast.success(t("Adjustment added to demo data"), { description: a.reversalId || a.createdId ? [a.reversalId && t("reversed by {id}", { id: a.reversalId }), a.createdId && t("new entry {id}", { id: a.createdId })].filter(Boolean).join(" · ") : t("No billing change") });
                setAmending(null);
              } catch (err) { setAmendError(err instanceof Error ? err.message : String(err)); }
            }}>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="font-medium">{amendRow.s.name}: {t(marks[amending.studentId] ?? "Unmarked")} → {t(amending.to ?? "Unmarked")}</div>
                <div className="text-xs text-muted-foreground">{t("Now")}: {amendRow.posted ? (amendRow.posted.type === "Charge" ? t("Posted {id} · {amount}", { id: amendRow.posted.id, amount: egp(amendRow.posted.amount, lang) }) : t("Posted {id} · 1 package session", { id: amendRow.posted.id })) : t("No charge posted")}</div>
                <div className="text-xs text-muted-foreground">{t("After")}: {amendPreview ? outcomeText(amendPreview, t, lang) : ""}</div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="amend-reason">{t("Reason")}</Label><Textarea id="amend-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder={t("e.g. Student arrived late; teacher confirmed")} /></div>
              <p className="text-xs text-muted-foreground">{t("Recorded by {by}.", { by: actor.name })}</p>
              {amendError && <p role="alert" className="text-sm text-destructive">{amendError}</p>}
              <DialogFooter><Button type="button" variant="outline" onClick={() => setAmending(null)}>{t("Cancel")}</Button><Button type="submit">{t("Add adjustment")}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
