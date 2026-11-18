import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, Legend } from "recharts";
import { Plus, UserPlus, CalendarCheck, Send, Clock } from "lucide-react";
import { KpiCard, PageHeader, Panel, Pill, Money, chartAxis, tooltipStyle } from "@/components/app/ui";
import { PeriodBranchFilter } from "@/components/app/filters";
import { Button } from "@/components/ui/button";
import { attendanceHistory, students, classes, teacherById, studentById, classById } from "@/lib/data";
import { balancesAsOf, billedByClass, displayStatus, reversedIds } from "@/lib/ledger";
import { useLedger, monthLabel } from "@/lib/ledger-store";
import { useFinance } from "@/lib/use-finance";
import { pctChange } from "@/lib/finance";
import { egp, shortDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { RecordPaymentDialog } from "@/components/app/record-payment";

export const Route = createFileRoute("/_console/overview")({
  head: () => ({
    meta: [
      { title: "Overview — CenterOS" },
      { name: "description", content: "Financial and operational health of your center at a glance." },
      { property: "og:title", content: "Overview — CenterOS" },
      { property: "og:description", content: "Billed revenue, collections, outstanding balances and attendance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { t, lang } = useI18n();
  const { entries, filter, period, branch } = useLedger();
  const f = useFinance();
  const c = f.current, p = f.previous;
  const rev = useMemo(() => reversedIds(entries), [entries]);
  const overdue = useMemo(() => {
    const b = balancesAsOf(entries, filter.to, filter.branch);
    return [...b.entries()].filter(([, v]) => v > 0).sort((a, z) => z[1] - a[1]).slice(0, 5).map(([id, v]) => ({ s: studentById(id)!, v }));
  }, [entries, filter]);
  const recent = useMemo(() => entries
    .filter((e) => e.type !== "Charge" && e.date >= filter.from && e.date <= filter.to && (filter.branch === "all" || e.branch === filter.branch))
    .sort((a, z) => z.enteredAt.localeCompare(a.enteredAt)).slice(0, 6), [entries, filter]);
  const byClass = useMemo(() => {
    const m = billedByClass(entries, filter);
    return classes.map((cl) => ({ cl, billed: m.get(cl.id) ?? 0 })).filter((x) => x.billed > 0).sort((a, z) => z.billed - a.billed);
  }, [entries, filter]);
  const branchClasses = classes.filter((cl) => branch === "all" || cl.branch === branch);
  const spark = (k: "billed" | "gross" | "outstanding" | "students" | "payables") => f.series.map((x) => x[k]);
  const attNow = attendanceHistory.find((a) => a.m === period) ?? attendanceHistory[attendanceHistory.length - 1]!;
  const attPrev = attendanceHistory[attendanceHistory.indexOf(attNow) - 1] ?? attNow;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`${t("Good evening")}, Yehia`}
        subtitle={`${monthLabel(period, lang)} · ${branch === "all" ? t("All branches") : branch}`}
        actions={<><PeriodBranchFilter /><RecordPaymentDialog trigger={<Button><Plus className="size-4" />{t("Record payment")}</Button>} /></>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Billed revenue" value={egp(c.billed, lang)} delta={pctChange(c.billed, p.billed)} spark={spark("billed")} hint={`Net of discounts ${egp(c.netBilled, lang)}`} />
        <KpiCard label="Gross collections" value={egp(c.grossCollections, lang)} delta={pctChange(c.grossCollections, p.grossCollections)} spark={spark("gross")} hint={`Net after refunds ${egp(c.netCollections, lang)}`} />
        <KpiCard label="Outstanding receivables" value={egp(c.outstanding, lang)} delta={pctChange(c.outstanding, p.outstanding)} invert spark={spark("outstanding")} hint={`${c.studentsOwing} students owe`} />
        <KpiCard label="Active Students" value={String(f.students)} delta={pctChange(f.students, f.studentsPrev)} spark={spark("students")} hint="Billed this period" />
        <KpiCard label="Attendance Rate" value={`${attNow.attendance}%`} delta={Math.round((attNow.attendance - attPrev.attendance) * 10) / 10} spark={attendanceHistory.map((a) => a.attendance)} hint="All branches" />
        <KpiCard label="Teacher Payables" value={egp(f.payables, lang)} delta={pctChange(f.payables, f.payablesPrev)} invert spark={spark("payables")} hint="Accrued this period" />
      </div>

      <div className="surface mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Collections reconcile:</span>
        <span>Gross <b className="font-semibold"><Money value={c.grossCollections} /></b></span>
        <span className="text-muted-foreground">− Refunds <Money value={c.refunds} /></span>
        <span>= Net <b className="font-semibold text-positive"><Money value={c.netCollections} /></b></span>
        <span className="text-muted-foreground">Not counted: {c.pendingCount} pending (<Money value={c.pending} />), {c.reversedCount} reversed (<Money value={c.reversed} />)</span>
        <Link to="/finance" className="ms-auto text-xs font-medium text-brand">See breakdown & definitions</Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Billed revenue vs gross collections" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={f.series} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...chartAxis} />
                <YAxis {...chartAxis} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => egp(v)} cursor={{ fill: "var(--muted)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="billed" name="Billed revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gross" name="Gross collections" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">The current month runs to today.</p>
        </Panel>
        <Panel title={t("Quick actions")}>
          <div className="grid gap-2">
            <RecordPaymentDialog trigger={<QA icon={Plus} label={t("Record payment")} />} />
            <Link to="/students"><QA icon={UserPlus} label={t("Add student")} /></Link>
            <Link to="/attendance"><QA icon={CalendarCheck} label={t("Mark attendance")} /></Link>
            <Link to="/communications"><QA icon={Send} label={t("Send reminders")} /></Link>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Active students (billed)">
          <div className="h-44"><ResponsiveContainer><AreaChart data={f.series}>
            <defs><linearGradient id="enr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-3)" stopOpacity={0.2} /><stop offset="1" stopColor="var(--chart-3)" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="label" {...chartAxis} /><YAxis {...chartAxis} width={30} /><Tooltip {...tooltipStyle} />
            <Area dataKey="students" name="Students" stroke="var(--chart-3)" strokeWidth={2} fill="url(#enr)" />
          </AreaChart></ResponsiveContainer></div>
        </Panel>
        <Panel title={`${t("Attendance trend")} · all branches`}>
          <div className="h-44"><ResponsiveContainer><LineChart data={attendanceHistory.map((a) => ({ ...a, label: new Date(`${a.m}-15T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) }))}>
            <XAxis dataKey="label" {...chartAxis} /><YAxis {...chartAxis} width={30} domain={[85, 95]} /><Tooltip {...tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Line dataKey="attendance" name="Attendance" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Billed revenue by class">
          <div className="space-y-2.5">
            {byClass.slice(0, 5).map(({ cl, billed }) => (
              <div key={cl.id}>
                <div className="flex justify-between gap-2 text-[13px]"><span className="truncate">{cl.name}</span><Money value={billed} /></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${(billed / byClass[0]!.billed) * 100}%` }} /></div>
              </div>
            ))}
            {byClass.length === 0 && <p className="text-sm text-muted-foreground">No charges in this period.</p>}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title={t("Recent transactions")} className="lg:col-span-3" bodyClass="p-0" action={<Link to="/finance" className="text-xs font-medium text-brand">View all</Link>}>
          <ul className="divide-y">
            {recent.map((x) => {
              const st = displayStatus(x, rev);
              const inflow = x.type === "Payment";
              return (
                <li key={x.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0 flex-1"><div className="truncate font-medium">{studentById(x.studentId)?.name}</div><div className="truncate text-xs text-muted-foreground">{x.id} · {x.type === "Reversal" ? `reverses ${x.reversesId}` : x.method ?? x.reason} · {shortDate(x.date)}</div></div>
                  <Pill tone={x.type === "Payment" ? "positive" : x.type === "Discount" ? "brand" : "negative"}>{x.type}</Pill>
                  {st !== "Completed" && <Pill tone={st === "Pending" ? "warning" : "neutral"}>{st}</Pill>}
                  <span className={inflow && st === "Completed" ? "w-24 text-end font-medium text-positive" : "w-24 text-end font-medium text-muted-foreground"}>{inflow ? "+" : "−"}<Money value={x.amount} /></span>
                </li>
              );
            })}
            {recent.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">No transactions in this period.</li>}
          </ul>
        </Panel>
        <Panel title="Highest balances owed" className="lg:col-span-2" bodyClass="p-0" action={<Link to="/communications" className="text-xs font-medium text-brand">Remind</Link>}>
          <ul className="divide-y">
            {overdue.map(({ s, v }) => (
              <li key={s.id}>
                <Link to="/students/$id" params={{ id: s.id }} className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-muted/50">
                  <div><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.grade} · {s.branch}</div></div>
                  <span className="font-medium text-destructive"><Money value={v} /></span>
                </Link>
              </li>
            ))}
            {overdue.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">Nobody owes anything.</li>}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title={t("Upcoming classes")} bodyClass="p-0">
          <ul className="divide-y">
            {branchClasses.slice(0, 5).map((cl) => (
              <li key={cl.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <div className="flex w-20 items-center gap-1.5 text-muted-foreground num"><Clock className="size-3.5" />{cl.time}</div>
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{cl.name}</div><div className="text-xs text-muted-foreground">{teacherById(cl.teacherId).name} · {cl.branch}</div></div>
                <span className="text-xs text-muted-foreground num">{cl.enrolled}/{cl.capacity}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("Top classes")} bodyClass="p-0">
          <ul className="divide-y">
            {[...byClass].sort((a, z) => classById(z.cl.id).attendance - classById(a.cl.id).attendance).slice(0, 5).map(({ cl, billed }, i) => (
              <li key={cl.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="w-4 text-muted-foreground num">{i + 1}</span>
                <div className="min-w-0 flex-1 truncate font-medium">{cl.name}</div>
                <Pill tone="positive">{cl.attendance}% attend.</Pill>
                <span className="w-24 text-end num"><Money value={billed} /></span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">{students.length} sample students · demo data only, nothing is saved.</p>
    </div>
  );
}

function QA({ icon: Icon, label }: { icon: typeof Plus; label: string }) {
  return (
    <div className="flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:border-brand/40 hover:bg-accent">
      <div className="grid size-8 place-items-center rounded-md bg-accent text-brand"><Icon className="size-4" /></div>{label}
    </div>
  );
}
