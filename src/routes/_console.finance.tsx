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
import { studentById } from "@/lib/data";
import { METHODS, displayStatus, reversedIds, type LedgerEntry } from "@/lib/ledger";
import { useLedger, monthLabel } from "@/lib/ledger-store";
import { useFinance } from "@/lib/use-finance";
import { shortDate } from "@/lib/format";
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
  const { entries, filter, period, branch } = useLedger();
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
    ["Billed revenue", c.billed, "", `Net billed ${fmt(c.netBilled)} after discounts`],
    ["Gross collections", c.grossCollections, "text-positive", "Completed payments only"],
    ["Net collections", c.netCollections, "", `Gross − refunds ${fmt(c.refunds)}`],
    ["Outstanding receivables", c.outstanding, "text-destructive", `${c.studentsOwing} students owe · end of period`],
  ];
  const secondary: [string, number, string][] = [
    ["Discounts", c.discounts, "Reduce billed revenue"],
    ["Refunds", c.refunds, "Paid back to students"],
    ["Pending", c.pending, `${c.pendingCount} payments · not counted`],
    ["Reversed", c.reversed, `${c.reversedCount} entries · not counted`],
    ["Prepaid balances", c.prepaid, "Student credit · end of period"],
    ["Teacher payables", payables, "Accrued this period"],
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("Payments & Finance")} subtitle={`${monthLabel(period, lang)} · ${branch === "all" ? t("All branches") : branch}`}
        actions={<>
          <PeriodBranchFilter />
          <Button variant="outline" onClick={() => downloadCsv(`transactions-${period}.csv`, [["ID","Date","Student","Type","Amount","Method","Branch","Reference","Note","Reason","Reverses","Replaces","Status","Entered by","Entered at"], ...rows.map((x) => [x.id, x.date, studentById(x.studentId)?.name ?? "", x.type, x.amount, x.method ?? "", x.branch, x.reference ?? "", x.note ?? "", x.reason ?? "", x.reversesId ?? "", x.replacesId ?? "", displayStatus(x, rev), x.enteredBy, x.enteredAt])])}><Download className="size-4" />{t("Export")}</Button>
          <RecordPaymentDialog trigger={<Button size="lg"><Plus className="size-4" />{t("Record payment")}</Button>} />
        </>} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {primary.map(([l, v, cls, hint]) => (
          <div key={l} className="surface p-4"><div className="text-[13px] text-muted-foreground">{l}</div><div className={cn("mt-1.5 text-2xl font-semibold tracking-tight", cls)}><Money value={v} /></div><div className="mt-0.5 text-xs text-muted-foreground num">{hint}</div></div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {secondary.map(([l, v, hint]) => (
          <div key={l} className="rounded-lg border bg-card px-3.5 py-3"><div className="text-xs text-muted-foreground">{l}</div><div className="mt-1 font-semibold"><Money value={v} /></div><div className="text-[11px] text-muted-foreground">{hint}</div></div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <Panel title="Gross collections by method">
          <div className="space-y-3">
            {c.byMethod.map((b) => (
              <div key={b.method}>
                <div className="flex justify-between text-[13px]"><span>{b.method} <span className="text-muted-foreground">· {b.count}</span></span><Money value={b.amount} /></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-positive" style={{ width: `${(b.amount / maxM) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          <dl className="mt-4 space-y-1.5 border-t pt-3 text-[13px]">
            <div className="flex justify-between font-semibold"><dt>Total = gross collections</dt><dd><Money value={methodTotal} /></dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>− Refunds</dt><dd><Money value={c.refunds} /></dd></div>
            <div className="flex justify-between font-semibold text-positive"><dt>= Net collections</dt><dd><Money value={c.netCollections} /></dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Pending ({c.pendingCount}) and reversed ({c.reversedCount}) payments are excluded.</p>
        </Panel>

        <div className="surface overflow-hidden lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Transactions <span className="font-normal text-muted-foreground">· {rows.length}</span></h2>
            <div className="flex flex-wrap gap-2">
              <Select value={type} onValueChange={set(setType)}><SelectTrigger className="h-8 w-32 text-xs" aria-label="Type"><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((x) => <SelectItem key={x} value={x}>{x === "all" ? "All types" : x}</SelectItem>)}</SelectContent></Select>
              <Select value={status} onValueChange={set(setStatus)}><SelectTrigger className="h-8 w-32 text-xs" aria-label="Status"><SelectValue /></SelectTrigger><SelectContent>{["all", "Completed", "Pending", "Reversed"].map((x) => <SelectItem key={x} value={x}>{x === "all" ? "All statuses" : x}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="border-b px-4 py-2">
            <Tabs value={method} onValueChange={set(setMethod)}><TabsList className="h-8">{["all", ...METHODS].map((m) => <TabsTrigger key={m} value={m} className="text-xs">{m === "all" ? "All methods" : m}</TabsTrigger>)}</TabsList></Tabs>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>{["ID", t("Date"), t("Student"), t("Type"), t("Amount"), t("Method"), "Reference / reason", "Entered by", t("Status"), ""].map((h, i) => <th key={i} className="whitespace-nowrap px-3 py-2.5 text-start font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y">{view.map((x) => {
                const st = displayStatus(x, rev);
                const canCorrect = st === "Completed" && x.type !== "Reversal";
                return (
                  <tr key={x.id} className={cn("hover:bg-muted/40", st === "Reversed" && "text-muted-foreground")}>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground num">{x.id}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 num">{shortDate(x.date)}</td>
                    <td className="px-3 py-2.5"><div className="font-medium">{studentById(x.studentId)?.name}</div><div className="text-xs text-muted-foreground">{x.branch}</div></td>
                    <td className="whitespace-nowrap px-3 py-2.5">{x.type}{x.reversesId && <div className="text-xs text-muted-foreground">of {x.reversesId}</div>}{x.replacesId && <div className="text-xs text-muted-foreground">replaces {x.replacesId}</div>}</td>
                    <td className={cn("whitespace-nowrap px-3 py-2.5 font-medium", x.type === "Payment" && st === "Completed" ? "text-positive" : "", st === "Reversed" && "line-through")}>{x.type === "Payment" ? "+" : "−"}<Money value={x.amount} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5">{x.method ?? "—"}</td>
                    <td className="max-w-48 px-3 py-2.5"><div className="truncate text-xs" title={[x.reference, x.reason, x.note].filter(Boolean).join(" · ")}>{x.reference ?? x.reason ?? x.note ?? "—"}</div></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs">{x.enteredBy}</td>
                    <td className="px-3 py-2.5"><Pill tone={st === "Completed" ? "positive" : st === "Pending" ? "warning" : "neutral"}>{st}</Pill></td>
                    <td className="px-2 py-2.5">
                      {canCorrect && (
                        <DropdownMenu><DropdownMenuTrigger className="rounded p-1 hover:bg-muted" aria-label={`Actions for ${x.id}`}><MoreHorizontal className="size-4" /></DropdownMenuTrigger>
                          <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setCorrecting(x)}>Correct or reverse…</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                      )}
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
            {view.length === 0 && <EmptyState title="No transactions match" hint="Try another method, type, status, month or branch." />}
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
            <span>Showing {rows.length ? page * PAGE + 1 : 0}–{Math.min(rows.length, page * PAGE + PAGE)} of {rows.length}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= rows.length} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </div>
      </div>

      <Panel title="How these numbers are calculated" className="mt-4"><FinanceDefinitions /></Panel>
      <CorrectEntryDialog entry={correcting} onClose={() => setCorrecting(null)} />
    </div>
  );
}

const fmt = (n: number) => `EGP ${Math.round(n).toLocaleString("en-US")}`;
