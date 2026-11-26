import { createFileRoute, redirect } from "@tanstack/react-router";
import { enterDemo } from "@/lib/demo-mode";

/**
 * Public entry to the in-browser demo: turns demo mode on for this tab and opens the console on the
 * sample center. No account and no Supabase involved (see src/lib/demo-mode.tsx).
 */
export const Route = createFileRoute("/demo")({
  ssr: false,
  beforeLoad: () => {
    enterDemo();
    throw redirect({ to: "/overview", replace: true });
  },
});
