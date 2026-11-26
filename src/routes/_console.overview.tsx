import { createFileRoute, Link } from "@tanstack/react-router";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Plus, CalendarCheck, MessageCircle, Receipt, Hourglass, PackageOpen, CircleAlert, ArrowUpRight, Banknote, RotateCcw, Undo2, BadgePercent, CheckCircle2,
} from "lucide-react";
import { Panel, Pill, Money, Delta, EmptyState, MiniStat, IconTile, Avatar, LedgerCode, chartAxis, tooltipStyle, type Tone } from "@/components/app/ui";
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
import { hasPriorData, attendanceLabel, attendanceStats, weeklyAttendance, enrollmentTrend, cairoNow, classStartMinutes, weekStart, addDays } from "@/lib/overview-display";
import { pageHead } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/overview")({
  head: pageHead("Overview", "Nile Academy financial overview, today's classes, attention required and recent ledger activity."),
  pendingComponent: OverviewSkeleton,
  component: Overview,
});

function OverviewSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto max-w-[90rem] space-y-6">
      <Skeleton className="h-14 w-72 rounded-lg" />
      <Skeleton className="h-36 w-full rounded-xl" />
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
  const { center } = useCenter();
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
  const branchLabel = branch === "all" ? t("All branches") : t(branch);

  const revDelta = showDelta(c.billed, p.billed);
  const outDelta = showDelta(c.outstanding, p.outstanding);

  const vs = t("vs {month}", { month: monthLabel(compare.from.slice(0, 7), lang) });
  const grossDelta = showDelta(c.grossCollections, p.grossCollections);

  return (
    <ScopeCtx.Provider value={scope}>
    <div className="mx-auto max-w-[90rem] space-y-6">
      {/* Period + branch: in the header from 1280px, here below it (same shared filter). */}
      <div className="xl:hidden"><PeriodBranchFilter /></div>
      {/* A · Period title and the two actions */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground"><bdi>{center.name}</bdi> · {branchLabel} · {t("{a} active of {n} students", { a: fmtNum(active, lang), n: fmtNum(scoped.length, lang) })}</p>
          <h2 className="mt-1 text-page-title font-medium text-foreground">{monthLabel(period, lang)}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <AddStudent variant="outline" />
          <RecordPaymentDialog trigger={<Button><Plus />{t("Record payment")}</Button>} />
        </div>
      </section>

      {/* B · Four figures, each with what it compares to */}
      <section aria-label={t("Key figures")} className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border bg-border shadow-card sm:grid-cols-2 xl:grid-cols-4">
        <Figure label={t("Period revenue")} value={<Money value={c.billed} />}
          delta={revDelta !== null ? <Delta value={revDelta} suffix={pctSuffix} vs={vs} /> : undefined}
          hint={t("Billed in {month} · net {amount} after discounts", { month: monthLabel(period, lang), amount: formatMoney(c.netBilled, lang) })} />
        <Figure label={t("Gross collections")} accent value={<Money value={c.grossCollections} />}
          delta={grossDelta !== null ? <Delta value={grossDelta} suffix={pctSuffix} vs={vs} /> : undefined}
          hint={collectedShare !== null ? <>{t("Collected against net billed")} · <bdi className="num">{formatPercent(Math.round(collectedShare), lang)}</bdi></> : t("Completed payments only")} />
        <Figure label={t("Outstanding balances")} value={<Money value={c.outstanding} />}
          delta={outDelta !== null ? <Delta value={outDelta} invert suffix={pctSuffix} vs={vs} /> : undefined}
          hint={<>{t("{n} students owe · end of period", { n: fmtNum(c.studentsOwing, lang) })} · {t("Prepaid credit")} <Money value={c.prepaid} /></>} />
        <Figure label={t("Attendance rate")} value={att.marked ? formatPercent(rate, lang) : "—"}
          delta={att.marked && attPrev.marked ? <Delta value={Math.round((rate - ratePrev) * 10) / 10} suffix={rtl ? " نقطة" : " pts"} vs={vs} /> : undefined}
          hint={att.marked ? t("{m} marks across {s} recorded sessions", { m: fmtNum(att.marked, lang), s: fmtNum(att.sessions, lang) }) : t("No attendance recorded in this period")} />
      </section>

      {/* C · The two moments: revenue and today's register */}
      <div className="grid gap-6 xl:grid-cols-3">
        <RevenuePanel className="xl:col-span-2" />
        <RegisterPanel today={today} nowMinutes={clock.minutes}
          summary={[
            [t("Classes today"), fmtNum(a.todaysClasses.length, lang), t("{n} finalized", { n: fmtNum(finalizedToday, lang) })],
            [t("Attendance to finalize"), fmtNum(a.unfinalized.length, lang), t("Classes that have started")],
            [t("Collected today"), <Money key="m" value={todayMetrics.grossCollections} />, t("{n} payments recorded", { n: fmtNum(paymentsToday, lang) })],
            [t("Awaiting confirmation"), fmtNum(a.pending.count, lang), <Money key="p" value={a.pending.amount} />],
          ]} />
      </div>

      {/* D · Attention, activity, trends */}
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <AttentionPanel today={today} />
        <ActivityFeed />
        <TrendsPanel className="lg:col-span-2 xl:col-span-1" />
      </div>
    </div>
    </ScopeCtx.Provider>
  );
}

