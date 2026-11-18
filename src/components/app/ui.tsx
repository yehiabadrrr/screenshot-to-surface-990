import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, bodyClass }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("surface overflow-hidden", className)}>
      {title && (
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClass)}>{children}</div>
    </section>
  );
}

export function Delta({ value, invert = false, suffix = "%" }: { value: number; invert?: boolean | undefined; suffix?: string }) {
  const good = invert ? value <= 0 : value >= 0;
  const Icon = value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium num", good ? "bg-positive-soft text-positive" : "bg-negative-soft text-destructive")}>
      <Icon className="size-3" />{Math.abs(value)}{suffix}
    </span>
  );
}

export function KpiCard({ label, value, delta, invert, spark, hint }: { label: string; value: string; delta: number; invert?: boolean | undefined; spark?: number[]; hint?: ReactNode }) {
  const { t } = useI18n();
  const good = invert ? delta <= 0 : delta >= 0;
  const color = good ? "var(--positive)" : "var(--destructive)";
  const id = label.replace(/\W/g, "");
  return (
    <div className="surface flex flex-col p-4">
      <div className="text-[13px] text-muted-foreground">{t(label)}</div>
      <div className="mt-1.5 whitespace-nowrap text-xl font-semibold tracking-tight text-foreground num">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground num">{hint}</div>}
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Delta value={delta} invert={invert} /> <span className="hidden xl:inline">{t("vs last month")}</span></div>
        {spark && (
          <div className="h-8 w-20">
            <ResponsiveContainer>
              <AreaChart data={spark.map((v) => ({ v }))}>
                <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity={0.25} /><stop offset="1" stopColor={color} stopOpacity={0} /></linearGradient></defs>
                <Area dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

const tones = {
  positive: "bg-positive-soft text-positive",
  negative: "bg-negative-soft text-destructive",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-accent text-brand",
};
export function Pill({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Money({ value, signed }: { value: number; signed?: boolean }) {
  const { lang } = useI18n();
  const v = Math.round(value);
  const s = lang === "ar" ? `${Math.abs(v).toLocaleString("ar-EG")} ج.م` : `EGP ${Math.abs(v).toLocaleString("en-US")}`;
  return <span className="num">{signed && v < 0 ? "−" : ""}{s}</span>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="py-12 text-center">
      <div className="text-sm font-medium text-foreground">{title}</div>
      {hint && <div className="mt-1 text-sm text-muted-foreground">{hint}</div>}
    </div>
  );
}

export const chartAxis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
export const tooltipStyle = { contentStyle: { borderRadius: 10, border: "1px solid var(--border)", boxShadow: "var(--shadow-pop)", fontSize: 12 } };
