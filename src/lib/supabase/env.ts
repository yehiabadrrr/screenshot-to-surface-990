/**
 * Public Supabase configuration. Only the project URL and the publishable (anon) key may be used by
 * this app; both are safe in the browser because every table is protected by RLS. The service-role
 * key is never read here.
 */
const env = import.meta.env as Record<string, string | undefined>;

export const SUPABASE_URL = (env["VITE_SUPABASE_URL"] ?? "").trim();
export const SUPABASE_PUBLISHABLE_KEY = (env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "").trim();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
}