/** One cell of the figure strip: label, figure, change, one supporting line. */
function Figure({ label, value, delta, hint, accent = false }: { label: string; value: ReactNode; delta?: ReactNode | undefined; hint: ReactNode; accent?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col bg-card p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={cn("mt-2 break-words text-metric font-medium num", accent ? "text-brand" : "text-foreground")}>{value}</div>
      <div className="mt-1 min-h-4">{delta}</div>
      <div className="mt-auto pt-2 text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function RevenuePanel({ className }: { className?: string }) {
  const { t, lang, rtl, period, f, c } = useScope();
  const series = f.series.map((item) => ({ ...item, label: monthShort(item.m, lang) }));
  const mismatch = Math.abs(c.byMethod.reduce((sum, item) => sum + item.amount, 0) - c.grossCollections) > 0.005;
  return (
    <Panel className={className} title={t("Revenue analytics")} subtitle={t("Billed revenue against gross collections, by month")}
      action={<div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm border border-chart-2" />{t("Billed revenue")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-chart-3" />{t("Gross collections")}</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-chart-1" /><bdi>{monthShort(period, lang)}</bdi></span>
      </div>}>
      {series.some((item) => item.billed !== 0 || item.gross !== 0) ? (
        <div className="h-72 w-full" dir="ltr">
          <ResponsiveContainer>
            <BarChart data={series} barGap={3} barCategoryGap="30%" margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" {...chartAxis} reversed={rtl} interval="preserveStartEnd" minTickGap={8} />
              <YAxis {...chartAxis} orientation={rtl ? "right" : "left"} width={rtl ? 68 : 52} tickFormatter={(value: number) => kAxis(value, lang)} />
              <Tooltip {...tooltipStyle} formatter={(value: number) => formatMoney(value, lang)} cursor={{ fill: "var(--muted)", opacity: 0.7 }} />
              <Bar dataKey="billed" name={t("Billed revenue")} fill="transparent" stroke="var(--chart-2)" strokeWidth={1} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="gross" name={t("Gross collections")} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {series.map((item) => <Cell key={item.m} fill={item.m === period ? "var(--chart-1)" : "var(--chart-3)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : <EmptyState title={t("No financial activity in this period")} compact />}
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-4 lg:grid-cols-4">
        <MiniStat label={t("Gross collections")} value={<Money value={c.grossCollections} />} hint={t("Completed payments only")} />
        <MiniStat label={t("Net collections")} value={<Money value={c.netCollections} />} hint={<>{t("After refunds of")} <Money value={c.refunds} /></>} />
        <MiniStat label={t("Teacher payables")} value={<Money value={f.payables} />} hint={t("Accrued · settlement not tracked")} />
        <MiniStat label={t("Not counted")} value={<Money value={c.pending + c.reversed} />} hint={t("Pending {p} · reversed {r}", { p: formatMoney(c.pending, lang), r: formatMoney(c.reversed, lang) })} />
      </dl>
      <div role={mismatch ? "alert" : undefined} className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {mismatch && <span className="flex items-center gap-1 font-medium text-destructive"><CircleAlert className="size-3.5" />{t("Collections do not reconcile")}</span>}
        <span>{!mismatch && <><span className="inline-flex items-center gap-1 text-positive"><CheckCircle2 className="size-3.5" />{t("Reconciled")}</span> · </>}{t("Gross")} <Money value={c.grossCollections} /> − {t("Refunds")} <Money value={c.refunds} /> = {t("Net")} <Money value={c.netCollections} /></span>
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
      detail: <><span className="text-foreground/80">{t(title)}</span>{e.method ? ` · ${t(e.method)}` : ""}{e.reversesId ? ` · ${t("of {id}", { id: e.reversesId })}` : ""}</>,
      amount: <span className={cn("font-medium num", e.type === "Payment" && st === "Completed" ? "text-positive" : st === "Reversed" || st === "Pending" ? "text-muted-foreground" : "text-foreground", st === "Reversed" && "line-through")}><bdi>{e.type === "Payment" ? "+" : "−"}<Money value={e.amount} /></bdi></span> });
  }
  for (const s of Object.values(sessions)) {
    if (!s.finalized || s.date < filter.from || s.date > filter.to || !inBranch(branchOf(s.classId))) continue;
    const cls = classes.find((x) => x.id === s.classId);
    const marked = Object.values(s.marks).filter(Boolean).length;
    items.push({ key: s.sessionId, at: s.finalized.at, icon: CalendarCheck, tone: "teal", title: <bdi>{cls?.name ?? s.classId}</bdi>, detail: <><span className="text-foreground/80">{t("Attendance finalized")}</span> · {t("{n} students marked", { n: fmtNum(marked, lang) })}</> });
  }
  items.sort((x, y) => y.at.localeCompare(x.at));
  const view = items.slice(0, 7);
  return (
    <Panel title={t("Recent activity")} subtitle={t("Payments, corrections and finalized sessions")} bodyClass="px-0 pb-2"
      action={<Link to="/finance" className="text-xs font-medium text-brand hover:underline">{t("View all")}</Link>}>
      {view.length ? (
        <ol className="relative">
          {view.map((item, i) => (
            <li key={item.key} className="relative flex gap-3 px-5 py-2.5">
              {i < view.length - 1 && <span aria-hidden className="absolute start-9 top-12 bottom-0 w-px bg-border" />}
              <IconTile icon={item.icon} tone={item.tone} className="relative size-8 rounded-full [&_svg]:size-3.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  {item.to ? <Link to="/students/$id" params={{ id: item.to }} className="min-w-0 truncate text-ui font-medium hover:text-brand">{item.title}</Link> : <span className="min-w-0 truncate text-ui font-medium">{item.title}</span>}
                  {item.amount && <span className="shrink-0 text-ui">{item.amount}</span>}
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">{item.to && <LedgerCode code={item.to} />}<span className="min-w-0 truncate">{item.detail} · {timeOfDay(item.at, lang)}</span></div>
              </div>
            </li>
          ))}
        </ol>
      ) : <EmptyState title={t("No activity in this period")} compact />}
    </Panel>
  );
}

/** Today's register: the week strip, the picked day's classes in time order and, today, a line at the current time. */
function RegisterPanel({ today: day0, nowMinutes, summary }: { today: string; nowMinutes: number; summary: [string, ReactNode, ReactNode][] }) {
  const { t, lang, classes, teachers, sessions, inBranch } = useScope();
  const [picked, setPicked] = useState(day0);
  const start = weekStart(day0);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const list = classes.filter((x) => inBranch(x.branch) && classWeekdays(x.days).includes(weekdayOf(picked))).sort((x, y) => classStartMinutes(x.time) - classStartMinutes(y.time));
  const dayFmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { weekday: lang === "ar" ? "narrow" : "short", timeZone: "UTC" });
  const nowAt = picked === day0 ? list.findIndex((x) => classStartMinutes(x.time) > nowMinutes) : -2;
  const nowHour = Math.floor(nowMinutes / 60);
  const nowLabel = localTime(`${nowHour % 12 || 12}:${String(nowMinutes % 60).padStart(2, "0")} ${nowHour < 12 ? "AM" : "PM"}`, lang);
  const nowLine = (
    <li key="now" aria-label={t("Now")} className="flex items-center gap-2 px-5 py-1">
      <span className="w-14 shrink-0 font-mono text-meta text-brand"><bdi>{nowLabel}</bdi></span>
      <span className="size-1.5 shrink-0 rounded-full bg-brand" /><span className="h-px flex-1 bg-brand" />
    </li>
  );
  return (
    <Panel title={t("Today's register")} subtitle={longDate(new Date(`${picked}T12:00:00Z`), lang)} bodyClass="px-0 pb-2"
      action={<Link to="/attendance" className="text-xs font-medium text-brand hover:underline">{t("Attendance")}</Link>}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 pb-4">
        {summary.map(([label, value, hint]) => (
          <div key={label} className="min-w-0">
            <dt className="truncate text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 text-section-title font-medium num">{value}</dd>
            <dd className="truncate text-meta text-muted-foreground">{hint}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-7 gap-1 border-t px-4 py-3">
        {days.map((d) => {
          const sel = d === picked, isToday = d === day0;
          const count = classes.filter((x) => inBranch(x.branch) && classWeekdays(x.days).includes(weekdayOf(d))).length;
          return (
            <button key={d} type="button" onClick={() => setPicked(d)} aria-pressed={sel} aria-label={`${longDate(new Date(`${d}T12:00:00Z`), lang)} · ${t("{n} classes", { n: fmtNum(count, lang) })}`}
              className={cn("flex flex-col items-center rounded-lg border py-1.5 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring", sel ? "border-transparent bg-primary text-primary-foreground" : "border-transparent hover:bg-muted", !sel && isToday && "border-border")}>
              <span className={cn("text-meta", sel ? "text-primary-foreground/75" : "text-muted-foreground")}>{dayFmt.format(new Date(`${d}T12:00:00Z`))}</span>
              <span className="mt-0.5 text-sm font-medium num">{Number(d.slice(8))}</span>
              <span className={cn("mt-1 size-1 rounded-full", count ? (sel ? "bg-primary-foreground/70" : "bg-muted-foreground/60") : "bg-transparent")} />
            </button>
          );
        })}
      </div>
      <ul className="max-h-80 overflow-y-auto border-t py-1">
        {list.map((x, i) => {
          const future = picked > day0 || (picked === day0 && classStartMinutes(x.time) > nowMinutes);
          const status = attendanceLabel(sessions[sessionIdFor(x.id, picked)]);
          const tone: Tone = picked > day0 ? "neutral" : status === "Finalized" ? "positive" : status === "In progress" ? "info" : future ? "neutral" : "warning";
          const label = picked > day0 ? "Upcoming" : status === "Attendance not recorded" ? (future ? "Later today" : "Not recorded") : status;
          const row = (
            <div className="flex items-center gap-3 px-5 py-2.5">
              <div className="w-14 shrink-0 font-mono text-xs text-muted-foreground"><bdi>{localTime(x.time, lang)}</bdi></div>
              <div className="min-w-0 flex-1"><bdi className="block truncate text-ui font-medium">{x.name}</bdi><div className="truncate text-xs text-muted-foreground"><bdi>{teachers.find((tt) => tt.id === x.teacherId)?.name ?? x.teacherId}</bdi> · {t(x.branch)}</div></div>
              <Pill tone={tone} dot>{t(label)}</Pill>
            </div>
          );
          return [
            i === nowAt ? nowLine : null,
            <li key={x.id}>{picked <= day0 ? <Link to="/attendance" search={{ classId: x.id, date: picked }} className="block transition-colors hover:bg-muted/60">{row}</Link> : row}</li>,
          ];
        })}
        {nowAt === -1 && list.length > 0 && nowLine}
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
    <Panel title={t("Needs attention")} subtitle={t("Derived from the ledger and attendance")} bodyClass="px-0 pb-2"
      action={a.count ? <span className="font-mono text-xs text-muted-foreground">{fmtNum(a.count, lang)}</span> : undefined}>
      {nothing ? <EmptyState title={t("Nothing requires attention")} icon={CheckCircle2} compact /> : (
        <ul className="divide-y border-t">
          {a.unfinalized.slice(0, 3).map((x) => (
            <li key={x.id}><Link to="/attendance" search={{ classId: x.id, date: day0 }} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
              <IconTile icon={CalendarCheck} tone="warning" className="size-8 [&_svg]:size-4" />
              <div className="min-w-0 flex-1"><bdi className="block truncate text-ui font-medium">{x.name}</bdi><div className="text-xs text-muted-foreground">{t("Started at {time} · attendance not finalized", { time: localTime(x.time, lang) })}</div></div>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            </Link></li>
          ))}
          {a.pending.count > 0 && (
            <li><Link to="/finance" className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
              <IconTile icon={Hourglass} tone="warning" className="size-8 [&_svg]:size-4" />
              <div className="min-w-0 flex-1"><div className="truncate text-ui font-medium">{t("{n} payments awaiting confirmation", { n: fmtNum(a.pending.count, lang) })}</div><div className="text-xs text-muted-foreground">{t("Not counted as collected")} · <Money value={a.pending.amount} /></div></div>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            </Link></li>
          )}
          {a.lowPackages.slice(0, 3).map((pk) => (
            <li key={`${pk.studentId}-${pk.classId}`}><Link to="/students/$id" params={{ id: pk.studentId }} search={{ tab: "enroll" }} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/50">
              <IconTile icon={PackageOpen} tone="neutral" className="size-8 [&_svg]:size-4" />
              <div className="min-w-0 flex-1"><bdi className="block truncate text-ui font-medium">{studentMap.get(pk.studentId)?.name ?? pk.studentId}</bdi><div className="truncate text-xs text-muted-foreground">{t(pk.remaining === 0 ? "Package used up" : "{n} package session left", { n: fmtNum(pk.remaining, lang) })} · <bdi>{classes.find((x) => x.id === pk.classId)?.name}</bdi></div></div>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            </Link></li>
          ))}
          {owing.map(([id, value]) => {
            const s = studentMap.get(id);
            return (
              <li key={id} className="flex items-center gap-3 px-5 py-2.5">
                <Avatar name={s?.name ?? id} seed={id} size="sm" />
                <Link to="/students/$id" params={{ id }} className="min-w-0 flex-1 hover:text-brand"><bdi className="block truncate text-ui font-medium">{s?.name ?? id}</bdi><span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground"><LedgerCode code={id} />{t("Outstanding balance")}</span></Link>
                <span className="shrink-0 text-ui font-medium text-destructive"><Money value={value} /></span>
                {s?.guardianPhone && <Button asChild variant="ghost" size="icon" className="size-8 text-positive" title={t("WhatsApp reminder")}><a href={`https://wa.me/2${s.guardianPhone}`} target="_blank" rel="noreferrer" aria-label={`${t("WhatsApp reminder")} · ${s.name}`}><MessageCircle className="size-4" /></a></Button>}
              </li>
            );
          })}
          {a.owing.length > owing.length && <li className="px-5 py-2.5 text-xs text-muted-foreground"><Link to="/students" className="font-medium text-brand hover:underline">{t("{n} more students with a balance", { n: fmtNum(a.owing.length - owing.length, lang) })}</Link></li>}
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
    <Panel className={className} title={t("Trends")}
      subtitle={view === "attendance" ? t("Weekly attendance rate from recorded sessions") : t("New registrations and total students, by join month")}
      action={<Tabs value={view} onValueChange={(v) => setView(v as typeof view)} dir={rtl ? "rtl" : "ltr"}><TabsList className="h-8"><TabsTrigger value="attendance" className="px-2.5 text-xs">{t("Attendance")}</TabsTrigger><TabsTrigger value="enrollment" className="px-2.5 text-xs">{t("Enrollment")}</TabsTrigger></TabsList></Tabs>}>
      {view === "attendance" ? (
        weekly.length ? (
          <div className="h-52 w-full" dir="ltr">
            <ResponsiveContainer>
              <AreaChart data={weekly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...chartAxis} reversed={rtl} interval="preserveStartEnd" minTickGap={16} />
                <YAxis {...chartAxis} orientation={rtl ? "right" : "left"} width={40} domain={[(min: number) => Math.max(0, Math.floor(min - 5)), 100]} tickFormatter={(v: number) => formatPercent(v, lang)} />
                <Tooltip {...tooltipStyle} formatter={(v: number, _n, item) => [`${formatPercent(v, lang)} · ${t("{m} marks", { m: fmtNum((item.payload as { marked: number }).marked, lang) })}`, t("Attendance rate")]} labelFormatter={(l: string) => t("Week of {date}", { date: l })} />
                <Area dataKey="rate" type="monotone" stroke="var(--chart-4)" strokeWidth={1.5} fill="var(--muted)" fillOpacity={0.6} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyState title={t("No attendance recorded yet")} compact />
      ) : enroll.length ? (
        <div className="h-52 w-full" dir="ltr">
          <ResponsiveContainer>
            <ComposedChart data={enroll} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" {...chartAxis} reversed={rtl} />
              <YAxis yAxisId="new" {...chartAxis} orientation={rtl ? "right" : "left"} width={32} allowDecimals={false} />
              <YAxis yAxisId="total" {...chartAxis} orientation={rtl ? "left" : "right"} width={36} allowDecimals={false} />
              <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [formatNumber(v), name]} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
              <Bar yAxisId="new" dataKey="joined" name={t("New registrations")} fill="var(--chart-3)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              <Line yAxisId="total" dataKey="total" name={t("Total students")} type="monotone" stroke="var(--chart-4)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
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
