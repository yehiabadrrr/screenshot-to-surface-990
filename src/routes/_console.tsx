import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/shell";
import { LedgerProvider } from "@/lib/ledger-store";

export const Route = createFileRoute("/_console")({
  component: () => (
    <LedgerProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </LedgerProvider>
  ),
});
