import type { ComponentType, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Inbox } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { formatMoney, formatPercent } from "@/lib/format";
import { initials } from "@/lib/center-config";

type Icon = ComponentType<{ className?: string | undefined }>;

/**
 * Page toolbar under the global header. The shell header owns the page <h1>; this row carries
 * the page's live context line (counts, period) and its primary actions.
 */
export function PageHeader({ title, subtitle, actions }: { title?: string | undefined; subtitle?: ReactNode | undefined; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {title && <h2 className="sr-only">{title}</h2>}
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, subtitle, action, children, className, bodyClass, icon: PanelIcon }: { title?: ReactNode | undefined; subtitle?: ReactNode | undefined; action?: ReactNode | undefined; children: ReactNode; className?: string | undefined; bodyClass?: string | undefined; icon?: Icon }) {
  return (
    <section className={cn("surface min-w-0 overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-5 pt-4 pb-3">
          <div className="flex min-w-0 flex-1 basis-48 items-start gap-2.5">
            {PanelIcon && <PanelIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
            <div className="min-w-0">
              {title && <h2 className="text-section-title font-semibold text-foreground">{title}</h2>}
              {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn("px-5 pb-5", !(title || action) && "pt-5", bodyClass)}>{children}</div>
    </section>
  );
}

export type Tone = "brand" | "teal" | "positive" | "negative" | "warning" | "info" | "lavender" | "coral" | "neutral";
const tileTones: Record<Tone, string> = {
  brand: "bg-tint-blue text-tint-blue-ink",
  teal: "bg-tint-teal text-tint-teal-ink",
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-destructive",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  lavender: "bg-tint-lavender text-tint-lavender-ink",
  coral: "bg-tint-coral text-tint-coral-ink",
  neutral: "bg-muted text-muted-foreground",
};
const barTones: Record<Tone, string> = {
  brand: "bg-brand", teal: "bg-teal-bright", positive: "bg-positive", negative: "bg-destructive", warning: "bg-warning",
  info: "bg-info", lavender: "bg-tint-lavender-ink", coral: "bg-tint-coral-ink", neutral: "bg-muted-foreground",
};

export function IconTile({ icon: TileIcon, tone = "brand", className }: { icon: Icon; tone?: Tone; className?: string | undefined }) {
  return <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", tileTones[tone], className)}><TileIcon className="size-[18px]" /></span>;
}

/** Horizontal meter. `value` is 0–100 and is clamped; callers pass real ratios only. */
export function Meter({ value, tone = "brand", label, className }: { value: number; tone?: Tone; label: string; className?: string | undefined }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-[width]", barTones[tone])} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Delta({ value, invert = false, suffix = "%" }: { value: number; invert?: boolean | undefined; suffix?: string }) {
  const good = invert ? value <= 0 : value >= 0;
  const DeltaIcon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold num", good ? "bg-positive-soft text-positive" : "bg-negative-soft text-destructive")}>
      <DeltaIcon className="size-3 rtl:-scale-x-100" /><bdi>{Math.abs(value)}{suffix}</bdi>
    </span>
  );
}

/**
 * Metric card: icon tile, optional delta chip, a prominent value, label, supporting line and an
 * optional real-ratio meter. Every number passed in must come from application state.
 */
export function StatCard({ icon, tone = "brand", label, value, hint, delta, meter, footer, className }: {
  icon: Icon; tone?: Tone; label: string; value: ReactNode; hint?: ReactNode | undefined;
  delta?: ReactNode | undefined; meter?: { value: number; label: string; caption?: ReactNode; tone?: Tone } | undefined; footer?: ReactNode | undefined; className?: string | undefined;
}) {
  return (
    <div className={cn("surface flex min-w-0 flex-col p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <IconTile icon={icon} tone={tone} />
        {delta}
      </div>
      <div className="mt-4 min-w-0 break-words font-display text-metric font-bold tracking-tight text-foreground num">{value}</div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      {meter && (
        <div className="mt-auto pt-4">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground"><span className="min-w-0 truncate">{meter.caption ?? meter.label}</span><span className="shrink-0 font-semibold text-foreground num"><bdi>{formatPercent(Math.round(meter.value))}</bdi></span></div>
          <Meter value={meter.value} tone={meter.tone ?? tone} label={meter.label} />
        </div>
      )}
      {footer && <div className="mt-auto pt-3 text-[11px] text-muted-foreground">{footer}</div>}
    </div>
  );
}

/** Compact tinted figure, used under charts and in finance breakdowns. */
export function MiniStat({ label, value, hint, tone = "neutral", icon: MiniIcon }: { label: string; value: ReactNode; hint?: ReactNode | undefined; tone?: Tone; icon?: Icon }) {
  return (
    <div className={cn("min-w-0 rounded-lg px-3.5 py-3", tileTones[tone].split(" ")[0])}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">{MiniIcon && <MiniIcon className={cn("size-3.5", tileTones[tone].split(" ")[1])} />}<span className="min-w-0 truncate">{label}</span></div>
      <div className="mt-1 break-words font-display text-metric-sm font-bold tracking-tight text-foreground num">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Kept for compatibility with existing imports. */
export function KpiCard({ label, value, delta, invert, spark, hint }: { label: string; value: string; delta: number; invert?: boolean | undefined; spark?: number[]; hint?: ReactNode | undefined }) {
  const { t } = useI18n();
  const good = invert ? delta <= 0 : delta >= 0;
  const color = good ? "var(--positive)" : "var(--destructive)";
  return (
    <div className="surface flex flex-col p-4">
      <div className="text-[13px] text-muted-foreground">{t(label)}</div>
      <div className="mt-1.5 break-words text-metric font-semibold text-foreground num">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground num">{hint}</div>}
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Delta value={delta} invert={invert} /> <span className="hidden xl:inline">{t("vs last month")}</span></div>
        {spark && (
          <div className="h-8 w-20">
            <ResponsiveContainer>
              <AreaChart data={spark.map((v) => ({ v }))}>
                <Area dataKey="v" stroke={color} strokeWidth={1.5} fill="none" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

const pillTones: Record<Tone, string> = {
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-destructive",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-tint-blue text-tint-blue-ink",
  teal: "bg-tint-teal text-tint-teal-ink",
  info: "bg-info-soft text-info",
  lavender: "bg-tint-lavender text-tint-lavender-ink",
  coral: "bg-tint-coral text-tint-coral-ink",
};
export function Pill({ tone = "neutral", dot = false, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string | undefined }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", pillTones[tone], className)}>
      {dot && <span className={cn("size-1.5 shrink-0 rounded-full", barTones[tone])} />}
      {children}
    </span>
  );
}

export function Money({ value, signed }: { value: number; signed?: boolean }) {
  const { lang } = useI18n();
  return <bdi className="num">{formatMoney(value, lang, signed)}</bdi>;
}

export function EmptyState({ title, hint, icon: EmptyIcon = Inbox, action, compact = false }: { title: string; hint?: string | undefined; icon?: Icon; action?: ReactNode | undefined; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "py-8" : "py-12")}>
      <span className="mb-3 grid size-11 place-items-center rounded-full bg-muted text-muted-foreground"><EmptyIcon className="size-5" /></span>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Deterministic pastel per name, so a person or class keeps the same color everywhere. */
export const TINTS = ["blue", "teal", "lavender", "amber", "coral", "rose"] as const;
export type Tint = (typeof TINTS)[number];
export const tintFor = (key: string): Tint => {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS.at(h % TINTS.length) ?? "blue";
};
export const tintClass: Record<Tint, string> = {
  blue: "bg-tint-blue text-tint-blue-ink",
  teal: "bg-tint-teal text-tint-teal-ink",
  lavender: "bg-tint-lavender text-tint-lavender-ink",
  amber: "bg-tint-amber text-tint-amber-ink",
  coral: "bg-tint-coral text-tint-coral-ink",
  rose: "bg-tint-rose text-tint-rose-ink",
};

export function Avatar({ name, seed, size = "md", className }: { name: string; seed?: string; size?: "xs" | "sm" | "md" | "lg" | "xl"; className?: string | undefined }) {
  const sizes = { xs: "size-6 text-[10px]", sm: "size-8 text-[11px]", md: "size-9 text-xs", lg: "size-12 text-sm", xl: "size-16 text-lg" };
  return <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full font-semibold", sizes[size], tintClass[tintFor(seed ?? name)], className)}>{initials(name)}</span>;
}

export const chartAxis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
export const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: "1px solid var(--border)", boxShadow: "var(--shadow-pop)", fontSize: 12, background: "var(--popover)", color: "var(--popover-foreground)" },
  labelStyle: { color: "var(--muted-foreground)", fontWeight: 500 },
};
