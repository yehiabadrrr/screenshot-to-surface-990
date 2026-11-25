import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Send, LayoutTemplate, Users, Construction, CheckCircle2, UserRound, ListChecks } from "lucide-react";
import { PageHeader, Pill, Panel, IconTile, Avatar, Money, EmptyState } from "@/components/app/ui";
import { Button } from "@/components/ui/button";
import { useLedger } from "@/lib/ledger-store";
import { useAttention } from "@/lib/attention";
import { useI18n } from "@/lib/i18n";
import { fmtNum } from "@/lib/l10n";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/_console/communications")({
  head: pageHead("Communications", "WhatsApp click-to-chat with guardians and students in Markazly."),
  component: Page,
});

function Page() {
  const { t, lang } = useI18n();
  const { findStudent } = useLedger();
  const a = useAttention();
  const owing = a.owing.map(([id, value]) => ({ s: findStudent(id), id, value })).filter((x) => x.s?.guardianPhone).slice(0, 8);
  return (
    <div className="mx-auto max-w-[90rem]">
      <PageHeader subtitle={t("WhatsApp click-to-chat works today; templates and bulk messaging come next")} />

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title={t("Balance reminders")} subtitle={t("Guardians of students with an outstanding balance at the end of the selected period")} icon={MessageCircle} bodyClass="px-0 pb-1"
          action={<Pill tone="positive" dot>{t("Available now")}</Pill>}>
          {owing.length ? (
            <ul className="divide-y border-t">
              {owing.map(({ s, id, value }) => s && (
                <li key={id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={s.name} seed={id} />
                  <div className="min-w-0 flex-1"><Link to="/students/$id" params={{ id }} className="block truncate text-sm font-semibold hover:text-brand"><bdi>{s.name}</bdi></Link><div className="truncate text-xs text-muted-foreground">{t("Guardian")}: <bdi>{s.guardian}</bdi> · <bdi dir="ltr">{s.guardianPhone}</bdi></div></div>
                  <span className="hidden shrink-0 text-sm font-semibold text-destructive sm:block"><Money value={value} /></span>
                  <Button asChild size="sm" variant="outline" className="shrink-0"><a href={`https://wa.me/2${s.guardianPhone}`} target="_blank" rel="noreferrer"><MessageCircle className="text-positive" />{t("WhatsApp")}</a></Button>
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={CheckCircle2} title={t("No outstanding balances")} compact />}
          {a.owing.length > owing.length && <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">{t("{n} more students with a balance", { n: fmtNum(a.owing.length - owing.length, lang) })} · <Link to="/students" className="font-medium text-brand hover:underline">{t("Open students")}</Link></p>}
          <p className="border-t px-5 py-2.5 text-[11px] text-muted-foreground">{t("Opens WhatsApp with the guardian's number. Nothing is sent from Markazly and nothing is logged.")}</p>
        </Panel>

        <div className="space-y-5">
          <Panel title={t("Where click-to-chat lives")} icon={ListChecks}>
            <ul className="space-y-3 text-sm">
              {[["Student profile", "Student and guardian WhatsApp buttons", UserRound], ["Students directory", "WhatsApp reminder in the row menu for owing students", Users], ["Overview", "Reminder button beside each outstanding balance", MessageCircle]].map(([title, body, Icon]) => (
                <li key={title as string} className="flex gap-3"><IconTile icon={Icon as typeof Users} tone="positive" className="size-8 [&_svg]:size-4" /><div><div className="font-medium">{t(title as string)}</div><div className="text-xs text-muted-foreground">{t(body as string)}</div></div></li>
              ))}
            </ul>
          </Panel>
          <Panel title={t("Coming next")} icon={Construction} action={<Pill tone="warning">{t("Not built yet")}</Pill>}>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3"><IconTile icon={LayoutTemplate} tone="neutral" className="size-8 [&_svg]:size-4" /><div><div className="font-medium">{t("Message templates")}</div><div className="text-xs text-muted-foreground">{t("Reusable Arabic and English reminders with the student's balance filled in.")}</div></div></li>
              <li className="flex gap-3"><IconTile icon={Send} tone="neutral" className="size-8 [&_svg]:size-4" /><div><div className="font-medium">{t("Bulk messaging and history")}</div><div className="text-xs text-muted-foreground">{t("Send to a filtered group and keep a record of what was sent.")}</div></div></li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
