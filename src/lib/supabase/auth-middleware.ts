import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader, setResponseStatus } from "@tanstack/react-start/server";
import { getBrowserSupabase, createUserSupabase } from "./client";
import { isSupabaseConfigured } from "./env";

/**
 * Client half, registered globally in src/start.ts: sends the signed-in user's access token with every
 * server-function call. Sends nothing when signed out.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    if (typeof window === "undefined" || !isSupabaseConfigured) return next();
    const { data } = await getBrowserSupabase().auth.getSession();
    const token = data.session?.access_token;
    return token ? next({ headers: { Authorization: `Bearer ${token}` } }) : next();
  },
);

export class AuthError extends Error {
  constructor(message = "You are not signed in.") {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Server half, added to every server function that touches data: verifies the bearer token with
 * Supabase Auth and hands the handler a client that queries as that user (so RLS applies).
 */
export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const header = getRequestHeader("authorization") ?? "";
    const token = /^Bearer\s+(.+)$/i.exec(header)?.[1];
    if (!token) {
      setResponseStatus(401);
      throw new AuthError();
    }
    const supabase = createUserSupabase(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      setResponseStatus(401);
      throw new AuthError("Your session has expired. Sign in again.");
    }
    return next({
      context: { supabase, user: { id: data.user.id, email: data.user.email ?? "" } },
    });
  },
);
