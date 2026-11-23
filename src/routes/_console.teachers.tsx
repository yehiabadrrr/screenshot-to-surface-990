import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, EmptyState } from "@/components/app/ui";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_console/teachers")({
  head: pageHead("Teacher Management", "Teacher Management in CenterOS."),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("Teacher Management")} />
      <Panel><EmptyState title={t("This page is next in line")} hint={t("It will be built in the next step.")} /></Panel>
    </div>
  );
}
