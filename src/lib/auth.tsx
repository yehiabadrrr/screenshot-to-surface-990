import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type AuthStatus = "loading" | "signedOut" | "signedIn" | "unconfigured";
type AuthState = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  recovering: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  status: "loading",
  session: null,
  user: null,
  recovering: false,
  signOut: async () => {},
});

/** Display name for a Supabase user: the name given at sign-up, else the email's local part. */
export const displayName = (user: User | null | undefined) =>
  (user?.user_metadata as { full_name?: string } | undefined)?.full_name?.trim() ||
  user?.email?.split("@")[0] ||
  "";

/** Tracks the Supabase session in the browser. The server never relies on this; it verifies tokens itself. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus("unconfigured");
      return;
    }
    const supabase = getBrowserSupabase();
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setStatus(data.session ? "signedIn" : "signedOut");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(next);
      setStatus(next ? "signedIn" : "signedOut");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      recovering,
      signOut: async () => {
        if (!isSupabaseConfigured) return;
        await getBrowserSupabase().auth.signOut();
        try {
          localStorage.removeItem("markazly-center");
        } catch {
          /* storage may be unavailable */
        }
      },
    }),
    [status, session, recovering],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

/** Resolves the current session once, for route guards (`beforeLoad` runs client-side on console routes). */
export async function currentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured || typeof window === "undefined") return null;
  const { data } = await getBrowserSupabase().auth.getSession();
  return data.session;
}
