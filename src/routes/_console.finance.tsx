import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Plus, Download, MoreHorizontal, Receipt, Wallet, Coins, CircleAlert, BadgePercent, Undo2, Hourglass, RotateCcw, PiggyBank, GraduationCap,
  CheckCircle2, Minus, Equal, PackageCheck, ChevronLeft, ChevronRight, Lock, BookOpenText, ArrowLeftRight, Filter as FilterIcon,
} from "lucide-react";
import { PageHeader, Panel, Pill, Money, EmptyState, StatCard, MiniStat, LedgerCode, type Tone } from "@/components/app/ui";
import { PeriodBranchFilter, usePartialPeriod } from "@/components/app/filters";
import { FinanceDefinitions } from "@/components/app/definitions";
import { CorrectEntryDialog } from "@/components/app/correct-entry";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RecordPaymentDialog } from "@/components/app/record-payment";
import { METHODS, displayStatus, reversedIds, type LedgerEntry, type Method } from "@/lib/ledger";
import { useLedger, monthLabel } from "@/lib/ledger-store";
import { useFinance } from "@/lib/use-finance";
import { egp, formatPercent } from "@/lib/format";
import { fmtNum, noteText, shortDateL } from "@/lib/l10n";
import { useI18n } from "@/lib/i18n";
import { pageHead, downloadCsv } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/finance")({
  head: pageHead("Payments & Finance", "Billed revenue, gross and net collections, receivables, refunds, discounts and teacher payables."),
  component: FinancePage,
});

const PAGE = 20;
const TYPES = ["all", "Payment", "Refund", "Discount", "Reversal"] as const;
const methodColor: Record<Method, string> = { Cash: "bg-chart-2", InstaPay: "bg-chart-1", Fawry: "bg-chart-4", "Bank transfer": "bg-chart-3", Other: "bg-muted-foreground" };
const typeMeta: Record<string, [typeof Wallet, Tone]> = { Payment: [Wallet, "positive"], Refund: [Undo2, "coral"], Discount: [BadgePercent, "lavender"], Reversal: [RotateCcw, "neutral"], PackageUse: [PackageCheck, "teal"] };
/** Display label only: PackageUse entries carry no money, so they read as a session used. */
const typeLabel = (type: string) => (type === "PackageUse" ? "Package session used" : type);

