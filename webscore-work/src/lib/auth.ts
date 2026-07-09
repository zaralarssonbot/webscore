import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { store } from "./db/store";
import type { Organization, Role, User } from "./types";
import { isSupabaseEnabled } from "./supabase/config";
import { createSupabaseServerClient } from "./supabase/server";
import { mapOrganization, mapUser } from "./supabase/mappers";

const SESSION_COOKIE = "ws_session";

export interface Session {
  user: User;
  organization: Organization;
}

/**
 * Resolve the current session.
 *
 *   • SUPABASE mode — verify the Supabase Auth JWT, then load the matching
 *     profile (`users`) + organization. RLS guarantees the rows belong to the
 *     caller's org.
 *   • DEMO mode     — the cookie holds a demo user id resolved from the store.
 *
 * Either way the returned { user, organization } shape is identical, so every
 * page/action consumer is mode-agnostic.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  if (isSupabaseEnabled()) return getSupabaseSession();
  return getDemoSession();
});

async function getDemoSession(): Promise<Session | null> {
  const jar = await cookies();
  const userId = jar.get(SESSION_COOKIE)?.value;
  if (!userId) return null;
  const user = store.users.find((u) => u.id === userId && u.active);
  if (!user) return null;
  const organization = store.organization;
  if (organization.id !== user.organizationId) return null;
  return { user, organization };
}

async function getSupabaseSession(): Promise<Session | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  // Profile row is keyed by auth.users.id; RLS scopes it to the caller's org.
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .eq("active", true)
    .maybeSingle();
  if (!profile) return null;

  const { data: orgRow } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.organization_id)
    .maybeSingle();
  if (!orgRow) return null;

  return { user: mapUser(profile), organization: mapOrganization(orgRow) };
}

/** Like getSession but throws/redirects callers should handle (see requireSession). */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}

/**
 * Page guard: require an authenticated session whose role satisfies the given
 * capability. Redirects unauthenticated users to /login and users lacking the
 * capability to a page they can access. Mirrors the server-action checks.
 */
export async function requireCapability(
  capability: (r: Role) => boolean
): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!capability(session.user.role)) {
    redirect(session.user.role === "worker" ? "/my-work" : "/dashboard");
  }
  return session;
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

/** Role capability matrix — the single source of truth for access checks. */
export const can = {
  /** Back-office areas (sales, finance, reports) — everyone except workers. */
  backoffice: (r: Role) => r === "admin" || r === "supervisor",
  manageOrg: (r: Role) => r === "admin",
  manageUsers: (r: Role) => r === "admin",
  manageCustomers: (r: Role) => r === "admin" || r === "supervisor",
  createQuotes: (r: Role) => r === "admin",
  manageQuotes: (r: Role) => r === "admin",
  planWorkOrders: (r: Role) => r === "admin" || r === "supervisor",
  assignStaff: (r: Role) => r === "admin" || r === "supervisor",
  approveTime: (r: Role) => r === "admin" || r === "supervisor",
  approveWork: (r: Role) => r === "admin" || r === "supervisor",
  createInvoices: (r: Role) => r === "admin",
  viewReports: (r: Role) => r === "admin" || r === "supervisor",
  manageSettings: (r: Role) => r === "admin",
  registerTime: () => true,
  registerMaterial: () => true,
  uploadImages: () => true,
};
