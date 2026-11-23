import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Phone, Plus, MessageCircle, Pencil, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { Panel, Pill, Money, EmptyState } from "@/components/app/ui";
import { RuleEditor, ruleIsValid } from "@/components/app/rule-editor";
import { RuleEffects } from "@/components/app/rule-effects";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { classById, teacherById } from "@/lib/data";
import { balancesAsOf, reversedIds, displayStatus, type LedgerEntry } from "@/lib/ledger";
import { packageRemaining, type BillingRule } from "@/lib/billing";
import { useLedger, todayIso } from "@/lib/ledger-store";
import { RecordPaymentDialog } from "@/components/app/record-payment";
import { useI18n } from "@/lib/i18n";
import { fmtNum, localDays, localTime, ruleKindLabel, ruleSummary, shortDateL } from "@/lib/l10n";
import { cn } from "@/lib/utils";
import { StudentBalance } from "@/components/app/student-balance";

export const Route = createFileRoute("/_console/students/$id")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => typeof search["tab"] === "string" && ["enroll", "att", "fin", "edit"].includes(search["tab"]) ? { tab: search["tab"] } : {},
  head: () => ({
    meta: [
      { title: "Student profile — CenterOS" },
      { name: "description", content: "Student profile: enrollments, billing rules, attendance and financial history." },
      { property: "og:title", content: "Student profile — CenterOS" },
      { property: "og:description", content: "Student profile on CenterOS." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const [tab, setTab] = useState(search.tab ?? "enroll");
  useEffect(() => setTab(search.tab ?? "enroll"), [search.tab, id]);
  const { t, lang } = useI18n();
  const L = useLedger();
  const s = L.findStudent(id);
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
    return <div className="mx-auto max-w-3xl"><EmptyState title={t("Student not found")} hint={t("Sample students added in this tab disappear on refresh.")} /><div className="text-center"><Link to="/students" className="text-sm font-medium text-brand">{t("Back to students")}</Link></div></div>;
  }

  const paid = mine.filter((x) => x.type === "Payment" && displayStatus(x, rev) === "Completed").reduce((a, x) => a + x.amount, 0);
  const balance = balancesAsOf(L.entries, todayIso()).get(id) ?? 0;
  const initials = s.name.split(" ").map((p) => p[0]).join("").slice(0, 2);
  const typeLabel = (x: LedgerEntry) => x.type === "Charge" ? (x.packageSessions ? t("Package purchase") : x.sessionId ? t("Session charge") : t("Tuition charge")) : x.type === "Reversal" ? t("Reversal of {id}", { id: x.reversesId ?? "" }) : t(x.type);
  const marked = attendance.filter((r) => r.marks[id]);
  const presentPct = marked.length ? Math.round((marked.filter((r) => r.marks[id] === "Present").length / marked.length) * 100) : s.attendance;

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/students" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4 rtl:rotate-180" /> {t("Students")}</Link>
      <header className="mb-5 border-b pb-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="flex min-w-0 items-start gap-3"><div className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-lg font-semibold text-brand">{initials}</div><div className="min-w-0"><h1 className="break-words text-xl font-semibold"><bdi>{s.name}</bdi></h1><div className="mt-1 text-xs text-muted-foreground"><bdi>{s.id}</bdi> · {t(s.grade)} · {t(s.branch)}</div><div className="mt-2"><Pill tone={s.status === "Active" ? "positive" : s.status === "Paused" ? "warning" : "neutral"}>{t(s.status)}</Pill></div></div></div>
          <div className="shrink-0"><StudentBalance value={balance} /></div>
        </div>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-1"><Button variant="ghost" size="icon" asChild><a href={`tel:${s.phone}`} aria-label={t("Call")} title={t("Call")}><Phone /></a></Button>{s.phone && <Button variant="ghost" size="icon" asChild><a href={`https://wa.me/2${s.phone}`} target="_blank" rel="noreferrer" aria-label={t("WhatsApp")} title={t("WhatsApp")}><MessageCircle /></a></Button>}{s.guardianPhone && <Button variant="ghost" asChild><a href={`https://wa.me/2${s.guardianPhone}`} target="_blank" rel="noreferrer">{t("WhatsApp guardian")}</a></Button>}</div>
          <div className="col-span-2 flex flex-wrap justify-end gap-2 sm:col-auto"><Button variant="outline" onClick={() => setTab("edit")}><Pencil />{t("Edit")}</Button><RecordPaymentDialog studentId={s.id} trigger={<Button><Plus />{t("Record payment")}</Button>} /></div>
        </div>
      </header>
      <div className="mb-5 grid grid-cols-3 gap-3 border-b pb-4">
        <Stat label={t("Total paid")} value={<Money value={paid} />} /><Stat label={t("Attendance")} value={`${fmtNum(presentPct, lang)}%`} /><Stat label={t("Enrolled classes")} value={fmtNum(s.classIds.length, lang)} />
      </div>
      <Tabs value={tab} onValueChange={setTab} dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="overflow-x-auto"><TabsList className="h-auto min-w-full justify-start gap-1"><TabsTrigger value="enroll">{t("Enrollments & Billing Rules")}</TabsTrigger><TabsTrigger value="att">{t("Attendance")}</TabsTrigger><TabsTrigger value="fin">{t("Ledger")}</TabsTrigger><TabsTrigger value="edit">{t("Edit")}</TabsTrigger></TabsList></div>
        <TabsContent value="enroll" className="mt-4"><Panel bodyClass="p-0"><ul className="divide-y">
          {s.classIds.map((cid) => {
            const c = classById(cid);
            const { rule, source } = L.ruleFor(s.id, cid);
            const left = rule.kind === "package" ? packageRemaining(L.entries, s.id, cid) : 0;
            return (
              <li key={cid} className="flex flex-col gap-3 px-5 py-4 text-sm sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="break-words font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{teacherById(c.teacherId).name} · {localDays(c.days, t)} · {localTime(c.time, lang)}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Pill tone={source === "enrollment" ? "brand" : "neutral"}>{ruleKindLabel(rule, t)}{source === "enrollment" ? ` · ${t("own rule")}` : ` · ${t("class rule")}`}</Pill>
                    <span className="text-xs text-muted-foreground">{ruleSummary(rule, t, lang)}</span>
                    {rule.kind === "package" && <Pill tone={left > 0 ? "positive" : "warning"}>{t("{n} sessions left", { n: fmtNum(left, lang) })}</Pill>}
                    {rule.kind === "package" && <meter className="h-2 w-28" min={0} max={Math.max(rule.sessions, left)} value={Math.max(0, left)} aria-label={t("Remaining sessions")} /> }
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {rule.kind === "package" && <Button size="sm" variant="outline" onClick={() => setSelling(cid)}><PackagePlus className="size-4" />{t("Add package")}</Button>}
                  <Button size="sm" variant="outline" onClick={() => { setRuleFor(cid); setUseOwn(source === "enrollment"); setDraft(rule); setRuleError(""); }}><Pencil className="size-4" />{t("Billing rule")}</Button>
                </div>
              </li>
            );
          })}
        </ul></Panel></TabsContent>
        <TabsContent value="att" className="mt-4"><Panel bodyClass="p-0">
          {attendance.length === 0 ? <EmptyState title={t("No attendance recorded yet")} hint={t("Attendance appears here once a teacher marks a session.")} /> : (
            <ul className="divide-y">{attendance.map((r) => {
              const m = r.marks[id];
              return <li key={r.sessionId} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm"><span>{shortDateL(r.date, lang)} · {classById(r.classId).name}</span><Pill tone={m === "Present" ? "positive" : m === "Absent" ? "negative" : m === "Excused" ? "warning" : "neutral"}>{t(m ?? "Unmarked")}</Pill></li>;
            })}</ul>)}
        </Panel></TabsContent>
        <TabsContent value="fin" className="mt-4"><section><div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><h2 className="text-sm font-semibold">{t("Ledger")}</h2><StudentBalance value={balance} /></div><p className="mb-4 text-xs text-muted-foreground">{t("Balance context is the end-of-day balance; pending and reversed entries are excluded.")}</p><TxnList rows={mine} label={typeLabel} rev={rev} studentId={s.id} /></section></TabsContent>
        <TabsContent value="edit" className="mt-4">
          <h2 className="mb-2 text-sm font-semibold">{t("Personal information")}</h2><p className="mb-4 text-sm text-muted-foreground">{t("Student details are read-only. Editing is not implemented; no changes are saved.")}</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-5 border-y py-4 text-sm">{[[t("Full name"), s.name], [t("Phone"), s.phone], [t("Grade"), t(s.grade)], [t("Branch"), t(s.branch)], [t("Joined"), shortDateL(s.joined, lang)], [t("Guardian name"), s.guardian], [t("Guardian phone"), s.guardianPhone || "—"]].map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-xs text-muted-foreground">{key}</dt><dd className="mt-1 break-words font-medium"><bdi>{value}</bdi></dd></div>)}</dl>
          {s.guardianPhone && <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" asChild><a href={`tel:${s.guardianPhone}`}><Phone />{t("Call")}</a></Button><Button variant="outline" asChild><a href={`https://wa.me/2${s.guardianPhone}`} target="_blank" rel="noreferrer"><MessageCircle />{t("WhatsApp guardian")}</a></Button></div>}
        </TabsContent>
      </Tabs>

      <Dialog open={!!ruleFor} onOpenChange={(o) => !o && setRuleFor(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto">
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
        <AlertDialogContent>
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

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-lg font-semibold num">{value}</div></div>;
}
function TxnList({ rows, label, rev, studentId }: { rows: LedgerEntry[]; label: (x: LedgerEntry) => string; rev: Set<string>; studentId: string }) {
  const { t, lang } = useI18n();
  const { entries } = useLedger();
  if (rows.length === 0) return <EmptyState title={t("No transactions yet")} />;
  return <ul className="divide-y">{rows.map((entry) => {
    const status = displayStatus(entry, rev);
    const context = balancesAsOf(entries, entry.date).get(studentId) ?? 0;
    const replacement = rows.find((item) => item.replacesId === entry.id);
    const reversal = rows.find((item) => item.reversesId === entry.id);
    return <li id={`entry-${entry.id}`} key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 text-sm scroll-mt-20">
      <div className="min-w-0"><div className="break-words font-medium">{label(entry)}</div><div className="mt-1 break-words text-xs text-muted-foreground"><bdi>{entry.id}</bdi> · {shortDateL(entry.date, lang)} · {entry.method ? t(entry.method) : entry.reason ?? (entry.classId ? classById(entry.classId).name : "—")}</div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-brand">{[entry.reversesId, entry.replacesId, reversal?.id, replacement?.id].filter((id): id is string => !!id).map((id) => <a key={id} href={`#entry-${id}`} className="underline"><bdi>{id}</bdi></a>)}</div>
        <div className="mt-1 text-xs text-muted-foreground">{t("End-of-day balance")} · {t(context > 0 ? "Owing" : context < 0 ? "Credit" : "Settled")} · <Money value={Math.abs(context)} /></div>
      </div>
      <div className="shrink-0 text-right"><div className={cn("whitespace-nowrap font-medium num", entry.type === "Payment" && status === "Completed" ? "text-positive" : "text-muted-foreground", status === "Reversed" && "line-through")}>{entry.type === "PackageUse" ? t("1 session") : <bdi>{entry.type === "Payment" || entry.type === "Discount" ? "−" : entry.type === "Charge" || entry.type === "Refund" ? "+" : ""}<Money value={entry.amount} /></bdi>}</div><div className="mt-1 text-xs text-muted-foreground">{t(status)}</div></div>
    </li>;
  })}</ul>;
}