function FinancePage() {
  const { t, lang } = useI18n();
  const { entries, students, filter, period, branch } = useLedger();
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const { current: c, payables } = useFinance();
  const partial = usePartialPeriod();
  const [method, setMethod] = useState("all");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [correcting, setCorrecting] = useState<LedgerEntry | null>(null);
  const rev = useMemo(() => reversedIds(entries), [entries]);

  const rows = useMemo(() => entries
    .filter((e) => e.type !== "Charge" && e.date >= filter.from && e.date <= filter.to && (filter.branch === "all" || e.branch === filter.branch))
    .filter((e) => (method === "all" || e.method === method) && (type === "all" || e.type === type) && (status === "all" || displayStatus(e, rev) === status))
    .sort((a, z) => z.date.localeCompare(a.date) || z.enteredAt.localeCompare(a.enteredAt)), [entries, filter, method, type, status, rev]);
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const methodTotal = c.byMethod.reduce((s, b) => s + b.amount, 0);
  const reconciles = Math.abs(methodTotal - c.grossCollections) < 0.005;
  const set = (f: (v: string) => void) => (v: string) => { f(v); setPage(0); };
  const filtersOn = method !== "all" || type !== "all" || status !== "all";
  const dir = lang === "ar" ? "rtl" : "ltr";

  return (
    <div className="mx-auto max-w-[90rem]">
      <PageHeader
        subtitle={<>{monthLabel(period, lang)} · {branch === "all" ? t("All branches") : t(branch)}{partial && <span className="hidden xl:inline"> · {t("Month to date · through {date}", { date: shortDateL(filter.to, lang) })}</span>}</>}
        actions={<>
          <div className="xl:hidden"><PeriodBranchFilter /></div>
          <Button variant="outline" onClick={() => downloadCsv(`transactions-${period}.csv`, [["ID","Date","Student","Type","Amount","Method","Branch","Reference","Note","Reason","Reverses","Replaces","Status","Entered by","Entered at"], ...rows.map((x) => [x.id, x.date, studentMap.get(x.studentId)?.name ?? x.studentId, x.type, x.amount, x.method ?? "", x.branch, x.reference ?? "", x.note ?? "", x.reason ?? "", x.reversesId ?? "", x.replacesId ?? "", displayStatus(x, rev), x.enteredBy, x.enteredAt])])}><Download className="size-4" />{t("Export")}</Button>
          <RecordPaymentDialog trigger={<Button><Plus className="size-4" />{t("Record payment")}</Button>} />
        </>} />

      {/* Headline figures */}
      <section aria-label={t("Key figures")} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Receipt} tone="brand" label={t("Billed revenue")} value={<Money value={c.billed} />} hint={t("Net billed {amount} after discounts", { amount: egp(c.netBilled, lang) })} />
        <StatCard icon={Wallet} tone="positive" label={t("Gross collections")} value={<Money value={c.grossCollections} />} hint={t("Completed payments only")}
          meter={c.netBilled > 0 ? { value: (c.grossCollections / c.netBilled) * 100, label: t("Collected against net billed"), tone: "positive" } : undefined} />
        <StatCard icon={Coins} tone="teal" label={t("Net collections")} value={<Money value={c.netCollections} />} hint={t("Gross − refunds {amount}", { amount: egp(c.refunds, lang) })} />
        <StatCard icon={CircleAlert} tone="negative" label={t("Outstanding receivables")} value={<Money value={c.outstanding} />} hint={t("{n} students owe · end of period", { n: fmtNum(c.studentsOwing, lang) })}
          footer={<span className="flex items-center justify-between gap-2"><span>{t("Prepaid balances")}</span><span className="font-medium text-positive"><Money value={c.prepaid} /></span></span>} />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        {/* Reconciliation */}
        <Panel className="xl:col-span-2" title={t("Collections reconciliation")} subtitle={t("Every figure is read from the ledger; pending and reversed entries never count")} icon={ArrowLeftRight}
          action={reconciles ? <Pill tone="positive"><CheckCircle2 className="size-3" />{t("Reconciled")}</Pill> : <Pill tone="negative"><CircleAlert className="size-3" />{t("Collections do not reconcile")}</Pill>}>
          <div className="grid items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <FlowTile tone="positive" label={t("Gross collections")} value={<Money value={c.grossCollections} />} hint={t("{n} payments", { n: fmtNum(c.byMethod.reduce((n, m) => n + m.count, 0), lang) })} />
            <Operator icon={Minus} />
            <FlowTile tone="coral" label={t("Refunds")} value={<Money value={c.refunds} />} hint={t("Paid back to students")} />
            <Operator icon={Equal} />
            <FlowTile tone="brand" label={t("Net collections")} value={<Money value={c.netCollections} />} hint={t("Kept by the center")} strong />
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between gap-2 text-xs"><span className="font-medium text-muted-foreground">{t("Gross collections by method")}</span><span className="font-medium num"><Money value={methodTotal} /></span></div>
            <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={c.byMethod.map((b) => `${t(b.method)} ${egp(b.amount, lang)}`).join(" · ")}>
              {c.byMethod.filter((b) => b.amount > 0).map((b) => <span key={b.method} className={methodColor[b.method]} style={{ width: `${(b.amount / Math.max(1, methodTotal)) * 100}%` }} title={`${t(b.method)} · ${egp(b.amount, lang)}`} />)}
            </div>
          </div>
          <div className="mt-4 grid gap-2 border-t pt-4 text-xs sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-lg bg-warning-soft px-3 py-2"><Hourglass className="size-4 shrink-0 text-warning" /><span className="min-w-0 flex-1">{t("Pending · not counted")}</span><b className="font-medium num"><Money value={c.pending} /></b><span className="text-muted-foreground num">({fmtNum(c.pendingCount, lang)})</span></div>
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2"><RotateCcw className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1">{t("Reversed · not counted")}</span><b className="font-medium num"><Money value={c.reversed} /></b><span className="text-muted-foreground num">({fmtNum(c.reversedCount, lang)})</span></div>
          </div>
        </Panel>

        {/* Methods */}
        <Panel title={t("Payment methods")} subtitle={t("Share of gross collections")} icon={Wallet}>
          <ul className="space-y-3.5">
            {c.byMethod.map((b) => {
              const share = methodTotal > 0 ? (b.amount / methodTotal) * 100 : 0;
              return (
                <li key={b.method}>
                  <div className="flex items-center justify-between gap-2 text-ui">
                    <span className="flex min-w-0 items-center gap-2"><span className={cn("size-2.5 shrink-0 rounded-sm", methodColor[b.method])} /><span className="truncate font-medium">{t(b.method)}</span><span className="text-xs text-muted-foreground num">· {fmtNum(b.count, lang)}</span></span>
                    <span className="shrink-0 font-medium num"><Money value={b.amount} /></span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", methodColor[b.method])} style={{ width: `${share}%` }} /></div><span className="w-10 text-end text-meta text-muted-foreground num"><bdi>{formatPercent(Math.round(share), lang)}</bdi></span></div>
                </li>
              );
            })}
          </ul>
          <dl className="mt-4 space-y-1.5 border-t pt-3 text-ui">
            <div className="flex justify-between"><dt className="font-medium">{t("Total = gross collections")}</dt><dd className="font-medium"><Money value={methodTotal} /></dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>− {t("Refunds")}</dt><dd><Money value={c.refunds} /></dd></div>
            <div className="flex justify-between font-medium text-positive"><dt>= {t("Net collections")}</dt><dd><Money value={c.netCollections} /></dd></div>
          </dl>
        </Panel>
      </div>

      {/* Secondary figures */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MiniStat tone="lavender" icon={BadgePercent} label={t("Discounts")} value={<Money value={c.discounts} />} hint={t("Reduce billed revenue")} />
        <MiniStat tone="coral" icon={Undo2} label={t("Refunds")} value={<Money value={c.refunds} />} hint={t("Paid back to students")} />
        <MiniStat tone="warning" icon={Hourglass} label={t("Pending")} value={<Money value={c.pending} />} hint={t("{n} payments · not counted", { n: fmtNum(c.pendingCount, lang) })} />
        <MiniStat tone="neutral" icon={RotateCcw} label={t("Reversed")} value={<Money value={c.reversed} />} hint={t("{n} entries · not counted", { n: fmtNum(c.reversedCount, lang) })} />
        <MiniStat tone="positive" icon={PiggyBank} label={t("Prepaid balances")} value={<Money value={c.prepaid} />} hint={t("Student credit · end of period")} />
        <MiniStat tone="brand" icon={GraduationCap} label={t("Teacher payables")} value={<Money value={payables} />} hint={t("Accrued this period")} />
      </div>

      {/* Transactions */}
      <section className="surface mt-5 min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div>
            <h2 className="text-section-title font-medium">{t("Transactions")} <span className="font-normal text-muted-foreground num">· {fmtNum(rows.length, lang)}</span></h2>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" />{t("Append-only ledger: completed entries are corrected by reversal, never edited")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterIcon className="size-4 text-muted-foreground" />
            <Select dir={dir} value={type} onValueChange={set(setType)}><SelectTrigger className={cn("h-9 w-36 text-xs", type !== "all" && "border-primary/50 bg-accent")} aria-label={t("Type")}><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((x) => <SelectItem key={x} value={x}>{x === "all" ? t("All types") : t(x)}</SelectItem>)}</SelectContent></Select>
            <Select dir={dir} value={status} onValueChange={set(setStatus)}><SelectTrigger className={cn("h-9 w-36 text-xs", status !== "all" && "border-primary/50 bg-accent")} aria-label={t("Status")}><SelectValue /></SelectTrigger><SelectContent>{["all", "Completed", "Pending", "Reversed"].map((x) => <SelectItem key={x} value={x}>{x === "all" ? t("All statuses") : t(x)}</SelectItem>)}</SelectContent></Select>
            {filtersOn && <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setMethod("all"); setType("all"); setStatus("all"); setPage(0); }}>{t("Clear all")}</Button>}
          </div>
        </div>
        <div className="overflow-x-auto border-y bg-muted/30 px-5 py-2">
          <Tabs dir={dir} value={method} onValueChange={set(setMethod)}>
            <TabsList className="h-8 bg-transparent p-0">
              {["all", ...METHODS].map((m) => <TabsTrigger key={m} value={m} className="h-8 gap-1.5 rounded-md px-3 text-xs data-[state=active]:bg-card data-[state=active]:shadow-card">{m !== "all" && <span className={cn("size-2 rounded-sm", methodColor[m as Method])} />}{m === "all" ? t("All methods") : t(m)}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="workspace-table w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>{[t("Transaction"), t("Student"), t("Type"), t("Method"), t("Reference / reason"), t("Entered by"), t("Status"), t("Amount"), ""].map((h, i) => <th key={i} className={cn("whitespace-nowrap px-3", i === 7 ? "text-end" : "text-start", i === 5 && "hidden 2xl:table-cell", i === 4 && "hidden 2xl:table-cell")}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">{view.map((x) => {
              const st = displayStatus(x, rev);
              const canCorrect = st === "Completed" && x.type !== "Reversal";
              const [TIcon, tone] = typeMeta[x.type] ?? [Receipt, "neutral" as Tone];
              return (
                <tr key={x.id} className={cn("hover:bg-muted/40", st === "Reversed" && "text-muted-foreground")}>
                  <td className="whitespace-nowrap px-3"><LedgerCode code={x.id} className="text-foreground" /><div className="text-xs text-muted-foreground num">{shortDateL(x.date, lang)}</div></td>
                  <td className="min-w-36 px-3">{studentMap.has(x.studentId) ? <Link to="/students/$id" params={{ id: x.studentId }} className="font-medium hover:text-brand"><bdi>{studentMap.get(x.studentId)?.name}</bdi></Link> : <bdi className="font-medium">{x.studentId}</bdi>}<div className="text-xs text-muted-foreground">{t(x.branch)}</div></td>
                  <td className="whitespace-nowrap px-3">
                    <span className="inline-flex items-center gap-1.5"><span className={cn("grid size-6 place-items-center rounded-md bg-muted", tone === "positive" ? "text-positive" : "text-muted-foreground")}><TIcon className="size-3.5" /></span>{t(typeLabel(x.type))}</span>
                    {x.reversesId && <div className="mt-0.5 text-meta text-muted-foreground">{t("of {id}", { id: x.reversesId })}</div>}
                    {x.replacesId && <div className="mt-0.5 text-meta text-muted-foreground">{t("replaces {id}", { id: x.replacesId })}</div>}
                    {(x.reference || x.reason || x.note) && <div className="mt-0.5 max-w-44 truncate text-meta text-muted-foreground 2xl:hidden">{x.reference ? <bdi dir="ltr">{x.reference}</bdi> : noteText(x.reason ?? x.note, t, lang)}</div>}
                  </td>
                  <td className="whitespace-nowrap px-3">{x.method ? <span className="inline-flex items-center gap-1.5"><span className={cn("size-2 rounded-sm", methodColor[x.method])} />{t(x.method)}</span> : "—"}</td>
                  <td className="hidden max-w-52 px-3 2xl:table-cell"><div className="truncate text-xs" title={[x.reference, noteText(x.reason, t, lang), noteText(x.note, t, lang)].filter(Boolean).join(" · ")}>{x.reference ? <bdi dir="ltr">{x.reference}</bdi> : noteText(x.reason ?? x.note, t, lang) ?? "—"}</div></td>
                  <td className="hidden whitespace-nowrap px-3 text-xs 2xl:table-cell"><bdi>{t(x.enteredBy)}</bdi></td>
                  <td className="px-3"><Pill tone={st === "Completed" ? "positive" : st === "Pending" ? "warning" : "neutral"} dot>{t(st)}</Pill></td>
                  <td className={cn("whitespace-nowrap px-3 text-end font-medium num", x.type === "Payment" && st === "Completed" ? "text-positive" : "", st === "Reversed" && "line-through", x.type === "PackageUse" && "font-medium text-muted-foreground")}>{x.type === "PackageUse" ? t("1 session") : <bdi>{x.type === "Payment" ? "+" : "−"}<Money value={x.amount} /></bdi>}</td>
                  <td className="w-12 px-2">
                    {canCorrect ? (
                      <DropdownMenu dir={dir}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8" aria-label={t("Actions for {id}", { id: x.id })}><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="text-meta font-normal text-muted-foreground">{t("Completed entries are never edited")}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setCorrecting(x)}><RotateCcw />{t("Correct or reverse…")}</DropdownMenuItem>
                        </DropdownMenuContent></DropdownMenu>
                    ) : <span className="grid size-8 place-items-center text-muted-foreground/50" title={t("No action available")}><Lock className="size-3.5" /></span>}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>

        {/* Mobile list */}
        <ul className="divide-y md:hidden">{view.map((x) => {
          const st = displayStatus(x, rev);
          const canCorrect = st === "Completed" && x.type !== "Reversal";
          return (
            <li key={x.id} className={cn("flex items-start gap-3 px-4 py-3", st === "Reversed" && "text-muted-foreground")}>
              <div className="min-w-0 flex-1">
                <bdi className="block truncate text-sm font-medium">{studentMap.get(x.studentId)?.name ?? x.studentId}</bdi>
                <div className="mt-0.5 text-xs text-muted-foreground"><bdi dir="ltr">{x.id}</bdi> · {t(typeLabel(x.type))}{x.method ? ` · ${t(x.method)}` : ""} · {shortDateL(x.date, lang)}</div>
                <div className="mt-1.5"><Pill tone={st === "Completed" ? "positive" : st === "Pending" ? "warning" : "neutral"} dot>{t(st)}</Pill></div>
              </div>
              <div className={cn("shrink-0 text-sm font-medium num", x.type === "Payment" && st === "Completed" && "text-positive", st === "Reversed" && "line-through")}>{x.type === "PackageUse" ? t("1 session") : <bdi>{x.type === "Payment" ? "+" : "−"}<Money value={x.amount} /></bdi>}</div>
              {canCorrect && <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={t("Actions for {id}", { id: x.id })} onClick={() => setCorrecting(x)}><MoreHorizontal /></Button>}
            </li>
          );
        })}</ul>

        {view.length === 0 && <EmptyState icon={Receipt} title={t("No transactions match")} hint={t("Try another method, type, status, month or branch.")} />}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground">
          <span>{t("Showing {a}–{b} of {n}", { a: fmtNum(rows.length ? page * PAGE + 1 : 0, lang), b: fmtNum(Math.min(rows.length, page * PAGE + PAGE), lang), n: fmtNum(rows.length, lang) })}</span>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="size-8" aria-label={t("Previous")} disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="rtl:-scale-x-100" /></Button>
            <span className="px-2 num">{t("Page {p} of {n}", { p: fmtNum(page + 1, lang), n: fmtNum(pages, lang) })}</span>
            <Button size="icon" variant="outline" className="size-8" aria-label={t("Next")} disabled={(page + 1) * PAGE >= rows.length} onClick={() => setPage(page + 1)}><ChevronRight className="rtl:-scale-x-100" /></Button>
          </div>
        </div>
      </section>

      <Panel title={t("How these numbers are calculated")} icon={BookOpenText} className="mt-5"><FinanceDefinitions /></Panel>
      <CorrectEntryDialog entry={correcting} onClose={() => setCorrecting(null)} />
    </div>
  );
}

function FlowTile({ label, value, hint, strong = false }: { tone: Tone; label: string; value: ReactNode; hint: string; strong?: boolean }) {
  return (
    <div className={cn("min-w-0 rounded-xl border px-4 py-3.5", strong && "border-brand/40 bg-info-soft")}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-1 break-words text-metric-sm font-medium num", strong && "text-brand")}>{value}</div>
      <div className="mt-0.5 text-meta text-muted-foreground">{hint}</div>
    </div>
  );
}

function Operator({ icon: OIcon }: { icon: typeof Minus }) {
  return <div className="flex items-center justify-center py-1 sm:py-0"><span className="grid size-7 place-items-center rounded-full border bg-card text-muted-foreground"><OIcon className="size-3.5" /></span></div>;
}
