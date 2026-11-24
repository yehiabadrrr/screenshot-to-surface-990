import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Plus, CalendarCheck, MessageCircle, AlertTriangle, Users, BookOpen, Wallet, ArrowUpRight, GraduationCap, Receipt, CalendarDays, Clock3 } from "lucide-react";
import { PageHeader, Panel, Pill, Money, Delta, EmptyState, chartAxis, tooltipStyle } from "@/components/app/ui";
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
import { AddStudent } from "@/components/app/add-student";
import { formatNumber, formatPercent } from "@/lib/format";
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
  const scopedStudents = students.filter((student) => branch === "all" || student.branch === branch);
  const scopedClasses = classes.filter((item) => branch === "all" || item.branch === branch);
  const metrics = [
    { icon: Receipt, tone: "brand", label: "Billed revenue", value: c.billed, prev: p.billed, detail: "Net billed", detailValue: c.netBilled },
    { icon: Wallet, tone: "teal", label: "Gross collections", value: c.grossCollections, prev: p.grossCollections, detail: "Net collections", detailValue: c.netCollections },
    { icon: Clock3, tone: "warning", label: "Outstanding receivables", value: c.outstanding, prev: p.outstanding, detail: "Prepaid balances", detailValue: c.prepaid },
    { icon: GraduationCap, tone: "brand", label: "Teacher payables", value: f.payables, prev: f.payablesPrev, detail: "Accrued · settlement not tracked" },
  ];
  return <div className="mx-auto max-w-7xl">
    <PageHeader title={t("Dashboard")} subtitle={`${t("Center overview")} · ${branch === "all" ? t("All branches") : t(branch)}`} actions={<PeriodBranchFilter />} />
    <section className="mb-6 grid gap-5 rounded-lg bg-welcome px-5 py-6 text-welcome-foreground sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0"><div className="mb-2 flex items-center gap-2 text-xs text-welcome-muted"><CalendarDays className="size-3.5" />{longDashboardDate(clock, lang)}<span>·</span><bdi>{centerProfile.name}</bdi></div><h2 className="text-2xl font-semibold">{t(greetingKey(Number(part("hour"))))}{rtl ? "،" : ","} <bdi>{centerProfile.currentUser.name.split(" ")[0] ?? ""}</bdi></h2><p className="mt-2 text-sm text-welcome-muted">{t("Your center. Under control.")}</p></div>
      <div className="flex flex-wrap gap-2"><AddStudent /><RecordPaymentDialog trigger={<Button variant="outline"><Plus />{t("Record payment")}</Button>} /></div>
    </section>
    <section aria-label={t("Center overview")} className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[{ icon: Users, label: "Total students", value: formatNumber(scopedStudents.length), detail: `${formatNumber(scopedStudents.filter((student) => student.status === "Active").length)} ${t("Active students")}` }, { icon: BookOpen, label: "Total classes", value: formatNumber(scopedClasses.length), detail: `${formatNumber(todaysClasses.length)} ${t("Scheduled today")}` }, { icon: CalendarCheck, label: "Attendance rate", value: scopedStudents.length ? formatPercent(scopedStudents.reduce((sum, student) => sum + student.attendance, 0) / scopedStudents.length, lang) : "—", detail: t("Student sample average") }, { icon: CalendarDays, label: "Enrollments", value: formatNumber(scopedStudents.reduce((sum, student) => sum + student.classIds.length, 0)), detail: t("Across enrolled classes") }].map((metric) => <div className="surface flex min-w-0 items-start gap-3 p-4" key={metric.label}><span className="grid size-9 shrink-0 place-items-center rounded-md bg-teal-soft text-teal"><metric.icon className="size-4" /></span><div className="min-w-0"><h2 className="text-xs text-muted-foreground">{t(metric.label)}</h2><div className="mt-1 text-metric font-semibold num">{metric.value}</div><p className="mt-1 text-[11px] text-muted-foreground">{metric.detail}</p></div></div>)}
    </section>
    <section aria-label={t("Financial overview")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {metrics.map((metric) => <div key={metric.label} className="surface min-w-0 p-4">
        <div className="mb-3 flex items-center gap-2"><span className={metric.tone === "teal" ? "grid size-8 shrink-0 place-items-center rounded-md bg-teal-soft text-teal" : metric.tone === "warning" ? "grid size-8 shrink-0 place-items-center rounded-md bg-warning-soft text-warning" : "grid size-8 shrink-0 place-items-center rounded-md bg-accent text-brand"}><metric.icon className="size-4" /></span><h2 className="text-xs text-muted-foreground">{t(metric.label)}</h2></div>
        <div className="break-words text-metric font-semibold"><Money value={metric.value} /></div>
        <div className="mt-2 text-[11px] text-muted-foreground">{t(metric.detail)}{metric.detailValue !== undefined && <> · <Money value={metric.detailValue} /></>}</div>
        {hasPriorData(entries, compare, metric.prev) && <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground"><Delta value={pctChange(metric.value, metric.prev)} invert={metric.label === "Outstanding receivables" || metric.label === "Teacher payables"} suffix={rtl ? "٪" : "%"} />{t("vs prior period")}</div>}
      </div>)}
    </section>
    <div role={mismatch ? "alert" : undefined} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 text-[11px]">
      {mismatch && <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="size-4" />{t("Collections do not reconcile")}</span>}
      <span>{t("Gross")} <Money value={c.grossCollections} /> − {t("Refunds")} <Money value={c.refunds} /> = {t("Net")} <Money value={c.netCollections} /></span>
      <span className="text-muted-foreground">{t("Not counted:")} {t("Pending")} <Money value={c.pending} /> · {t("Reversed")} <Money value={c.reversed} /></span>
      <Link to="/finance" className="ms-auto text-brand">{t("Breakdown & definitions")}</Link>
    </div>
    <Panel title={t("Revenue analytics")} className="mb-6" action={<span className="text-xs text-muted-foreground">{t("Billed revenue vs gross collections")}</span>}>
      {series.some((item) => item.billed !== 0 || item.gross !== 0) ? <div className="h-64 w-full" dir="ltr"><ResponsiveContainer><BarChart data={series} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="label" {...chartAxis} reversed={rtl} /><YAxis {...chartAxis} orientation={rtl ? "right" : "left"} width={56} tickFormatter={(value: number) => kAxis(value, lang)} />
        <Tooltip {...tooltipStyle} formatter={(value: number) => egp(value, lang)} cursor={{ fill: "var(--muted)" }} />
        <Legend iconType="square" iconSize={8} /><Bar dataKey="billed" name={t("Billed revenue")} fill="var(--brand)" radius={[3, 3, 0, 0]} isAnimationActive={false} /><Bar dataKey="gross" name={t("Gross collections")} fill="var(--chart-2)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart></ResponsiveContainer></div> : <EmptyState title={t("No financial activity in this period")} />}
    </Panel>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title={t("Today's classes")} action={<Link to="/attendance" className="text-xs text-brand">{t("View all")} <ArrowUpRight className="ms-1 inline size-3 rtl:-scale-x-100" /></Link>} bodyClass="px-5 py-1">
        <ul className="divide-y">{todaysClasses.map((item) => {
          const status = attendanceLabel(sessions[sessionIdFor(item.id, today)]);
          return <li key={item.id}><Link to="/attendance" search={{ classId: item.id, date: today }} className="flex items-center gap-3 py-3 hover:bg-muted/40"><CalendarCheck className="size-4 shrink-0 text-brand" /><div className="min-w-0 flex-1"><bdi className="block break-words text-sm font-medium">{item.name}</bdi><div className="mt-1 text-xs text-muted-foreground"><bdi>{teachers.find((teacher) => teacher.id === item.teacherId)?.name ?? item.teacherId}</bdi> · {localTime(item.time, lang)}</div></div><Pill tone={status === "Finalized" ? "positive" : "warning"}>{t(status)}</Pill></Link></li>;
        })}</ul>
        {!todaysClasses.length && <EmptyState title={t("No classes scheduled today")} />}
      </Panel>
      <Panel title={t("Attention required")} action={<AlertTriangle className="size-4 text-warning" />} bodyClass="px-5 py-1">
        <ul className="divide-y">
          {overdue.map(([id, value]) => { const student = studentMap.get(id); return <li key={id} className="flex flex-wrap items-center gap-2 py-3"><Link to="/students/$id" params={{ id }} className="min-w-0 flex-1"><bdi className="block break-words text-sm font-medium">{student?.name ?? id}</bdi><span className="text-xs text-destructive">{t("Outstanding balance")} · <Money value={value} /></span></Link>{student?.guardianPhone && <Button asChild variant="ghost" size="icon" title={t("Send reminders")}><a href={`https://wa.me/2${student.guardianPhone}`} target="_blank" rel="noreferrer" aria-label={`${t("Send reminders")} · ${student.name}`}><MessageCircle /></a></Button>}</li>; })}
          {notRecorded.slice(0, 2).map((item) => <li key={item.id}><Link to="/attendance" search={{ classId: item.id, date: today }} className="block py-3 text-sm hover:text-brand"><bdi>{item.name}</bdi><span className="mt-1 block text-xs text-muted-foreground">{t("Attendance not recorded")}</span></Link></li>)}
          {f.payables > 0 && <li><Link to="/finance" className="block py-3 text-sm hover:text-brand">{t("Review teacher payables")} · <Money value={f.payables} /><span className="mt-1 block text-xs text-muted-foreground">{t("Accrued · settlement not tracked")}</span></Link></li>}
        </ul>
        {!overdue.length && !notRecorded.length && f.payables <= 0 && <EmptyState title={t("Nothing requires attention")} />}
      </Panel>
    </div>
    <Panel title={t("Recent activity")} className="mt-6" action={<Link to="/finance" className="text-xs text-brand">{t("View all")}</Link>}>

      <ul className="divide-y">{recent.map((entry) => { const status = displayStatus(entry, rev); return <li key={entry.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
        <Link to="/students/$id" params={{ id: entry.studentId }} className="min-w-0 flex-1"><bdi className="block break-words font-medium">{studentMap.get(entry.studentId)?.name ?? entry.studentId}</bdi><span className="text-xs text-muted-foreground"><bdi>{entry.id}</bdi> · {t(entry.type)} · {shortDateL(entry.date, lang)}</span></Link>
        <Pill tone={status === "Completed" ? "positive" : status === "Pending" ? "warning" : "neutral"}>{t(status)}</Pill>
        <span className="min-w-28 text-right font-medium num"><bdi>{entry.type === "Payment" ? "+" : "−"}<Money value={entry.amount} /></bdi></span>
      </li>; })}</ul>
      {!recent.length && <EmptyState title={t("No transactions in this period.")} />}
    </Panel>
    <div className="mt-5 flex flex-wrap items-center gap-2"><span className="me-2 text-xs font-medium text-muted-foreground">{t("Quick actions")}</span><Button asChild variant="outline"><Link to="/attendance"><CalendarCheck />{t("Mark attendance")}</Link></Button><Button asChild variant="outline"><Link to="/classes"><BookOpen />{t("Classes")}</Link></Button><Button asChild variant="outline"><Link to="/reports"><ArrowUpRight />{t("View reports")}</Link></Button></div>
  </div>;
}

function longDashboardDate(date: Date, lang: "en" | "ar") { return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" }).format(date); }
