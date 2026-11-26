import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Building2, MapPin, Languages, Palette, Database, Lock, Sun, Moon, Check } from "lucide-react";
import { PageHeader, Avatar, Pill } from "@/components/app/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n, type Lang } from "@/lib/i18n";
import { useTheme, type Theme } from "@/lib/theme";
import { pageHead } from "@/lib/head";
import { initials } from "@/lib/center-config";
import { useLedger } from "@/lib/ledger-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_console/settings")({
  head: pageHead("Settings", "Read-only demo center profile, branches, language and appearance in Markezly."),
  component: Page,
});

function Page() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { centerName, branches, currentUser } = useLedger();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader subtitle={t("Read-only · demo data")} />
      <div className="space-y-5">
        <Section icon={Building2} title={t("Center profile")} hint={t("Shown across Markezly. Editing needs saved data, which isn't set up yet.")} locked>
          <div className="mb-5 flex items-center gap-4">
            <span className="grid size-14 place-items-center rounded-xl bg-tint-teal font-display text-lg font-bold text-tint-teal-ink">{initials(centerName)}</span>
            <div><bdi className="block font-display text-lg font-bold">{centerName}</bdi><div className="text-xs text-muted-foreground">{t("{n} branches", { n: branches.length })}</div></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnly id="center-name" label={t("Center name")} value={centerName} />
            <div className="space-y-1.5">
              <Label htmlFor="current-user">{t("Current user")}</Label>
              <div className="flex items-center gap-2.5 rounded-md border bg-muted/40 px-3 py-1.5"><Avatar name={currentUser.name} size="sm" /><div className="min-w-0"><bdi id="current-user" className="block truncate text-sm font-medium">{currentUser.name}</bdi><div className="text-[11px] text-muted-foreground">{t(currentUser.role)}</div></div></div>
            </div>
          </div>
        </Section>

        <Section icon={MapPin} title={t("Branches")} hint={t("Every financial figure can be filtered by branch.")} locked>
          <ul className="grid gap-3 sm:grid-cols-3">
            {branches.map((b) => <li key={b} className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5"><span className="grid size-8 place-items-center rounded-md bg-tint-blue text-tint-blue-ink"><MapPin className="size-4" /></span><bdi className="text-sm font-medium">{t(b)}</bdi></li>)}
          </ul>
        </Section>

        <Section icon={Languages} title={t("Language")} hint={t("Switches immediately. Arabic uses right-to-left layout; names stay as entered.")}>
          <div role="radiogroup" aria-label={t("Language")} className="grid gap-3 sm:grid-cols-2">
            {([["en", "English", "LTR · English interface"], ["ar", "العربية", "RTL · واجهة عربية"]] as const).map(([value, label, hint]) => (
              <Choice key={value} selected={lang === value} onSelect={() => setLang(value as Lang)} title={label} hint={hint} />
            ))}
          </div>
        </Section>

        <Section icon={Palette} title={t("Appearance")} hint={t("Saved in this browser.")}>
          <div role="radiogroup" aria-label={t("Appearance")} className="grid gap-3 sm:grid-cols-2">
            {([["light", "Light mode", Sun], ["dark", "Dark mode", Moon]] as const).map(([value, label, Icon]) => (
              <Choice key={value} selected={theme === value} onSelect={() => setTheme(value as Theme)} title={t(label)} icon={<Icon className="size-4" />} />
            ))}
          </div>
        </Section>

        <Section icon={Database} title={t("Data")}>
          <div className="flex items-start gap-3 rounded-lg bg-warning-soft px-4 py-3 text-sm"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-warning" /><div><div className="font-semibold">{t("Demo data")}</div><p className="mt-0.5 text-[13px] text-muted-foreground">{t("Sample data resets on refresh. Nothing is saved.")}</p></div></div>
        </Section>
      </div>
    </div>
  );
}

function Section({ icon: SIcon, title, hint, locked = false, children }: { icon: typeof Building2; title: string; hint?: string; locked?: boolean; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <section className="surface grid gap-5 p-5 md:grid-cols-[15rem_minmax(0,1fr)] md:p-6">
      <div>
        <div className="flex items-center gap-2"><SIcon className="size-4 text-muted-foreground" /><h2 className="text-section-title font-semibold">{title}</h2></div>
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
        {locked && <Pill tone="neutral" className="mt-2"><Lock className="size-3" />{t("Read-only")}</Pill>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function ReadOnly({ id, label, value }: { id: string; label: string; value: string }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} readOnly disabled className="bg-muted/40 disabled:opacity-100" /></div>;
}

function Choice({ selected, onSelect, title, hint, icon }: { selected: boolean; onSelect: () => void; title: string; hint?: string; icon?: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onSelect}
      className={cn("flex items-center gap-3 rounded-lg border px-4 py-3 text-start transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring", selected ? "border-primary bg-accent ring-1 ring-primary" : "hover:bg-muted/50")}>
      {icon && <span className="grid size-8 place-items-center rounded-md bg-muted">{icon}</span>}
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span>{hint && <span className="block text-xs text-muted-foreground">{hint}</span>}</span>
      <span className={cn("grid size-5 place-items-center rounded-full border", selected && "border-primary bg-primary text-primary-foreground")}>{selected && <Check className="size-3" />}</span>
    </button>
  );
}
