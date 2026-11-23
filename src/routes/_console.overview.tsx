import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Plus, CalendarCheck, MessageCircle, AlertTriangle } from "lucide-react";
import { PageHeader, Pill, Money, Delta, EmptyState, chartAxis, tooltipStyle } from "@/components/app/ui";
import { PeriodBranchFilter } from "@/components/app/filters";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { balancesAsOf, displayStatus, reversedIds } from "@/lib/ledger";
import { useLedger, monthLabel } from "@/lib/ledger-store";
import { useFinance } from "@/lib/use-finance";
import { pctChange } from "@/lib/finance";
import { egp } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { kAxis, localTime, monthShort, shortDateL } from "@/lib/l10n";
import { RecordPaymentDialog } from "@/components/app/record-payment";
import { centerProfile } from "@/lib/center-config";
import { classWeekdays, weekdayOf, sessionIdFor } from "@/lib/billing";
import { greetingKey, hasPriorData, attendanceLabel } from "@/lib/overview-display";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_console/overview")({
  head: pageHead("Overview", "Nile Academy financial overview, today's classes, attention required and recent ledger activity."),
  pendingComponent: OverviewSkeleton,
  component: Overview,
});

function OverviewSkeleton() {
  return <div aria-busy="true" className="mx-auto max-w-7xl space-y-6"><Skeleton className="h-16 w-full" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-72 w-full" /></div>;
}

