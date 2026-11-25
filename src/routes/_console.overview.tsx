import { createFileRoute, Link } from "@tanstack/react-router";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Plus, CalendarCheck, MessageCircle, Users, Wallet, Receipt, CalendarDays, Clock3, Hourglass, PackageOpen, CircleAlert,
  ArrowUpRight, Banknote, RotateCcw, Undo2, BadgePercent, CheckCircle2, GraduationCap, BookOpen, Coins, TrendingUp, Activity,
} from "lucide-react";
import { Panel, Pill, Money, Delta, EmptyState, StatCard, MiniStat, IconTile, Avatar, chartAxis, tooltipStyle, type Tone } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordPaymentDialog } from "@/components/app/record-payment";
import { PeriodBranchFilter } from "@/components/app/filters";
import { AddStudent } from "@/components/app/add-student";
import { computeMetrics, displayStatus, reversedIds, type LedgerEntry } from "@/lib/ledger";
import { useLedger, monthLabel } from "@/lib/ledger-store";
import { useFinance } from "@/lib/use-finance";
import { attendanceRate, pctChange } from "@/lib/finance";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { fmtNum, kAxis, localTime, monthShort, shortDateL, timeOfDay } from "@/lib/l10n";
import { useCenter } from "@/lib/center-context";
import { classWeekdays, weekdayOf, sessionIdFor } from "@/lib/billing";
import { useAttention, useNow } from "@/lib/attention";
import { greetingKey, hasPriorData, attendanceLabel, attendanceStats, weeklyAttendance, enrollmentTrend, cairoNow, classStartMinutes, weekStart, addDays } from "@/lib/overview-display";
import { pageHead } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/overview")({
  head: pageHead("Overview", "Nile Academy financial overview, today's classes, attention required and recent ledger activity."),
  pendingComponent: OverviewSkeleton,
  component: Overview,
});

function OverviewSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto max-w-[90rem] space-y-5">
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

/** Store, finance and attention state, computed once in Overview and shared by every panel. */
function useScopeValue() {
  const { t, lang } = useI18n();
  const L = useLedger();
  const f = useFinance();
  const a = useAttention();
  const studentMap = useMemo(() => new Map(L.students.map((s) => [s.id, s])), [L.students]);
  const branchOf = useMemo(() => { const m = new Map(L.classes.map((x) => [x.id, x.branch as string])); return (id: string) => m.get(id) ?? ""; }, [L.classes]);
  const inBranch = (b: string) => L.branch === "all" || b === L.branch;
  return { ...L, t, lang, rtl: lang === "ar", f, a, c: f.current, studentMap, branchOf, inBranch };
}
const ScopeCtx = createContext<ReturnType<typeof useScopeValue> | null>(null);
function useScope() {
  const v = useContext(ScopeCtx);
  if (!v) throw new Error("Overview panels must render inside Overview");
  return v;
}

