import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { backendEnabled, getSupabase } from "./supabase";

export interface CenterInfo {
  id: string;
  name: string;
  isDemo: boolean;
}
export interface MemberInfo {
  role: "owner" | "accountant" | "front_desk" | "teacher";
  displayName: string;
}
export interface BranchInfo {
  id: string;
  name: string;
}
export interface UserInfo {
  id: string;
  email: string;
}

/**
 * - demo: saved data is off, or nobody is signed in → the in-memory sample center.
 * - loading: checking the session / membership.
 * - needs-center: signed in, not yet a member of any center → onboarding.
 * - center: signed in; students come from this center's saved data.
 */
export type WorkspaceState =
  | { status: "demo" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "needs-center"; user: UserInfo }
  | {
      status: "center";
      user: UserInfo;
      center: CenterInfo;
      member: MemberInfo;
      branches: BranchInfo[];
    };

type Workspace = WorkspaceState & {
  refresh: () => Promise<WorkspaceState>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Workspace>({
  status: "demo",
  refresh: async () => ({ status: "demo" }),
  signOut: async () => {},
});

async function resolve(session: Session | null): Promise<WorkspaceState> {
  const sb = getSupabase();
  if (!sb || !session) return { status: "demo" };
  const user = { id: session.user.id, email: session.user.email ?? "" };
  const { data, error } = await sb
    .from("center_members")
    .select("role, display_name, centers(id, name, is_demo)")
    .eq("user_id", user.id)
    .limit(1);
  if (error) return { status: "error", message: error.message };
  const row = data?.[0] as
    | {
        role: MemberInfo["role"];
        display_name: string;
        centers: { id: string; name: string; is_demo: boolean } | null;
      }
    | undefined;
  if (!row?.centers) return { status: "needs-center", user };
  const branches = await sb
    .from("branches")
    .select("id, name")
    .eq("center_id", row.centers.id)
    .order("created_at")
    .order("name");
  if (branches.error) return { status: "error", message: branches.error.message };
  return {
    status: "center",
    user,
    center: { id: row.centers.id, name: row.centers.name, isDemo: row.centers.is_demo },
    member: { role: row.role, displayName: row.display_name || user.email },
    branches: branches.data ?? [],
  };
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  // Same first render on server and client: "loading" when saved data is on, "demo" otherwise.
  const [state, setState] = useState<WorkspaceState>(
    backendEnabled ? { status: "loading" } : { status: "demo" },
  );

  const refresh = useCallback(async (): Promise<WorkspaceState> => {
    const sb = getSupabase();
    if (!sb) return { status: "demo" };
    const { data } = await sb.auth.getSession();
    const next = await resolve(data.session);
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let latest = 0;
    const apply = (session: Session | null) => {
      const run = ++latest;
      void resolve(session).then((next) => {
        if (run === latest) setState(next);
      });
    };
    void sb.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED")
        apply(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase()?.auth.signOut();
    setState({ status: "demo" });
  }, []);

  return <Ctx.Provider value={{ ...state, refresh, signOut }}>{children}</Ctx.Provider>;
}

export const useWorkspace = () => useContext(Ctx);
