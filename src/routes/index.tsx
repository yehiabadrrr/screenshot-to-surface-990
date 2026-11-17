import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n";
import { Languages } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — CenterOS" },
      { name: "description", content: "Sign in to CenterOS to manage students, attendance, payments and teacher payouts." },
      { property: "og:title", content: "Sign in — CenterOS" },
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
          <div className="flex items-center gap-2.5"><Logo className="size-8" /><span className="text-lg font-semibold tracking-tight">CenterOS</span></div>
          <button onClick={() => setLang(lang === "en" ? "ar" : "en")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <Languages className="size-4" />{lang === "en" ? "العربية" : "English"}
          </button>
        </div>
        <form
          className="mx-auto my-auto w-full max-w-sm py-12"
          onSubmit={(e) => { e.preventDefault(); setLoading(true); setTimeout(() => nav({ to: "/overview" }), 500); }}
        >
          <h1 className="text-2xl font-semibold tracking-tight">{lang === "ar" ? "مرحباً بعودتك" : "Welcome back"}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{lang === "ar" ? "سجّل الدخول لإدارة مركزك" : "Sign in to manage your center."}</p>
          <div className="mt-8 space-y-4">
            <div className="space-y-1.5"><Label htmlFor="email">{t("Email")}</Label><Input id="email" type="email" required defaultValue="yehia@nileacademy.eg" /></div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between"><Label htmlFor="pw">{t("Password")}</Label><a href="#" className="text-xs font-medium text-brand hover:underline">{t("Forgot password?")}</a></div>
              <Input id="pw" type="password" required defaultValue="demo-password" />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground"><Checkbox defaultChecked /> {t("Remember me")}</label>
            <Button type="submit" className="h-10 w-full" disabled={loading}>{loading ? "…" : t("Sign in")}</Button>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">{lang === "ar" ? "نسخة تجريبية ببيانات افتراضية" : "Demo workspace with sample data."}</p>
        </form>
      </div>
      <div className="relative hidden overflow-hidden bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -end-32 -top-32 size-[28rem] rounded-full border border-primary-foreground/10" />
        <div className="absolute -end-12 -top-12 size-[18rem] rounded-full border border-primary-foreground/10" />
        <div className="relative max-w-md text-3xl font-semibold leading-tight tracking-tight">
          {lang === "ar" ? "كل جنيه، كل حصة، كل طالب — في مكان واحد." : "Every pound, every session, every student — in one place."}
        </div>
        <div className="relative grid max-w-md grid-cols-2 gap-3">
          {[["Collected this month","EGP 185,000"],["Attendance","92.6%"],["Outstanding","EGP 42,000"],["Active students","284"]].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-4">
              <div className="text-xs opacity-70">{k}</div><div className="mt-1 text-xl font-semibold num">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
