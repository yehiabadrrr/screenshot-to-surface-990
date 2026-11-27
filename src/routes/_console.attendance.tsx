import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, X, Clock3, CheckCheck, Lock, History, Eye, Info, CalendarDays, MapPin, CircleDashed, Users, Receipt } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Pill, Panel, Avatar, IconTile, Meter, EmptyState } from "@/components/app/ui";
import { RuleEffects } from "@/components/app/rule-effects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { classWeekdays, weekdayOf, sessionIdFor, sessionOutcome, packageRemaining, linkedEntry, type AttendanceStatus, type Mark } from "@/lib/billing";
import { useLedger, todayIso } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { egp } from "@/lib/format";
import { fmtNum, localDays, localTime, longDate, outcomeText, ruleKindLabel, ruleSummary, timeOfDay } from "@/lib/l10n";
import { pageHead } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/attendance")({
  validateSearch: (search: Record<string, unknown>): { classId?: string; date?: string } => ({
    ...(typeof search['classId'] === "string" && /^C-\d+$/.test(search['classId']) ? { classId: search['classId'] } : {}),
    ...(typeof search['date'] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(search['date']) && search['date'] <= todayIso() ? { date: search['date'] } : {}),
  }),
  head: pageHead("Attendance", "Mark Present, Absent or Excused, see how each student is billed, and finalize the session."),
  component: AttendancePage,
});

const opts: { v: AttendanceStatus; icon: typeof Check; cls: string }[] = [
  { v: "Present", icon: Check, cls: "data-[on=true]:bg-positive data-[on=true]:text-positive-foreground data-[on=true]:hover:bg-positive" },
  { v: "Absent", icon: X, cls: "data-[on=true]:bg-destructive data-[on=true]:text-destructive-foreground data-[on=true]:hover:bg-destructive" },
  { v: "Excused", icon: Clock3, cls: "data-[on=true]:bg-warning data-[on=true]:text-warning-foreground data-[on=true]:hover:bg-warning" },
];

