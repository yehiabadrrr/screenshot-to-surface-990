import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, EmptyState } from "@/components/app/ui";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_console/communications")({
  head: pageHead("Communications", "Communications in CenterOS."),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={t("Communications")} />
      <Panel><EmptyState title="This page is next in line" hint="It will be built in the next step." /></Panel>
    </div>
  );
}
