import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { LogIn } from "lucide-react";
import { AuthLayout, Field, FormError, authErrorText } from "@/components/app/auth-layout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Only same-origin paths are accepted as a post-sign-in destination. */
const safeRedirect = (value: unknown) => (typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/overview");

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => (typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {}),
  head: () => ({
    meta: [
      { title: "Sign in — Markazly" },
      { name: "description", content: "Sign in to Markazly to manage students, attendance, payments and teacher payouts." },
      { property: "og:title", content: "Sign in — Markazly" },
      { property: "og:description", content: "Education center management and financial operations for Egypt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignIn,
});

function SignIn() {
  const { t } = useI18n();
  const { status } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const target = safeRedirect(search.redirect);

  useEffect(() => { if (status === "signedIn") void navigate({ href: target, replace: true }); }, [status, navigate, target]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError(t("Enter your email and password.")); return; }
    setBusy(true);
    const { error: err } = await getBrowserSupabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) { setError(t(authErrorText(err))); return; }
    void navigate({ href: target, replace: true });
  };

  return (
    <AuthLayout title={t("Welcome back")} subtitle={t("Sign in to manage your center.")}
      footer={<>{t("New to Markazly?")} <Link to="/signup" className="font-medium text-brand hover:underline">{t("Create an account")}</Link></>}>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field id="email" label={t("Email")} type="email" autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="space-y-1.5">
          <Field id="password" label={t("Password")} type="password" autoComplete="current-password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="text-end"><Link to="/forgot-password" className="text-xs font-medium text-brand hover:underline">{t("Forgot password?")}</Link></div>
        </div>
        <FormError message={error} />
        <Button type="submit" className="h-10 w-full" disabled={busy}><LogIn />{busy ? t("Signing in…") : t("Sign in")}</Button>
      </form>
    </AuthLayout>
  );
}
