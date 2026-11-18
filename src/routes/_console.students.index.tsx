import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Upload, UserPlus, Search, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Pill, Money, EmptyState } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { students as baseStudents, classById, branches, classes } from "@/lib/data";
import { balancesAsOf } from "@/lib/ledger";
import { useLedger, todayIso } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { pageHead, downloadCsv } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/students/")({
  head: pageHead("Students", "Search, filter and manage every enrolled student and their balance."),
  component: StudentsPage,
});

const PAGE = 15;

function StudentsPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [branch, setBranch] = useState("all");
  const [bal, setBal] = useState("all");
  const [page, setPage] = useState(0);
  const { entries } = useLedger();
  const students = useMemo(() => { const b = balancesAsOf(entries, todayIso()); return baseStudents.map((s) => ({ ...s, balance: b.get(s.id) ?? 0 })); }, [entries]);
  const rows = useMemo(() => students.filter((s) =>
    (!q || `${s.name} ${s.id} ${s.phone}`.toLowerCase().includes(q.toLowerCase())) &&
    (status === "all" || s.status === status) && (branch === "all" || s.branch === branch) &&
    (bal === "all" || (bal === "due" ? s.balance > 0 : bal === "prepaid" ? s.balance < 0 : s.balance === 0))), [students, q, status, branch, bal]);
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  const reset = (f: (v: string) => void) => (v: string) => { f(v); setPage(0); };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("Students")} subtitle={`${students.filter((s) => s.status === "Active").length} active · ${students.length} total`}
        actions={<>
          <Button variant="outline" onClick={() => toast.info("CSV/Excel import", { description: "Upload a file with name, phone, guardian and class columns." })}><Upload className="size-4" />{t("Import")}</Button>
          <Button variant="outline" onClick={() => downloadCsv("students.csv", [["ID","Name","Phone","Classes","Balance","Attendance","Status"], ...rows.map((s) => [s.id, s.name, s.phone, s.classIds.map((c) => classById(c).name).join(" | "), s.balance, s.attendance, s.status])])}><Download className="size-4" />{t("Export")}</Button>
          <AddStudent />
        </>} />
      <div className="surface">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Name, ID or phone" className="ps-8" />
          </div>
          <F value={status} onChange={reset(setStatus)} placeholder="Status" opts={["Active", "Paused", "Inactive"]} />
          <F value={branch} onChange={reset(setBranch)} placeholder="Branch" opts={[...branches]} />
          <F value={bal} onChange={reset(setBal)} placeholder="Balance" opts={[["due","Has balance due"],["prepaid","Prepaid"],["settled","Settled"]]} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-start text-xs text-muted-foreground">
              <tr>{["ID", t("Name"), t("Phone"), t("Classes"), t("Balance"), t("Attendance"), t("Status"), ""].map((h, i) => <th key={i} className="px-4 py-2.5 text-start font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {view.map((s) => (
                <tr key={s.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 text-muted-foreground num">{s.id}</td>
                  <td className="px-4 py-3"><Link to="/students/$id" params={{ id: s.id }} className="font-medium hover:text-brand">{s.name}</Link><div className="text-xs text-muted-foreground">{s.grade} · {s.branch}</div></td>
                  <td className="px-4 py-3 num" dir="ltr">{s.phone}</td>
                  <td className="px-4 py-3"><div className="max-w-56 truncate">{s.classIds.map((c) => classById(c).name).join(", ")}</div></td>
                  <td className={cn("px-4 py-3 font-medium", s.balance > 0 ? "text-destructive" : s.balance < 0 ? "text-positive" : "text-muted-foreground")}>
                    {s.balance === 0 ? "—" : <>{s.balance < 0 && "+"}<Money value={Math.abs(s.balance)} /></>}
                  </td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-14 rounded-full bg-muted"><div className={cn("h-full rounded-full", s.attendance >= 85 ? "bg-positive" : "bg-warning")} style={{ width: `${s.attendance}%` }} /></div><span className="num text-xs">{s.attendance}%</span></div></td>
                  <td className="px-4 py-3"><Pill tone={s.status === "Active" ? "positive" : s.status === "Paused" ? "warning" : "neutral"}>{t(s.status)}</Pill></td>
                  <td className="px-2 py-3">
                    <DropdownMenu><DropdownMenuTrigger className="rounded p-1 hover:bg-muted" aria-label="Actions"><MoreHorizontal className="size-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to="/students/$id" params={{ id: s.id }}>View profile</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info(`Editing ${s.name}`)}>Edit student</DropdownMenuItem>
                      </DropdownMenuContent></DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {view.length === 0 && <EmptyState title="No students match these filters" hint="Try clearing the search or changing a filter." />}
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
  );
}

function F({ value, onChange, placeholder, opts }: { value: string; onChange: (v: string) => void; placeholder: string; opts: (string | [string, string])[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All · {placeholder}</SelectItem>
        {opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return <SelectItem key={v} value={v}>{l}</SelectItem>; })}
      </SelectContent>
    </Select>
  );
}

function AddStudent() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><UserPlus className="size-4" />{t("Add student")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("Add student")}</DialogTitle></DialogHeader>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const n = new FormData(e.currentTarget).get("name"); toast.success(`${n} added`, { description: "Enrollment and first invoice created." }); setOpen(false); }}>
          <div className="space-y-1.5 sm:col-span-2"><Label>Full name</Label><Input name="name" required placeholder="Mariam Hassan" /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input required placeholder="010…" dir="ltr" /></div>
          <div className="space-y-1.5"><Label>Guardian phone</Label><Input placeholder="011…" dir="ltr" /></div>
          <div className="space-y-1.5"><Label>Grade</Label><Input placeholder="Thanaweya 3" /></div>
          <div className="space-y-1.5"><Label>Class</Label>
            <Select><SelectTrigger><SelectValue placeholder="Choose class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button><Button type="submit">{t("Save")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
