import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft, Phone, Plus, MessageCircle, Pencil, PackagePlus, CalendarDays, MapPin, GraduationCap, IdCard, Wallet, CalendarCheck,
  BookOpen, Banknote, Receipt, Undo2, BadgePercent, RotateCcw, PackageCheck, UserRound, Lock, Users,
} from "lucide-react";
import { toast } from "sonner";
import { Panel, Pill, Money, EmptyState, Avatar, Meter, IconTile, LedgerCode, type Tone } from "@/components/app/ui";
import { RuleEditor, ruleIsValid } from "@/components/app/rule-editor";
import { RuleEffects } from "@/components/app/rule-effects";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { classById, teacherById, type ClassItem } from "@/lib/data";
import { balancesAsOf, reversedIds, displayStatus, type LedgerEntry } from "@/lib/ledger";
import { packageRemaining, type BillingRule } from "@/lib/billing";
import { useLedger, todayIso } from "@/lib/ledger-store";
import { RecordPaymentDialog } from "@/components/app/record-payment";
import { useI18n } from "@/lib/i18n";
import { fmtNum, localDays, localTime, ruleKindLabel, ruleSummary, shortDateL, noteText } from "@/lib/l10n";
import { formatPercent } from "@/lib/format";
import { useCenter } from "@/lib/center-context";
import { useDemoMode } from "@/lib/demo-mode";
import { useStudent, useUpdateStudent, errorMessage } from "@/lib/students/queries";
import { toStudent } from "@/lib/students/model";
import { studentFields, STUDENT_STATUSES } from "@/lib/students/schema";
import type { StudentRow } from "@/lib/supabase/types";
import { GRADES } from "@/components/app/add-student";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/students/$id")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => typeof search["tab"] === "string" && ["overview", "enroll", "att", "fin", "guardian", "edit"].includes(search["tab"]) ? { tab: search["tab"] } : {},
  head: () => ({
    meta: [
      { title: "Student profile — Markazly" },
      { name: "description", content: "Student profile: enrollments, billing rules, attendance and financial history." },
      { property: "og:title", content: "Student profile — Markazly" },
      { property: "og:description", content: "Student profile on Markazly." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const [tab, setTab] = useState(search.tab ?? "overview");
  useEffect(() => setTab(search.tab ?? "overview"), [search.tab, id]);
  const { t, lang } = useI18n();
  const L = useLedger();
  const { center, branches, canEditStudents } = useCenter();
  const publicDemo = useDemoMode();
  // Persistent fields come from the server (RLS-scoped); demo attendance is joined from the store.
  const remote = useStudent(center.id, id);
  const stored = L.findStudent(id);
  const s = useMemo(() => {
    if (!remote.data) return stored;
    const names = new Map(branches.map((b) => [b.id, b.name]));
    return { ...toStudent(remote.data, (b) => names.get(b) ?? "—"), attendance: stored?.attendance ?? null };
  }, [remote.data, stored, branches]);
  const [ruleFor, setRuleFor] = useState<string | null>(null);
  const [draft, setDraft] = useState<BillingRule | null>(null);
  const [useOwn, setUseOwn] = useState(false);
  const [ruleError, setRuleError] = useState("");
  const [selling, setSelling] = useState<string | null>(null);

  const rev = useMemo(() => reversedIds(L.entries), [L.entries]);
  const mine = useMemo(() => L.entries.filter((x) => x.studentId === id).sort((a, z) => z.date.localeCompare(a.date) || z.id.localeCompare(a.id)), [L.entries, id]);
  const attendance = useMemo(() => Object.values(L.sessions).filter((r) => r.marks[id] !== undefined || (s?.classIds.includes(r.classId) && r.finalized))
    .sort((a, z) => z.date.localeCompare(a.date)).slice(0, 40), [L.sessions, id, s]);

  if (!s) {
    if (remote.isPending) return <div className="mx-auto max-w-[90rem] space-y-4" aria-busy="true"><Skeleton className="h-52 w-full rounded-xl" /><Skeleton className="h-72 w-full rounded-xl" /></div>;
    return <div className="mx-auto max-w-3xl"><div className="surface"><EmptyState icon={UserRound} title={t("Student not found")} hint={remote.isError ? t(errorMessage(remote.error, "Could not load the student.")) : t("This student does not exist in your center.")} action={<Button asChild variant="outline"><Link to="/students"><ArrowLeft className="rtl:rotate-180" />{t("Back to students")}</Link></Button>} /></div></div>;
  }

  const paid = mine.filter((x) => x.type === "Payment" && displayStatus(x, rev) === "Completed").reduce((a, x) => a + x.amount, 0);
  const balance = balancesAsOf(L.entries, todayIso()).get(id) ?? 0;
  const typeLabel = (x: LedgerEntry) => x.type === "Charge" ? (x.packageSessions ? t("Package purchase") : x.sessionId ? t("Session charge") : t("Tuition charge")) : x.type === "Reversal" ? t("Reversal of {id}", { id: x.reversesId ?? "" }) : x.type === "PackageUse" ? t("Package session used") : t(x.type);
  const marked = attendance.filter((r) => r.marks[id]);
  const presentPct = marked.length ? Math.round((marked.filter((r) => r.marks[id] === "Present").length / marked.length) * 100) : s.attendance;
  const enrollments = s.classIds.map((cid) => {
    const c = classById(cid);
    const { rule, source } = L.ruleFor(s.id, cid);
    const left = rule.kind === "package" ? packageRemaining(L.entries, s.id, cid) : 0;
    return { cid, c, rule, source, left };
  });
  const packages = enrollments.filter((e) => e.rule.kind === "package");
  const statusTone: Tone = s.status === "Active" ? "positive" : s.status === "Paused" ? "warning" : "neutral";
  const owes = balance > 0, credit = balance < 0;

  return (
    <div className="mx-auto max-w-[90rem]">
      <Link to="/students" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4 rtl:rotate-180" />{t("All students")}</Link>

      {/* Profile header */}
      <header className="surface mb-5 overflow-hidden">
        <div className="px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar name={s.name} seed={s.id} size="xl" className="size-14 text-lg sm:size-16" />
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-xl font-medium sm:text-2xl"><bdi>{s.name}</bdi></h2><Pill tone={statusTone} dot>{t(s.status)}</Pill></div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <LedgerCode code={s.id} />
                  <span className="inline-flex items-center gap-1"><GraduationCap className="size-3.5" />{t(s.grade)}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{t(s.branch)}</span>
                  <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />{t("Joined {date}", { date: shortDateL(s.joined, lang) })}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon" asChild><a href={`tel:${s.phone}`} aria-label={t("Call")} title={t("Call")}><Phone /></a></Button>
              {s.phone && <Button variant="outline" size="icon" asChild className="text-positive"><a href={`https://wa.me/2${s.phone}`} target="_blank" rel="noreferrer" aria-label={t("WhatsApp")} title={t("WhatsApp")}><MessageCircle /></a></Button>}
              {s.guardianPhone && <Button variant="outline" asChild><a href={`https://wa.me/2${s.guardianPhone}`} target="_blank" rel="noreferrer"><MessageCircle className="text-positive" />{t("WhatsApp guardian")}</a></Button>}
              <RecordPaymentDialog studentId={s.id} trigger={<Button><Plus />{t("Record payment")}</Button>} />
            </div>
          </div>

          {/* Summary */}
          <div className="mt-5 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-4">
            <SummaryTile icon={Wallet} tone={owes ? "negative" : credit ? "positive" : "neutral"} label={t("Balance today")} demo
              value={<Money value={Math.abs(balance)} />} hint={t(owes ? "Owing" : credit ? "Credit" : "Settled")} />
            <SummaryTile icon={Banknote} tone="positive" label={t("Total paid")} demo value={<Money value={paid} />} hint={t("Completed payments")} />
            <SummaryTile icon={CalendarCheck} tone="lavender" label={t("Attendance")} demo value={presentPct === null ? "—" : <bdi>{formatPercent(presentPct, lang)}</bdi>}
              hint={marked.length ? t("{n} recorded sessions", { n: fmtNum(marked.length, lang) }) : t("Sample average")} />
            <SummaryTile icon={BookOpen} tone="brand" label={t("Enrolled classes")} value={fmtNum(s.classIds.length, lang)}
              hint={packages.length ? t("{n} package sessions left", { n: fmtNum(packages.reduce((n, p) => n + Math.max(0, p.left), 0), lang) }) : t("No packages")} />
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Tabs value={tab} onValueChange={setTab} dir={lang === "ar" ? "rtl" : "ltr"} className="min-w-0">
          <div className="surface mb-4 overflow-x-auto px-4">
            <TabsList className="workspace-tabs min-w-max justify-start">
              <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
              <TabsTrigger value="enroll">{t("Enrollments & billing")}</TabsTrigger>
              <TabsTrigger value="att">{t("Attendance")}</TabsTrigger>
              <TabsTrigger value="fin">{t("Statement")}</TabsTrigger>
              <TabsTrigger value="guardian">{t("Guardian")}</TabsTrigger>
              <TabsTrigger value="edit">{t("Personal details")}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 space-y-5">
            <Panel title={t("Enrolled classes")} subtitle={t("Billing rule and package balance per class")} icon={BookOpen} bodyClass="px-0 pb-1"
              action={<Button size="sm" variant="ghost" className="text-brand" onClick={() => setTab("enroll")}>{t("Manage")}</Button>}>
              <ul className="divide-y border-t">{enrollments.map((e) => <EnrollmentRow key={e.cid} e={e} />)}</ul>
            </Panel>
            <Panel title={t("Recent statement")} subtitle={t("Latest ledger entries for this student")} icon={Receipt}
              action={<Button size="sm" variant="ghost" className="text-brand" onClick={() => setTab("fin")}>{t("Full statement")}</Button>}>
              <TxnList rows={mine.slice(0, 5)} label={typeLabel} rev={rev} studentId={s.id} compact />
            </Panel>
          </TabsContent>

          <TabsContent value="enroll" className="mt-0">
            <Panel title={t("Enrollments & billing rules")} subtitle={t("Class rules apply unless the student has their own")} bodyClass="px-0 pb-1">
              <ul className="divide-y border-t">
                {enrollments.map((e) => (
                  <EnrollmentRow key={e.cid} e={e} actions={<>
                    {e.rule.kind === "package" && <Button size="sm" variant="outline" onClick={() => setSelling(e.cid)}><PackagePlus className="size-4" />{t("Add package")}</Button>}
                    <Button size="sm" variant="outline" onClick={() => { setRuleFor(e.cid); setUseOwn(e.source === "enrollment"); setDraft(e.rule); setRuleError(""); }}><Pencil className="size-4" />{t("Billing rule")}</Button>
                  </>} />
                ))}
              </ul>
            </Panel>
          </TabsContent>

          <TabsContent value="att" className="mt-0">
            <Panel title={t("Attendance history")} subtitle={marked.length ? t("Present {p} · Absent {a} · Excused {e}", { p: fmtNum(marked.filter((r) => r.marks[id] === "Present").length, lang), a: fmtNum(marked.filter((r) => r.marks[id] === "Absent").length, lang), e: fmtNum(marked.filter((r) => r.marks[id] === "Excused").length, lang) }) : undefined} icon={CalendarCheck} bodyClass="px-0 pb-1">
              {attendance.length === 0 ? <EmptyState icon={CalendarCheck} title={t("No attendance recorded yet")} hint={t("Attendance appears here once a teacher marks a session.")} compact /> : (
                <ul className="divide-y border-t">{attendance.map((r) => {
                  const m = r.marks[id];
                  const tone: Tone = m === "Present" ? "positive" : m === "Absent" ? "negative" : m === "Excused" ? "warning" : "neutral";
                  return (
                    <li key={r.sessionId}>
                      <Link to="/attendance" search={{ classId: r.classId, date: r.date }} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-muted/40">
                        <div className="w-14 shrink-0 text-center"><div className="text-base font-medium leading-none num">{Number(r.date.slice(8))}</div><div className="mt-1 text-meta text-muted-foreground">{shortDateL(r.date, lang).replace(/^\d+\s*/, "")}</div></div>
                        <div className="min-w-0 flex-1"><bdi className="block truncate font-medium">{classById(r.classId).name}</bdi><div className="text-xs text-muted-foreground">{r.finalized ? t("Finalized") : t("Not finalized")}</div></div>
                        <Pill tone={tone} dot>{t(m ?? "Unmarked")}</Pill>
                      </Link>
                    </li>
                  );
                })}</ul>)}
            </Panel>
          </TabsContent>

          <TabsContent value="fin" className="mt-0">
            <Panel title={t("Financial statement")} subtitle={t("Balance context is the end-of-day balance; pending and reversed entries are excluded.")} icon={Receipt}
              action={<div className="text-end"><div className="text-meta text-muted-foreground">{t("Balance today")}</div><div className={cn("text-lg font-medium num", owes ? "text-destructive" : credit ? "text-positive" : "text-foreground")}><Money value={Math.abs(balance)} /></div></div>}>
              <TxnList rows={mine} label={typeLabel} rev={rev} studentId={s.id} />
            </Panel>
          </TabsContent>

          <TabsContent value="guardian" className="mt-0">
            <Panel title={t("Parent / Guardian")} icon={Users}><GuardianCard name={s.guardian} phone={s.guardianPhone} /></Panel>
          </TabsContent>

          <TabsContent value="edit" className="mt-0">
            <Panel title={t("Personal details")} icon={IdCard} subtitle={t(publicDemo ? "Kept until you refresh" : "Saved to your center's database")}>
              {canEditStudents && remote.data ? <EditStudentForm row={remote.data} /> : (
                <>
                  <p className="mb-4 flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-ui text-muted-foreground"><Lock className="mt-0.5 size-4 shrink-0" />{t(canEditStudents ? "Loading the saved record…" : "Your role can view students but not edit them.")}</p>
                  <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    {[[t("Full name"), s.name], [t("Student ID"), s.id], [t("Phone"), s.phone], [t("Grade"), t(s.grade)], [t("Branch"), t(s.branch)], [t("Joined"), shortDateL(s.joined, lang)], [t("Guardian name"), s.guardian || "—"], [t("Guardian phone"), s.guardianPhone || "—"]].map(([key, value]) => (
                      <div key={key} className="min-w-0 rounded-lg border px-3 py-2.5"><dt className="text-meta font-medium text-muted-foreground">{key}</dt><dd className="mt-0.5 break-words text-sm font-medium"><bdi>{value}</bdi></dd></div>
                    ))}
                  </dl>
                </>
              )}
            </Panel>
          </TabsContent>
        </Tabs>

        {/* Context panel */}
        <aside className="space-y-5">
          <Panel title={t("Guardian")} icon={Users}><GuardianCard name={s.guardian} phone={s.guardianPhone} compact /></Panel>
          {packages.length > 0 && (
            <Panel title={t("Package sessions")} icon={PackageCheck}>
              <ul className="space-y-4">
                {packages.map((p) => p.rule.kind === "package" && (
                  <li key={p.cid}>
                    <div className="flex items-baseline justify-between gap-2 text-ui"><bdi className="min-w-0 truncate font-medium">{p.c.name}</bdi><span className={cn("shrink-0 font-medium num", p.left <= 1 ? "text-warning" : "text-foreground")}>{fmtNum(Math.max(0, p.left), lang)}/{fmtNum(p.rule.sessions, lang)}</span></div>
                    <Meter className="mt-1.5" value={(Math.max(0, p.left) / Math.max(p.rule.sessions, p.left)) * 100} tone={p.left <= 1 ? "warning" : "lavender"} label={t("Remaining sessions")} />
                    <div className="mt-1 text-meta text-muted-foreground">{t(p.left <= 0 ? "Package used up" : "{n} sessions left", { n: fmtNum(p.left, lang) })}</div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          <Panel title={t("Contact")} icon={Phone}>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">{t("Phone")}</dt><dd className="font-medium"><bdi dir="ltr">{s.phone}</bdi></dd></div>
              <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">{t("Branch")}</dt><dd className="font-medium">{t(s.branch)}</dd></div>
              <div className="flex items-center justify-between gap-2"><dt className="text-muted-foreground">{t("Joined")}</dt><dd className="font-medium">{shortDateL(s.joined, lang)}</dd></div>
            </dl>
          </Panel>
        </aside>
      </div>

      <Dialog open={!!ruleFor} onOpenChange={(o) => !o && setRuleFor(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto" dir={lang === "ar" ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{t("Billing rule")} · {ruleFor ? classById(ruleFor).name : ""}</DialogTitle>
            <DialogDescription>{t("Applies to future finalized sessions for this student only. Posted charges are not recalculated. Demo only, not saved.")}</DialogDescription>
          </DialogHeader>
          {ruleFor && draft && (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault();
              if (useOwn && !ruleIsValid(draft)) { setRuleError(t("Every amount in a billing rule must be greater than zero.")); return; }
              L.setEnrollmentRule(s.id, ruleFor, useOwn ? draft : null);
              toast.success(t("Billing rule updated in demo data"), { description: useOwn ? ruleSummary(draft, t, lang) : t("Uses the class rule") });
              setRuleFor(null);
            }}>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={useOwn} onCheckedChange={(v) => { setUseOwn(v === true); if (v !== true) setDraft(L.classRule(ruleFor)); }} />{t("Own billing rule for this student")}</label>
              {useOwn ? <RuleEditor value={draft} onChange={setDraft} fallbackFee={classById(ruleFor).fee} />
                : <p className="text-sm text-muted-foreground">{t("Uses the class rule")}: {ruleKindLabel(L.classRule(ruleFor), t)} · {ruleSummary(L.classRule(ruleFor), t, lang)}</p>}
              <RuleEffects rule={useOwn ? draft : L.classRule(ruleFor)} />
              {ruleError && <p role="alert" className="text-sm text-destructive">{ruleError}</p>}
              <DialogFooter><Button type="button" variant="outline" onClick={() => setRuleFor(null)}>{t("Cancel")}</Button><Button type="submit">{t("Save rule")}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!selling} onOpenChange={(o) => !o && setSelling(null)}>
        <AlertDialogContent dir={lang === "ar" ? "rtl" : "ltr"}>
          {selling && (() => { const r = L.ruleFor(s.id, selling).rule; return r.kind === "package" ? (<>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Add a package")} · {classById(selling).name}</AlertDialogTitle>
              <AlertDialogDescription>{t("Charges {amount} for {n} sessions to this student's balance. Record the payment separately. Demo only, not saved.", { amount: ruleSummary(r, t, lang).split(" · ")[0] ?? "", n: fmtNum(r.sessions, lang) })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>{t("Cancel")}</AlertDialogCancel><AlertDialogAction onClick={() => { const e = L.sellPackage(s.id, selling); toast.success(t("Package charge {id} added to demo data", { id: e.id })); setSelling(null); }}>{t("Add package")}</AlertDialogAction></AlertDialogFooter>
          </>) : null; })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type Enrollment = { cid: string; c: ClassItem; rule: BillingRule; source: "class" | "enrollment"; left: number };

function EnrollmentRow({ e, actions }: { e: Enrollment; actions?: ReactNode }) {
  const { t, lang } = useI18n();
  return (
    <li className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
      <IconTile icon={BookOpen} tone="neutral" className="hidden size-9 sm:grid [&_svg]:size-4" />
      <div className="min-w-0 flex-1">
        <bdi className="block break-words text-sm font-medium">{e.c.name}</bdi>
        <div className="mt-0.5 text-xs text-muted-foreground"><bdi>{teacherById(e.c.teacherId).name}</bdi> · {localDays(e.c.days, t)} · <bdi>{localTime(e.c.time, lang)}</bdi></div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Pill tone={e.source === "enrollment" ? "brand" : "neutral"}>{ruleKindLabel(e.rule, t)} · {t(e.source === "enrollment" ? "own rule" : "class rule")}</Pill>
          <span className="text-xs text-muted-foreground">{ruleSummary(e.rule, t, lang)}</span>
        </div>
        {e.rule.kind === "package" && (
          <div className="mt-2 flex max-w-xs items-center gap-2">
            <Meter value={(Math.max(0, e.left) / Math.max(e.rule.sessions, e.left)) * 100} tone={e.left <= 1 ? "warning" : "lavender"} label={t("Remaining sessions")} />
            <span className={cn("shrink-0 text-xs font-medium num", e.left <= 1 ? "text-warning" : "text-foreground")}>{t("{n} sessions left", { n: fmtNum(e.left, lang) })}</span>
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </li>
  );
}

function SummaryTile({ icon, tone, label, value, hint, demo = false }: { icon: typeof Wallet; tone: Tone; label: string; value: ReactNode; hint: ReactNode; demo?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border bg-card px-3.5 py-3">
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0"><div className="flex items-center gap-1.5 truncate text-meta font-medium text-muted-foreground">{label}{demo && <span className="rounded bg-warning-soft px-1 py-px text-meta font-medium text-warning">{t("Demo")}</span>}</div><div className="truncate text-lg font-medium num">{value}</div><div className="truncate text-meta text-muted-foreground">{hint}</div></div>
    </div>
  );
}

function GuardianCard({ name, phone, compact = false }: { name: string; phone: string; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar name={name} size="lg" />
        <div className="min-w-0"><bdi className="block truncate font-medium">{name}</bdi><div className="text-xs text-muted-foreground">{phone ? <bdi dir="ltr">{phone}</bdi> : t("No phone on file")}</div></div>
      </div>
      {phone && (
        <div className={cn("mt-4 grid gap-2", compact ? "grid-cols-2" : "max-w-sm grid-cols-2")}>
          <Button asChild variant="outline" size="sm"><a href={`tel:${phone}`}><Phone />{t("Call")}</a></Button>
          <Button asChild variant="outline" size="sm"><a href={`https://wa.me/2${phone}`} target="_blank" rel="noreferrer"><MessageCircle className="text-positive" />{t("WhatsApp")}</a></Button>
        </div>
      )}
    </div>
  );
}

const entryMeta: Record<LedgerEntry["type"], [typeof Wallet, Tone]> = {
  Charge: [Receipt, "brand"], Payment: [Banknote, "positive"], Refund: [Undo2, "coral"], Discount: [BadgePercent, "lavender"], Reversal: [RotateCcw, "neutral"], PackageUse: [PackageCheck, "teal"],
};

function TxnList({ rows, label, rev, studentId, compact = false }: { rows: LedgerEntry[]; label: (x: LedgerEntry) => string; rev: Set<string>; studentId: string; compact?: boolean }) {
  const { t, lang } = useI18n();
  const { entries } = useLedger();
  if (rows.length === 0) return <EmptyState icon={Receipt} title={t("No transactions yet")} compact />;
  return (
    <ol className="relative">
      {rows.map((entry, i) => {
        const status = displayStatus(entry, rev);
        const context = balancesAsOf(entries, entry.date).get(studentId) ?? 0;
        const replacement = rows.find((item) => item.replacesId === entry.id);
        const reversal = rows.find((item) => item.reversesId === entry.id);
        const [EIcon, tone] = entryMeta[entry.type];
        const sign = entry.type === "Payment" || entry.type === "Discount" ? "−" : entry.type === "Charge" || entry.type === "Refund" ? "+" : "";
        const links = [entry.reversesId, entry.replacesId, reversal?.id, replacement?.id].filter((x): x is string => !!x);
        const detail = entry.method ? t(entry.method) : noteText(entry.reason ?? entry.note, t, lang) ?? (entry.classId ? classById(entry.classId).name : "—");
        return (
          <li id={compact ? undefined : `entry-${entry.id}`} key={entry.id} className="relative flex scroll-mt-24 gap-3 pb-4 last:pb-0">
            {i < rows.length - 1 && <span aria-hidden className="absolute start-4 top-9 bottom-0 w-px bg-border" />}
            <IconTile icon={EIcon} tone={status === "Reversed" ? "neutral" : tone} className="relative size-8 rounded-full [&_svg]:size-3.5" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5"><span className="break-words text-sm font-medium">{label(entry)}</span>{status !== "Completed" && <Pill tone={status === "Pending" ? "warning" : "neutral"}>{t(status)}</Pill>}</div>
                  <div className="mt-0.5 break-words text-xs text-muted-foreground"><bdi dir="ltr">{entry.id}</bdi> · {shortDateL(entry.date, lang)} · <bdi>{detail}</bdi></div>
                </div>
                <div className="shrink-0 text-end">
                  <div className={cn("whitespace-nowrap text-sm font-medium num", entry.type === "Payment" && status === "Completed" ? "text-positive" : status === "Reversed" ? "text-muted-foreground line-through" : "text-foreground")}>
                    {entry.type === "PackageUse" ? t("1 session") : <bdi>{sign}<Money value={entry.amount} /></bdi>}
                  </div>
                </div>
              </div>
              {!compact && links.length > 0 && <div className="mt-1 flex flex-wrap gap-2 text-xs">{links.map((lid) => <a key={lid} href={`#entry-${lid}`} className="ledger-code text-brand hover:underline"><bdi dir="ltr">{lid}</bdi></a>)}</div>}
              {!compact && <div className="mt-1 text-meta text-muted-foreground">{t("End-of-day balance")} · {t(context > 0 ? "Owing" : context < 0 ? "Credit" : "Settled")} · <Money value={Math.abs(context)} /></div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Edits the persistent student record. Validation mirrors the server schema and the database constraints. */
function EditStudentForm({ row }: { row: StudentRow }) {
  const { t, lang } = useI18n();
  const { center, branches } = useCenter();
  const update = useUpdateStudent();
  const initial = { name: row.name, phone: row.phone, guardianName: row.guardian_name ?? "", guardianPhone: row.guardian_phone ?? "", grade: row.grade, branchId: row.branch_id, status: row.status };
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => { setForm(initial); setErrors({}); }, [row.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) => form[k] !== initial[k]);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const dir = lang === "ar" ? "rtl" : "ltr";

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = studentFields.omit({ classCodes: true }).safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= t(issue.message);
      setErrors(next);
      return;
    }
    setErrors({});
    const patch = Object.fromEntries(Object.entries(parsed.data).filter(([k, v]) => v !== (initial as Record<string, unknown>)[k]));
    try {
      await update.mutateAsync({ centerId: center.id, code: row.student_code, patch });
      toast.success(t("Changes saved"), { description: t("{name} was updated.", { name: parsed.data.name }) });
    } catch (err) {
      setErrors({ form: t(errorMessage(err, "Could not save the changes.")) });
    }
  };

  const text = (k: "name" | "phone" | "guardianName" | "guardianPhone", label: string, tel = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={`ed-${k}`}>{t(label)}</Label>
      <Input id={`ed-${k}`} value={form[k]} dir={tel ? "ltr" : undefined} inputMode={tel ? "tel" : "text"} maxLength={tel ? 11 : 120}
        onChange={(e) => set(k)(tel ? e.target.value.replace(/D/g, "").slice(0, 11) : e.target.value)}
        aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `ed-${k}-error` : undefined} />
      {errors[k] && <p id={`ed-${k}-error`} role="alert" className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );
  const choice = (k: "grade" | "branchId" | "status", label: string, options: [string, string][]) => (
    <div className="space-y-1.5">
      <Label>{t(label)}</Label>
      <Select value={form[k]} onValueChange={set(k)} dir={dir}>
        <SelectTrigger aria-label={t(label)}><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}><bdi>{t(l)}</bdi></SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  const grades = GRADES.includes(form.grade) ? GRADES : [form.grade, ...GRADES];
  return (
    <form onSubmit={save} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {text("name", "Full name")}{text("phone", "Phone", true)}
        {choice("grade", "Grade", grades.map((g) => [g, g]))}
        {choice("branchId", "Branch", branches.map((b) => [b.id, b.name]))}
        {choice("status", "Status", STUDENT_STATUSES.map((s) => [s, s]))}
        <div className="space-y-1.5"><Label>{t("Student ID")}</Label><Input value={row.student_code} readOnly disabled dir="ltr" className="bg-muted/40 disabled:opacity-100" /></div>
      </div>
      <fieldset className="grid gap-4 border-t pt-4 sm:grid-cols-2"><legend className="mb-1 text-sm font-medium">{t("Guardian")}</legend>{text("guardianName", "Guardian name")}{text("guardianPhone", "Guardian phone", true)}</fieldset>
      {errors["form"] && <p role="alert" className="rounded-md bg-negative-soft px-3 py-2 text-sm text-destructive">{errors["form"]}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        <span className="me-auto text-xs text-muted-foreground">{t("Joined {date}", { date: shortDateL(row.joined_on, lang) })} · {t("Last updated {date}", { date: shortDateL(row.updated_at, lang) })}</span>
        <Button type="button" variant="outline" disabled={!dirty || update.isPending} onClick={() => { setForm(initial); setErrors({}); }}>{t("Discard")}</Button>
        <Button type="submit" disabled={!dirty || update.isPending}>{update.isPending ? t("Saving…") : t("Save changes")}</Button>
      </div>
    </form>
  );
}
