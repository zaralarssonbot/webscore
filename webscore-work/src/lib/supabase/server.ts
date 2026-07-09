import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "./config";

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. Reads/writes the auth session through the Next.js cookie
 * store so RLS sees the signed-in user (auth.uid()).
 *
 * Note: writing cookies from a Server Component throws in Next.js; that's
 * expected and harmless — the proxy (proxy.ts) refreshes the session cookie on
 * navigation, so the try/catch swallow is the documented @supabase/ssr pattern.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — ignore; proxy handles the refresh.
        }
      },
    },
  });
}

/**
 * Service-role client — bypasses RLS. SERVER ONLY, never reachable from the
 * browser. Use sparingly for trusted operations that legitimately cross the
 * RLS boundary (provisioning, signed-URL minting, public-token webhooks).
 * Every caller must enforce its own tenant scoping.
 */
export function createSupabaseAdminClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — admin client unavailable."
    );
  }
  return createServerClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}
