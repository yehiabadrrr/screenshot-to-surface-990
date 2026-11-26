import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/app/logo";
import { FullPageNotice } from "@/components/app/full-page-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { useWorkspace } from "@/lib/backend/workspace";
import { getSupabase } from "@/lib/backend/supabase";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [{ title: "Set up your center — Markezly" }, { name: "robots", content: "noindex" }],
  }),
  component: Onboarding,
});

/** Signed-in accounts without a center create one here. The center starts empty: no sample data is added. */
function Onboarding() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [center, setCenter] = useState("");
  const [branch, setBranch] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ws.status === "demo") void navigate({ to: "/login" });
    if (ws.status === "center") void navigate({ to: "/overview" });
  }, [ws.status, navigate]);

  if (ws.status !== "needs-center") return <FullPageNotice busy title={t("Loading…")} />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (center.trim().length < 2) {
      setError(t("Enter your center's name."));
      return;
    }
    setBusy(true);
    const { error: rpcError } = await getSupabase()!.rpc("create_center", {
      center_name: center.trim(),
      branch_name: branch.trim() || "Main branch",
      owner_name: name.trim(),
    });
    if (rpcError) {
      setError(rpcError.message);
      setBusy(false);
      return;
    }
    const next = await ws.refresh();
    setBusy(false);
    if (next.status === "center") void navigate({ to: "/overview" });
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-10">
      <form onSubmit={submit} className="w-full max-w-sm space-y-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo className="size-8" />
          <span className="text-lg font-semibold tracking-tight">Markezly</span>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Set up your center")}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t(
              "Signed in as {email}. You'll be the owner. Your center starts empty; no sample data is added.",
              { email: ws.user.email },
            )}
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="center-name">{t("Center name")}</Label>
            <Input
              id="center-name"
              value={center}
              onChange={(e) => setCenter(e.target.value)}
              maxLength={120}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branch-name">{t("First branch")}</Label>
            <Input
              id="branch-name"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              maxLength={80}
              placeholder={t("Main branch")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner-name">{t("Your name")}</Label>
            <Input
              id="owner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            <bdi>{error}</bdi>
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" className="h-10 flex-1" disabled={busy}>
            {busy ? "…" : t("Create center")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => void ws.signOut()}
          >
            {t("Sign out")}
          </Button>
        </div>
      </form>
    </div>
  );
}
