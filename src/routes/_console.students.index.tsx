import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search, MoreHorizontal, ArrowUpDown, X, MessageCircle, Pencil, Wallet } from "lucide-react";
import { PageHeader, Pill, EmptyState } from "@/components/app/ui";
import { StudentBalance } from "@/components/app/student-balance";
import { AddStudent, GRADES } from "@/components/app/add-student";
import { RecordPaymentDialog } from "@/components/app/record-payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { balancesAsOf } from "@/lib/ledger";
import { useLedger, todayIso } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { fmtNum, pct } from "@/lib/l10n";
import { pageHead, downloadCsv } from "@/lib/head";
import { selectStudents, type StudentRow, type StudentSort } from "@/lib/student-display";
import { centerProfile } from "@/lib/center-config";

export const Route = createFileRoute("/_console/students/")({ head: pageHead("Students", "Search, filter and manage enrolled students, billing balances and contact details."), component: StudentsPage });
const PAGE = 15;
function StudentsPage() {
  const { t, lang } = useI18n();
  const [q, setQ] = useState(""); const [grade, setGrade] = useState("all"); const [status, setStatus] = useState("all"); const [branch, setBranch] = useState("all"); const [bal, setBal] = useState("all"); const [page, setPage] = useState(0);
  const [sort, setSort] = useState<StudentSort>("name"); const [descending, setDescending] = useState(false);
  const { entries, students: all, classes } = useLedger();
  const students = useMemo(() => { const balances = balancesAsOf(entries, todayIso()); return all.map((s) => ({ ...s, balance: balances.get(s.id) ?? 0 })); }, [entries, all]);
  const rows = useMemo(() => selectStudents(students, { query: q, grade, status, branch, balance: bal }, sort, descending), [students, q, grade, status, branch, bal, sort, descending]);
  const actualPage = Math.min(page, Math.max(0, Math.ceil(rows.length / PAGE) - 1));
  const view = rows.slice(actualPage * PAGE, actualPage * PAGE + PAGE);
  const clear = () => { setQ(""); setGrade("all"); setStatus("all"); setBranch("all"); setBal("all"); setPage(0); };
  const reset = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(0); };
  const active = [q && `${t("Search")}: ${q}`, grade !== "all" && `${t("Grade")}: ${t(grade)}`, branch !== "all" && `${t("Branch")}: ${t(branch)}`, bal !== "all" && `${t("Balance")}: ${t(bal)}`, status !== "all" && `${t("Status")}: ${t(status)}`].filter(Boolean);
  const classBadges = (ids: string[]) => <div className="flex min-w-0 flex-wrap gap-1">{ids.map((id) => <span key={id} className="max-w-full break-words rounded border bg-muted/40 px-1.5 py-0.5 text-[11px]"><bdi>{classes.find((item) => item.id === id)?.name ?? id}</bdi></span>)}</div>;
  const changeSort = (value: StudentSort) => { if (sort === value) setDescending(!descending); else { setSort(value); setDescending(false); } setPage(0); };
  const sortHeader = (value: StudentSort, label: string) => <th className={value === "balance" ? "px-3 py-2 text-right" : "px-3 py-2 text-start"} aria-sort={sort === value ? descending ? "descending" : "ascending" : "none"}><Button variant="ghost" size="sm" onClick={() => changeSort(value)} className="px-0 text-xs">{t(label)}<ArrowUpDown /></Button></th>;
  return <div className="mx-auto max-w-7xl">
    <PageHeader title={t("Students")} subtitle={t("{a} active · {n} total", { a: fmtNum(students.filter((s) => s.status === "Active").length, lang), n: fmtNum(students.length, lang) })} actions={<><Button variant="outline" onClick={() => downloadCsv("students.csv", [["ID", "Name", "Phone", "Classes", "Balance", "Attendance", "Status"], ...rows.map((s) => [s.id, s.name, s.phone, s.classIds.map((id) => classes.find((item) => item.id === id)?.name ?? id).join(" | "), s.balance, s.attendance, s.status])])}><Download />{t("Export")}</Button><AddStudent /></>} />
    <div className="grid grid-cols-2 gap-2 border-y py-3 sm:flex sm:flex-wrap sm:items-center">
      <div className="relative col-span-2 min-w-0 sm:flex-1"><Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => reset(setQ)(e.target.value)} aria-label={t("Name, ID or phone")} placeholder={t("Name, ID or phone")} className="ps-8" /></div>
      <Filter value={grade} onChange={reset(setGrade)} label="All grades" options={GRADES} /><Filter value={branch} onChange={reset(setBranch)} label="All branches" options={[...centerProfile.branches]} /><Filter value={bal} onChange={reset(setBal)} label="All balances" options={['Owing', 'Credit', 'Settled']} /><Filter value={status} onChange={reset(setStatus)} label="All statuses" options={['Active', 'Paused', 'Inactive']} />
    </div>
    {active.length > 0 && <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b py-2 text-xs"><div className="min-w-0 break-words"><span className="font-medium">{t("Active filters")}: </span>{active.join(" · ")}</div><Button size="sm" variant="ghost" onClick={clear}><X />{t("Clear all")}</Button></div>}
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-3 sm:hidden"><Filter value={sort} onChange={(value) => changeSort(value as StudentSort)} label="Sort by" options={['name','balance','attendance']} /><Button size="icon" variant="ghost" aria-label={t("Reverse sort direction")} onClick={() => setDescending(!descending)}><ArrowUpDown /></Button></div>
    <div className="hidden overflow-x-auto sm:block"><table className="w-full text-sm"><thead className="border-b text-xs text-muted-foreground"><tr>{sortHeader("name", "Name")}{sortHeader("balance", "Balance")}<th className="px-3 py-2 text-start">{t("Classes")}</th><th className="px-3 py-2 text-start">{t("Phone")}</th>{sortHeader("attendance", "Attendance")}<th className="px-3 py-2 text-start">{t("Status")}</th><th className="px-3 py-2"><span className="sr-only">{t("Actions")}</span></th></tr></thead><tbody className="divide-y">{view.map((s) => <tr key={s.id} className="hover:bg-muted/30"><td className="min-w-40 px-3 py-3"><Link to="/students/$id" params={{ id: s.id }} className="font-semibold hover:text-brand"><bdi>{s.name}</bdi></Link><div className="mt-1 text-xs text-muted-foreground"><bdi>{s.id}</bdi> · {t(s.grade)}</div></td><td className="px-3 py-3"><StudentBalance value={s.balance} /></td><td className="min-w-40 px-3 py-3">{classBadges(s.classIds)}</td><td className="whitespace-nowrap px-3 py-3 text-xs"><a href={`tel:${s.phone}`}><bdi>{s.phone}</bdi></a></td><td className="px-3 py-3 num">{pct(s.attendance, lang)}</td><td className="px-3 py-3"><Pill tone={s.status === "Active" ? "positive" : s.status === "Paused" ? "warning" : "neutral"}>{t(s.status)}</Pill></td><td className="px-2 py-3"><StudentActions student={s} /></td></tr>)}</tbody></table></div>
    <ul className="space-y-3 sm:hidden">{view.map((s) => <li key={s.id} className="rounded-md border bg-card p-3"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><div className="min-w-0"><Link to="/students/$id" params={{ id: s.id }} className="block break-words font-semibold"><bdi>{s.name}</bdi></Link><div className="mt-1 text-xs text-muted-foreground"><bdi>{s.id}</bdi></div></div><StudentBalance value={s.balance} /></div><div className="my-3">{classBadges(s.classIds)}</div><div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"><Pill tone={s.status === "Active" ? "positive" : "neutral"}>{t(s.status)}</Pill><div className="flex shrink-0 gap-1"><RecordPaymentDialog studentId={s.id} trigger={<Button variant="ghost" size="icon" aria-label={`${t("Record payment")} · ${s.name}`} title={t("Record payment")}><Wallet /></Button>} /><StudentActions student={s} /></div></div></li>)}</ul>
    {rows.length === 0 && <div><EmptyState title={t(all.length ? "No students match these filters" : "No students yet")} /><div className="mb-6 text-center">{all.length ? <Button variant="outline" onClick={clear}>{t("Clear all")}</Button> : <AddStudent />}</div></div>}
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t py-3 text-xs text-muted-foreground"><span className="min-w-0">{t("Showing {a}–{b} of {n}", { a: fmtNum(rows.length ? actualPage * PAGE + 1 : 0, lang), b: fmtNum(Math.min(rows.length, (actualPage + 1) * PAGE), lang), n: fmtNum(rows.length, lang) })}</span><div className="flex shrink-0 gap-1"><Button size="sm" variant="outline" disabled={actualPage === 0} onClick={() => setPage(actualPage - 1)}>{t("Previous")}</Button><Button size="sm" variant="outline" disabled={(actualPage + 1) * PAGE >= rows.length} onClick={() => setPage(actualPage + 1)}>{t("Next")}</Button></div></div>
  </div>;
}
function Filter({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: string[] }) { const { t, lang } = useI18n(); return <Select value={value} onValueChange={onChange} dir={lang === 'ar' ? 'rtl' : 'ltr'}><SelectTrigger aria-label={t(label)} className="w-full min-w-0 sm:w-36"><SelectValue /></SelectTrigger><SelectContent>{label !== 'Sort by' && <SelectItem value="all">{t(label)}</SelectItem>}{options.map((item) => <SelectItem key={item} value={item}>{t(item)}</SelectItem>)}</SelectContent></Select>; }
function StudentActions({ student }: { student: StudentRow }) {
  const { t, lang } = useI18n(); const [paying, setPaying] = useState(false);
  const phone = student.guardianPhone || student.phone;
  return <><DropdownMenu dir={lang === 'ar' ? 'rtl' : 'ltr'}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`${t("Actions")} · ${student.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to="/students/$id" params={{ id: student.id }}>{t("View profile")}</Link></DropdownMenuItem><DropdownMenuItem onSelect={() => setPaying(true)}><Wallet />{t("Record payment")}</DropdownMenuItem>{student.balance > 0 && phone && <DropdownMenuItem asChild><a href={`https://wa.me/2${phone}`} target="_blank" rel="noreferrer"><MessageCircle />{t("WhatsApp reminder")}</a></DropdownMenuItem>}<DropdownMenuItem asChild><Link to="/students/$id" params={{ id: student.id }} search={{ tab: 'edit' }}><Pencil />{t("Edit")}</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu>{paying && <RecordPaymentDialog studentId={student.id} trigger={null} controlledOpen={paying} onOpenChange={setPaying} />}</>;
}
