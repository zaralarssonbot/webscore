import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of auth truth for the customer account system. Wraps the
 * existing supabase.auth client (already configured with persistSession +
 * autoRefreshToken). The internal /admin gate is independent and untouched.
 */

export interface SignInRedirect {
  next?: string;
  claim?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithMagicLink: (email: string, redirect?: SignInRedirect) => Promise<{ error: string | null }>;
  signInWithGoogle: (redirect?: SignInRedirect) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/** Built lazily (never at module load) so prerender/SSR never touches window. */
function callbackUrl(redirect?: SignInRedirect): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://webscore.se";
  const url = new URL(`${origin}/auth/callback`);
  if (redirect?.next) url.searchParams.set("next", redirect.next);
  if (redirect?.claim) url.searchParams.set("claim", redirect.claim);
  return url.toString();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      loading,
      signInWithMagicLink: async (email, redirect) => {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: callbackUrl(redirect), shouldCreateUser: true },
        });
        return { error: error?.message ?? null };
      },
      signInWithGoogle: async (redirect) => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: callbackUrl(redirect) },
        });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
