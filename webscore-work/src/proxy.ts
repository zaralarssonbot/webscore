import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Proxy (formerly "middleware" — renamed in Next.js 16) that keeps the Supabase
 * auth session fresh on every navigation. Without this, access/refresh tokens
 * stored in cookies would expire and Server Components would intermittently see
 * a logged-out user.
 *
 * In DEMO mode (no Supabase env) this is a no-op pass-through.
 *
 * Security note (per Next.js docs): the proxy must NOT be the only auth gate.
 * Each Server Action and page still enforces auth/role via requireSession /
 * requireCapability in src/lib/auth.ts.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Demo mode — nothing to refresh.
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Touch the session so @supabase/ssr rotates tokens when needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and image optimization so the
     * session refresh covers pages, the public token routes and Server Actions,
     * but never blocks CSS/JS/images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
