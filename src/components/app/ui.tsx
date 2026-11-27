import type { ComponentType, ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { formatMoney, formatPercent } from "@/lib/format";
import { initials } from "@/lib/center-config";

type Icon = ComponentType<{ className?: string | undefined }>;

/**
 * Page toolbar under the global header. The shell header owns the page <h1>; this row carries
 * the page's live context line (counts, period) and its primary actions.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title?: string | undefined;
  subtitle?: ReactNode | undefined;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        {title && <h2 className="sr-only">{title}</h2>}
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClass,
}: {
  title?: ReactNode | undefined;
  subtitle?: ReactNode | undefined;
  action?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
  bodyClass?: string | undefined;
  icon?: Icon;
}) {
  return (
    <section className={cn("surface min-w-0 overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-5 pt-4 pb-3">
          <div className="min-w-0 flex-1 basis-48">
            {title && <h2 className="text-section-title font-medium text-foreground">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn("px-5 pb-5", !(title || action) && "pt-5", bodyClass)}>{children}</div>
    </section>
  );
}

export type Tone =
  | "brand"
  | "teal"
  | "positive"
  | "negative"
  | "warning"
  | "info"
  | "lavender"
  | "coral"
  | "neutral";
/** Icons stay in the text roles; only semantic tones keep their meaning color. */
const iconInk: Record<Tone, string> = {
  brand: "text-muted-foreground",
  teal: "text-muted-foreground",
  lavender: "text-muted-foreground",
  coral: "text-muted-foreground",
  info: "text-muted-foreground",
  neutral: "text-muted-foreground",
  positive: "text-positive",
  negative: "text-destructive",
  warning: "text-warning",
};
const barTones: Record<Tone, string> = {
  brand: "bg-brand",
  teal: "bg-brand",
  positive: "bg-positive",
  negative: "bg-destructive",
  warning: "bg-warning",
  info: "bg-brand",
  lavender: "bg-muted-foreground",
  coral: "bg-muted-foreground",
  neutral: "bg-muted-foreground",
};

export function IconTile({
  icon: TileIcon,
  tone = "brand",
  className,
}: {
  icon: Icon;
  tone?: Tone;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg bg-muted",
        iconInk[tone],
        className,
      )}
    >
      <TileIcon className="size-4" />
    </span>
  );
}

/** Horizontal meter. `value` is 0–100 and is clamped; callers pass real ratios only. */
export function Meter({
  value,
  tone = "brand",
  label,
  className,
}: {
  value: number;
  tone?: Tone;
  label: string;
  className?: string | undefined;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width]", barTones[tone])}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

/** A change, said in words: arrow, size and (optionally) what it compares to. */
export function Delta({
  value,
  invert = false,
  suffix = "%",
  vs,
}: {
  value: number;
  invert?: boolean | undefined;
  suffix?: string;
  vs?: string | undefined;
}) {
  const good = invert ? value <= 0 : value >= 0;
  const DeltaIcon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 text-xs">
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-medium num",
          good ? "text-positive" : "text-destructive",
        )}
      >
        <DeltaIcon className="size-3.5 rtl:-scale-x-100" />
        <bdi>
          {Math.abs(value)}
          {suffix}
        </bdi>
      </span>
      {vs && <span className="text-muted-foreground">{vs}</span>}
    </span>
  );
}

/**
 * Metric card: a label, a figure, then its change and one supporting line. Numbers only: no icon tile,
 * no sparkline. `meter` is shown as its caption and percentage. Every number must come from application state.
 */
