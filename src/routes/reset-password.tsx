import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { KeyRound, Link2Off } from "lucide-react";
import { AuthLayout, Field, FormError, authErrorText } from "@/components/app/auth-layout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { pageHead } from "@/lib/head";

/** Landing page of the recovery email. Supabase signs the user in from the link, then they set a password. */
export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: pageHead("Choose a new password", "Set a new Markazly password."),
  component: ResetPassword,
});

function ResetPassword() {
  const { t } = useI18n();
  const { status } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("Use at least 8 characters."));
      return;
    }
    if (password !== confirm) {
      setError(t("The passwords do not match."));
      return;
    }
    setBusy(true);
    const { error: err } = await getBrowserSupabase().auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(t(authErrorText(err)));
      return;
    }
    toast.success(t("Password updated"));
    void navigate({ to: "/overview", replace: true });
  };

  if (status === "loading")
    return (
      <AuthLayout title={t("Choose a new password")}>
        <p className="text-sm text-muted-foreground">{t("Checking your link…")}</p>
      </AuthLayout>
    );
  if (status !== "signedIn") {
    return (
      <AuthLayout
        title={t("This link has expired")}
        footer={
          <Link to="/forgot-password" className="font-medium text-brand hover:underline">
            {t("Send a new link")}
          </Link>
        }
      >
        <div className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm">
          <Link2Off className="mt-0.5 size-5 shrink-0 text-destructive" />
          <p>{t("Reset links work once and expire after one hour. Ask for a new one.")}</p>
        </div>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title={t("Choose a new password")}>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field
          id="rp-new"
          label={t("New password")}
          type="password"
          autoComplete="new-password"
          dir="ltr"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={t("At least 8 characters.")}
        />
        <Field
          id="rp-confirm"
          label={t("Confirm new password")}
          type="password"
          autoComplete="new-password"
          dir="ltr"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <FormError message={error} />
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          <KeyRound />
          {busy ? t("Saving…") : t("Save password")}
        </Button>
      </form>
    </AuthLayout>
  );
}
