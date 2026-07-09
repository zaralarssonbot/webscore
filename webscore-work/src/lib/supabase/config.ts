/**
 * Supabase configuration & runtime mode detection.
 *
 * The app runs in one of two modes, decided purely by environment variables:
 *
 *   • DEMO mode   — no Supabase env set. Data lives in the in-memory store
 *                   (src/lib/db). Lets the app run with zero infrastructure.
 *   • SUPABASE     — NEXT_PUBLIC_SUPABASE_URL + anon key present. Reads/writes
 *                    go to Postgres; auth uses Supabase Auth; files use Storage.
 *
 * Keeping this decision in one place means every other module (auth, data,
 * storage) can ask `isSupabaseEnabled()` instead of re-checking env vars.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Service-role key — server-only, never exposed to the client bundle. */
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Storage bucket names (created by migration 0003). */
export const BUCKETS = {
  /** Work documentation photos: before/during/after/damage/deviation. */
  attachments: "attachments",
  /** Material receipts and other financial documents. */
  receipts: "receipts",
  /** Generated quote / invoice PDFs. */
  documents: "documents",
} as const;

/**
 * True when the public Supabase env is configured. Safe to call on both the
 * server and the client (only reads NEXT_PUBLIC_* vars).
 */
export function isSupabaseEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** True when a service-role key is available (server-only operations). */
export function hasServiceRole(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}
