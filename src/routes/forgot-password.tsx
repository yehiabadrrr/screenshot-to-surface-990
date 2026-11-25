import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { MailCheck, Send } from "lucide-react";
import { AuthLayout, Field, FormError, authErrorText } from "@/components/app/auth-layout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { pageHead } from "@/lib/head";

export const Route = createFileRoute("/forgot-password")({
  head: pageHead("Reset your password", "Get a link to reset your Markazly password."),
  component: ForgotPassword,
});

function ForgotPassword() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setError(t("Enter a valid email address.")); return; }
    setBusy(true);
    const { error: err } = await getBrowserSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    // Rate limits are worth reporting; anything else gets the same answer so accounts cannot be probed.
    if (err && /rate_limit/.test(err.code ?? "")) { setError(t(authErrorText(err))); return; }
    setSent(true);
  };

  return (
    <AuthLayout title={t("Reset your password")} subtitle={sent ? undefined : t("We will email you a link to choose a new password.")}
      footer={<Link to="/" className="font-medium text-brand hover:underline">{t("Back to sign in")}</Link>}>
      {sent ? (
        <div className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-positive" />
          <p>{t("If an account exists for {email}, a reset link is on its way. It expires after one hour.", { email: email.trim() })}</p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={submit} noValidate>
          <Field id="fp-email" label={t("Email")} type="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
          <FormError message={error} />
          <Button type="submit" className="h-10 w-full" disabled={busy}><Send className="rtl:-scale-x-100" />{busy ? t("Sending…") : t("Send reset link")}</Button>
        </form>
      )}
    </AuthLayout>
  );
}
