import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Pencil,
  BookOpen,
  Languages as LanguagesIcon,
  CalendarCheck,
  CalendarDays,
  Clock3,
  MapPin,
  MoreHorizontal,
  Info,
  Users,
  Layers,
  Receipt,
  Repeat,
  PackageCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  PageHeader,
  Pill,
  Money,
  Avatar,
  Meter,
  MiniStat,
  EmptyState,
  tintDot,
  tintFor,
} from "@/components/app/ui";
import { RuleEditor, ruleIsValid } from "@/components/app/rule-editor";
import { RuleEffects } from "@/components/app/rule-effects";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { ClassItem } from "@/lib/data";
import type { BillingRule } from "@/lib/billing";
import { useLedger } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { fmtNum, localDays, localTime, ruleKindLabel, ruleSummary } from "@/lib/l10n";
import { formatPercent } from "@/lib/format";
import { pageHead } from "@/lib/head";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/classes")({
  head: pageHead(
    "Classes & Courses",
    "Tutoring groups and language courses with teachers, schedules, capacity and billing rules.",
  ),
  component: ClassesPage,
});

/** "Physics · Thanaweya 3" → level "Thanaweya 3". Names without a level part have none. */
const levelOf = (name: string) => name.split(" · ").slice(1).join(" · ") || undefined;

