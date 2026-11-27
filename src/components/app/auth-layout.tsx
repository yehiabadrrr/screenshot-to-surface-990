import type { ComponentProps, ReactNode } from "react";
import { Languages, ShieldCheck, Users, Wallet } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";

/** Two-column layout shared by sign-in, registration, password recovery and onboarding. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  footer?: ReactNode | undefined;
}) {
  const { t, lang, setLang } = useI18n();
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo className="size-8" />
            <span className="text-base font-medium">Markazly</span>
          </div>
          <Button
            variant="ghost"
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Languages className="size-4" />
            {lang === "en" ? "العربية" : "English"}
          </Button>
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="text-2xl font-medium">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
          {!isSupabaseConfigured ? (
            <p
              role="alert"
              className="mt-6 rounded-lg border border-warning/40 bg-warning-soft px-3 py-2.5 text-sm text-foreground"
            >
              {t(
                "Sign-in is not configured on this deployment. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
              )}
            </p>
          ) : (
            <div className="mt-8">{children}</div>
          )}
          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
      <div className="hidden border-s bg-muted/60 p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto w-full max-w-md">
          <p className="text-3xl font-medium leading-tight text-foreground">
            {t("Every pound, every session, every student — in one place.")}
          </p>
          <ReceiptPreview />
          <ul className="mt-10 space-y-3 text-sm text-muted-foreground">
            {(
              [
                [Users, "Students and guardians in one directory"],
                [Wallet, "Payments, balances and collections"],
                [ShieldCheck, "Each center's data is private to its team"],
              ] as const
            ).map(([Icon, text]) => (
              <li key={text} className="flex items-center gap-2.5">
                <Icon className="size-4 shrink-0" />
                {t(text)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Illustration only (aria-hidden): what a recorded payment looks like in Markazly. Not account data. */
function ReceiptPreview() {
  const { t, lang } = useI18n();
  return (
    <div
      aria-hidden
      className="mt-10 max-w-sm rotate-[-1.5deg] rounded-xl border bg-card p-5 shadow-pop rtl:rotate-[1.5deg]"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{t("Payment received")}</span>
        <span className="ledger-code" dir="ltr">
          PAY-0193
        </span>
      </div>
      <div className="mt-3 text-metric font-medium text-foreground num">
        <bdi>{formatMoney(850, lang)}</bdi>
      </div>
      <div className="mt-4 space-y-2 border-t border-dashed pt-4 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{t("Student")}</span>
          <span className="flex items-center gap-1.5">
            <span className="ledger-code" dir="ltr">
              S-1042
            </span>
            {t("Omar Hassan")}
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{t("Method")}</span>
          <span>{t("Cash")}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{t("Balance")}</span>
          <span className="text-positive">{t("Settled")}</span>
        </div>
      </div>
    </div>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  className,
  ...input
}: ComponentProps<typeof Input> & {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="h-10"
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="rounded-md bg-negative-soft px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

/** Maps Supabase Auth error codes to plain-language keys (translated by the caller). */
export function authErrorText(
  error: { code?: string | undefined; message?: string | undefined } | null | undefined,
): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "Email or password is incorrect.";
    case "email_not_confirmed":
      return "Confirm your email first: open the link we sent you.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Sign in instead.";
    case "weak_password":
      return "Choose a stronger password (at least 8 characters).";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a minute and try again.";
    case "same_password":
      return "Choose a password different from your current one.";
    default:
      return error?.message ? "Something went wrong. Try again." : "";
  }
}
