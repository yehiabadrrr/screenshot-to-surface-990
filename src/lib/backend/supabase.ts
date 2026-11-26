import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Saved data is used only when explicitly switched on and fully configured; otherwise the app is the in-memory demo. */
export const backendEnabled =
  import.meta.env.VITE_MARKEZLY_BACKEND === "supabase" && !!url && !!key;

let client: SupabaseClient | null = null;

/** Browser-only client (sessions live in localStorage). Returns null on the server or when the backend is off. */
export function getSupabase(): SupabaseClient | null {
  if (!backendEnabled || typeof window === "undefined") return null;
  client ??= createClient(url!, key!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
