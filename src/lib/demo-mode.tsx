import { createContext, useContext, type ReactNode } from "react";
import type { MyCenter } from "@/lib/api/centers";
import { DEMO_BRANCH_IDS, DEMO_CENTER_NAME } from "@/lib/demo-seed";

/**
 * Public demo: a sample center that runs entirely in the visitor's browser. It never talks to Supabase,
 * so it needs no account, no membership and no change to RLS. Entered from /demo, kept for the tab in
 * sessionStorage, and left with "Exit demo". Student edits live in memory and reset on refresh.
 */

const FLAG = "markazly-demo";

export const isDemoMode = () => {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
};
export const enterDemo = () => {
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch {
    /* the demo still opens for this navigation */
  }
};
export const exitDemo = () => {
  try {
    sessionStorage.removeItem(FLAG);
  } catch {
    /* nothing to clear */
  }
};

/**
 * Its own center id, deliberately not the database Demo Center's, so a signed-in member's cached
 * Supabase rows and the local copy can never share a query key.
 */
export const LOCAL_DEMO_CENTER_ID = "d3e00000-0000-4000-8000-0000000000aa";

export const LOCAL_DEMO_CENTER: MyCenter = {
  center: { id: LOCAL_DEMO_CENTER_ID, name: DEMO_CENTER_NAME, is_demo: true },
  role: "admin",
  branches: Object.entries(DEMO_BRANCH_IDS).map(([name, id]) => ({ id, name })),
};

export const LOCAL_DEMO_USER = { id: "demo-visitor", email: "", name: "Demo visitor" };

const Ctx = createContext(false);
export const DemoModeProvider = ({ value, children }: { value: boolean; children: ReactNode }) => (
  <Ctx.Provider value={value}>{children}</Ctx.Provider>
);
/** True inside the console when it is running the in-browser demo. */
export const useDemoMode = () => useContext(Ctx);
