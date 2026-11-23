import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/ui";
import { useI18n } from "@/lib/i18n";
import { pageHead } from "@/lib/head";
import { centerProfile } from "@/lib/center-config";

export const Route = createFileRoute("/_console/settings")({
  head: pageHead("Settings", "Read-only demo center profile, branches and active language in CenterOS."),
  component: Page,
});

function Page() {
  const { t, lang } = useI18n();
  return <div className="mx-auto max-w-5xl">
    <PageHeader title={t("Settings")} subtitle={t("Read-only · demo data")} />
    <section className="border-b py-5">
      <h2 className="mb-4 text-section-title font-semibold">{t("Center profile")}</h2>
      <dl className="grid gap-5 sm:grid-cols-3">
        {[["Center name", centerProfile.name], ["Current user", centerProfile.currentUser.name], ["Role", t(centerProfile.currentUser.role)]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{t(label ?? "")}</dt><dd className="mt-1 text-sm font-medium"><bdi>{value}</bdi></dd></div>)}
      </dl>
    </section>
    <section className="border-b py-5"><h2 className="mb-4 text-section-title font-semibold">{t("Branches")}</h2><ul className="grid gap-3 text-sm sm:grid-cols-3">{centerProfile.branches.map((branch) => <li key={branch}><bdi>{branch}</bdi></li>)}</ul></section>
    <section className="py-5"><h2 className="mb-4 text-section-title font-semibold">{t("Language")}</h2><p className="text-sm">{lang === "ar" ? "العربية · RTL" : "English · LTR"}</p></section>
    <p className="mt-4 text-xs text-muted-foreground">{t("Sample data resets on refresh. Nothing is saved.")}</p>
  </div>;
}
