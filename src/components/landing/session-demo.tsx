import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n";

/**
 * Landing-page illustration of the product's core loop: marking attendance posts a
 * charge, and un-marking appends a reversal instead of deleting anything.
 * Self-contained marketing demo; it does not touch the app's ledger store.
 */

const FEE = 80;

const STUDENTS = [
  { en: "Omar Fathy", ar: "عمر فتحي" },
  { en: "Malak Farouk", ar: "ملك فاروق" },
  { en: "Seif Hassan", ar: "سيف حسن" },
  { en: "Jana Mansour", ar: "جنى منصور" },
];

const COPY = {
  en: {
    cls: "Physics · Thanaweya 3",
    meta: `Wed 6:00 PM · EGP ${FEE} per attended session`,
    hint: "Tap a student. Tap again to undo.",
    present: "Present",
    register: "Register",
    ledger: "Ledger",
    charge: "Session charge",
    reversal: "Reversal of",
    reason: "marked by mistake",
    billed: "Billed tonight",
    lines: (n: number) => `${n} ${n === 1 ? "entry" : "entries"} · none edited`,
    empty: "Nothing posted yet. Mark a student present.",
  },
  ar: {
    cls: "فيزياء · تالتة ثانوي",
    meta: `الأربعاء 6:00 م · ${FEE} ج.م للحصة`,
    hint: "اضغط على اسم الطالب. اضغط تاني للتراجع.",
    present: "حاضر",
    register: "كشف الحضور",
    ledger: "دفتر الحسابات",
    charge: "رسوم حصة",
    reversal: "إلغاء",
    reason: "اتسجّل بالغلط",
    billed: "المستحق الليلة",
    lines: (n: number) => `${n} قيد · ولا قيد اتعدّل`,
    empty: "لسه مفيش قيود. سجّل طالب حاضر.",
  },
} as const;

interface Line {
  id: string;
  kind: "charge" | "reversal";
  student: number;
  amount: number;
  reverses?: string;
}

export const mono = "font-['IBM_Plex_Mono',ui-monospace,monospace]";

export function SessionDemo({ lang }: { lang: Lang }) {
  const c = COPY[lang];
  const [next, setNext] = useState(2043);
  const [open, setOpen] = useState<Record<number, string | undefined>>({
    0: "INV-2041",
    2: "INV-2042",
  });
  const [lines, setLines] = useState<Line[]>([
    { id: "INV-2042", kind: "charge", student: 2, amount: FEE },
    { id: "INV-2041", kind: "charge", student: 0, amount: FEE },
  ]);

  const toggle = (i: number) => {
    const charged = open[i];
    if (charged) {
      const id = `REV-${next}`;
      setLines((l) => [{ id, kind: "reversal", student: i, amount: FEE, reverses: charged }, ...l]);
      setOpen((o) => ({ ...o, [i]: undefined }));
    } else {
      const id = `INV-${next}`;
      setLines((l) => [{ id, kind: "charge", student: i, amount: FEE }, ...l]);
      setOpen((o) => ({ ...o, [i]: id }));
    }
    setNext((n) => n + 1);
  };

  const billed = lines.reduce((s, l) => s + (l.kind === "charge" ? l.amount : -l.amount), 0);

  return (
    <div className="grid overflow-hidden rounded-2xl border border-navy/10 bg-card shadow-[0_30px_80px_-30px_oklch(0.288_0.064_256.5/0.45)] sm:grid-cols-[0.9fr_1.1fr]">
      {/* Register: the paper attendance sheet every center already keeps. */}
      <div className="min-w-0 border-b border-navy/10 p-5 sm:border-e sm:border-b-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {c.register}
        </div>
        <div className="mt-1 font-display text-base font-bold text-foreground">{c.cls}</div>
        <div className="text-xs text-muted-foreground">{c.meta}</div>
        <ul className="mt-4 border-t border-dashed border-navy/15">
          {STUDENTS.map((s, i) => {
            const on = Boolean(open[i]);
            return (
              <li key={s.en} className="border-b border-dashed border-navy/15">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(i)}
                  className="flex w-full items-center gap-3 py-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 rounded-sm"
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-md border transition-colors",
                      on
                        ? "border-positive bg-positive text-positive-foreground"
                        : "border-navy/25 bg-background",
                    )}
                  >
                    {on && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 text-sm font-medium text-foreground">{s[lang]}</span>
                  <span
                    className={cn(
                      "text-xs",
                      on ? "font-semibold text-positive" : "text-muted-foreground/60",
                    )}
                  >
                    {on ? c.present : "—"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">{c.hint}</p>
      </div>

      {/* Ledger tape: append-only, newest first. */}
      <div className="flex min-h-[19rem] min-w-0 flex-col bg-muted/50 p-5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {c.ledger}
        </div>
        <ol
          aria-live="polite"
          className="mt-3 max-h-56 flex-1 space-y-1.5 overflow-y-auto pe-1 [mask-image:linear-gradient(to_bottom,black_75%,transparent)]"
        >
          {lines.length === 0 && <li className="text-xs text-muted-foreground">{c.empty}</li>}
          {lines.map((l) => (
            <li
              key={l.id}
              className={cn(
                "rounded-lg border bg-card px-3 py-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300",
                l.kind === "reversal" ? "border-warning/40" : "border-navy/10",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className={mono + " " + cn("text-[11px] text-muted-foreground")} dir="ltr">
                  {l.id}
                </span>
                <span
                  className={
                    mono +
                    " " +
                    cn(
                      "text-sm font-semibold",
                      l.kind === "reversal" ? "text-warning" : "text-foreground",
                    )
                  }
                  dir="ltr"
                >
                  {l.kind === "reversal" ? "−" : "+"}
                  {l.amount}
                </span>
              </div>
              <div className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                {l.kind === "reversal" && (
                  <RotateCcw className="mt-0.5 size-3 shrink-0 text-warning" />
                )}
                <span className="min-w-0">
                  {STUDENTS[l.student]![lang]} ·{" "}
                  {l.kind === "reversal" ? (
                    <>
                      {c.reversal} <bdi className={mono}>{l.reverses}</bdi> · {c.reason}
                    </>
                  ) : (
                    c.charge
                  )}
                </span>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-navy/15 pt-3">
          <div>
            <div className="text-xs text-muted-foreground">{c.billed}</div>
            <div className="text-[11px] text-muted-foreground/80">{c.lines(lines.length)}</div>
          </div>
          <div
            className={
              mono + " " + cn("shrink-0 whitespace-nowrap text-2xl font-semibold text-foreground")
            }
            dir="ltr"
          >
            {lang === "ar" ? `${billed} ج.م` : `EGP ${billed}`}
          </div>
        </div>
      </div>
    </div>
  );
}
