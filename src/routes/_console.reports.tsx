import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Download,
  Users,
  Receipt,
  CalendarCheck,
  GraduationCap,
  TrendingUp,
  Building2,
  FileSpreadsheet,
  ArrowUpRight,
  Construction,
} from "lucide-react";
import { PageHeader, Pill, IconTile, Panel, type Tone } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_console/reports")({
  head: pageHead("Reports & Analytics", "Reports and exports in Markazly."),
  component: Page,
});

const planned: { icon: typeof BarChart3; tone: Tone; title: string; body: string }[] = [
  {
    icon: TrendingUp,
    tone: "brand",
    title: "Revenue and collections by month",
    body: "Billed, collected and outstanding over time, per branch.",
  },
  {
    icon: Receipt,
    tone: "negative",
    title: "Receivables ageing",
    body: "What each student owes, grouped by how long it has been due.",
  },
  {
    icon: CalendarCheck,
    tone: "lavender",
    title: "Attendance by class and student",
    body: "Session-level attendance with absence patterns.",
  },
  {
    icon: GraduationCap,
    tone: "teal",
    title: "Teacher payouts",
    body: "Accrued and settled pay per teacher and period.",
  },
  {
    icon: Building2,
    tone: "warning",
    title: "Branch comparison",
    body: "Enrollment, revenue and attendance side by side.",
  },
  {
    icon: FileSpreadsheet,
    tone: "neutral",
    title: "Excel import and export",
    body: "Bring students in from a spreadsheet; export any report to Excel.",
  },
];

function Page() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-[90rem]">
      <PageHeader subtitle={t("Exports that work today, and the reports that come next")} />

      <Panel
        title={t("Available now")}
        subtitle={t("CSV exports built into existing screens; they follow the screen's filters")}
        icon={Download}
        className="mb-5"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <ExportCard
            icon={Users}
            tone="teal"
            title={t("Student list")}
            body={t(
              "Name, phone, classes, balance, attendance and status. Export from the Students page.",
            )}
            to="/students"
          />
          <ExportCard
            icon={Receipt}
            tone="positive"
            title={t("Transactions")}
            body={t(
              "Every payment, refund, discount and reversal in the selected month. Export from Finance.",
            )}
            to="/finance"
          />
        </div>
      </Panel>

      <div className="mb-3 flex items-center gap-2">
        <Construction className="size-4 text-muted-foreground" />
        <h2 className="text-section-title font-medium">{t("Planned reports")}</h2>
        <Pill tone="warning">{t("Not built yet")}</Pill>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {planned.map((r) => (
          <li
            key={r.title}
            aria-disabled
            className="flex gap-3 rounded-xl border border-dashed bg-card/50 p-4"
          >
            <IconTile icon={r.icon} tone={r.tone} className="opacity-70" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{t(r.title)}</span>
                <Pill tone="neutral">{t("Planned")}</Pill>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t(r.body)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExportCard({
  icon,
  tone,
  title,
  body,
  to,
}: {
  icon: typeof BarChart3;
  tone: Tone;
  title: string;
  body: string;
  to: "/students" | "/finance";
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-start gap-3 rounded-xl border p-4">
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link to={to}>
          {t("Open")}
          <ArrowUpRight className="rtl:-scale-x-100" />
        </Link>
      </Button>
    </div>
  );
}