function Overview() {
  const { t, lang } = useI18n();
  const [clock, setClock] = useState<Date | null>(null);
  useEffect(() => { setClock(new Date()); const id = window.setInterval(() => setClock(new Date()), 60000); return () => window.clearInterval(id); }, []);
  const { entries, students, classes, teachers, sessions, filter, compare, period, branch } = useLedger();
  const f = useFinance();
  const c = f.current, p = f.previous;
  const rtl = lang === "ar";
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const rev = useMemo(() => reversedIds(entries), [entries]);
  const overdue = useMemo(() => [...balancesAsOf(entries, filter.to, filter.branch)].filter(([, value]) => value > 0).sort((a, b) => b[1] - a[1]).slice(0, 4), [entries, filter]);
  const recent = useMemo(() => entries.filter((e) => e.type !== "Charge" && e.date >= filter.from && e.date <= filter.to && (filter.branch === "all" || e.branch === filter.branch)).sort((a, b) => b.enteredAt.localeCompare(a.enteredAt)).slice(0, 6), [entries, filter]);
  if (!clock) return <OverviewSkeleton />;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", hourCycle: "h23" }).formatToParts(clock);
  const part = (key: string) => parts.find((item) => item.type === key)?.value ?? "";
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const todaysClasses = classes.filter((item) => (branch === "all" || item.branch === branch) && classWeekdays(item.days).includes(weekdayOf(today)));
  const notRecorded = todaysClasses.filter((item) => attendanceLabel(sessions[sessionIdFor(item.id, today)]) === "Attendance not recorded");
  const mismatch = Math.abs(c.byMethod.reduce((sum, item) => sum + item.amount, 0) - c.grossCollections) > 0.005;
  const series = f.series.map((item) => ({ ...item, label: monthShort(item.m, lang) }));
  const metrics = [
    { label: "Billed revenue", value: c.billed, prev: p.billed, detail: "Net billed", detailValue: c.netBilled },
    { label: "Gross collections", value: c.grossCollections, prev: p.grossCollections, detail: "Net collections", detailValue: c.netCollections },
    { label: "Outstanding receivables", value: c.outstanding, prev: p.outstanding, detail: "Prepaid balances", detailValue: c.prepaid },
    { label: "Teacher payables", value: f.payables, prev: f.payablesPrev, detail: "Accrued · settlement not tracked" },
  ];
  return <div className="mx-auto max-w-7xl">
    <PageHeader title={`${t(greetingKey(Number(part("hour"))))}${rtl ? "،" : ","} ${centerProfile.currentUser.name.split(" ")[0] ?? ""}`} subtitle={`${monthLabel(period, lang)} · ${branch === "all" ? t("All branches") : t(branch)}`} actions={<><PeriodBranchFilter /><RecordPaymentDialog trigger={<Button><Plus />{t("Record payment")}</Button>} /></>} />
    <section aria-label={t("Financial overview")} className="grid grid-cols-2 gap-x-6 gap-y-5 border-y py-5 lg:grid-cols-4">
      {metrics.map((metric) => <div key={metric.label} className="min-w-0">
        <h2 className="text-sm text-muted-foreground">{t(metric.label)}</h2>
        <div className="mt-1 break-words text-metric font-semibold"><Money value={metric.value} /></div>
        <div className="mt-2 text-xs text-muted-foreground">{t(metric.detail)}{metric.detailValue !== undefined && <> · <Money value={metric.detailValue} /></>}</div>
        {hasPriorData(entries, compare, metric.prev) && <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><Delta value={pctChange(metric.value, metric.prev)} invert={metric.label === "Outstanding receivables" || metric.label === "Teacher payables"} suffix={rtl ? "٪" : "%"} />{t("vs prior period")}</div>}
      </div>)}
    </section>
    <div role={mismatch ? "alert" : undefined} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b py-3 text-xs">
      {mismatch && <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="size-4" />{t("Collections do not reconcile")}</span>}
      <span>{t("Gross")} <Money value={c.grossCollections} /> − {t("Refunds")} <Money value={c.refunds} /> = {t("Net")} <Money value={c.netCollections} /></span>
      <span className="text-muted-foreground">{t("Not counted:")} {t("Pending")} <Money value={c.pending} /> · {t("Reversed")} <Money value={c.reversed} /></span>
      <Link to="/finance" className="ms-auto text-brand">{t("Breakdown & definitions")}</Link>
    </div>
    <section className="border-b py-5">
      <h2 className="mb-4 text-section-title font-semibold">{t("Billed revenue vs gross collections")}</h2>
      {series.some((item) => item.billed !== 0 || item.gross !== 0) ? <div className="h-64 w-full" dir="ltr"><ResponsiveContainer><BarChart data={series} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...chartAxis} reversed={rtl} /><YAxis {...chartAxis} orientation={rtl ? "right" : "left"} width={56} tickFormatter={(value: number) => kAxis(value, lang)} />
        <Tooltip {...tooltipStyle} formatter={(value: number) => egp(value, lang)} cursor={{ fill: "var(--muted)" }} />
        <Legend iconType="square" iconSize={8} /><Bar dataKey="billed" name={t("Billed revenue")} fill="var(--brand)" radius={[3, 3, 0, 0]} isAnimationActive={false} /><Bar dataKey="gross" name={t("Gross collections")} fill="var(--positive)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart></ResponsiveContainer></div> : <EmptyState title={t("No financial activity in this period")} />}
    </section>
    <div className="grid gap-x-8 lg:grid-cols-2">
      <section className="min-w-0 border-b py-5">
        <h2 className="mb-3 text-section-title font-semibold">{t("Today's classes")} · {shortDateL(today, lang)}</h2>
        <ul className="divide-y">{todaysClasses.map((item) => {
          const status = attendanceLabel(sessions[sessionIdFor(item.id, today)]);
          return <li key={item.id}><Link to="/attendance" search={{ classId: item.id, date: today }} className="flex items-center gap-3 py-3 hover:bg-muted/40"><CalendarCheck className="size-4 shrink-0 text-brand" /><div className="min-w-0 flex-1"><bdi className="block break-words text-sm font-medium">{item.name}</bdi><div className="mt-1 text-xs text-muted-foreground"><bdi>{teachers.find((teacher) => teacher.id === item.teacherId)?.name ?? item.teacherId}</bdi> · {localTime(item.time, lang)}</div></div><Pill tone={status === "Finalized" ? "positive" : "warning"}>{t(status)}</Pill></Link></li>;
        })}</ul>
        {!todaysClasses.length && <EmptyState title={t("No classes scheduled today")} />}
      </section>
      <section className="min-w-0 border-b py-5">
        <h2 className="mb-3 text-section-title font-semibold">{t("Attention required")}</h2>
        <ul className="divide-y">
          {overdue.map(([id, value]) => { const student = studentMap.get(id); return <li key={id} className="flex flex-wrap items-center gap-2 py-3"><Link to="/students/$id" params={{ id }} className="min-w-0 flex-1"><bdi className="block break-words text-sm font-medium">{student?.name ?? id}</bdi><span className="text-xs text-destructive">{t("Outstanding balance")} · <Money value={value} /></span></Link>{student?.guardianPhone && <Button asChild variant="ghost" size="icon" title={t("Send reminders")}><a href={`https://wa.me/2${student.guardianPhone}`} target="_blank" rel="noreferrer" aria-label={`${t("Send reminders")} · ${student.name}`}><MessageCircle /></a></Button>}</li>; })}
          {notRecorded.slice(0, 2).map((item) => <li key={item.id}><Link to="/attendance" search={{ classId: item.id, date: today }} className="block py-3 text-sm hover:text-brand"><bdi>{item.name}</bdi><span className="mt-1 block text-xs text-muted-foreground">{t("Attendance not recorded")}</span></Link></li>)}
          {f.payables > 0 && <li><Link to="/finance" className="block py-3 text-sm hover:text-brand">{t("Review teacher payables")} · <Money value={f.payables} /><span className="mt-1 block text-xs text-muted-foreground">{t("Accrued · settlement not tracked")}</span></Link></li>}
        </ul>
        {!overdue.length && !notRecorded.length && f.payables <= 0 && <EmptyState title={t("Nothing requires attention")} />}
      </section>
    </div>
    <section className="py-5">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-section-title font-semibold">{t("Recent activity")}</h2><Link to="/finance" className="text-xs text-brand">{t("View all")}</Link></div>
      <ul className="divide-y">{recent.map((entry) => { const status = displayStatus(entry, rev); return <li key={entry.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
        <Link to="/students/$id" params={{ id: entry.studentId }} className="min-w-0 flex-1"><bdi className="block break-words font-medium">{studentMap.get(entry.studentId)?.name ?? entry.studentId}</bdi><span className="text-xs text-muted-foreground"><bdi>{entry.id}</bdi> · {t(entry.type)} · {shortDateL(entry.date, lang)}</span></Link>
        <Pill tone={status === "Completed" ? "positive" : status === "Pending" ? "warning" : "neutral"}>{t(status)}</Pill>
        <span className="min-w-28 text-right font-medium num"><bdi>{entry.type === "Payment" ? "+" : "−"}<Money value={entry.amount} /></bdi></span>
      </li>; })}</ul>
      {!recent.length && <EmptyState title={t("No transactions in this period.")} />}
    </section>
  </div>;
}
