import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search, MoreHorizontal, ArrowUpDown, ArrowDown, ArrowUp, X, MessageCircle, UserRound, Wallet, ChevronLeft, ChevronRight, Users, SlidersHorizontal, IdCard } from "lucide-react";
import { Pill, EmptyState, Avatar, Meter, PageHeader, type Tone } from "@/components/app/ui";
import { StudentBalance } from "@/components/app/student-balance";
import { AddStudent, GRADES } from "@/components/app/add-student";
import { RecordPaymentDialog } from "@/components/app/record-payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { balancesAsOf } from "@/lib/ledger";
import { useLedger, todayIso } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { fmtNum, pct } from "@/lib/l10n";
import { pageHead, downloadCsv } from "@/lib/head";
import { selectStudents, type StudentRow, type StudentSort } from "@/lib/student-display";
import { centerProfile } from "@/lib/center-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/students/")({ head: pageHead("Students", "Search, filter and manage enrolled students, billing balances and contact details."), component: StudentsPage });
const PAGE = 15;
const BALANCES = ["Owing", "Credit", "Settled"] as const;

function StudentsPage() {
  const { t, lang } = useI18n();
  const [q, setQ] = useState(""); const [grade, setGrade] = useState("all"); const [status, setStatus] = useState("all"); const [branch, setBranch] = useState("all"); const [bal, setBal] = useState("all"); const [page, setPage] = useState(0);
  const [sort, setSort] = useState<StudentSort>("name"); const [descending, setDescending] = useState(false);
  const { entries, students: all, classes } = useLedger();
  const students = useMemo(() => { const balances = balancesAsOf(entries, todayIso()); return all.map((s) => ({ ...s, balance: balances.get(s.id) ?? 0 })); }, [entries, all]);
  const rows = useMemo(() => selectStudents(students, { query: q, grade, status, branch, balance: bal }, sort, descending), [students, q, grade, status, branch, bal, sort, descending]);
  // Counts for the balance segments respect every other active filter, so they always match the table.
  const segmentCounts = useMemo(() => {
    const base = selectStudents(students, { query: q, grade, status, branch, balance: "all" }, sort, descending);
    return { all: base.length, Owing: base.filter((s) => s.balance > 0).length, Credit: base.filter((s) => s.balance < 0).length, Settled: base.filter((s) => s.balance === 0).length };
  }, [students, q, grade, status, branch, sort, descending]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const actualPage = Math.min(page, pages - 1);
  const view = rows.slice(actualPage * PAGE, actualPage * PAGE + PAGE);
  const clear = () => { setQ(""); setGrade("all"); setStatus("all"); setBranch("all"); setBal("all"); setPage(0); };
  const reset = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(0); };
  const active = [q && `${t("Search")}: ${q}`, grade !== "all" && `${t("Grade")}: ${t(grade)}`, branch !== "all" && `${t("Branch")}: ${t(branch)}`, status !== "all" && `${t("Status")}: ${t(status)}`].filter(Boolean) as string[];
  const className = (id: string) => classes.find((item) => item.id === id)?.name ?? id;
  const changeSort = (value: StudentSort) => { if (sort === value) setDescending(!descending); else { setSort(value); setDescending(false); } setPage(0); };
  const SortIcon = ({ value }: { value: StudentSort }) => sort !== value ? <ArrowUpDown className="size-3.5 opacity-50" /> : descending ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />;
  const sortHeader = (value: StudentSort, label: string, end = false) => (
    <th className={cn("px-3", end ? "text-end" : "text-start")} aria-sort={sort === value ? (descending ? "descending" : "ascending") : "none"}>
      <button type="button" onClick={() => changeSort(value)} className={cn("inline-flex items-center gap-1 rounded text-xs font-medium hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", sort === value && "text-foreground")}>{t(label)}<SortIcon value={value} /></button>
    </th>
  );
  const classChips = (ids: string[]) => (
    <div className="flex min-w-0 flex-wrap gap-1">
      {ids.slice(0, 2).map((id) => <span key={id} className="max-w-44 truncate rounded-md border bg-muted/50 px-1.5 py-0.5 text-[11px]" title={className(id)}><bdi>{className(id)}</bdi></span>)}
      {ids.length > 2 && <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground" title={ids.slice(2).map(className).join(" · ")}>+{fmtNum(ids.length - 2, lang)}</span>}
    </div>
  );
  const statusTone = (s: StudentRow["status"]): Tone => (s === "Active" ? "positive" : s === "Paused" ? "warning" : "neutral");

  return (
    <div className="mx-auto max-w-[90rem]">
      <PageHeader
        subtitle={t("{a} active · {n} total", { a: fmtNum(students.filter((s) => s.status === "Active").length, lang), n: fmtNum(students.length, lang) })}
        actions={<>
          <Button variant="outline" onClick={() => downloadCsv("students.csv", [["ID", "Name", "Phone", "Classes", "Balance", "Attendance", "Status"], ...rows.map((s) => [s.id, s.name, s.phone, s.classIds.map(className).join(" | "), s.balance, s.attendance, s.status])])}><Download />{t("Export")}</Button>
          <AddStudent />
        </>} />

      {/* Balance segments: the existing balance filter, with live counts */}
      <div role="tablist" aria-label={t("Balance")} className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {(["all", ...BALANCES] as const).map((key) => {
          const on = bal === key;
          const dot = key === "Owing" ? "bg-destructive" : key === "Credit" ? "bg-positive" : key === "Settled" ? "bg-muted-foreground" : "bg-brand";
          return (
            <button key={key} role="tab" type="button" aria-selected={on} onClick={() => reset(setBal)(key)}
              className={cn("flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-colors", on ? "border-primary bg-card text-foreground shadow-card ring-1 ring-primary" : "bg-card/60 text-muted-foreground hover:bg-card hover:text-foreground")}>
              <span className={cn("size-2 rounded-full", dot)} />{t(key === "all" ? "All students" : key)}
              <span className={cn("rounded-full px-1.5 text-[11px] font-semibold num", on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{fmtNum(segmentCounts[key], lang)}</span>
            </button>
          );
        })}
      </div>

      <div className="surface overflow-hidden">
        {/* Search and filters */}
        <div className="grid grid-cols-2 gap-2.5 border-b p-3 sm:flex sm:flex-wrap sm:items-center sm:p-4">
          <div className="relative col-span-2 min-w-0 sm:min-w-64 sm:flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => reset(setQ)(e.target.value)} aria-label={t("Name, ID or phone")} placeholder={t("Search by name, ID or phone")} className="h-10 bg-muted/40 ps-9" />
            {q && <button type="button" onClick={() => reset(setQ)("")} aria-label={t("Clear search")} className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>}
          </div>
          <Filter value={grade} onChange={reset(setGrade)} label="All grades" options={GRADES} />
          <Filter value={branch} onChange={reset(setBranch)} label="All branches" options={[...centerProfile.branches]} />
          <Filter value={status} onChange={reset(setStatus)} label="All statuses" options={["Active", "Paused", "Inactive"]} />
          <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:hidden">
            <Filter value={sort} onChange={(value) => changeSort(value as StudentSort)} label="Sort by" options={["name", "balance", "attendance"]} />
            <Button variant="outline" size="icon" className="size-10" aria-label={t("Reverse sort direction")} onClick={() => setDescending(!descending)}>{descending ? <ArrowDown /> : <ArrowUp />}</Button>
          </div>
        </div>
        {active.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2 text-xs">
            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
            {active.map((label) => <span key={label} className="rounded-full border bg-card px-2 py-0.5"><bdi>{label}</bdi></span>)}
            <Button size="sm" variant="ghost" className="ms-auto h-7 text-xs" onClick={clear}><X className="size-3.5" />{t("Clear all")}</Button>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="workspace-table w-full text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                {sortHeader("name", "Student")}
                <th className="px-3 text-start">{t("Grade")}</th>
                <th className="hidden px-3 text-start xl:table-cell">{t("Branch")}</th>
                <th className="px-3 text-start">{t("Classes")}</th>
                {sortHeader("attendance", "Attendance")}
                {sortHeader("balance", "Balance", true)}
                <th className="px-3 text-start">{t("Status")}</th>
                <th className="w-12 px-2"><span className="sr-only">{t("Actions")}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {view.map((s) => (
                <tr key={s.id} className="group hover:bg-muted/40">
                  <td className="min-w-48 px-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} seed={s.id} />
                      <div className="min-w-0">
                        <Link to="/students/$id" params={{ id: s.id }} className="block truncate font-semibold hover:text-brand"><bdi>{s.name}</bdi></Link>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground"><bdi dir="ltr">{s.id}</bdi><span>·</span><a href={`tel:${s.phone}`} className="hover:text-foreground"><bdi dir="ltr">{s.phone}</bdi></a></div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 text-[13px]">{t(s.grade)}</td>
                  <td className="hidden whitespace-nowrap px-3 text-[13px] xl:table-cell">{t(s.branch)}</td>
                  <td className="min-w-40 max-w-64 px-3">{classChips(s.classIds)}</td>
                  <td className="w-32 px-3">
                    <div className="flex items-center gap-2"><span className="w-10 shrink-0 text-[13px] font-medium num"><bdi>{pct(s.attendance, lang)}</bdi></span><Meter value={s.attendance} tone={s.attendance >= 90 ? "positive" : s.attendance >= 80 ? "teal" : "warning"} label={t("Attendance")} className="w-14" /></div>
                  </td>
                  <td className="px-3"><StudentBalance value={s.balance} /></td>
                  <td className="px-3"><Pill tone={statusTone(s.status)} dot>{t(s.status)}</Pill></td>
                  <td className="px-2"><StudentActions student={s} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <ul className="divide-y md:hidden">
          {view.map((s) => (
            <li key={s.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar name={s.name} seed={s.id} />
                <div className="min-w-0 flex-1">
                  <Link to="/students/$id" params={{ id: s.id }} className="block break-words font-semibold hover:text-brand"><bdi>{s.name}</bdi></Link>
                  <div className="mt-0.5 text-xs text-muted-foreground"><bdi dir="ltr">{s.id}</bdi> · {t(s.grade)} · {t(s.branch)}</div>
                </div>
                <StudentBalance value={s.balance} />
              </div>
              <div className="mt-3">{classChips(s.classIds)}</div>
              <div className="mt-3 flex items-center gap-2">
                <Pill tone={statusTone(s.status)} dot>{t(s.status)}</Pill>
                <span className="text-xs text-muted-foreground">{t("Attendance")} <b className="font-semibold text-foreground num"><bdi>{pct(s.attendance, lang)}</bdi></b></span>
                <div className="ms-auto flex shrink-0 gap-1">
                  <RecordPaymentDialog studentId={s.id} trigger={<Button variant="outline" size="icon" className="size-9" aria-label={`${t("Record payment")} · ${s.name}`} title={t("Record payment")}><Wallet /></Button>} />
                  <StudentActions student={s} />
                </div>
              </div>
            </li>
          ))}
        </ul>

        {rows.length === 0 && (
          <EmptyState icon={Users} title={t(all.length ? "No students match these filters" : "No students yet")} hint={all.length ? t("Try a different search or clear the filters.") : undefined}
            action={all.length ? <Button variant="outline" onClick={clear}>{t("Clear all")}</Button> : <AddStudent />} />
        )}

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
          <span>{t("Showing {a}–{b} of {n}", { a: fmtNum(rows.length ? actualPage * PAGE + 1 : 0, lang), b: fmtNum(Math.min(rows.length, (actualPage + 1) * PAGE), lang), n: fmtNum(rows.length, lang) })}</span>
          <nav aria-label={t("Pagination")} className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="size-8" aria-label={t("Previous")} disabled={actualPage === 0} onClick={() => setPage(actualPage - 1)}><ChevronLeft className="rtl:-scale-x-100" /></Button>
            {pageList(actualPage, pages).map((p, i) => p === null
              ? <span key={`gap-${i}`} className="px-1">…</span>
              : <Button key={p} size="sm" variant={p === actualPage ? "default" : "ghost"} className="h-8 min-w-8 px-2 num" aria-current={p === actualPage ? "page" : undefined} onClick={() => setPage(p)}>{fmtNum(p + 1, lang)}</Button>)}
            <Button size="icon" variant="outline" className="size-8" aria-label={t("Next")} disabled={actualPage + 1 >= pages} onClick={() => setPage(actualPage + 1)}><ChevronRight className="rtl:-scale-x-100" /></Button>
          </nav>
        </div>
      </div>
    </div>
  );
}

/** Page numbers with gaps: first, last, and the neighbours of the current page. */
function pageList(current: number, total: number): (number | null)[] {
  const keep = new Set([0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total));
  const out: (number | null)[] = [];
  [...keep].sort((a, b) => a - b).forEach((p, i, arr) => { if (i > 0 && p - (arr[i - 1] ?? p) > 1) out.push(null); out.push(p); });
  return out;
}

function Filter({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: readonly string[] }) {
  const { t, lang } = useI18n();
  const sortLabels: Record<string, string> = { name: "Sort: name", balance: "Sort: balance", attendance: "Sort: attendance" };
  return (
    <Select value={value} onValueChange={onChange} dir={lang === "ar" ? "rtl" : "ltr"}>
      <SelectTrigger aria-label={t(label)} className={cn("h-10 w-full min-w-0 sm:w-40", value !== "all" && label !== "Sort by" && "border-primary/50 bg-accent")}><SelectValue /></SelectTrigger>
      <SelectContent>
        {label !== "Sort by" && <SelectItem value="all">{t(label)}</SelectItem>}
        {options.map((item) => <SelectItem key={item} value={item}>{t(sortLabels[item] ?? item)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function StudentActions({ student }: { student: StudentRow }) {
  const { t, lang } = useI18n();
  const [paying, setPaying] = useState(false);
  const phone = student.guardianPhone || student.phone;
  return <>
    <DropdownMenu dir={lang === "ar" ? "rtl" : "ltr"}>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-9" aria-label={`${t("Actions")} · ${student.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild><Link to="/students/$id" params={{ id: student.id }}><UserRound />{t("View profile")}</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/students/$id" params={{ id: student.id }} search={{ tab: "edit" }}><IdCard />{t("Personal details")}</Link></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setPaying(true)}><Wallet />{t("Record payment")}</DropdownMenuItem>
        {student.balance > 0 && phone && <>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><a href={`https://wa.me/2${phone}`} target="_blank" rel="noreferrer"><MessageCircle className="text-positive" />{t("WhatsApp reminder")}</a></DropdownMenuItem>
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
    {paying && <RecordPaymentDialog studentId={student.id} trigger={null} controlledOpen={paying} onOpenChange={setPaying} />}
  </>;
}