function ClassesPage() {
  const { t, lang } = useI18n();
  const { classRule, setClassRule, students, branch, classes } = useLedger();
  const [kind, setKind] = useState("all");
  const [edit, setEdit] = useState<ClassItem | null>(null);
  const [draft, setDraft] = useState<BillingRule | null>(null);
  const [error, setError] = useState("");
  const inBranch = (c: ClassItem) => branch === "all" || c.branch === branch;
  const scoped = classes.filter(inBranch);
  const rows = scoped.filter((c) => kind === "all" || c.kind === kind);
  const roster = useMemo(() => {
    const m = new Map<string, typeof students>();
    for (const s of students)
      if (s.status === "Active")
        for (const cid of s.classIds) m.set(cid, [...(m.get(cid) ?? []), s]);
    return m;
  }, [students]);
  const enrolledIn = (id: string) => roster.get(id)?.length ?? 0;
  const totalEnrolled = scoped.reduce((s, c) => s + enrolledIn(c.id), 0);
  const totalCapacity = scoped.reduce((s, c) => s + c.capacity, 0);
  const ruleMix = { monthly: 0, per_session: 0, package: 0 };
  for (const c of scoped) ruleMix[classRule(c.id).kind]++;
  const openEdit = (c: ClassItem) => {
    setEdit(c);
    setDraft(classRule(c.id));
    setError("");
  };
  const counts = {
    all: scoped.length,
    Tutoring: scoped.filter((c) => c.kind === "Tutoring").length,
    "Language course": scoped.filter((c) => c.kind === "Language course").length,
  };

  return (
    <div className="mx-auto max-w-[90rem]">
      <PageHeader
        subtitle={t("{n} active classes · {e} enrollments", {
          n: fmtNum(scoped.length, lang),
          e: fmtNum(totalEnrolled, lang),
        })}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
            <Info className="size-3.5 shrink-0" />
            {t("Creating classes needs saved data, which isn't set up yet.")}
          </span>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat
          tone="brand"
          icon={Layers}
          label={t("Classes")}
          value={fmtNum(scoped.length, lang)}
          hint={t("{t} tutoring · {l} language", {
            t: fmtNum(counts.Tutoring, lang),
            l: fmtNum(counts["Language course"], lang),
          })}
        />
        <MiniStat
          tone="teal"
          icon={Users}
          label={t("Active enrollments")}
          value={fmtNum(totalEnrolled, lang)}
          hint={t("Across {n} seats", { n: fmtNum(totalCapacity, lang) })}
        />
        <MiniStat
          tone="lavender"
          icon={Repeat}
          label={t("Average fill")}
          value={
            totalCapacity ? (
              <bdi>{formatPercent(Math.round((totalEnrolled / totalCapacity) * 100), lang)}</bdi>
            ) : (
              "—"
            )
          }
          hint={t("Enrolled against capacity")}
        />
        <MiniStat
          tone="warning"
          icon={Receipt}
          label={t("Billing rules")}
          value={fmtNum(scoped.length, lang)}
          hint={t("{m} monthly · {s} per session · {p} package", {
            m: fmtNum(ruleMix.monthly, lang),
            s: fmtNum(ruleMix.per_session, lang),
            p: fmtNum(ruleMix.package, lang),
          })}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={kind} onValueChange={setKind} dir={lang === "ar" ? "rtl" : "ltr"}>
          <TabsList className="h-10">
            {(
              [
                ["all", "All"],
                ["Tutoring", "Tutoring"],
                ["Language course", "Language courses"],
              ] as const
            ).map(([v, label]) => (
              <TabsTrigger key={v} value={v} className="gap-1.5 px-3">
                {t(label)}
                <span className="rounded-full bg-muted px-1.5 text-meta font-medium text-muted-foreground num">
                  {fmtNum(counts[v], lang)}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <span className="text-xs text-muted-foreground">
          {branch === "all" ? t("All branches") : t(branch)}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="surface">
          <EmptyState icon={BookOpen} title={t("No classes in this branch")} />
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map((c) => (
            <ClassCard
              key={c.id}
              c={c}
              rule={classRule(c.id)}
              roster={roster.get(c.id) ?? []}
              onEdit={() => openEdit(c)}
            />
          ))}
        </div>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent dir={lang === "ar" ? "rtl" : "ltr"} className="max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("Billing rule")} · <bdi>{edit?.name}</bdi>
            </DialogTitle>
            <DialogDescription>
              {t(
                "Applies to future finalized sessions for students without their own rule. Posted charges are not recalculated. Demo only, not saved.",
              )}
            </DialogDescription>
          </DialogHeader>
          {edit && draft && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!ruleIsValid(draft)) {
                  setError(t("Every amount in a billing rule must be greater than zero."));
                  return;
                }
                setClassRule(edit.id, draft);
                toast.success(t("Billing rule updated in demo data"), {
                  description: `${edit.name} · ${ruleSummary(draft, t, lang)}`,
                });
                setEdit(null);
              }}
            >
              <RuleEditor value={draft} onChange={setDraft} fallbackFee={edit.fee} />
              <RuleEffects rule={draft} />
              <p className="text-xs text-muted-foreground">
                {t(
                  "Other class details (name, teacher, schedule) can't be edited until saved data is set up.",
                )}{" "}
                <Money value={edit.fee} /> · {localDays(edit.days, t)}
              </p>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEdit(null)}>
                  {t("Cancel")}
                </Button>
                <Button type="submit">{t("Save rule")}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClassCard({
  c,
  rule,
  roster,
  onEdit,
}: {
  c: ClassItem;
  rule: BillingRule;
  roster: { id: string; name: string }[];
  onEdit: () => void;
}) {
  const { t, lang } = useI18n();
  const teacher = useLedger().teacherById(c.teacherId) ?? {
    id: c.teacherId,
    name: "—",
    subject: "",
  };
  const tint = tintFor(teacher.subject);
  const n = roster.length;
  const fill = c.capacity ? (n / c.capacity) * 100 : 0;
  const level = levelOf(c.name);
  const KindIcon = c.kind === "Tutoring" ? BookOpen : LanguagesIcon;
  const RuleIcon =
    rule.kind === "monthly"
      ? CalendarDays
      : rule.kind === "per_session"
        ? CalendarCheck
        : PackageCheck;
  return (
    <article className="surface group flex min-w-0 flex-col overflow-hidden transition-colors hover:border-input">
      <div className="relative flex items-start justify-between gap-3 px-4 pt-4 pb-1">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <KindIcon className="size-4" />
        </span>
        <div className="flex items-center gap-1">
          <Pill tone="positive" dot>
            {t("Active")}
          </Pill>
          <DropdownMenu dir={lang === "ar" ? "rtl" : "ltr"}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground "
                aria-label={`${t("Class actions")} · ${c.name}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                {t("Edit billing rule")}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/attendance" search={{ classId: c.id }}>
                  <CalendarCheck />
                  {t("Take attendance")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 pt-3">
        <div className="flex items-center gap-1.5 text-meta font-medium text-muted-foreground">
          <span className={cn("size-1.5 shrink-0 rounded-full", tintDot[tint])} />
          <span>{t(teacher.subject)}</span>
          {level && (
            <>
              <span>·</span>
              <span>{t(level)}</span>
            </>
          )}
          <span>·</span>
          <span>{t(c.kind)}</span>
        </div>
        <h2 className="mt-1 line-clamp-2 min-h-11 break-words text-section-title font-medium leading-snug">
          <bdi>{c.name}</bdi>
        </h2>

        <div className="mt-3 flex items-center gap-2.5">
          <Avatar name={teacher.name} seed={teacher.id} size="sm" />
          <div className="min-w-0">
            <bdi className="block truncate text-ui font-medium">{teacher.name}</bdi>
            <div className="text-meta text-muted-foreground">{t("Teacher")}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-meta">
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
            <CalendarDays className="size-3.5 text-muted-foreground" />
            {localDays(c.days, t)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
            <Clock3 className="size-3.5 text-muted-foreground" />
            <bdi>{localTime(c.time, lang)}</bdi>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
            <MapPin className="size-3.5 text-muted-foreground" />
            {t(c.branch)}
          </span>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="mt-3 flex items-start gap-2.5 rounded-lg border border-dashed px-3 py-2.5 text-start transition-colors hover:border-primary/50 hover:bg-accent/50"
          aria-label={`${t("Edit billing rule")} · ${c.name}`}
        >
          <RuleIcon className="mt-0.5 size-4 shrink-0 text-brand" />
          <span className="min-w-0 flex-1">
            <span className="block text-ui font-medium">{ruleKindLabel(rule, t)}</span>
            <span className="block text-meta text-muted-foreground">
              {ruleSummary(rule, t, lang)}
            </span>
          </span>
          <Pencil className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </button>

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-meta font-medium text-muted-foreground">
                {t("Enrolled students")}
              </div>
              <div className="mt-0.5 text-base font-medium num">
                <bdi>
                  {fmtNum(n, lang)}
                  <span className="text-xs font-medium text-muted-foreground">
                    {" "}
                    / {fmtNum(c.capacity, lang)}
                  </span>
                </bdi>
              </div>
            </div>
            <div
              className="flex -space-x-2 rtl:space-x-reverse"
              aria-label={t("{n} students", { n: fmtNum(n, lang) })}
            >
              {roster.slice(0, 3).map((s) => (
                <Avatar
                  key={s.id}
                  name={s.name}
                  seed={s.id}
                  size="sm"
                  className="ring-2 ring-card"
                />
              ))}
              {n > 3 && (
                <span className="grid size-8 place-items-center rounded-full bg-muted text-meta font-medium text-muted-foreground ring-2 ring-card num">
                  +{fmtNum(n - 3, lang)}
                </span>
              )}
            </div>
          </div>
          <Meter
            className="mt-2"
            value={fill}
            tone={fill >= 90 ? "warning" : "brand"}
            label={t("Capacity")}
          />
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t pt-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/attendance" search={{ classId: c.id }}>
                <CalendarCheck />
                {t("Attendance")}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title={t("Edit billing rule")}
              aria-label={`${t("Edit billing rule")} · ${c.name}`}
              onClick={onEdit}
            >
              <Pencil />
              {t("Rule")}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
