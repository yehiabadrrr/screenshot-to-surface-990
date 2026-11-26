import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { Languages } from "lucide-react";
import { backendEnabled, getSupabase } from "@/lib/backend/supabase";
import { useWorkspace } from "@/lib/backend/workspace";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Markezly" },
      { name: "description", content: "Sign in to Markezly to manage students, attendance, payments and teacher payouts." },
      { property: "og:title", content: "Sign in — Markezly" },
      { property: "og:description", content: "Education center management and financial operations for Egypt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const { t, lang, setLang } = useI18n();
  const [loading, setLoading] = useState(false);
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5"><Logo className="size-8" /><span className="text-lg font-semibold tracking-tight">Markezly</span></Link>
          <Button variant="ghost" onClick={() => setLang(lang === "en" ? "ar" : "en")} className="gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <Languages className="size-4" />{lang === "en" ? "العربية" : "English"}
          </Button>
        </div>
        {backendEnabled ? <AccountForm /> : <form
          className="mx-auto my-auto w-full max-w-sm py-12"
          onSubmit={(e) => { e.preventDefault(); setLoading(true); setTimeout(() => nav({ to: "/overview" }), 500); }}
        >
          <h1 className="text-2xl font-semibold tracking-tight">{lang === "ar" ? "مرحباً بعودتك" : "Welcome back"}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{lang === "ar" ? "سجّل الدخول لإدارة مركزك" : "Sign in to manage your center."}</p>
          <div className="mt-8 space-y-4">
            <div className="space-y-1.5"><Label htmlFor="email">{t("Email")}</Label><Input id="email" type="email" required defaultValue="yehia@nileacademy.eg" /></div>
            <div className="space-y-1.5">
              <Label htmlFor="pw">{t("Password")}</Label>
              <Input id="pw" type="password" required defaultValue="demo-password" />
            </div>
            <Button type="submit" className="h-10 w-full" disabled={loading}>{loading ? "…" : t("Sign in")}</Button>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">{t("Demo data")} · {t("No real sign-in. Credentials are not checked.")}</p>
        </form>}
      </div>
      <div className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -end-32 -top-32 size-[28rem] rounded-full border border-primary-foreground/10" />
        <div className="absolute -end-12 -top-12 size-[18rem] rounded-full border border-primary-foreground/10" />
        <div className="relative max-w-md text-3xl font-semibold leading-tight tracking-tight">
          {lang === "ar" ? "كل جنيه، كل حصة، كل طالب — في مكان واحد." : "Every pound, every session, every student — in one place."}
        </div>
      </div>
    </div>
  );
}

/** Real sign-in / sign-up against Supabase Auth. Only rendered when saved data is switched on. */
function AccountForm() {
  const nav = useNavigate();
  const ws = useWorkspace();
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const go = async () => {
    const next = await ws.refresh();
    if (next.status === "center") void nav({ to: "/overview" });
    else if (next.status === "needs-center") void nav({ to: "/onboarding" });
    else if (next.status === "error") setError(next.message);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    const sb = getSupabase()!;
    const r = mode === "sign-in"
      ? await sb.auth.signInWithPassword({ email: email.trim(), password })
      : await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/onboarding` } });
    if (r.error) { setError(r.error.message); setBusy(false); return; }
    if (!r.data.session) { setNotice(t("Check your email to confirm your account, then sign in.")); setBusy(false); setMode("sign-in"); return; }
    await go();
    setBusy(false);
  };

  if (ws.status === "center" || ws.status === "needs-center") {
    return (
      <div className="mx-auto my-auto w-full max-w-sm space-y-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">{t("You're signed in")}</h1>
        <p className="text-sm text-muted-foreground"><bdi>{ws.user.email}</bdi>{ws.status === "center" && <> · <bdi>{ws.center.name}</bdi></>}</p>
        <div className="flex gap-2">
          <Button className="h-10 flex-1" onClick={() => void go()}>{t(ws.status === "center" ? "Open your center" : "Set up your center")}</Button>
          <Button variant="outline" className="h-10" onClick={() => void ws.signOut()}>{t("Sign out")}</Button>
        </div>
      </div>
    );
  }

  return (
    <form className="mx-auto my-auto w-full max-w-sm py-12" onSubmit={submit}>
      <h1 className="text-2xl font-semibold tracking-tight">{mode === "sign-in" ? (lang === "ar" ? "مرحباً بعودتك" : "Welcome back") : t("Create your account")}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{mode === "sign-in" ? (lang === "ar" ? "سجّل الدخول لإدارة مركزك" : "Sign in to manage your center.") : t("You'll set up your center next.")}</p>
      <div className="mt-8 space-y-4">
        <div className="space-y-1.5"><Label htmlFor="email">{t("Email")}</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" /></div>
        <div className="space-y-1.5"><Label htmlFor="pw">{t("Password")}</Label><Input id="pw" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" /></div>
        {error && <p role="alert" className="text-sm text-destructive"><bdi>{error}</bdi></p>}
        {notice && <p role="status" className="text-sm text-positive">{notice}</p>}
        <Button type="submit" className="h-10 w-full" disabled={busy || ws.status === "loading"}>{busy ? "…" : t(mode === "sign-in" ? "Sign in" : "Create account")}</Button>
      </div>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t(mode === "sign-in" ? "New to Markezly?" : "Already have an account?")}{" "}
        <button type="button" className="font-medium text-brand hover:underline" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(""); setNotice(""); }}>{t(mode === "sign-in" ? "Create an account" : "Sign in")}</button>
      </p>
      <p className="mt-3 text-center text-xs text-muted-foreground"><Link to="/overview" className="hover:text-foreground hover:underline">{t("Or explore the demo without signing in")}</Link></p>
    </form>
  );
}
