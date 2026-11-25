import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, assertSupabaseConfigured } from "./env";
import type { Database } from "./types";

let browserClient: SupabaseClient<Database> | undefined;

/**
 * The browser client. Holds the signed-in session (localStorage), refreshes tokens and completes
 * password-recovery links. Never call on the server: server functions use the per-request client.
 */
export function getBrowserSupabase(): SupabaseClient<Database> {
  if (typeof window === "undefined") throw new Error("getBrowserSupabase() is browser-only");
  assertSupabaseConfigured();
  browserClient ??= createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "markazly-auth", flowType: "implicit" },
  });
  return browserClient;
}

/**
 * A client that acts as one user for one request: the publishable key plus that user's access token.
 * Every query it makes is subject to RLS as that user.
 */
export function createUserSupabase(accessToken: string): SupabaseClient<Database> {
  assertSupabaseConfigured();
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
