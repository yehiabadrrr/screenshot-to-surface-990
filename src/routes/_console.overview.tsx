import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { Plus, UserPlus, CalendarCheck, Send, Clock } from "lucide-react";
import { KpiCard, PageHeader, Panel, Pill, Money, chartAxis, tooltipStyle } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { kpis, monthly, transactions, students, classes, teacherById, studentById } from "@/lib/data";
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
      { property: "og:description", content: "Revenue, collections, outstanding balances and attendance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { t, lang } = useI18n();
  const overdue = students.filter((s) => s.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5);
  const top = [...classes].sort((a, b) => b.revenue - a.revenue);
  const series = (k: keyof (typeof monthly)[number]) => monthly.map((m) => m[k] as number);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title={`${t("Good evening")}, Yehia`}
        subtitle={lang === "ar" ? "ملخص نوفمبر ٢٠٢٦ — كل الفروع" : "November 2026 summary · All branches"}
        actions={<RecordPaymentDialog trigger={<Button><Plus className="size-4" />{t("Record payment")}</Button>} />}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total Revenue" value={egp(kpis.revenue, lang)} delta={pctChange(kpis.revenue, kpis.revenuePrev)} spark={series("revenue")} />
        <KpiCard label="Collected Payments" value={egp(kpis.collected, lang)} delta={pctChange(kpis.collected, kpis.collectedPrev)} spark={series("collected")} />
        <KpiCard label="Outstanding Balances" value={egp(kpis.outstanding, lang)} delta={pctChange(kpis.outstanding, kpis.outstandingPrev)} invert spark={[31, 33, 35, 36, 37.5, 42]} />
        <KpiCard label="Active Students" value={String(kpis.active)} delta={pctChange(kpis.active, kpis.activePrev)} spark={series("students")} />
        <KpiCard label="Attendance Rate" value={`${kpis.attendance}%`} delta={Math.round((kpis.attendance - kpis.attendancePrev) * 10) / 10} spark={series("attendance")} />
        <KpiCard label="Teacher Payables" value={egp(kpis.payables, lang)} delta={pctChange(kpis.payables, kpis.payablesPrev)} invert spark={[98, 104, 109, 112, 118, kpis.payables / 1000]} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title={t("Revenue vs collections")} className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={monthly} barGap={4}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="m" {...chartAxis} />
                <YAxis {...chartAxis} tickFormatter={(v) => `${v / 1000}k`} width={40} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => egp(v)} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="revenue" name="Revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
        <Panel title={t("Enrollment trend")}>
          <div className="h-44"><ResponsiveContainer><AreaChart data={monthly}>
            <defs><linearGradient id="enr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-3)" stopOpacity={0.2} /><stop offset="1" stopColor="var(--chart-3)" stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="m" {...chartAxis} /><YAxis {...chartAxis} width={30} domain={[220, 300]} /><Tooltip {...tooltipStyle} />
            <Area dataKey="students" name="Students" stroke="var(--chart-3)" strokeWidth={2} fill="url(#enr)" />
          </AreaChart></ResponsiveContainer></div>
        </Panel>
        <Panel title={t("Attendance trend")}>
          <div className="h-44"><ResponsiveContainer><LineChart data={monthly}>
            <XAxis dataKey="m" {...chartAxis} /><YAxis {...chartAxis} width={30} domain={[85, 95]} /><Tooltip {...tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Line dataKey="attendance" name="Attendance" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart></ResponsiveContainer></div>
        </Panel>
        <Panel title={t("Revenue by class")}>
          <div className="space-y-2.5">
            {top.slice(0, 5).map((c) => (
              <div key={c.id}>
                <div className="flex justify-between text-[13px]"><span className="truncate">{c.name}</span><Money value={c.revenue} /></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${(c.revenue / top[0]!.revenue) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title={t("Recent transactions")} className="lg:col-span-3" bodyClass="p-0" action={<Link to="/finance" className="text-xs font-medium text-brand">View all</Link>}>
          <ul className="divide-y">
            {transactions.slice(0, 6).map((x) => (
              <li key={x.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{studentById(x.studentId)?.name}</div><div className="text-xs text-muted-foreground">{x.id} · {x.method} · {shortDate(x.date)}</div></div>
                <Pill tone={x.type === "Payment" ? "positive" : x.type === "Refund" ? "negative" : "brand"}>{x.type}</Pill>
                <span className={x.type === "Payment" ? "w-24 text-end font-medium text-positive" : "w-24 text-end font-medium text-muted-foreground"}>{x.type === "Payment" ? "+" : "−"}<Money value={x.amount} /></span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("Overdue payments")} className="lg:col-span-2" bodyClass="p-0" action={<Link to="/communications" className="text-xs font-medium text-brand">Remind</Link>}>
          <ul className="divide-y">
            {overdue.map((s) => (
              <li key={s.id}>
                <Link to="/students/$id" params={{ id: s.id }} className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-muted/50">
                  <div><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.grade} · {s.branch}</div></div>
                  <span className="font-medium text-destructive"><Money value={s.balance} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title={t("Upcoming classes")} bodyClass="p-0">
          <ul className="divide-y">
            {classes.slice(0, 5).map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <div className="flex w-20 items-center gap-1.5 text-muted-foreground num"><Clock className="size-3.5" />{c.time}</div>
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{teacherById(c.teacherId).name} · {c.branch}</div></div>
                <span className="text-xs text-muted-foreground num">{c.enrolled}/{c.capacity}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={t("Top classes")} bodyClass="p-0">
          <ul className="divide-y">
            {[...classes].sort((a, b) => b.attendance - a.attendance).slice(0, 5).map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="w-4 text-muted-foreground num">{i + 1}</span>
                <div className="min-w-0 flex-1 truncate font-medium">{c.name}</div>
                <Pill tone="positive">{c.attendance}% attend.</Pill>
                <span className="w-24 text-end num"><Money value={c.revenue} /></span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
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