function Overview() {
  const now = useNow();
  const scope = useScopeValue();
  const { center, user } = useCenter();
  const { t, lang, rtl, entries, students, sessions, filter, compare, period, branch, f, a, c, branchOf } = scope;
  const p = f.previous;
  const att = useMemo(() => attendanceStats(sessions, branchOf, filter), [sessions, branchOf, filter]);
  const attPrev = useMemo(() => attendanceStats(sessions, branchOf, compare), [sessions, branchOf, compare]);

  if (!now) return <OverviewSkeleton />;
  const clock = cairoNow(now);
  const today = clock.date;
  const inBranch = (b: string) => branch === "all" || b === branch;
  const scoped = students.filter((s) => inBranch(s.branch));
  const active = scoped.filter((s) => s.status === "Active").length;
  const rate = attendanceRate(att.present, att.marked);
  const ratePrev = attendanceRate(attPrev.present, attPrev.marked);
  // Payments are dated with the store's business date (ledger-store todayIso), so "today" money uses it too.
  const todayMetrics = computeMetrics(entries, { from: scope.today, to: scope.today, branch });
  const paymentsToday = todayMetrics.byMethod.reduce((n, m) => n + m.count, 0);
  const finalizedToday = a.todaysClasses.filter((x) => attendanceLabel(sessions[sessionIdFor(x.id, today)]) === "Finalized").length;
  const collectedShare = c.netBilled > 0 ? (c.grossCollections / c.netBilled) * 100 : null;
  const showDelta = (cur: number, prev: number) => hasPriorData(entries, compare, prev) ? pctChange(cur, prev) : null;
  const pctSuffix = rtl ? "٪" : "%";
  const firstName = user.name.split(" ")[0] ?? "";
  const branchLabel = branch === "all" ? t("All branches") : t(branch);

  const revDelta = showDelta(c.billed, p.billed);
  const outDelta = showDelta(c.outstanding, p.outstanding);

  return (
    <ScopeCtx.Provider value={scope}>
    <div className="mx-auto max-w-[90rem] space-y-5">
      {/* Period + branch: in the header from 1280px, here below it (same shared filter). */}
      <div className="xl:hidden"><PeriodBranchFilter /></div>
      {/* A · Welcome hero */}
      <section className="bg-hero relative overflow-clip rounded-2xl px-5 py-6 text-welcome-foreground shadow-raised sm:px-7 sm:py-7">
        <div aria-hidden className="pointer-events-none absolute -end-16 -top-24 size-72 rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -end-4 -top-10 size-44 rounded-full border border-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-welcome-muted">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-medium text-white"><CalendarDays className="size-3.5" />{longDate(now, lang)}</span>
              <span className="inline-flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-teal-bright" /><bdi>{center.name}</bdi> · {branchLabel}</span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-[1.75rem]">{t(greetingKey(clock.hour))}{rtl ? "،" : ","} <bdi>{firstName}</bdi></h2>
            <p className="mt-1 text-sm text-welcome-muted">{t("Here is what is happening at your center today.")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <RecordPaymentDialog trigger={<Button className="bg-white text-navy shadow-none hover:bg-white/90"><Plus />{t("Record payment")}</Button>} />
            <AddStudent variant="ghost" className="border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white" />
            <Button asChild variant="ghost" className="border border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><Link to="/attendance"><CalendarCheck />{t("Mark attendance")}</Link></Button>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <HeroStat icon={BookOpen} label={t("Classes today")} value={fmtNum(a.todaysClasses.length, lang)} hint={t("{n} finalized", { n: fmtNum(finalizedToday, lang) })} />
          <HeroStat icon={CalendarCheck} label={t("Attendance to finalize")} value={fmtNum(a.unfinalized.length, lang)} hint={t("Classes that have started")} />
          <HeroStat icon={Banknote} label={t("Collected today")} value={<bdi>{formatMoney(todayMetrics.grossCollections, lang)}</bdi>} hint={t("{n} payments recorded", { n: fmtNum(paymentsToday, lang) })} />
          <HeroStat icon={Hourglass} label={t("Awaiting confirmation")} value={fmtNum(a.pending.count, lang)} hint={<bdi>{formatMoney(a.pending.amount, lang)}</bdi>} />
        </div>
      </section>

      {/* B · KPI cards */}
      <section aria-label={t("Key figures")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Receipt} tone="brand" label={t("Period revenue")} value={<Money value={c.billed} />}
          hint={t("Billed in {month} · net {amount} after discounts", { month: monthLabel(period, lang), amount: formatMoney(c.netBilled, lang) })}
          delta={revDelta !== null ? <Delta value={revDelta} suffix={pctSuffix} /> : undefined}
          meter={collectedShare !== null ? { value: collectedShare, label: t("Collected against net billed"), caption: t("Collected against net billed"), tone: "teal" } : undefined} />
        <StatCard icon={Users} tone="teal" label={t("Active students")} value={formatNumber(active)}
          hint={t("{n} on roll · {b} billed this period", { n: fmtNum(scoped.length, lang), b: fmtNum(f.students, lang) })}
          meter={scoped.length ? { value: (active / scoped.length) * 100, label: t("Active share of roll"), tone: "teal" } : undefined} />
        <StatCard icon={CalendarCheck} tone="lavender" label={t("Attendance rate")} value={att.marked ? formatPercent(rate, lang) : "—"}
          hint={att.marked ? t("{m} marks across {s} recorded sessions", { m: fmtNum(att.marked, lang), s: fmtNum(att.sessions, lang) }) : t("No attendance recorded in this period")}
          delta={att.marked && attPrev.marked ? <Delta value={Math.round((rate - ratePrev) * 10) / 10} suffix={rtl ? " نقطة" : " pts"} /> : undefined}
          footer={att.marked ? <AttendanceSplit present={att.present} absent={att.absent} excused={att.excused} /> : undefined} />
        <StatCard icon={CircleAlert} tone="negative" label={t("Outstanding balances")} value={<Money value={c.outstanding} />}
          hint={t("{n} students owe · end of period", { n: fmtNum(c.studentsOwing, lang) })}
          delta={outDelta !== null ? <Delta value={outDelta} invert suffix={pctSuffix} /> : undefined}
          footer={<span className="flex items-center justify-between gap-2"><span>{t("Prepaid credit")}</span><span className="font-semibold text-positive"><Money value={c.prepaid} /></span></span>} />
      </section>

      {/* E · Revenue analytics + F · Activity */}
      <div className="grid gap-5 xl:grid-cols-3">
        <RevenuePanel className="xl:col-span-2" />
        <ActivityFeed />
      </div>

      {/* C · Schedule, D · Attention, E · Trends */}
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <SchedulePanel today={today} nowMinutes={clock.minutes} />
        <AttentionPanel today={today} />
        <TrendsPanel className="lg:col-span-2 xl:col-span-1" />
      </div>
    </div>
    </ScopeCtx.Provider>
  );
}

function HeroStat({ icon: HIcon, label, value, hint }: { icon: typeof Plus; label: string; value: ReactNode; hint: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/12 bg-white/[0.07] p-3.5 backdrop-blur-sm sm:p-4">
      <div className="flex items-center gap-2 text-xs text-welcome-muted"><span className="grid size-7 shrink-0 place-items-center rounded-md bg-white/10 text-white"><HIcon className="size-3.5" /></span><span className="min-w-0 leading-tight">{label}</span></div>
      <div className="mt-2.5 truncate font-display text-xl font-bold tracking-tight text-white num sm:text-2xl">{value}</div>
      <div className="mt-0.5 truncate text-[11px] text-welcome-muted">{hint}</div>
    </div>
  );
}

function AttendanceSplit({ present, absent, excused }: { present: number; absent: number; excused: number }) {
  const { t, lang, rtl, entries, students, classes, teachers, sessions, filter, period, branch, f, a, c, studentMap, branchOf, inBranch } = useScope();
  const total = present + absent + excused;
  const seg = (n: number) => `${(n / total) * 100}%`;
  return (
    <div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={t("Present {p} · Absent {a} · Excused {e}", { p: fmtNum(present, lang), a: fmtNum(absent, lang), e: fmtNum(excused, lang) })}>
        <span className="bg-positive" style={{ width: seg(present) }} /><span className="bg-destructive" style={{ width: seg(absent) }} /><span className="bg-warning" style={{ width: seg(excused) }} />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-positive" />{t("Present")} <b className="font-semibold text-foreground num">{fmtNum(present, lang)}</b></span>
        <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-destructive" />{t("Absent")} <b className="font-semibold text-foreground num">{fmtNum(absent, lang)}</b></span>
        <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full bg-warning" />{t("Excused")} <b className="font-semibold text-foreground num">{fmtNum(excused, lang)}</b></span>
      </div>
    </div>
  );
}

function RevenuePanel({ className }: { className?: string }) {
  const { t, lang, rtl, entries, students, classes, teachers, sessions, filter, period, branch, f, a, c, studentMap, branchOf, inBranch } = useScope();
  const series = f.series.map((item) => ({ ...item, label: monthShort(item.m, lang) }));
  const mismatch = Math.abs(c.byMethod.reduce((sum, item) => sum + item.amount, 0) - c.grossCollections) > 0.005;
  return (
    <Panel className={className} title={t("Revenue analytics")} subtitle={t("Billed revenue against gross collections, by month")}
      action={<div className="flex items-center gap-3 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-chart-1" />{t("Billed revenue")}</span><span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-chart-2" />{t("Gross collections")}</span></div>}>
      {series.some((item) => item.billed !== 0 || item.gross !== 0) ? (
        <div className="h-64 w-full" dir="ltr">
          <ResponsiveContainer>
            <BarChart data={series} barGap={4} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" {...chartAxis} reversed={rtl} />
              <YAxis {...chartAxis} orientation={rtl ? "right" : "left"} width={rtl ? 68 : 52} tickFormatter={(value: number) => kAxis(value, lang)} />
              <Tooltip {...tooltipStyle} formatter={(value: number) => formatMoney(value, lang)} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
              <Bar dataKey="billed" name={t("Billed revenue")} fill="var(--chart-1)" radius={[5, 5, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="gross" name={t("Gross collections")} fill="var(--chart-2)" radius={[5, 5, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyState title={t("No financial activity in this period")} compact />}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat tone="positive" icon={Wallet} label={t("Gross collections")} value={<Money value={c.grossCollections} />} hint={t("Completed payments only")} />
        <MiniStat tone="brand" icon={Coins} label={t("Net collections")} value={<Money value={c.netCollections} />} hint={<>{t("After refunds of")} <Money value={c.refunds} /></>} />
        <MiniStat tone="lavender" icon={GraduationCap} label={t("Teacher payables")} value={<Money value={f.payables} />} hint={t("Accrued · settlement not tracked")} />
        <MiniStat tone="warning" icon={Hourglass} label={t("Not counted")} value={<Money value={c.pending + c.reversed} />} hint={t("Pending {p} · reversed {r}", { p: formatMoney(c.pending, lang), r: formatMoney(c.reversed, lang) })} />
      </div>
      <div role={mismatch ? "alert" : undefined} className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t pt-3 text-[11px] text-muted-foreground">
        {mismatch && <span className="flex items-center gap-1 font-medium text-destructive"><CircleAlert className="size-3.5" />{t("Collections do not reconcile")}</span>}
        <span>{!mismatch && <><span className="inline-flex items-center gap-1 font-medium text-positive"><CheckCircle2 className="size-3.5" />{t("Reconciled")}</span> · </>}{t("Gross")} <Money value={c.grossCollections} /> − {t("Refunds")} <Money value={c.refunds} /> = {t("Net")} <Money value={c.netCollections} /></span>
        <Link to="/finance" className="ms-auto inline-flex items-center gap-1 font-medium text-brand hover:underline">{t("Breakdown & definitions")}<ArrowUpRight className="size-3.5 rtl:-scale-x-100" /></Link>
      </div>
    </Panel>
  );
}

function ActivityFeed() {
  const { t, lang, rtl, entries, students, classes, teachers, sessions, filter, period, branch, f, a, c, studentMap, branchOf, inBranch } = useScope();
  const rev = reversedIds(entries);
  type Item = { key: string; at: string; icon: typeof Plus; tone: Tone; title: ReactNode; detail: ReactNode; amount?: ReactNode; to?: string };
  const items: Item[] = [];
  const show = (e: LedgerEntry) => e.type !== "Charge" && e.type !== "PackageUse" && e.date >= filter.from && e.date <= filter.to && inBranch(e.branch);
  for (const e of entries) {
    if (!show(e)) continue;
    const st = displayStatus(e, rev);
    const name = studentMap.get(e.studentId)?.name ?? e.studentId;
    const meta: Record<string, [typeof Plus, Tone, string]> = {
      Payment: st === "Pending" ? [Hourglass, "warning", "Payment awaiting confirmation"] : [Banknote, "positive", "Payment received"],
      Refund: [Undo2, "coral", "Refund issued"],
      Discount: [BadgePercent, "lavender", "Discount granted"],
      Reversal: [RotateCcw, "neutral", "Entry reversed"],
    };
    const [icon, tone, title] = meta[e.type] ?? [Receipt, "neutral", e.type];
    items.push({ key: e.id, at: e.enteredAt, icon, tone, to: e.studentId, title: <bdi>{name}</bdi>,
      detail: <><span className="font-medium text-foreground/80">{t(title)}</span>{e.method ? ` · ${t(e.method)}` : ""}{e.reversesId ? ` · ${t("of {id}", { id: e.reversesId })}` : ""}</>,
      amount: <span className={cn("font-semibold num", e.type === "Payment" && st === "Completed" ? "text-positive" : st === "Reversed" || st === "Pending" ? "text-muted-foreground" : "text-foreground", st === "Reversed" && "line-through")}><bdi>{e.type === "Payment" ? "+" : "−"}<Money value={e.amount} /></bdi></span> });
  }
  for (const s of Object.values(sessions)) {
    if (!s.finalized || s.date < filter.from || s.date > filter.to || !inBranch(branchOf(s.classId))) continue;
    const cls = classes.find((x) => x.id === s.classId);
    const marked = Object.values(s.marks).filter(Boolean).length;
    items.push({ key: s.sessionId, at: s.finalized.at, icon: CalendarCheck, tone: "teal", title: <bdi>{cls?.name ?? s.classId}</bdi>, detail: <><span className="font-medium text-foreground/80">{t("Attendance finalized")}</span> · {t("{n} students marked", { n: fmtNum(marked, lang) })}</> });
  }
  items.sort((x, y) => y.at.localeCompare(x.at));
  const view = items.slice(0, 7);
  return (
    <Panel title={t("Recent activity")} subtitle={t("Payments, corrections and finalized sessions")} icon={Activity} bodyClass="px-0 pb-2"
      action={<Link to="/finance" className="text-xs font-medium text-brand hover:underline">{t("View all")}</Link>}>
      {view.length ? (
        <ol className="relative">
          {view.map((item, i) => (
            <li key={item.key} className="relative flex gap-3 px-5 py-2.5">
              {i < view.length - 1 && <span aria-hidden className="absolute start-[2.3rem] top-11 bottom-0 w-px bg-border" />}
              <IconTile icon={item.icon} tone={item.tone} className="relative size-8 rounded-full [&_svg]:size-3.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  {item.to ? <Link to="/students/$id" params={{ id: item.to }} className="min-w-0 truncate text-[13px] font-medium hover:text-brand">{item.title}</Link> : <span className="min-w-0 truncate text-[13px] font-medium">{item.title}</span>}
                  {item.amount && <span className="shrink-0 text-[13px]">{item.amount}</span>}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.detail} · {timeOfDay(item.at, lang)}</div>
              </div>
            </li>
          ))}
        </ol>
      ) : <EmptyState title={t("No activity in this period")} compact />}
    </Panel>
  );
}

function SchedulePanel({ today: day0, nowMinutes }: { today: string; nowMinutes: number }) {
  const { t, lang, rtl, entries, students, classes, teachers, sessions, filter, period, branch, f, a, c, studentMap, branchOf, inBranch } = useScope();
  const [picked, setPicked] = useState(day0);
  const start = weekStart(day0);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const list = classes.filter((x) => inBranch(x.branch) && classWeekdays(x.days).includes(weekdayOf(picked))).sort((x, y) => classStartMinutes(x.time) - classStartMinutes(y.time));
  const dayFmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { weekday: "short", timeZone: "UTC" });
  return (
    <Panel title={t("Class schedule")} subtitle={t("Tap a day to see its classes and attendance")} icon={CalendarDays} bodyClass="px-0 pb-2"
      action={<Link to="/attendance" className="text-xs font-medium text-brand hover:underline">{t("Attendance")}</Link>}>
      <div className="grid grid-cols-7 gap-1 px-4 pb-3">
        {days.map((d) => {
          const sel = d === picked, isToday = d === day0;
          const count = classes.filter((x) => inBranch(x.branch) && classWeekdays(x.days).includes(weekdayOf(d))).length;
          return (
            <button key={d} type="button" onClick={() => setPicked(d)} aria-pressed={sel} aria-label={`${longDate(new Date(`${d}T12:00:00Z`), lang)} · ${t("{n} classes", { n: fmtNum(count, lang) })}`}
              className={cn("flex flex-col items-center rounded-lg py-2 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", sel ? "bg-primary text-primary-foreground shadow-raised" : "hover:bg-muted", !sel && isToday && "ring-1 ring-primary/40")}>
              <span className={cn("text-[10px] font-medium", sel ? "text-primary-foreground/80" : "text-muted-foreground")}>{dayFmt.format(new Date(`${d}T12:00:00Z`))}</span>
              <span className="mt-0.5 font-display text-sm font-bold num">{Number(d.slice(8))}</span>
              <span className={cn("mt-1 size-1 rounded-full", count ? (sel ? "bg-primary-foreground" : "bg-teal-bright") : "bg-transparent")} />
            </button>
          );
        })}
      </div>
      <ul className="max-h-80 divide-y overflow-y-auto border-t">
        {list.map((x) => {
          const future = picked > day0 || (picked === day0 && classStartMinutes(x.time) > nowMinutes);
          const status = attendanceLabel(sessions[sessionIdFor(x.id, picked)]);
          const tone: Tone = picked > day0 ? "neutral" : status === "Finalized" ? "positive" : status === "In progress" ? "info" : future ? "neutral" : "warning";
          const label = picked > day0 ? "Upcoming" : status === "Attendance not recorded" ? (future ? "Later today" : "Not recorded") : status;
          const row = (
            <div className="flex items-center gap-3 px-5 py-3">
              <div className="w-14 shrink-0 text-[11px] font-semibold text-muted-foreground num"><bdi>{localTime(x.time, lang)}</bdi></div>
              <div className="min-w-0 flex-1"><bdi className="block truncate text-[13px] font-medium">{x.name}</bdi><div className="truncate text-[11px] text-muted-foreground"><bdi>{teachers.find((tt) => tt.id === x.teacherId)?.name ?? x.teacherId}</bdi> · {t(x.branch)}</div></div>
              <Pill tone={tone} dot>{t(label)}</Pill>
            </div>
          );
          return <li key={x.id}>{picked <= day0 ? <Link to="/attendance" search={{ classId: x.id, date: picked }} className="block hover:bg-muted/50">{row}</Link> : row}</li>;
        })}
      </ul>
      {!list.length && <EmptyState title={t("No classes scheduled on this day")} compact />}
    </Panel>
  );
}

function AttentionPanel({ today: day0 }: { today: string }) {
  const { t, lang, rtl, entries, students, classes, teachers, sessions, filter, period, branch, f, a, c, studentMap, branchOf, inBranch } = useScope();
  const owing = a.owing.slice(0, 4);
  const nothing = !owing.length && !a.unfinalized.length && !a.lowPackages.length && !a.pending.count;
  return (
    <Panel title={t("Needs attention")} subtitle={t("Derived from the ledger and attendance")} icon={CircleAlert} bodyClass="px-0 pb-2"
      action={a.count ? <Pill tone="negative">{fmtNum(a.count, lang)}</Pill> : undefined}>
      {nothing ? <EmptyState title={t("Nothing requires attention")} icon={CheckCircle2} compact /> : (
        <ul className="divide-y border-t">
          {a.unfinalized.slice(0, 3).map((x) => (
            <li key={x.id}><Link to="/attendance" search={{ classId: x.id, date: day0 }} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
              <IconTile icon={CalendarCheck} tone="warning" className="size-8 [&_svg]:size-4" />
              <div className="min-w-0 flex-1"><bdi className="block truncate text-[13px] font-medium">{x.name}</bdi><div className="text-[11px] text-muted-foreground">{t("Started at {time} · attendance not finalized", { time: localTime(x.time, lang) })}</div></div>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            </Link></li>
          ))}
          {a.pending.count > 0 && (
            <li><Link to="/finance" className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
              <IconTile icon={Hourglass} tone="warning" className="size-8 [&_svg]:size-4" />
              <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium">{t("{n} payments awaiting confirmation", { n: fmtNum(a.pending.count, lang) })}</div><div className="text-[11px] text-muted-foreground">{t("Not counted as collected")} · <Money value={a.pending.amount} /></div></div>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            </Link></li>
          )}
          {a.lowPackages.slice(0, 3).map((pk) => (
            <li key={`${pk.studentId}-${pk.classId}`}><Link to="/students/$id" params={{ id: pk.studentId }} search={{ tab: "enroll" }} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
              <IconTile icon={PackageOpen} tone="lavender" className="size-8 [&_svg]:size-4" />
              <div className="min-w-0 flex-1"><bdi className="block truncate text-[13px] font-medium">{studentMap.get(pk.studentId)?.name ?? pk.studentId}</bdi><div className="truncate text-[11px] text-muted-foreground">{t(pk.remaining === 0 ? "Package used up" : "{n} package session left", { n: fmtNum(pk.remaining, lang) })} · <bdi>{classes.find((x) => x.id === pk.classId)?.name}</bdi></div></div>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            </Link></li>
          ))}
          {owing.map(([id, value]) => {
            const s = studentMap.get(id);
            return (
              <li key={id} className="flex items-center gap-3 px-5 py-2.5">
                <Avatar name={s?.name ?? id} seed={id} size="sm" />
                <Link to="/students/$id" params={{ id }} className="min-w-0 flex-1 hover:text-brand"><bdi className="block truncate text-[13px] font-medium">{s?.name ?? id}</bdi><span className="text-[11px] text-muted-foreground">{t("Outstanding balance")}</span></Link>
                <span className="shrink-0 text-[13px] font-semibold text-destructive"><Money value={value} /></span>
                {s?.guardianPhone && <Button asChild variant="ghost" size="icon" className="size-8 text-positive" title={t("WhatsApp reminder")}><a href={`https://wa.me/2${s.guardianPhone}`} target="_blank" rel="noreferrer" aria-label={`${t("WhatsApp reminder")} · ${s.name}`}><MessageCircle className="size-4" /></a></Button>}
              </li>
            );
          })}
          {a.owing.length > owing.length && <li className="px-5 py-2.5 text-[11px] text-muted-foreground"><Link to="/students" className="font-medium text-brand hover:underline">{t("{n} more students with a balance", { n: fmtNum(a.owing.length - owing.length, lang) })}</Link></li>}
        </ul>
      )}
    </Panel>
  );
}

function TrendsPanel({ className }: { className?: string }) {
  const { t, lang, rtl, entries, students, classes, teachers, sessions, filter, period, branch, f, a, c, studentMap, branchOf, inBranch } = useScope();
  const [view, setView] = useState<"attendance" | "enrollment">("attendance");
  const weekly = weeklyAttendance(sessions, branchOf, branch).slice(-10).map((w) => ({ ...w, label: shortDateL(w.week, lang) }));
  const enroll = enrollmentTrend(students, branch, period).map((e) => ({ ...e, label: monthShort(e.m, lang) }));
  return (
    <Panel className={className} title={t("Trends")} icon={TrendingUp}
      subtitle={view === "attendance" ? t("Weekly attendance rate from recorded sessions") : t("New registrations and total students, by join month")}
      action={<Tabs value={view} onValueChange={(v) => setView(v as typeof view)} dir={rtl ? "rtl" : "ltr"}><TabsList className="h-8"><TabsTrigger value="attendance" className="px-2.5 text-xs">{t("Attendance")}</TabsTrigger><TabsTrigger value="enrollment" className="px-2.5 text-xs">{t("Enrollment")}</TabsTrigger></TabsList></Tabs>}>
      {view === "attendance" ? (
        weekly.length ? (
          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer>
              <AreaChart data={weekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs><linearGradient id="att-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" {...chartAxis} reversed={rtl} interval="preserveStartEnd" minTickGap={16} />
                <YAxis {...chartAxis} orientation={rtl ? "right" : "left"} width={40} domain={[(min: number) => Math.max(0, Math.floor(min - 5)), 100]} tickFormatter={(v: number) => formatPercent(v, lang)} />
                <Tooltip {...tooltipStyle} formatter={(v: number, _n, item) => [`${formatPercent(v, lang)} · ${t("{m} marks", { m: fmtNum((item.payload as { marked: number }).marked, lang) })}`, t("Attendance rate")]} labelFormatter={(l: string) => t("Week of {date}", { date: l })} />
                <Area dataKey="rate" type="monotone" stroke="var(--chart-3)" strokeWidth={2} fill="url(#att-fill)" dot={{ r: 2.5, fill: "var(--chart-3)" }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyState title={t("No attendance recorded yet")} compact />
      ) : enroll.length ? (
        <div className="h-64 w-full" dir="ltr">
          <ResponsiveContainer>
            <ComposedChart data={enroll} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" {...chartAxis} reversed={rtl} />
              <YAxis yAxisId="new" {...chartAxis} orientation={rtl ? "right" : "left"} width={32} allowDecimals={false} />
              <YAxis yAxisId="total" {...chartAxis} orientation={rtl ? "left" : "right"} width={36} allowDecimals={false} />
              <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [formatNumber(v), name]} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
              <Bar yAxisId="new" dataKey="joined" name={t("New registrations")} fill="var(--chart-2)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Line yAxisId="total" dataKey="total" name={t("Total students")} type="monotone" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyState title={t("No students yet")} compact />}
    </Panel>
  );
}

function longDate(date: Date, lang: "en" | "ar") {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" }).format(date);
}
