import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, UserPlus, Search, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Pill, Money, EmptyState } from "@/components/app/ui";
import { RuleEditor, ruleIsValid } from "@/components/app/rule-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { classById, branches, classes } from "@/lib/data";
import { balancesAsOf } from "@/lib/ledger";
import type { BillingRule } from "@/lib/billing";
import { useLedger, todayIso } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { fmtNum, ruleKindLabel, ruleSummary } from "@/lib/l10n";
import { pageHead, downloadCsv } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/students/")({
  head: pageHead("Students", "Search, filter and manage every enrolled student and their balance."),
  component: StudentsPage,
});

const PAGE = 15;
const GRADES = ["Thanaweya 3", "Thanaweya 2", "Thanaweya 1", "Prep 3", "Adult"];

function StudentsPage() {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [branch, setBranch] = useState("all");
  const [bal, setBal] = useState("all");
  const [page, setPage] = useState(0);
  const { entries, students: all } = useLedger();
  const students = useMemo(() => { const b = balancesAsOf(entries, todayIso()); return all.map((s) => ({ ...s, balance: b.get(s.id) ?? 0 })); }, [entries, all]);
  const rows = useMemo(() => students.filter((s) =>
    (!q || `${s.name} ${s.id} ${s.phone}`.toLowerCase().includes(q.toLowerCase())) &&
    (status === "all" || s.status === status) && (branch === "all" || s.branch === branch) &&
    (bal === "all" || (bal === "due" ? s.balance > 0 : bal === "prepaid" ? s.balance < 0 : s.balance === 0))), [students, q, status, branch, bal]);
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);
  const reset = (f: (v: string) => void) => (v: string) => { f(v); setPage(0); };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("Students")} subtitle={t("{a} active · {n} total", { a: fmtNum(students.filter((s) => s.status === "Active").length, lang), n: fmtNum(students.length, lang) })}
        actions={<>
          <Button variant="outline" onClick={() => downloadCsv("students.csv", [["ID","Name","Phone","Classes","Balance","Attendance","Status"], ...rows.map((s) => [s.id, s.name, s.phone, s.classIds.map((c) => classById(c).name).join(" | "), s.balance, s.attendance, s.status])])}><Download className="size-4" />{t("Export")}</Button>
          <AddStudent />
        </>} />
      <div className="surface">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder={t("Name, ID or phone")} className="ps-8" />
          </div>
          <F value={status} onChange={reset(setStatus)} allLabel={t("All statuses")} opts={[["Active", t("Active")], ["Paused", t("Paused")], ["Inactive", t("Inactive")]]} />
          <F value={branch} onChange={reset(setBranch)} allLabel={t("All branches")} opts={branches.map((b) => [b, t(b)])} />
          <F value={bal} onChange={reset(setBal)} allLabel={t("All balances")} opts={[["due", t("Has balance due")], ["prepaid", t("Prepaid")], ["settled", t("Settled")]]} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-start text-xs text-muted-foreground">
              <tr>{[t("ID"), t("Name"), t("Phone"), t("Classes"), t("Balance"), t("Attendance"), t("Status"), ""].map((h, i) => <th key={i} className="px-4 py-2.5 text-start font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">
              {view.map((s) => (
                <tr key={s.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 text-muted-foreground num">{s.id}</td>
                  <td className="px-4 py-3"><Link to="/students/$id" params={{ id: s.id }} className="font-medium hover:text-brand">{s.name}</Link><div className="text-xs text-muted-foreground">{t(s.grade)} · {t(s.branch)}</div></td>
                  <td className="px-4 py-3 num" dir="ltr">{s.phone}</td>
                  <td className="px-4 py-3"><div className="max-w-56 truncate">{s.classIds.map((c) => classById(c).name).join("، ")}</div></td>
                  <td className={cn("px-4 py-3 font-medium", s.balance > 0 ? "text-destructive" : s.balance < 0 ? "text-positive" : "text-muted-foreground")}>
                    {s.balance === 0 ? "—" : <>{s.balance < 0 && "+"}<Money value={Math.abs(s.balance)} /></>}
                  </td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="h-1.5 w-14 rounded-full bg-muted"><div className={cn("h-full rounded-full", s.attendance >= 85 ? "bg-positive" : "bg-warning")} style={{ width: `${s.attendance}%` }} /></div><span className="num text-xs">{fmtNum(s.attendance, lang)}%</span></div></td>
                  <td className="px-4 py-3"><Pill tone={s.status === "Active" ? "positive" : s.status === "Paused" ? "warning" : "neutral"}>{t(s.status)}</Pill></td>
                  <td className="px-2 py-3">
                    <DropdownMenu><DropdownMenuTrigger className="rounded p-1 hover:bg-muted" aria-label={t("Actions")}><MoreHorizontal className="size-4" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link to="/students/$id" params={{ id: s.id }}>{t("View profile and enrollments")}</Link></DropdownMenuItem>
                      </DropdownMenuContent></DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {view.length === 0 && <EmptyState title={t("No students match these filters")} hint={t("Try clearing the search or changing a filter.")} />}
        </div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <span>{t("Showing {a}–{b} of {n}", { a: fmtNum(rows.length ? page * PAGE + 1 : 0, lang), b: fmtNum(Math.min(rows.length, page * PAGE + PAGE), lang), n: fmtNum(rows.length, lang) })}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>{t("Previous")}</Button>
            <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= rows.length} onClick={() => setPage(page + 1)}>{t("Next")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function F({ value, onChange, allLabel, opts }: { value: string; onChange: (v: string) => void; allLabel: string; opts: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40" aria-label={allLabel}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** Adds a student with one or more enrollments; each enrollment can keep the class rule or get its own. */
function AddStudent() {
  const { t, lang } = useI18n();
  const { addStudent, classRule } = useLedger();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [guardian, setGuardian] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [grade, setGrade] = useState(GRADES[0]!);
  const [picked, setPicked] = useState<string[]>([]);
  const [own, setOwn] = useState<Record<string, BillingRule>>({});
  const [error, setError] = useState("");
  const reset = () => { setName(""); setPhone(""); setGuardian(""); setGuardianPhone(""); setGrade(GRADES[0]!); setPicked([]); setOwn({}); setError(""); };
  const toggle = (id: string, on: boolean) => {
    setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));
    if (!on) setOwn(({ [id]: _drop, ...rest }) => rest);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) reset(); }}>
      <DialogTrigger asChild><Button><UserPlus className="size-4" />{t("Add student")}</Button></DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Add student")}</DialogTitle>
          <DialogDescription>{t("Demo only: the student is added to the sample data in this tab and disappears on refresh.")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length < 3) return setError(t("Enter the student's full name."));
          if (!/^01[0125]\d{8}$/.test(phone)) return setError(t("Enter an 11-digit Egyptian mobile number starting with 010, 011, 012 or 015."));
          if (guardianPhone && !/^01[0125]\d{8}$/.test(guardianPhone)) return setError(t("The guardian's number is not a valid Egyptian mobile number."));
          if (picked.length === 0) return setError(t("Choose at least one class."));
          const bad = Object.values(own).find((r) => !ruleIsValid(r));
          if (bad) return setError(t("Every amount in a billing rule must be greater than zero."));
          const s = addStudent({ name: name.trim(), phone, guardian: guardian.trim() || "—", guardianPhone, grade, classIds: picked, branch: classById(picked[0]!).branch }, own);
          toast.success(t("{name} added to demo data as {id}", { name: s.name, id: s.id }), { description: t("Not saved to a real database.") });
          setOpen(false);
          nav({ to: "/students/$id", params: { id: s.id } });
        }}>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="st-name">{t("Full name")}</Label><Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></div>
          <div className="space-y-1.5"><Label htmlFor="st-phone">{t("Phone")}</Label><Input id="st-phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="010…" dir="ltr" inputMode="tel" /></div>
          <div className="space-y-1.5"><Label>{t("Grade")}</Label>
            <Select value={grade} onValueChange={setGrade}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GRADES.map((g) => <SelectItem key={g} value={g}>{t(g)}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1.5"><Label htmlFor="st-g">{t("Guardian name")}</Label><Input id="st-g" value={guardian} onChange={(e) => setGuardian(e.target.value)} maxLength={80} /></div>
          <div className="space-y-1.5"><Label htmlFor="st-gp">{t("Guardian phone")}</Label><Input id="st-gp" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="011…" dir="ltr" inputMode="tel" /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("Classes")}</Label>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
              {classes.map((c) => (
                <label key={c.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted">
                  <Checkbox checked={picked.includes(c.id)} onCheckedChange={(v) => toggle(c.id, v === true)} />
                  <span className="flex-1">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{ruleKindLabel(classRule(c.id), t)}</span>
                </label>
              ))}
            </div>
          </div>
          {picked.map((cid) => {
            const c = classById(cid);
            const r = own[cid];
            return (
              <div key={cid} className="space-y-2 rounded-lg border p-3 sm:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{c.name}</span>
                  <label className="flex items-center gap-2 text-xs"><Checkbox checked={!!r} onCheckedChange={(v) => setOwn((o) => { const n = { ...o }; if (v === true) n[cid] = classRule(cid); else delete n[cid]; return n; })} />{t("Own billing rule for this student")}</label>
                </div>
                {r ? <RuleEditor value={r} onChange={(nr) => setOwn((o) => ({ ...o, [cid]: nr }))} fallbackFee={c.fee} />
                  : <p className="text-xs text-muted-foreground">{t("Uses the class rule")}: {ruleKindLabel(classRule(cid), t)} · {ruleSummary(classRule(cid), t, lang)}</p>}
              </div>
            );
          })}
          {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button><Button type="submit">{t("Add to demo data")}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
