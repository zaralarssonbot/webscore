import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BackgroundEffect from "@/components/BackgroundEffect";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useAuth } from "@/context/AuthContext";
import { safeNext } from "@/lib/account/redirect";

export default function LoginPage() {
  useDocumentMeta({
    title: "Logga in – Webscore",
    description: "Logga in på ditt Webscore-konto.",
    canonical: "https://webscore.se/login",
    noindex: true,
  });

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session, loading, signInWithMagicLink, signInWithGoogle } = useAuth();

  const next = safeNext(params.get("next"));
  const claim = params.get("claim") ?? undefined;

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Preserve claim/next across the auth round-trip (redirect may drop query).
  useEffect(() => {
    if (claim) sessionStorage.setItem("webscore_claim", claim);
    sessionStorage.setItem("webscore_next", next);
  }, [claim, next]);

  // Already signed in → go straight through.
  useEffect(() => {
    if (!loading && session) navigate(next, { replace: true });
  }, [loading, session, next, navigate]);

  const redirect = { next, claim };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: err } = await signInWithMagicLink(email, redirect);
    setBusy(false);
    if (err) setError("Kunde inte skicka länken. Kontrollera adressen och försök igen.");
    else setSent(true);
  };

  const handleGoogle = async () => {
    setError("");
    setBusy(true);
    const { error: err } = await signInWithGoogle(redirect);
    if (err) {
      setBusy(false);
      setError("Kunde inte starta Google-inloggning.");
    }
    // On success the browser navigates to Google; no further UI needed.
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex items-center justify-center px-4">
      <BackgroundEffect />
      <div className="relative z-10 w-full max-w-sm card-surface p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/15">
            <Lock className="w-5 h-5 text-neon-cyan" />
          </div>
          <h1 className="text-xl font-bold font-display">Logga in på Webscore</h1>
        </div>

        {sent ? (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-neon-cyan">
              <Mail className="w-5 h-5" />
              <p className="text-sm font-medium">Kolla din inkorg</p>
            </div>
            <p className="text-sm text-muted-foreground font-light">
              Vi skickade en inloggningslänk till <span className="text-foreground">{email}</span>. Klicka
              på länken för att logga in. Du kan stänga den här fliken.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Använd en annan adress
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground font-light mb-6">
              Få en inloggningslänk via e-post, eller fortsätt med Google. Inget lösenord behövs.
            </p>
            <form onSubmit={handleMagicLink} className="space-y-3">
              <Input
                type="email"
                required
                autoComplete="email"
                placeholder="din@epost.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
              <Button type="submit" className="w-full" disabled={busy || !email}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Skicka inloggningslänk"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              eller
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
              Fortsätt med Google
            </Button>
          </>
        )}

        {error && <p className="mt-4 text-sm text-score-low">{error}</p>}
      </div>
    </div>
  );
}
