import { createFileRoute, Navigate, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, LogOut } from "lucide-react";
import { AuthLayout, Field, FormError } from "@/components/app/auth-layout";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth, currentSession } from "@/lib/auth";
import { createCenter, getMyCenters } from "@/lib/api/centers";
import { createCenterInput } from "@/lib/students/schema";
import { errorMessage } from "@/lib/students/queries";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { pageHead } from "@/lib/head";
import { PENDING_CENTER_KEY, splitBranches } from "@/lib/auth-forms";

/** First step for a signed-in user who does not belong to any center yet. */
export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    if (!isSupabaseConfigured || !(await currentSession())) throw redirect({ to: "/" });
  },
  head: pageHead("Set up your center", "Create your Markazly center."),
  component: Onboarding,
});

const readPending = () => {
  try { return JSON.parse(localStorage.getItem(PENDING_CENTER_KEY) ?? "null") as { name: string; branches: string[] } | null; } catch { return null; }
};

function Onboarding() {
  const { t } = useI18n();
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pending = readPending();
  const [name, setName] = useState(pending?.name ?? "");
  const [branches, setBranches] = useState(pending?.branches.join(", ") ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const centers = useQuery({ queryKey: ["centers", user?.id], queryFn: () => getMyCenters(), enabled: status === "signedIn" });

  if (status === "signedOut") return <Navigate to="/" />;
  if (centers.data?.length) return <Navigate to="/overview" />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = createCenterInput.safeParse({ name, branches: splitBranches(branches) });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[issue.path[0] === "name" ? "name" : "branches"] ??= t(issue.message);
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await createCenter({ data: parsed.data });
      try { localStorage.removeItem(PENDING_CENTER_KEY); } catch { /* optional */ }
      await qc.invalidateQueries({ queryKey: ["centers"] });
      void navigate({ to: "/overview", replace: true });
    } catch (err) {
      setError(t(errorMessage(err, "Could not create the center.")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={t("Set up your center")} subtitle={t("You will be its owner. You can add branches later.")}
      footer={<button type="button" onClick={() => void signOut().then(() => navigate({ to: "/" }))} className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"><LogOut className="size-3.5 rtl:-scale-x-100" />{t("Sign out")}</button>}>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field id="ob-center" label={t("Center name")} value={name} onChange={(e) => setName(e.target.value)} error={errors["name"]} />
        <Field id="ob-branches" label={t("Branches")} value={branches} onChange={(e) => setBranches(e.target.value)} error={errors["branches"]} hint={t("Separate branches with commas, e.g. Nasr City, Maadi")} />
        <FormError message={error} />
        <Button type="submit" className="h-10 w-full" disabled={busy || centers.isPending}><Building2 />{busy ? t("Creating…") : t("Create center")}</Button>
      </form>
    </AuthLayout>
  );
}