export function StatCard({
  label,
  value,
  hint,
  delta,
  meter,
  footer,
  className,
}: {
  icon?: Icon;
  tone?: Tone;
  label: string;
  value: ReactNode;
  hint?: ReactNode | undefined;
  delta?: ReactNode | undefined;
  meter?: { value: number; label: string; caption?: ReactNode; tone?: Tone } | undefined;
  footer?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("surface flex min-w-0 flex-col p-5", className)}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 min-w-0 break-words text-metric font-medium text-foreground num">
        {value}
      </div>
      {delta && <div className="mt-1">{delta}</div>}
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      {meter && (
        <div className="mt-1 text-xs text-muted-foreground">
          {meter.caption ?? meter.label} ·{" "}
          <bdi className="font-medium text-foreground num">
            {formatPercent(Math.round(meter.value))}
          </bdi>
        </div>
      )}
      {footer && <div className="mt-auto pt-3 text-xs text-muted-foreground">{footer}</div>}
    </div>
  );
}

/** Compact figure, used under charts and in breakdowns: label, value, one quiet line. */
export function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode | undefined;
  tone?: Tone;
  icon?: Icon;
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-metric-sm font-medium text-foreground num">{value}</div>
      {hint && <div className="mt-0.5 text-meta text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** Kept for compatibility with existing imports. */
export function KpiCard({
  label,
  value,
  delta,
  invert,
  hint,
}: {
  label: string;
  value: string;
  delta: number;
  invert?: boolean | undefined;
  spark?: number[];
  hint?: ReactNode | undefined;
}) {
  const { t } = useI18n();
  return (
    <StatCard
      label={t(label)}
      value={value}
      hint={hint}
      delta={<Delta value={delta} invert={invert} vs={t("vs last month")} />}
    />
  );
}

const pillTones: Record<Tone, string> = {
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-destructive",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-info-soft text-brand",
  info: "bg-info-soft text-brand",
  teal: "bg-muted text-muted-foreground",
  lavender: "bg-muted text-muted-foreground",
  coral: "bg-muted text-muted-foreground",
};
export function Pill({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-meta font-medium",
        pillTones[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 shrink-0 rounded-full", barTones[tone])} />}
      {children}
    </span>
  );
}

/** Signature: a student or ledger code, stamped like a register number. */
export function LedgerCode({ code, className }: { code: string; className?: string | undefined }) {
  return (
    <bdi dir="ltr" className={cn("ledger-code", className)}>
      {code}
    </bdi>
  );
}

export function Money({ value, signed }: { value: number; signed?: boolean }) {
  const { lang } = useI18n();
  return <bdi className="num">{formatMoney(value, lang, signed)}</bdi>;
}

export function EmptyState({
  title,
  hint,
  icon: EmptyIcon = Inbox,
  action,
  compact = false,
}: {
  title: string;
  hint?: string | undefined;
  icon?: Icon;
  action?: ReactNode | undefined;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "py-8" : "py-12")}>
      <span className="mb-3 grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground">
        <EmptyIcon className="size-[18px]" />
      </span>
      <div className="text-sm font-medium text-foreground">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-sm text-muted-foreground">{hint}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Deterministic category hue per key (a subject keeps its color). Shown only as a small dot (tintDot). */
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

export const tintDot: Record<Tint, string> = {
  blue: "bg-tint-blue-ink",
  teal: "bg-tint-teal-ink",
  lavender: "bg-tint-lavender-ink",
  amber: "bg-tint-amber-ink",
  coral: "bg-tint-coral-ink",
  rose: "bg-tint-rose-ink",
};

/** Initials on a neutral disc. `seed` is kept for compatibility. */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  seed?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string | undefined;
}) {
  const sizes = {
    xs: "size-6 text-meta",
    sm: "size-8 text-meta",
    md: "size-9 text-xs",
    lg: "size-12 text-sm",
    xl: "size-16 text-lg",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-muted font-medium text-muted-foreground ring-1 ring-border ring-inset",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export const chartAxis = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  tickLine: false,
  axisLine: false,
} as const;
export const tooltipStyle = {
  contentStyle: {
    borderRadius: 8,
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow-pop)",
    fontSize: 12,
    background: "var(--popover)",
    color: "var(--popover-foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontWeight: 500 },
};
