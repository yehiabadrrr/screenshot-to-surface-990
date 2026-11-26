import { createFileRoute, Navigate, Outlet, redirect } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app/shell";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { LedgerProvider } from "@/lib/ledger-store";
import { useAuth, currentSession, displayName } from "@/lib/auth";
import { CenterProvider, useCenter, roleLabel } from "@/lib/center-context";
import { getMyCenters } from "@/lib/api/centers";
import { useAllStudents, errorMessage } from "@/lib/students/queries";
import { toStudent } from "@/lib/students/model";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { DemoModeProvider, isDemoMode, LOCAL_DEMO_CENTER, LOCAL_DEMO_CENTER_ID, LOCAL_DEMO_USER } from "@/lib/demo-mode";
import { createLocalStudents, StudentSourceProvider } from "@/lib/students/source";
import { useI18n } from "@/lib/i18n";

/**
 * Protected console. Rendered only in the browser (ssr: false) so the guard can read the Supabase session
 * before anything is shown; data itself is protected separately by requireSupabaseAuth + RLS.
 */
export const Route = createFileRoute("/_console")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (isDemoMode()) return; // the in-browser demo needs no session (see src/lib/demo-mode.tsx)
    if (!isSupabaseConfigured) throw redirect({ to: "/login" });
    const session = await currentSession();
    if (!session) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  pendingComponent: ConsoleSplash,
  component: ConsoleLayout,
});

function ConsoleSplash({ label }: { label?: string }) {
  return (
    <div aria-busy="true" className="grid min-h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground"><Logo className="size-10 animate-pulse" />{label}</div>
    </div>
  );
}

function ConsoleError({ message, retry }: { message: string; retry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="surface max-w-sm p-6 text-center">
        <Logo className="mx-auto size-10" />
        <h1 className="mt-4 font-medium">{t("Markazly could not load your data")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t(message)}</p>
        <Button className="mt-4" onClick={retry}><RotateCcw />{t("Try again")}</Button>
      </div>
    </div>
  );
}

function ConsoleLayout() {
  const [demo] = useState(isDemoMode);
  return demo ? <DemoConsole /> : <SignedInConsole />;
}

/** The public demo: a local sample center and student store, no Supabase at all. Resets on refresh. */
function DemoConsole() {
  const { t } = useI18n();
  const [source] = useState(() => createLocalStudents(LOCAL_DEMO_CENTER_ID));
  return (
    <DemoModeProvider value>
      <StudentSourceProvider value={source}>
        <CenterProvider centers={[LOCAL_DEMO_CENTER]} user={{ ...LOCAL_DEMO_USER, name: t(LOCAL_DEMO_USER.name) }}>
          <CenterWorkspace />
        </CenterProvider>
      </StudentSourceProvider>
    </DemoModeProvider>
  );
}

function SignedInConsole() {
  const { status, user } = useAuth();
  const { t } = useI18n();
  const centers = useQuery({ queryKey: ["centers", user?.id], queryFn: () => getMyCenters(), enabled: status === "signedIn" });
  if (status === "signedOut") return <Navigate to="/login" />;
  if (status !== "signedIn" || !user || centers.isPending) return <ConsoleSplash label={t("Loading your center…")} />;
  if (centers.isError) return <ConsoleError message={errorMessage(centers.error, "Could not load your centers.")} retry={() => void centers.refetch()} />;
  if (!centers.data.length) return <Navigate to="/onboarding" />;
  return (
    <CenterProvider centers={centers.data} user={{ id: user.id, email: user.email ?? "", name: displayName(user) }}>
      <CenterWorkspace />
    </CenterProvider>
  );
}

/** Loads the active center's persistent students, then mounts the (still demo) ledger around them. */
function CenterWorkspace() {
  const { center, branches, user, role } = useCenter();
  const { t } = useI18n();
  const q = useAllStudents(center.id);
  const students = useMemo(() => {
    const names = new Map(branches.map((b) => [b.id, b.name]));
    return (q.data ?? []).map((row) => toStudent(row, (id) => names.get(id) ?? "—"));
  }, [q.data, branches]);
  if (q.isPending) return <ConsoleSplash label={t("Loading students…")} />;
  if (q.isError) return <ConsoleError message={errorMessage(q.error, "Could not load students.")} retry={() => void q.refetch()} />;
  return (
    <LedgerProvider key={`${center.id}:${user.id}`} students={students} demo={center.is_demo} currentUser={{ name: user.name, role: roleLabel[role] }}>
      <AppShell><Outlet /></AppShell>
    </LedgerProvider>
  );
}
