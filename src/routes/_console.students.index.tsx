import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Search,
  MoreHorizontal,
  ArrowDown,
  ArrowUp,
  X,
  MessageCircle,
  UserRound,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Users,
  SlidersHorizontal,
  IdCard,
  Database,
  FlaskConical,
  RotateCcw,
} from "lucide-react";
import {
  Pill,
  EmptyState,
  Avatar,
  Meter,
  PageHeader,
  LedgerCode,
  type Tone,
} from "@/components/app/ui";
import { StudentBalance } from "@/components/app/student-balance";
import { AddStudent, GRADES } from "@/components/app/add-student";
import { RecordPaymentDialog } from "@/components/app/record-payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { balancesAsOf } from "@/lib/ledger";
import { useLedger, todayIso } from "@/lib/ledger-store";
import { useCenter } from "@/lib/center-context";
import { useDemoMode } from "@/lib/demo-mode";
import { useStudentList, errorMessage } from "@/lib/students/queries";
import { toStudent } from "@/lib/students/model";
import { STUDENT_STATUSES, type ListStudentsInput } from "@/lib/students/schema";
import { useI18n } from "@/lib/i18n";
import { fmtNum, pct } from "@/lib/l10n";
import { pageHead, downloadCsv } from "@/lib/head";
import { balanceLabel, selectStudents, type StudentRow } from "@/lib/student-display";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/students/")({
  head: pageHead(
    "Students",
    "Search, filter and manage enrolled students, billing balances and contact details.",
  ),
  component: StudentsPage,
});
const PAGE = 15;
const BALANCES = ["Owing", "Credit", "Settled"] as const;
const SORTS = ["name", "code", "newest"] as const;
type Sort = (typeof SORTS)[number];

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

