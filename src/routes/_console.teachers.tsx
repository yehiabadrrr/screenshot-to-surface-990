import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { GraduationCap, Phone, MapPin, BookOpen, Users, Info, Construction } from "lucide-react";
import { PageHeader, Pill, Avatar, MiniStat, EmptyState, tintClass, tintFor } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/lib/ledger-store";
import { useI18n } from "@/lib/i18n";
import { fmtNum, localDays, localTime } from "@/lib/l10n";
import { formatMoney } from "@/lib/format";
import { pageHead } from "@/lib/head";
import type { CompensationModel } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/teachers")({
  head: pageHead("Teacher Management", "Teaching staff, subjects, assigned classes and pay models in Markazly."),
  component: Page,
});

/** Describes a pay model from the catalog. It shows the agreement only; no payout is computed here. */
function modelText(m: CompensationModel, t: (k: string, v?: Record<string, string | number>) => string, lang: "en" | "ar") {
  switch (m.type) {
    case "monthly": return t("{amount} monthly salary", { amount: formatMoney(m.amount, lang) });
    case "per_session": return t("{amount} per session taught", { amount: formatMoney(m.amount, lang) });
    case "per_student": return t("{amount} per attending student", { amount: formatMoney(m.amount, lang) });
    case "percentage": return t("{pct}% of collected tuition", { pct: fmtNum(m.percent, lang) });
  }
}
const modelLabel: Record<CompensationModel["type"], string> = { monthly: "Monthly salary", per_session: "Per session", per_student: "Per student", percentage: "Revenue share" };

function Page() {
  const { t, lang } = useI18n();
  const { teachers, classes, students, branch } = useLedger();
  const scoped = teachers.filter((x) => branch === "all" || x.branch === branch);
  const activeByClass = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of students) if (s.status === "Active") for (const cid of s.classIds) m.set(cid, (m.get(cid) ?? 0) + 1);
    return m;
  }, [students]);
  const subjects = new Set(scoped.map((x) => x.subject)).size;
  const models = scoped.reduce<Record<string, number>>((acc, x) => { acc[x.model.type] = (acc[x.model.type] ?? 0) + 1; return acc; }, {});

  return (
    <div className="mx-auto max-w-[90rem]">
      <PageHeader subtitle={t("{n} teachers · {s} subjects", { n: fmtNum(scoped.length, lang), s: fmtNum(subjects, lang) })} />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-info/20 bg-info-soft px-4 py-3 text-sm">
        <Construction className="mt-0.5 size-4 shrink-0 text-info" />
        <div><div className="font-semibold">{t("Teacher management is next in line")}</div><p className="mt-0.5 text-[13px] text-muted-foreground">{t("This roster is read-only and comes from the class catalog. Adding teachers, payout settlement and payslips are not built yet. Accrued payables appear on Finance.")}</p></div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat tone="brand" icon={GraduationCap} label={t("Teachers")} value={fmtNum(scoped.length, lang)} hint={branch === "all" ? t("All branches") : t(branch)} />
        <MiniStat tone="teal" icon={BookOpen} label={t("Subjects")} value={fmtNum(subjects, lang)} hint={t("Taught across the center")} />
        <MiniStat tone="lavender" icon={Users} label={t("Revenue share")} value={fmtNum(models["percentage"] ?? 0, lang)} hint={t("Teachers paid a share of tuition")} />
        <MiniStat tone="warning" icon={Info} label={t("Fixed or per-unit pay")} value={fmtNum(scoped.length - (models["percentage"] ?? 0), lang)} hint={t("Salary, per session or per student")} />
      </div>

      {scoped.length === 0 ? <div className="surface"><EmptyState icon={GraduationCap} title={t("No teachers in this branch")} /></div> : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {scoped.map((x) => {
            const own = classes.filter((c) => c.teacherId === x.id);
            const enrolled = own.reduce((n, c) => n + (activeByClass.get(c.id) ?? 0), 0);
            const tint = tintFor(x.subject);
            return (
              <article key={x.id} className="surface flex min-w-0 flex-col overflow-hidden">
                <div className={cn("h-1.5", tintClass[tint].split(" ")[0])} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start gap-3">
                    <Avatar name={x.name} seed={x.id} size="lg" />
                    <div className="min-w-0 flex-1">
                      <bdi className="block truncate font-display text-base font-bold tracking-tight">{x.name}</bdi>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5"><span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", tintClass[tint])}>{t(x.subject)}</span><span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="size-3" />{t(x.branch)}</span></div>
                    </div>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild><a href={`tel:${x.phone}`} aria-label={`${t("Call")} · ${x.name}`} title={t("Call")}><Phone className="size-4" /></a></Button>
                  </div>

                  <div className="mt-4 rounded-lg border border-dashed px-3 py-2.5">
                    <div className="text-[11px] font-medium text-muted-foreground">{t("Pay model")}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2"><Pill tone="neutral">{t(modelLabel[x.model.type])}</Pill><span className="text-[13px] font-medium"><bdi>{modelText(x.model, t, lang)}</bdi></span></div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground"><span>{t("Assigned classes")}</span><span className="num">{t("{n} students", { n: fmtNum(enrolled, lang) })}</span></div>
                    <ul className="space-y-1.5">
                      {own.map((c) => (
                        <li key={c.id}>
                          <Link to="/attendance" search={{ classId: c.id }} className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs hover:bg-muted">
                            <BookOpen className="size-3.5 shrink-0 text-muted-foreground" /><bdi className="min-w-0 flex-1 truncate font-medium">{c.name}</bdi>
                            <span className="shrink-0 text-muted-foreground">{localDays(c.days, t)} · <bdi>{localTime(c.time, lang)}</bdi></span>
                          </Link>
                        </li>
                      ))}
                      {!own.length && <li className="text-xs text-muted-foreground">{t("No classes assigned")}</li>}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
