import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app/shell";
import { LedgerProvider, type DataSource } from "@/lib/ledger-store";
import { useWorkspace, type WorkspaceState } from "@/lib/backend/workspace";
import { FullPageNotice } from "@/components/app/full-page-notice";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_console")({ component: Console });

const ROLE_LABEL = { owner: "Owner", accountant: "Accountant", front_desk: "Front desk", teacher: "Teacher" } as const;

function sourceFor(ws: Extract<WorkspaceState, { status: "center" }>): DataSource {
  return {
    kind: "center", centerId: ws.center.id, centerName: ws.center.name, isDemoCenter: ws.center.isDemo,
    branches: ws.branches.map((b) => b.name),
    canEdit: !ws.center.isDemo && ws.member.role !== "teacher",
    user: { name: ws.member.displayName, role: ROLE_LABEL[ws.member.role] },
  };
}

/** Signed out (or saved data off): the in-memory demo. Signed in: the member's own center. Signed in without a center: onboarding. */
function Console() {
  const ws = useWorkspace();
  const navigate = useNavigate();
  const { t } = useI18n();
  useEffect(() => { if (ws.status === "needs-center") void navigate({ to: "/onboarding" }); }, [ws.status, navigate]);

  if (ws.status === "loading" || ws.status === "needs-center") return <FullPageNotice busy title={t("Loading your center…")} />;
  if (ws.status === "error")
    return <FullPageNotice title={t("Your center couldn't be loaded")} detail={ws.message}><Button onClick={() => void ws.refresh()}>{t("Try again")}</Button><Button variant="outline" onClick={() => void ws.signOut()}>{t("Sign out")}</Button></FullPageNotice>;

  const source: DataSource = ws.status === "center" ? sourceFor(ws) : { kind: "demo" };
  return (
    <LedgerProvider key={source.kind === "center" ? source.centerId : "demo"} source={source}>
      <AppShell>
        <Outlet />
      </AppShell>
    </LedgerProvider>
  );
}
