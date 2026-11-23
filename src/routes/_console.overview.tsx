import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart, Legend } from "recharts";
import { Plus, UserPlus, CalendarCheck, Send, Clock } from "lucide-react";
import { KpiCard, PageHeader, Panel, Pill, Money, chartAxis, tooltipStyle } from "@/components/app/ui";
import { PeriodBranchFilter } from "@/components/app/filters";
import { Button } from "@/components/ui/button";
import { attendanceHistory, students, classes, teacherById, studentById, classById, staff } from "@/lib/data";
import { balancesAsOf, billedByClass, displayStatus, reversedIds } from "@/lib/ledger";
import { useLedger, monthLabel } from "@/lib/ledger-store";
import { useFinance } from "@/lib/use-finance";
import { pctChange } from "@/lib/finance";
import { egp } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { fmtNum, kAxis, localTime, monthShort, noteText, pct, shortDateL } from "@/lib/l10n";
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
  const rtl = lang === "ar";
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
  const series = f.series.map((x) => ({ ...x, label: monthShort(x.m, lang) }));
  const attSeries = attendanceHistory.map((a) => ({ ...a, label: monthShort(a.m, lang) }));
  const attNow = attendanceHistory.find((a) => a.m === period) ?? attendanceHistory[attendanceHistory.length - 1]!;
  const attPrev = attendanceHistory[attendanceHistory.indexOf(attNow) - 1] ?? attNow;
  const yAxis = { ...chartAxis, orientation: rtl ? ("right" as const) : ("left" as const) };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`${t("Good evening")}${lang === "ar" ? "، " : ", "}${staff.owner.split(" ")[0]}`}
        subtitle={`${monthLabel(period, lang)} · ${branch === "all" ? t("All branches") : t(branch)}`}
        actions={<><PeriodBranchFilter /><RecordPaymentDialog trigger={<Button><Plus className="size-4" />{t("Record payment")}</Button>} /></>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label={t("Billed revenue")} value={egp(c.billed, lang)} delta={pctChange(c.billed, p.billed)} spark={spark("billed")} hint={t("Net of discounts {amount}", { amount: egp(c.netBilled, lang) })} />
        <KpiCard label={t("Gross collections")} value={egp(c.grossCollections, lang)} delta={pctChange(c.grossCollections, p.grossCollections)} spark={spark("gross")} hint={t("Net after refunds {amount}", { amount: egp(c.netCollections, lang) })} />
        <KpiCard label={t("Outstanding receivables")} value={egp(c.outstanding, lang)} delta={pctChange(c.outstanding, p.outstanding)} invert spark={spark("outstanding")} hint={t("{n} students owe", { n: fmtNum(c.studentsOwing, lang) })} />
        <KpiCard label={t("Active Students")} value={fmtNum(f.students, lang)} delta={pctChange(f.students, f.studentsPrev)} spark={spark("students")} hint={t("Billed this period")} />
        <KpiCard label={t("Attendance Rate")} value={pct(attNow.attendance, lang)} delta={Math.round((attNow.attendance - attPrev.attendance) * 10) / 10} spark={attendanceHistory.map((a) => a.attendance)} hint={t("All branches")} />
        <KpiCard label={t("Teacher Payables")} value={egp(f.payables, lang)} delta={pctChange(f.payables, f.payablesPrev)} invert spark={spark("payables")} hint={t("Accrued this period")} />
      </div>

      <div className="surface mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
        <span className="text-muted-foreground">{t("Collections reconcile:")}</span>
        <span>{t("Gross")} <b className="font-semibold"><Money value={c.grossCollections} /></b></span>
        <span className="text-muted-foreground">− {t("Refunds")} <Money value={c.refunds} /></span>
        <span>= {t("Net")} <b className="font-semibold text-positive"><Money value={c.netCollections} /></b></span>
        <span className="text-muted-foreground">
          {t("Not counted:")} {t("{n} pending", { n: fmtNum(c.pendingCount, lang) })} (<Money value={c.pending} />){lang === "ar" ? "، " : ", "}{t("{n} reversed", { n: fmtNum(c.reversedCount, lang) })} (<Money value={c.reversed} />)
        </span>
        <Link to="/finance" className="ms-auto text-xs font-medium text-brand">{t("See breakdown & definitions")}</Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={t("Billed revenue vs gross collections")} className="lg:col-span-2">
          <div className="h-64" dir="ltr">
            <ResponsiveContainer>
              <BarChart data={series} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" {...chartAxis} reversed={rtl} />
                <YAxis {...yAxis} tickFormatter={(v: number) => kAxis(v, lang)} width={rtl ? 52 : 40} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => egp(v, lang)} cursor={{ fill: "var(--muted)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, direction: rtl ? "rtl" : "ltr" }} />
                <Bar dataKey="billed" name={t("Billed revenue")} fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gross" name={t("Gross collections")} fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("The current month runs to today.")}</p>
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
        <Panel title={t("Active students (billed)")}>
          <div className="h-44" dir="ltr"><ResponsiveContainer><AreaChart data={series}>
            <defs><linearGradient id="enr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-3)" stopOpacity={0.2} /><stop offset="1" stopColor="var(--chart-3)" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="label" {...chartAxis} reversed={rtl} /><YAxis {...yAxis} width={34} tickFormatter={(v: number) => fmtNum(v, lang)} /><Tooltip {...tooltipStyle} formatter={(v: number) => fmtNum(v, lang)} />
            <Area dataKey="students" name={t("Students")} stroke="var(--chart-3)" strokeWidth={2} fill="url(#enr)" />
          </AreaChart></ResponsiveContainer></div>
        </Panel>
        <Panel title={`${t("Attendance trend")} · ${t("all branches")}`}>
          <div className="h-44" dir="ltr"><ResponsiveContainer><LineChart data={attSeries}>
            <XAxis dataKey="label" {...chartAxis} reversed={rtl} /><YAxis {...yAxis} width={34} domain={[85, 95]} tickFormatter={(v: number) => fmtNum(v, lang)} /><Tooltip {...tooltipStyle} formatter={(v: number) => pct(v, lang)} />
            <Line dataKey="attendance" name={t("Attendance")} stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart></ResponsiveContainer></div>
        </Panel>
        <Panel title={t("Billed revenue by class")}>
          <div className="space-y-2.5">
            {byClass.slice(0, 5).map(({ cl, billed }) => (
              <div key={cl.id}>
                <div className="flex justify-between gap-2 text-[13px]"><span className="truncate">{cl.name}</span><Money value={billed} /></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${(billed / byClass[0]!.billed) * 100}%` }} /></div>
              </div>
            ))}
            {byClass.length === 0 && <p className="text-sm text-muted-foreground">{t("No charges in this period.")}</p>}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title={t("Recent transactions")} className="lg:col-span-3" bodyClass="p-0" action={<Link to="/finance" className="text-xs font-medium text-brand">{t("View all")}</Link>}>
          <ul className="divide-y">
            {recent.map((x) => {
              const st = displayStatus(x, rev);
              const inflow = x.type === "Payment";
              const detail = x.type === "Reversal" ? t("reverses {id}", { id: x.reversesId ?? "" }) : x.method ? t(x.method) : noteText(x.reason, t, lang);
              return (
                <li key={x.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                  <div className="min-w-0 flex-1"><div className="truncate font-medium">{studentById(x.studentId)?.name}</div><div className="truncate text-xs text-muted-foreground"><bdi>{x.id}</bdi> · {detail} · {shortDateL(x.date, lang)}</div></div>
                  <Pill tone={x.type === "Payment" ? "positive" : x.type === "Discount" ? "brand" : "negative"}>{t(x.type)}</Pill>
                  {st !== "Completed" && <Pill tone={st === "Pending" ? "warning" : "neutral"}>{t(st)}</Pill>}
                  <span className={inflow && st === "Completed" ? "w-24 shrink-0 text-end font-medium text-positive" : "w-24 shrink-0 text-end font-medium text-muted-foreground"}>{inflow ? "+" : "−"}<Money value={x.amount} /></span>
                </li>
              );
            })}
            {recent.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">{t("No transactions in this period.")}</li>}
          </ul>
        </Panel>
        <Panel title={t("Highest balances owed")} className="lg:col-span-2" bodyClass="p-0" action={<Link to="/communications" className="text-xs font-medium text-brand">{t("Remind")}</Link>}>
          <ul className="divide-y">
            {overdue.map(({ s, v }) => (
              <li key={s.id}>
                <Link to="/students/$id" params={{ id: s.id }} className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-muted/50">
                  <div><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{t(s.grade)} · {t(s.branch)}</div></div>
                  <span className="font-medium text-destructive"><Money value={v} /></span>
                </Link>
              </li>
            ))}
            {overdue.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">{t("Nobody owes anything.")}</li>}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title={t("Upcoming classes")} bodyClass="p-0">
          <ul className="divide-y">
            {branchClasses.slice(0, 5).map((cl) => (
              <li key={cl.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <div className="flex w-20 shrink-0 items-center gap-1.5 text-muted-foreground num"><Clock className="size-3.5" />{localTime(cl.time, lang)}</div>
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{cl.name}</div><div className="text-xs text-muted-foreground">{teacherById(cl.teacherId).name} · {t(cl.branch)}</div></div>
                <span className="text-xs text-muted-foreground num">{fmtNum(cl.enrolled, lang)}/{fmtNum(cl.capacity, lang)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("Top classes")} bodyClass="p-0">
          <ul className="divide-y">
            {[...byClass].sort((a, z) => classById(z.cl.id).attendance - classById(a.cl.id).attendance).slice(0, 5).map(({ cl, billed }, i) => (
              <li key={cl.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="w-4 text-muted-foreground num">{fmtNum(i + 1, lang)}</span>
                <div className="min-w-0 flex-1 truncate font-medium">{cl.name}</div>
                <Pill tone="positive">{t("{n} attendance", { n: pct(cl.attendance, lang) })}</Pill>
                <span className="w-24 shrink-0 text-end num"><Money value={billed} /></span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">{t("{n} sample students · demo data only, nothing is saved.", { n: fmtNum(students.length, lang) })}</p>
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