function StudentsPage() {
  const { t, lang } = useI18n();
  const { center, branches, canEditStudents } = useCenter();
  const publicDemo = useDemoMode();
  const { entries, students: all, classes } = useLedger();
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("all");
  const [status, setStatus] = useState("all");
  const [branchId, setBranchId] = useState("all");
  const [bal, setBal] = useState("all");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<Sort>("name");
  const [descending, setDescending] = useState(false);
  const query = useDebounced(q, 250);
  const branchName = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);

  // Demo-derived figures (in-memory ledger and attendance), joined to persistent students by code.
  const balances = useMemo(() => balancesAsOf(entries, todayIso()), [entries]);
  const withBalance = useMemo<StudentRow[]>(
    () => all.map((s) => ({ ...s, balance: balances.get(s.id) ?? 0 })),
    [all, balances],
  );
  const filters = {
    query,
    grade,
    status,
    branch: branchId === "all" ? "all" : (branchName.get(branchId) ?? ""),
    balance: "all",
  };
  const segmentCounts = useMemo(() => {
    const base = selectStudents(withBalance, filters, "name", false);
    return {
      all: base.length,
      Owing: base.filter((s) => s.balance > 0).length,
      Credit: base.filter((s) => s.balance < 0).length,
      Settled: base.filter((s) => s.balance === 0).length,
    };
  }, [withBalance, query, grade, status, branchId, branchName]); // eslint-disable-line react-hooks/exhaustive-deps
  const codes = useMemo(
    () =>
      bal === "all"
        ? undefined
        : withBalance.filter((s) => balanceLabel(s.balance) === bal).map((s) => s.id),
    [bal, withBalance],
  );

  const params: ListStudentsInput = {
    centerId: center.id,
    q: query,
    sort,
    descending,
    page,
    pageSize: PAGE,
    ...(grade !== "all" ? { grade } : {}),
    ...(branchId !== "all" ? { branchId } : {}),
    ...(status !== "all" ? { status: status as (typeof STUDENT_STATUSES)[number] } : {}),
    ...(codes ? { codes } : {}),
  };
  const list = useStudentList(params);
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const storeById = useMemo(() => new Map(all.map((s) => [s.id, s])), [all]);
  const view: StudentRow[] = (list.data?.rows ?? []).map((row) => {
    const s = toStudent(row, (id) => branchName.get(id) ?? "—");
    return {
      ...s,
      attendance: storeById.get(s.id)?.attendance ?? null,
      balance: balances.get(s.id) ?? 0,
    };
  });

  useEffect(() => {
    if (page > 0 && page >= pages) setPage(pages - 1);
  }, [page, pages]);
  const clear = () => {
    setQ("");
    setGrade("all");
    setStatus("all");
    setBranchId("all");
    setBal("all");
    setPage(0);
  };
  const reset = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setPage(0);
  };
  const active = [
    q && `${t("Search")}: ${q}`,
    grade !== "all" && `${t("Grade")}: ${t(grade)}`,
    branchId !== "all" && `${t("Branch")}: ${t(branchName.get(branchId) ?? "")}`,
    status !== "all" && `${t("Status")}: ${t(status)}`,
  ].filter(Boolean) as string[];
  const className = (id: string) => classes.find((item) => item.id === id)?.name ?? id;
  const sortLabel: Record<Sort, string> = {
    name: "Sort: name",
    code: "Sort: student ID",
    newest: "Sort: newest",
  };
  const toggleName = () => {
    if (sort === "name") setDescending(!descending);
    else {
      setSort("name");
      setDescending(false);
    }
    setPage(0);
  };
  const exportCsv = () => {
    const rows = selectStudents(withBalance, { ...filters, balance: bal }, "name", false);
    downloadCsv("students.csv", [
      [
        "ID",
        "Name",
        "Phone",
        "Branch",
        "Grade",
        "Classes",
        "Status",
        "Demo balance",
        "Demo attendance %",
      ],
      ...rows.map((s) => [
        s.id,
        s.name,
        s.phone,
        s.branch,
        s.grade,
        s.classIds.map(className).join(" | "),
        s.status,
        s.balance,
        s.attendance ?? "",
      ]),
    ]);
  };
  const classChips = (ids: string[]) => (
    <div className="flex min-w-0 flex-wrap gap-1">
      {ids.slice(0, 2).map((id) => (
        <span
          key={id}
          className="max-w-44 truncate rounded-md border bg-muted/50 px-1.5 py-0.5 text-meta"
          title={className(id)}
        >
          <bdi>{className(id)}</bdi>
        </span>
      ))}
      {ids.length > 2 && (
        <span
          className="rounded-md bg-muted px-1.5 py-0.5 text-meta text-muted-foreground"
          title={ids.slice(2).map(className).join(" · ")}
        >
          +{fmtNum(ids.length - 2, lang)}
        </span>
      )}
      {!ids.length && <span className="text-meta text-muted-foreground">—</span>}
    </div>
  );
  const statusTone = (s: StudentRow["status"]): Tone =>
    s === "Active" ? "positive" : s === "Paused" ? "warning" : "neutral";
  const demoTag = (
    <span className="ms-1 rounded bg-warning-soft px-1 py-px text-meta font-medium text-warning">
      {t("Demo")}
    </span>
  );
  const attendanceCell = (a: number | null) =>
    a === null ? (
      <span className="text-ui text-muted-foreground">—</span>
    ) : (
      <div className="flex items-center gap-2">
        <span className="w-10 shrink-0 text-ui font-medium num">
          <bdi>{pct(a, lang)}</bdi>
        </span>
        <Meter
          value={a}
          tone={a >= 90 ? "positive" : a >= 80 ? "neutral" : "warning"}
          label={t("Attendance")}
          className="w-14"
        />
      </div>
    );

  return (
    <div className="mx-auto max-w-[90rem]">
      <PageHeader
        subtitle={t("{a} active · {n} total", {
          a: fmtNum(all.filter((s) => s.status === "Active").length, lang),
          n: fmtNum(all.length, lang),
        })}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!all.length}>
              <Download />
              {t("Export")}
            </Button>
            {canEditStudents && <AddStudent />}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border bg-card/60 px-3 py-2 text-meta text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Database className="size-3.5 text-positive" />
          {t(
            publicDemo
              ? "Student records here are kept until you refresh. Nothing is saved."
              : "Student records are saved to your center's database.",
          )}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <FlaskConical className="size-3.5 text-warning" />
          {t("Balances and attendance come from demo ledger and attendance data.")}
        </span>
      </div>

      <div
        role="tablist"
        aria-label={t("Demo balance")}
        className="mb-4 flex gap-2 overflow-x-auto pb-1"
      >
        {(["all", ...BALANCES] as const).map((key) => {
          const on = bal === key;
          const dot =
            key === "Owing"
              ? "bg-destructive"
              : key === "Credit"
                ? "bg-positive"
                : key === "Settled"
                  ? "bg-muted-foreground"
                  : "bg-brand";
          return (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={on}
              onClick={() => reset(setBal)(key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-ui transition-colors",
                on
                  ? "border-input bg-card font-medium text-foreground shadow-card"
                  : "border-transparent text-muted-foreground hover:bg-card hover:text-foreground",
              )}
            >
              <span className={cn("size-1.5 rounded-full", dot)} />
              {t(key === "all" ? "All students" : key)}
              <span className="font-mono text-meta text-muted-foreground">
                {fmtNum(segmentCounts[key], lang)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="surface overflow-hidden">
        <div className="grid grid-cols-2 gap-2.5 border-b p-3 sm:flex sm:flex-wrap sm:items-center sm:p-4">
          <div className="relative col-span-2 min-w-0 sm:min-w-64 sm:flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => reset(setQ)(e.target.value)}
              aria-label={t("Name, ID or phone")}
              placeholder={t("Search by name, ID or phone")}
              className="h-10 bg-muted/40 ps-9"
            />
            {q && (
              <button
                type="button"
                onClick={() => reset(setQ)("")}
                aria-label={t("Clear search")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Filter
            value={grade}
            onChange={reset(setGrade)}
            placeholder="All grades"
            options={GRADES.map((g) => [g, g])}
          />
          <Filter
            value={branchId}
            onChange={reset(setBranchId)}
            placeholder="All branches"
            options={branches.map((b) => [b.id, b.name])}
          />
          <Filter
            value={status}
            onChange={reset(setStatus)}
            placeholder="All statuses"
            options={STUDENT_STATUSES.map((s) => [s, s])}
          />
          <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:col-auto sm:flex">
            <Select
              value={sort}
              onValueChange={(v) => {
                setSort(v as Sort);
                setPage(0);
              }}
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              <SelectTrigger aria-label={t("Sort by")} className="h-10 w-full min-w-0 sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(sortLabel[s])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="size-10"
              aria-label={t("Reverse sort direction")}
              onClick={() => {
                setDescending(!descending);
                setPage(0);
              }}
            >
              {descending ? <ArrowDown /> : <ArrowUp />}
            </Button>
          </div>
        </div>
        {active.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2 text-xs">
            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
            {active.map((label) => (
              <span key={label} className="rounded-full border bg-card px-2 py-0.5">
                <bdi>{label}</bdi>
              </span>
            ))}
            <Button size="sm" variant="ghost" className="ms-auto h-7 text-xs" onClick={clear}>
              <X className="size-3.5" />
              {t("Clear all")}
            </Button>
          </div>
        )}

        {list.isError ? (
          <EmptyState
            icon={Users}
            title={t("Students could not be loaded")}
            hint={t(errorMessage(list.error, "Could not load students."))}
            action={
              <Button variant="outline" onClick={() => void list.refetch()}>
                <RotateCcw />
                {t("Try again")}
              </Button>
            }
          />
        ) : list.isPending ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div
            className={cn("transition-opacity", list.isFetching && "opacity-60")}
            aria-busy={list.isFetching}
          >
            <div className="hidden overflow-x-auto md:block">
              <table className="workspace-table w-full text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th
                      className="px-3 text-start"
                      aria-sort={
                        sort === "name" ? (descending ? "descending" : "ascending") : "none"
                      }
                    >
                      <button
                        type="button"
                        onClick={toggleName}
                        className={cn(
                          "inline-flex items-center gap-1 rounded text-xs font-medium hover:text-foreground",
                          sort === "name" && "text-foreground",
                        )}
                      >
                        {t("Student")}
                        {sort === "name" &&
                          (descending ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ArrowUp className="size-3.5" />
                          ))}
                      </button>
                    </th>
                    <th className="px-3 text-start">{t("Grade")}</th>
                    <th className="hidden px-3 text-start xl:table-cell">{t("Branch")}</th>
                    <th className="px-3 text-start">{t("Classes")}</th>
                    <th className="px-3 text-start">
                      {t("Attendance")}
                      {demoTag}
                    </th>
                    <th className="px-3 text-end">
                      {t("Balance")}
                      {demoTag}
                    </th>
                    <th className="px-3 text-start">{t("Status")}</th>
                    <th className="w-12 px-2">
                      <span className="sr-only">{t("Actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {view.map((s) => (
                    <tr key={s.id} className="group hover:bg-muted/40">
                      <td className="min-w-48 px-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.name} seed={s.id} />
                          <div className="min-w-0">
                            <Link
                              to="/students/$id"
                              params={{ id: s.id }}
                              className="block truncate font-medium hover:text-brand"
                            >
                              <bdi>{s.name}</bdi>
                            </Link>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <LedgerCode code={s.id} />
                              <a href={`tel:${s.phone}`} className="hover:text-foreground">
                                <bdi dir="ltr">{s.phone}</bdi>
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 text-ui">{t(s.grade)}</td>
                      <td className="hidden whitespace-nowrap px-3 text-ui xl:table-cell">
                        <bdi>{t(s.branch)}</bdi>
                      </td>
                      <td className="min-w-40 max-w-64 px-3">{classChips(s.classIds)}</td>
                      <td className="w-32 px-3">{attendanceCell(s.attendance)}</td>
                      <td className="px-3">
                        <StudentBalance value={s.balance} />
                      </td>
                      <td className="px-3">
                        <Pill tone={statusTone(s.status)} dot>
                          {t(s.status)}
                        </Pill>
                      </td>
                      <td className="px-2">
                        <StudentActions student={s} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y md:hidden">
              {view.map((s) => (
                <li key={s.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={s.name} seed={s.id} />
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/students/$id"
                        params={{ id: s.id }}
                        className="block break-words font-medium hover:text-brand"
                      >
                        <bdi>{s.name}</bdi>
                      </Link>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        <bdi dir="ltr">{s.id}</bdi> · {t(s.grade)} · <bdi>{t(s.branch)}</bdi>
                      </div>
                    </div>
                    <StudentBalance value={s.balance} />
                  </div>
                  <div className="mt-3">{classChips(s.classIds)}</div>
                  <div className="mt-3 flex items-center gap-2">
                    <Pill tone={statusTone(s.status)} dot>
                      {t(s.status)}
                    </Pill>
                    <span className="text-xs text-muted-foreground">
                      {t("Attendance")}{" "}
                      <b className="font-medium text-foreground num">
                        <bdi>{s.attendance === null ? "—" : pct(s.attendance, lang)}</bdi>
                      </b>
                    </span>
                    <div className="ms-auto flex shrink-0 gap-1">
                      <RecordPaymentDialog
                        studentId={s.id}
                        trigger={
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-9"
                            aria-label={`${t("Record payment")} · ${s.name}`}
                            title={t("Record payment")}
                          >
                            <Wallet />
                          </Button>
                        }
                      />
                      <StudentActions student={s} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {view.length === 0 && (
              <EmptyState
                icon={Users}
                title={t(all.length ? "No students match these filters" : "No students yet")}
                hint={
                  all.length
                    ? t("Try a different search or clear the filters.")
                    : canEditStudents
                      ? t("Add your first student to get started.")
                      : undefined
                }
                action={
                  all.length ? (
                    <Button variant="outline" onClick={clear}>
                      {t("Clear all")}
                    </Button>
                  ) : canEditStudents ? (
                    <AddStudent />
                  ) : undefined
                }
              />
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground">
          <span>
            {t("Showing {a}–{b} of {n}", {
              a: fmtNum(total ? page * PAGE + 1 : 0, lang),
              b: fmtNum(Math.min(total, (page + 1) * PAGE), lang),
              n: fmtNum(total, lang),
            })}
          </span>
          <nav aria-label={t("Pagination")} className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              aria-label={t("Previous")}
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="rtl:-scale-x-100" />
            </Button>
            {pageList(page, pages).map((p, i) =>
              p === null ? (
                <span key={`gap-${i}`} className="px-1">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  size="sm"
                  variant={p === page ? "default" : "ghost"}
                  className="h-8 min-w-8 px-2 num"
                  aria-current={p === page ? "page" : undefined}
                  onClick={() => setPage(p)}
                >
                  {fmtNum(p + 1, lang)}
                </Button>
              ),
            )}
            <Button
              size="icon"
              variant="outline"
              className="size-8"
              aria-label={t("Next")}
              disabled={page + 1 >= pages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="rtl:-scale-x-100" />
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
}

/** Page numbers with gaps: first, last, and the neighbours of the current page. */
function pageList(current: number, total: number): (number | null)[] {
  const keep = new Set(
    [0, total - 1, current - 1, current, current + 1].filter((p) => p >= 0 && p < total),
  );
  const out: (number | null)[] = [];
  [...keep]
    .sort((a, b) => a - b)
    .forEach((p, i, arr) => {
      if (i > 0 && p - (arr[i - 1] ?? p) > 1) out.push(null);
      out.push(p);
    });
  return out;
}

function Filter({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: readonly (readonly [string, string])[];
}) {
  const { t, lang } = useI18n();
  return (
    <Select value={value} onValueChange={onChange} dir={lang === "ar" ? "rtl" : "ltr"}>
      <SelectTrigger
        aria-label={t(placeholder)}
        className={cn(
          "h-10 w-full min-w-0 sm:w-40",
          value !== "all" && "border-primary/50 bg-accent",
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t(placeholder)}</SelectItem>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {t(label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StudentActions({ student }: { student: StudentRow }) {
  const { t, lang } = useI18n();
  const [paying, setPaying] = useState(false);
  const phone = student.guardianPhone || student.phone;
  return (
    <>
      <DropdownMenu dir={lang === "ar" ? "rtl" : "ltr"}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label={`${t("Actions")} · ${student.name}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem asChild>
            <Link to="/students/$id" params={{ id: student.id }}>
              <UserRound />
              {t("View profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/students/$id" params={{ id: student.id }} search={{ tab: "edit" }}>
              <IdCard />
              {t("Personal details")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setPaying(true)}>
            <Wallet />
            {t("Record payment")}
          </DropdownMenuItem>
          {student.balance > 0 && phone && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={`https://wa.me/2${phone}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="text-positive" />
                  {t("WhatsApp reminder")}
                </a>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {paying && (
        <RecordPaymentDialog
          studentId={student.id}
          trigger={null}
          controlledOpen={paying}
          onOpenChange={setPaying}
        />
      )}
    </>
  );
}