function AttendancePage() {
  const search = Route.useSearch();
  const { t, lang } = useI18n();
  const L = useLedger();
  const { actor, setActor, entries } = L;
  const visible = actor.kind === "teacher" ? L.classes.filter((c) => c.teacherId === actor.teacherId) : L.classes;
  const [pickedClass, setPickedClass] = useState(search.classId ?? "");
  const [date, setDate] = useState(search.date ?? todayIso());
  // With no class picked, open on the first class actually scheduled for the selected date.
  const classId = visible.some((c) => c.id === pickedClass)
    ? pickedClass
    : (visible.find((c) => classWeekdays(c.days).includes(weekdayOf(date))) ?? visible[0])?.id;
  const [amending, setAmending] = useState<{ studentId: string; to: Mark } | null>(null);
  const [reason, setReason] = useState("");
  const [amendError, setAmendError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const cls = L.classes.find((c) => c.id === classId);
  const sid = cls ? sessionIdFor(cls.id, date) : "";
  const rec = L.sessions[sid];
  const marks = rec?.marks ?? {};
  const finalized = rec?.finalized;
  const roster = useMemo(() => (cls ? L.students.filter((s) => s.status === "Active" && s.classIds.includes(cls.id) && s.joined <= date) : []), [L.students, cls, date]);
  const rows = useMemo(() => roster.flatMap((s) => {
    if (!cls) return [];
    const { rule, source } = L.ruleFor(s.id, cls.id);
    const remaining = rule.kind === "package" ? packageRemaining(entries, s.id, cls.id) : 0;
    const posted = finalized ? linkedEntry(entries, sid, s.id) : undefined;
    return [{ s, rule, source, remaining, posted, outcome: sessionOutcome(rule, marks[s.id], remaining) }];
  }), [roster, L, cls, entries, finalized, sid, marks]);

  if (!cls) {
    return <div className="mx-auto max-w-3xl"><PageHeader title={t("Attendance")} /><p className="surface p-6 text-sm text-muted-foreground">{t(actor.kind === "teacher" ? "No classes are assigned to this teacher." : "No classes yet. Add your first class under Classes, then take its attendance here.")}</p></div>;
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
    <div className="mx-auto max-w-[90rem] pb-28 md:pb-6">
      <PageHeader
        title={actor.kind === "teacher" ? t("My classes · attendance") : t("Attendance")}
        subtitle={actor.kind === "teacher" ? t("My classes · attendance") : t("Tap a status for each student. Unmarked students are never charged.")}
        actions={
          <Select value={actor.kind === "admin" ? "admin" : actor.teacherId} onValueChange={(v) => { if (v === "admin") setActor({ kind: "admin", name: L.currentUser.name }); else { const next = L.teacherActors.find((a) => a.teacherId === v); if (next) setActor(next); } }} dir={lang === "ar" ? "rtl" : "ltr"}>
            <SelectTrigger className="h-9 w-auto min-w-56 gap-2 bg-card" aria-label={t("Viewing as")}><Eye className="size-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">{t("Viewing as")}: {L.currentUser.name} ({t(L.currentUser.role)})</SelectItem>
              {L.teacherActors.map((a) => <SelectItem key={a.teacherId} value={a.teacherId}>{t("Viewing as")}: {a.name} ({t("Teacher")})</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      {actor.kind === "teacher" && <p className="-mt-3 mb-4 flex items-start gap-2 rounded-lg border border-info/20 bg-info-soft px-3 py-2 text-xs text-foreground"><Info className="mt-0.5 size-3.5 shrink-0 text-info" />{t("Teacher view shows only this teacher's classes. It is a demo preview, not access control: there are no real sign-ins yet.")}</p>}

      {/* Session header */}
      <section className="surface mb-5 overflow-hidden">
        <div className="grid gap-3 border-b bg-muted/30 p-4 sm:grid-cols-[minmax(0,1fr)_12rem] sm:p-5">
          <Select value={cls.id} onValueChange={setPickedClass} dir={lang === "ar" ? "rtl" : "ltr"}>
            <SelectTrigger className="h-12 bg-card text-[15px] font-semibold" aria-label={t("Class")}><SelectValue /></SelectTrigger>
            <SelectContent>{visible.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" className="h-12 bg-card" value={date} max={todayIso()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label={t("Date")} />
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-[13px] text-muted-foreground sm:px-5">
          <span className="inline-flex items-center gap-1.5 font-semibold text-foreground"><CalendarDays className="size-4 text-brand" />{longDate(date, lang)}</span>
          <span className="inline-flex items-center gap-1.5"><Avatar name={(L.findTeacher(cls.teacherId)?.name ?? "—")} seed={cls.teacherId} size="xs" /><bdi className="font-medium text-foreground">{(L.findTeacher(cls.teacherId)?.name ?? "—")}</bdi></span>
          <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" />{localDays(cls.days, t)} · <bdi>{localTime(cls.time, lang)}</bdi></span>
          <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{t(cls.branch)}</span>
          <span className="ms-auto">{finalized ? <Pill tone="positive" dot>{t("Finalized")}</Pill> : <Pill tone="warning" dot>{t("Draft")}</Pill>}</span>
        </div>
        {!scheduled && <p className="mx-4 mb-4 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-foreground sm:mx-5"><Info className="mt-0.5 size-3.5 shrink-0 text-warning" />{t("This class is not scheduled on this weekday. You can still record a make-up session.")}</p>}
        {finalized && (
          <p className="flex items-center gap-1.5 border-t bg-positive-soft/60 px-4 py-2.5 text-xs text-foreground sm:px-5"><Lock className="size-3.5 shrink-0 text-positive" />
            {t("Finalized by {by} on {at}. Changing a status now asks for a reason and posts an adjustment.", { by: finalized.by, at: timeOfDay(finalized.at, lang) })}
          </p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {/* Session summary */}
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {([["Present", counts.Present, "positive", Check], ["Absent", counts.Absent, "negative", X], ["Excused", counts.Excused, "warning", Clock3], ["Unmarked", unmarked, unmarked ? "brand" : "neutral", CircleDashed]] as const).map(([label, n, tone, Icon]) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3">
                <IconTile icon={Icon} tone={tone} className="size-9 [&_svg]:size-4" />
                <div><div className="font-display text-xl font-bold leading-none num">{fmtNum(n, lang)}</div><div className="mt-1 text-[11px] font-medium text-muted-foreground">{t(label)}</div></div>
              </div>
            ))}
          </div>

          <div className="surface overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <h2 className="text-section-title font-semibold">{t("Student roster")}</h2>
                <div className="mt-1.5 flex items-center gap-2"><Meter className="w-32" value={roster.length ? (marked / roster.length) * 100 : 0} tone="teal" label={t("Marked")} /><span className="text-[11px] text-muted-foreground num">{t("{m} of {n} marked", { m: fmtNum(marked, lang), n: fmtNum(roster.length, lang) })}</span></div>
              </div>
              {!finalized && (
                <Button size="sm" variant="outline" className="h-9" onClick={() => L.setMarks(cls.id, date, Object.fromEntries(roster.filter((s) => !marks[s.id]).map((s) => [s.id, "Present" as const])))} disabled={!unmarked}>
                  <CheckCheck className="size-4 text-positive" />{t("Mark all unmarked present")}
                </Button>
              )}
            </div>
            <ul className="divide-y">
              {rows.map(({ s, rule, source, remaining, posted, outcome }) => {
                const m = marks[s.id];
                return (
                  <li key={s.id} className={cn("flex flex-col gap-3 border-s-[3px] px-4 py-3.5 sm:flex-row sm:items-center sm:px-5", m === "Present" ? "border-s-positive" : m === "Absent" ? "border-s-destructive" : m === "Excused" ? "border-s-warning" : "border-s-transparent")}>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar name={s.name} seed={s.id} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <bdi className="truncate font-semibold">{s.name}</bdi>
                          <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", source === "enrollment" ? "bg-tint-blue text-tint-blue-ink" : "bg-muted text-muted-foreground")}>{ruleKindLabel(rule, t)}{source === "enrollment" ? ` · ${t("own rule")}` : ""}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {rule.kind === "package" && <span className={cn("font-medium", remaining <= 1 && "text-warning")}>{t("{n} sessions left", { n: fmtNum(remaining, lang) })} · </span>}
                          {finalized
                            ? posted ? (posted.type === "Charge" ? t("Posted {id} · {amount}", { id: posted.id, amount: egp(posted.amount, lang) }) : t("Posted {id} · 1 package session", { id: posted.id })) : t("No charge posted")
                            : outcomeText(outcome, t, lang)}
                        </div>
                      </div>
                    </div>
                    <div role="group" aria-label={`${t("Attendance")} · ${s.name}`} className="grid grid-cols-3 gap-1.5 rounded-xl bg-muted/70 p-1 sm:w-auto sm:min-w-[19rem]">
                      {opts.map((o) => (
                        <button key={o.v} type="button" data-on={m === o.v} onClick={() => tap(s.id, o.v)} aria-pressed={m === o.v} aria-label={`${t(o.v)} · ${s.name}`}
                          className={cn("flex h-12 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted-foreground transition-colors outline-none hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:h-10 sm:text-[13px] data-[on=true]:shadow-card", o.cls)}>
                          <o.icon className="size-5 sm:size-4" /><span>{t(o.v)}</span>
                        </button>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
            {rows.length === 0 && <EmptyState icon={Users} title={t("No active students are enrolled in this class on this date.")} compact />}
          </div>
        </div>

        {/* Billing preview and audit */}
        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <Panel title={t("Billing preview")} subtitle={t("How each status bills under this class's rule")} icon={Receipt}>
            <div className="mb-3 flex items-start gap-3 rounded-lg bg-tint-blue px-3 py-2.5">
              <Receipt className="mt-0.5 size-4 shrink-0 text-tint-blue-ink" />
              <div className="min-w-0"><div className="text-[13px] font-semibold">{t("Class billing rule")}: {ruleKindLabel(L.classRule(cls.id), t)}</div><div className="text-xs text-muted-foreground">{ruleSummary(L.classRule(cls.id), t, lang)}</div></div>
            </div>
            <RuleEffects rule={L.classRule(cls.id)} columns={2} />
            {overrides > 0 && <p className="mt-3 text-xs text-muted-foreground">{t("{n} students have their own billing rule, shown on their row.", { n: fmtNum(overrides, lang) })}</p>}
            {!finalized && (
              <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4">
                <div className="rounded-lg border px-3 py-2"><div className="font-display text-lg font-bold num">{fmtNum(willCharge, lang)}</div><div className="text-[11px] text-muted-foreground">{t("Charges on finalize")}</div></div>
                <div className="rounded-lg border px-3 py-2"><div className="font-display text-lg font-bold num">{fmtNum(willUse, lang)}</div><div className="text-[11px] text-muted-foreground">{t("Package sessions used")}</div></div>
              </div>
            )}
          </Panel>

          {rec && rec.audit.length > 0 && (
            <Panel title={t("Changes after finalization")} icon={History}>
              <ol className="space-y-3">
                {[...rec.audit].reverse().map((a, i) => (
                  <li key={i} className="rounded-lg border-s-2 border-s-brand bg-muted/50 px-3 py-2 text-sm">
                    <div><bdi className="font-semibold">{L.findStudent(a.studentId)?.name}</bdi>: {t(a.from ?? "Unmarked")} <span className="rtl:hidden">→</span><span className="ltr:hidden">←</span> {t(a.to ?? "Unmarked")}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{t("{by} · {at} · reason: {reason}", { by: a.by, at: timeOfDay(a.at, lang), reason: a.reason })}</div>
                    <div className="mt-0.5 text-xs font-medium text-brand">{a.reversalId || a.createdId ? [a.reversalId && t("reversed by {id}", { id: a.reversalId }), a.createdId && t("new entry {id}", { id: a.createdId })].filter(Boolean).join(" · ") : t("No billing change")}</div>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </aside>
      </div>

      <div className="attendance-dock fixed inset-x-0 z-20 border-t bg-card/95 px-4 py-3 shadow-pop backdrop-blur md:sticky md:mt-5 md:rounded-xl md:border lg:me-[23.25rem]">
        <div className="mx-auto flex items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-semibold num">{t("{m} marked · {u} unmarked", { m: fmtNum(marked, lang), u: fmtNum(unmarked, lang) })}</div>
            <div className="truncate text-xs text-muted-foreground">
              {finalized ? t("Finalized · demo data, not saved") : t("On finalize: {c} charges, {u} package sessions · demo only", { c: fmtNum(willCharge, lang), u: fmtNum(willUse, lang) })}
            </div>
          </div>
          <Button size="lg" className="h-12 min-w-32 px-5 text-[15px]" disabled={!!finalized || marked === 0} onClick={() => (unmarked ? setConfirmOpen(true) : doFinalize())}>
            {finalized ? <><Lock />{t("Finalized")}</> : <><CheckCheck />{t("Finalize")}</>}
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
