import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { claimReport } from "@/lib/account/claim";
import { safeNext } from "@/lib/account/redirect";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

/**
 * Handles the return from a magic link (implicit tokens in the URL hash, parsed
 * automatically by the client) or Google OAuth (PKCE `?code`). Then optionally
 * claims a pending anonymous report and forwards to `next`.
 */
export default function AuthCallback() {
  useDocumentMeta({ title: "Loggar in… – Webscore", noindex: true });
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const url = new URL(window.location.href);

      // OAuth (PKCE) code exchange. Magic-link implicit tokens are auto-detected.
      const code = url.searchParams.get("code");
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(window.location.href);
        } catch (e) {
          console.error("[auth-callback] code exchange failed:", e);
        }
      }

      const next = safeNext(url.searchParams.get("next") ?? sessionStorage.getItem("webscore_next"));
      const claim = url.searchParams.get("claim") ?? sessionStorage.getItem("webscore_claim");

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("Inloggningen kunde inte slutföras. Försök igen.");
        setTimeout(() => navigate("/login", { replace: true }), 2200);
        return;
      }

      if (claim) {
        try {
          await claimReport(claim);
        } catch (e) {
          console.error("[auth-callback] claim failed (non-fatal):", e);
        }
        sessionStorage.removeItem("webscore_claim");
      }
      sessionStorage.removeItem("webscore_next");

      navigate(next, { replace: true });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      {error ? (
        <p className="text-sm text-score-low">{error}</p>
      ) : (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loggar in…</span>
        </div>
      )}
    </div>
  );
}
