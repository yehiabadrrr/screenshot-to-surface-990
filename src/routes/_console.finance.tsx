import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Download, MoreHorizontal } from "lucide-react";
import { PageHeader, Panel, Pill, Money, EmptyState } from "@/components/app/ui";
import { PeriodBranchFilter } from "@/components/app/filters";
import { FinanceDefinitions } from "@/components/app/definitions";
import { CorrectEntryDialog } from "@/components/app/correct-entry";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RecordPaymentDialog } from "@/components/app/record-payment";
import { METHODS, displayStatus, reversedIds, type LedgerEntry } from "@/lib/ledger";
import { useLedger, monthLabel } from "@/lib/ledger-store";
import { useFinance } from "@/lib/use-finance";
import { egp } from "@/lib/format";
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

function FinancePage() {
  const { t, lang } = useI18n();
  const { entries, students, filter, period, branch } = useLedger();
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const { current: c, payables } = useFinance();
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
  const methodTotal = c.byMethod.reduce((s, b) => s + b.amount, 0);
  const maxM = Math.max(1, ...c.byMethod.map((b) => b.amount));
  const set = (f: (v: string) => void) => (v: string) => { f(v); setPage(0); };

  const primary: [string, number, string, string][] = [
    [t("Billed revenue"), c.billed, "", t("Net billed {amount} after discounts", { amount: egp(c.netBilled, lang) })],
    [t("Gross collections"), c.grossCollections, "text-positive", t("Completed payments only")],
    [t("Net collections"), c.netCollections, "", t("Gross − refunds {amount}", { amount: egp(c.refunds, lang) })],
    [t("Outstanding receivables"), c.outstanding, "text-destructive", t("{n} students owe · end of period", { n: fmtNum(c.studentsOwing, lang) })],
  ];
  const secondary: [string, number, string][] = [
    [t("Discounts"), c.discounts, t("Reduce billed revenue")],
    [t("Refunds"), c.refunds, t("Paid back to students")],
    [t("Pending"), c.pending, t("{n} payments · not counted", { n: fmtNum(c.pendingCount, lang) })],
    [t("Reversed"), c.reversed, t("{n} entries · not counted", { n: fmtNum(c.reversedCount, lang) })],
    [t("Prepaid balances"), c.prepaid, t("Student credit · end of period")],
    [t("Teacher payables"), payables, t("Accrued this period")],
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("Payments & Finance")} subtitle={`${monthLabel(period, lang)} · ${branch === "all" ? t("All branches") : t(branch)}`}
        actions={<>
          <PeriodBranchFilter />
          <Button variant="outline" onClick={() => downloadCsv(`transactions-${period}.csv`, [["ID","Date","Student","Type","Amount","Method","Branch","Reference","Note","Reason","Reverses","Replaces","Status","Entered by","Entered at"], ...rows.map((x) => [x.id, x.date, studentMap.get(x.studentId)?.name ?? x.studentId, x.type, x.amount, x.method ?? "", x.branch, x.reference ?? "", x.note ?? "", x.reason ?? "", x.reversesId ?? "", x.replacesId ?? "", displayStatus(x, rev), x.enteredBy, x.enteredAt])])}><Download className="size-4" />{t("Export")}</Button>
          <RecordPaymentDialog trigger={<Button size="lg"><Plus className="size-4" />{t("Record payment")}</Button>} />
        </>} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {primary.map(([l, v, cls, hint]) => (
          <div key={l} className="surface p-5"><div className="text-[13px] text-muted-foreground">{l}</div><div className={cn("mt-2 break-words text-metric font-semibold", cls)}><Money value={v} /></div><div className="mt-0.5 text-xs text-muted-foreground num">{hint}</div></div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {secondary.map(([l, v, hint]) => (
          <div key={l} className="rounded-lg border bg-card px-3.5 py-3"><div className="text-xs text-muted-foreground">{l}</div><div className="mt-1 font-semibold"><Money value={v} /></div><div className="text-[11px] text-muted-foreground">{hint}</div></div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-4">
        <Panel title={t("Gross collections by method")}>
          <div className="space-y-3">
            {c.byMethod.map((b) => (
              <div key={b.method}>
                <div className="flex justify-between text-[13px]"><span>{t(b.method)} <span className="text-muted-foreground">· {fmtNum(b.count, lang)}</span></span><Money value={b.amount} /></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-positive" style={{ width: `${(b.amount / maxM) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <dl className="mt-4 space-y-1.5 border-t pt-3 text-[13px]">
            <div className="flex justify-between font-semibold"><dt>{t("Total = gross collections")}</dt><dd><Money value={methodTotal} /></dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>− {t("Refunds")}</dt><dd><Money value={c.refunds} /></dd></div>
            <div className="flex justify-between font-semibold text-positive"><dt>= {t("Net collections")}</dt><dd><Money value={c.netCollections} /></dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">{t("Pending ({p}) and reversed ({r}) payments are excluded.", { p: fmtNum(c.pendingCount, lang), r: fmtNum(c.reversedCount, lang) })}</p>
        </Panel>

        <div className="surface overflow-hidden min-w-0 xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="text-sm font-semibold">{t("Transactions")} <span className="font-normal text-muted-foreground">· {fmtNum(rows.length, lang)}</span></h2>
            <div className="flex flex-wrap gap-2">
              <Select dir={lang === "ar" ? "rtl" : "ltr"} value={type} onValueChange={set(setType)}><SelectTrigger className="h-8 w-32 text-xs" aria-label={t("Type")}><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((x) => <SelectItem key={x} value={x}>{x === "all" ? t("All types") : t(x)}</SelectItem>)}</SelectContent></Select>
              <Select dir={lang === "ar" ? "rtl" : "ltr"} value={status} onValueChange={set(setStatus)}><SelectTrigger className="h-8 w-32 text-xs" aria-label={t("Status")}><SelectValue /></SelectTrigger><SelectContent>{["all", "Completed", "Pending", "Reversed"].map((x) => <SelectItem key={x} value={x}>{x === "all" ? t("All statuses") : t(x)}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="overflow-x-auto border-b px-4 py-2">
            <Tabs dir={lang === "ar" ? "rtl" : "ltr"} value={method} onValueChange={set(setMethod)}><TabsList className="h-8">{["all", ...METHODS].map((m) => <TabsTrigger key={m} value={m} className="text-xs">{m === "all" ? t("All methods") : t(m)}</TabsTrigger>)}</TabsList></Tabs>
          </div>
          <div className="overflow-x-auto">
            <table className="workspace-table w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>{[t("ID"), t("Date"), t("Student"), t("Type"), t("Amount"), t("Method"), t("Reference / reason"), t("Entered by"), t("Status"), ""].map((h, i) => <th key={i} className={cn("whitespace-nowrap px-3 py-2.5 font-medium", i === 4 ? "text-right" : "text-start")}>{h}</th>)}</tr></thead>
              <tbody className="divide-y">{view.map((x) => {
                const st = displayStatus(x, rev);
                const canCorrect = st === "Completed" && x.type !== "Reversal";
                return (
                  <tr key={x.id} className={cn("hover:bg-muted/40", st === "Reversed" && "text-muted-foreground")}>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground num" dir="ltr">{x.id}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 num">{shortDateL(x.date, lang)}</td>
                    <td className="px-3 py-2.5"><div className="font-medium"><bdi>{studentMap.get(x.studentId)?.name ?? x.studentId}</bdi></div><div className="text-xs text-muted-foreground">{t(x.branch)}</div></td>
                    <td className="whitespace-nowrap px-3 py-2.5">{t(x.type)}{x.reversesId && <div className="text-xs text-muted-foreground">{t("of {id}", { id: x.reversesId })}</div>}{x.replacesId && <div className="text-xs text-muted-foreground">{t("replaces {id}", { id: x.replacesId })}</div>}</td>
                    <td className={cn("whitespace-nowrap px-3 py-2.5 text-right font-medium num", x.type === "Payment" && st === "Completed" ? "text-positive" : "", st === "Reversed" && "line-through")}><bdi>{x.type === "Payment" ? "+" : "−"}<Money value={x.amount} /></bdi></td>
                    <td className="whitespace-nowrap px-3 py-2.5">{x.method ? t(x.method) : "—"}</td>
                    <td className="max-w-48 px-3 py-2.5"><div className="truncate text-xs" title={[x.reference, noteText(x.reason, t, lang), noteText(x.note, t, lang)].filter(Boolean).join(" · ")}>{x.reference ? <bdi>{x.reference}</bdi> : noteText(x.reason ?? x.note, t, lang) ?? "—"}</div></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs">{t(x.enteredBy)}</td>
                    <td className="px-3 py-2.5"><Pill tone={st === "Completed" ? "positive" : st === "Pending" ? "warning" : "neutral"}>{t(st)}</Pill></td>
                    <td className="px-2 py-2.5">
                      {canCorrect && (
                        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={t("Actions for {id}", { id: x.id })}><MoreHorizontal /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setCorrecting(x)}>{t("Correct or reverse…")}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
            {view.length === 0 && <EmptyState title={t("No transactions match")} hint={t("Try another method, type, status, month or branch.")} />}
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t px-4 py-3 text-xs text-muted-foreground">
            <span>{t("Showing {a}–{b} of {n}", { a: fmtNum(rows.length ? page * PAGE + 1 : 0, lang), b: fmtNum(Math.min(rows.length, page * PAGE + PAGE), lang), n: fmtNum(rows.length, lang) })}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>{t("Previous")}</Button>
              <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= rows.length} onClick={() => setPage(page + 1)}>{t("Next")}</Button>
            </div>
          </div>
        </div>
      </div>

      <Panel title={t("How these numbers are calculated")} className="mt-4"><FinanceDefinitions /></Panel>
      <CorrectEntryDialog entry={correcting} onClose={() => setCorrecting(null)} />
    </div>
  );
}

