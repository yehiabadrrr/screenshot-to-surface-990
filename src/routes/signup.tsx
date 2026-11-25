import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MailCheck, UserPlus } from "lucide-react";
import { AuthLayout, Field, FormError, authErrorText } from "@/components/app/auth-layout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { createCenter } from "@/lib/api/centers";
import { createCenterInput } from "@/lib/students/schema";
import { errorMessage } from "@/lib/students/queries";
import { pageHead } from "@/lib/head";
import { PENDING_CENTER_KEY, splitBranches } from "@/lib/auth-forms";

export const Route = createFileRoute("/signup")({
  head: pageHead("Create your account", "Create a Markazly account and your center."),
  component: SignUp,
});

function SignUp() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", email: "", password: "", center: "", branches: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next["name"] = t("Enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next["email"] = t("Enter a valid email address.");
    if (form.password.length < 8) next["password"] = t("Use at least 8 characters.");
    const center = createCenterInput.safeParse({ name: form.center, branches: splitBranches(form.branches) });
    if (!center.success) for (const issue of center.error.issues) next[issue.path[0] === "name" ? "center" : "branches"] ??= t(issue.message);
    setErrors(next);
    if (Object.keys(next).length || !center.success) return;

    setBusy(true);
    try {
      const { data, error: err } = await getBrowserSupabase().auth.signUp({
        email: form.email.trim(), password: form.password,
        options: { data: { full_name: form.name.trim() }, emailRedirectTo: `${window.location.origin}/onboarding` },
      });
      if (err) { setError(t(authErrorText(err))); return; }
      if (!data.session) {
        // Email confirmation is on: remember the center so onboarding can create it after the first sign-in.
        try { localStorage.setItem(PENDING_CENTER_KEY, JSON.stringify(center.data)); } catch { /* optional */ }
        setSentTo(form.email.trim());
        return;
      }
      await createCenter({ data: center.data });
      await qc.invalidateQueries({ queryKey: ["centers"] });
      void navigate({ to: "/overview", replace: true });
    } catch (err) {
      setError(t(errorMessage(err, "Could not create the center.")));
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <AuthLayout title={t("Check your email")} footer={<Link to="/" className="font-medium text-brand hover:underline">{t("Back to sign in")}</Link>}>
        <div className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm">
          <MailCheck className="mt-0.5 size-5 shrink-0 text-positive" />
          <p>{t("We sent a confirmation link to {email}. Open it, then sign in to finish setting up your center.", { email: sentTo })}</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("Create your account")} subtitle={t("Set up your center in a minute. You will be its owner.")}
      footer={<>{t("Already have an account?")} <Link to="/" className="font-medium text-brand hover:underline">{t("Sign in")}</Link></>}>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field id="su-name" label={t("Your name")} autoComplete="name" value={form.name} onChange={set("name")} error={errors["name"]} />
        <Field id="su-email" label={t("Email")} type="email" autoComplete="email" dir="ltr" value={form.email} onChange={set("email")} error={errors["email"]} />
        <Field id="su-password" label={t("Password")} type="password" autoComplete="new-password" dir="ltr" value={form.password} onChange={set("password")} error={errors["password"]} hint={t("At least 8 characters.")} />
        <div className="border-t pt-4">
          <Field id="su-center" label={t("Center name")} value={form.center} onChange={set("center")} error={errors["center"]} />
          <Field id="su-branches" className="mt-4" label={t("Branches")} value={form.branches} onChange={set("branches")} error={errors["branches"]} hint={t("Separate branches with commas, e.g. Nasr City, Maadi")} />
        </div>
        <FormError message={error} />
        <Button type="submit" className="h-10 w-full" disabled={busy}><UserPlus />{busy ? t("Creating…") : t("Create account")}</Button>
        <p className="text-center text-xs text-muted-foreground">{t("Your center starts empty. Sample data is only in the separate Demo Center.")}</p>
      </form>
    </AuthLayout>
  );
}
