import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Download } from "lucide-react";
import { PageHeader, Panel, Pill, Money, EmptyState } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordPaymentDialog } from "@/components/app/record-payment";
import { transactions, students, studentById, methods, kpis } from "@/lib/data";
import { shortDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { pageHead, downloadCsv } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/finance")({
  head: pageHead("Payments & Finance", "Collections, receivables, refunds, discounts and teacher payables."),
  component: FinancePage,
});

function FinancePage() {
  const { t } = useI18n();
  const [method, setMethod] = useState("all");
  const sum = (type: string) => transactions.filter((x) => x.type === type && x.status !== "Reversed").reduce((s, x) => s + x.amount, 0);
  const prepaid = students.filter((s) => s.balance < 0).reduce((s, x) => s - x.balance, 0);
  const rows = transactions.filter((x) => method === "all" || x.method === method);
  const byMethod = methods.map((m) => ({ m, v: transactions.filter((x) => x.method === m && x.type === "Payment").reduce((s, x) => s + x.amount, 0) }));
  const maxM = Math.max(...byMethod.map((b) => b.v));
  const cards: [string, number, string][] = [
    ["Total collected", kpis.collected, "text-positive"], ["Outstanding receivables", kpis.outstanding, "text-destructive"],
    ["Refunds", sum("Refund"), ""], ["Discounts", sum("Discount"), ""], ["Student prepaid balances", prepaid, ""], ["Teacher payables", kpis.payables, ""],
  ];
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("Payments & Finance")} subtitle="November 2026 · All branches"
        actions={<>
          <Button variant="outline" onClick={() => downloadCsv("transactions.csv", [["ID","Student","Type","Amount","Method","Date","Status"], ...rows.map((x) => [x.id, studentById(x.studentId)?.name ?? "", x.type, x.amount, x.method, x.date.slice(0, 10), x.status])])}><Download className="size-4" />{t("Export")}</Button>
          <RecordPaymentDialog trigger={<Button size="lg"><Plus className="size-4" />{t("Record payment")}</Button>} />
        </>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(([l, v, c]) => <div key={l} className="surface p-4"><div className="text-[13px] text-muted-foreground">{l}</div><div className={cn("mt-1.5 text-xl font-semibold", c)}><Money value={v} /></div></div>)}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        <Panel title="Collections by method">
          <div className="space-y-3">{byMethod.map((b) => (
            <div key={b.m}><div className="flex justify-between text-[13px]"><span>{b.m}</span><Money value={b.v} /></div>
              <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-positive" style={{ width: `${maxM ? (b.v / maxM) * 100 : 0}%` }} /></div></div>))}</div>
        </Panel>
        <div className="surface overflow-hidden lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Transactions</h2>
            <Tabs value={method} onValueChange={setMethod}><TabsList>{["all", ...methods].map((m) => <TabsTrigger key={m} value={m} className="text-xs">{m === "all" ? "All" : m}</TabsTrigger>)}</TabsList></Tabs>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>{["Transaction", t("Student"), t("Type"), t("Amount"), t("Method"), t("Date"), t("Status")].map((h) => <th key={h} className="px-4 py-2.5 text-start font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y">{rows.map((x) => (
                <tr key={x.id} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5 text-muted-foreground num">{x.id}</td>
                  <td className="px-4 py-2.5 font-medium">{studentById(x.studentId)?.name}</td>
                  <td className="px-4 py-2.5">{x.type}</td>
                  <td className={cn("px-4 py-2.5 font-medium", x.type === "Payment" ? "text-positive" : "text-muted-foreground")}>{x.type === "Payment" ? "+" : "−"}<Money value={x.amount} /></td>
                  <td className="px-4 py-2.5">{x.method}</td>
                  <td className="px-4 py-2.5 num">{shortDate(x.date)}</td>
                  <td className="px-4 py-2.5"><Pill tone={x.status === "Completed" ? "positive" : x.status === "Pending" ? "warning" : "negative"}>{x.status}</Pill></td>
                </tr>))}</tbody>
            </table>
            {rows.length === 0 && <EmptyState title="No transactions for this method" hint="Payments recorded with this method will appear here." />}
          </div>
        </div>
      </div>
    </div>
  );
}
