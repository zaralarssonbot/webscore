// M5 shared auth + abuse-control helpers for Edge Functions.
//
// IDENTITY IS NEVER TRUSTED FROM THE REQUEST BODY. The caller's user id is
// derived only from a verified Supabase JWT in the Authorization header — the
// same discipline the deterministic score uses. See M5_SPEC.md §4.3, §15.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

/** Verify the caller's JWT and return their user id, or null if anonymous. */
export async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  // The anon key alone (anonymous callers) is not a user JWT → getUser rejects it.
  if (token === anonKey) return null;
  try {
    const client = createClient(Deno.env.get("SUPABASE_URL")!, anonKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/** Require an authenticated caller; throws a 401-shaped error otherwise. */
export async function requireUserId(req: Request): Promise<string> {
  const uid = await getUserId(req);
  if (!uid) {
    const e = new Error("unauthorized") as Error & { status?: number };
    e.status = 401;
    throw e;
  }
  return uid;
}

/** Best-effort SHA-256 of ip + daily salt. Raw IPs are never stored. */
export async function hashIp(req: Request): Promise<string | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "";
  if (!ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  const pepper = Deno.env.get("IP_HASH_PEPPER") ?? "webscore";
  const buf = new TextEncoder().encode(`${ip}|${day}|${pepper}`);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Fixed-window rate limit. Returns true when the action is ALLOWED, false when
 * the subject has exceeded `limit` within `windowMs`. Fails open on error so a
 * transient DB hiccup never blocks a legitimate user.
 */
export async function rateLimit(
  svc: SupabaseClient,
  subject: string,
  action: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  try {
    const now = Date.now();
    const windowStart = new Date(now - (now % windowMs)).toISOString();
    const { data, error } = await svc.rpc("bump_rate_limit", {
      p_subject: subject,
      p_action: action,
      p_window_start: windowStart,
    });
    if (error) return true; // fail open
    return (data as number) <= limit;
  } catch {
    return true;
  }
}

/** Append an audit-log row (best effort; never throws). */
export async function audit(
  svc: SupabaseClient,
  userId: string | null,
  action: string,
  target: string | null,
  ipHash: string | null,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    await svc.from("audit_log").insert({ user_id: userId, action, target, ip_hash: ipHash, meta });
  } catch (e) {
    console.error("[audit] failed (non-fatal):", e);
  }
}
