import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackgroundEffect from "@/components/BackgroundEffect";
import { Button } from "@/components/ui/button";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useAuth } from "@/context/AuthContext";
import { useEntitlements } from "@/hooks/useEntitlements";
import { billingEnabled } from "@/lib/account/limits";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { startCheckout } from "@/lib/billing/billing-service";
import { formatPrice } from "@/lib/billing/billing-utils";

export default function Plans() {
  useDocumentMeta({
    title: "Planer & priser – Webscore",
    description: "Välj en plan för Webscore-analys: Free, Pro, Business eller Enterprise.",
    canonical: "https://webscore.se/plans",
  });
  const { user } = useAuth();
  const { data: ent } = useEntitlements();
  const navigate = useNavigate();
  const [interval, setIntervalState] = useState<"month" | "year">("month");
  const [busy, setBusy] = useState<PlanId | null>(null);

  if (!billingEnabled()) return <Navigate to="/" replace />;

  const onCta = async (plan: PlanId) => {
    if (plan === "free") { navigate(user ? "/app" : "/login?next=/app"); return; }
    if (plan === "enterprise") { window.location.href = "mailto:hej@webscore.se?subject=Webscore%20Enterprise"; return; }
    if (!user) { navigate("/login?next=/plans"); return; }
    setBusy(plan);
    const r = await startCheckout(plan, interval);
    setBusy(null);
    if (r.url) window.location.href = r.url;
    else toast.error(r.error ?? "Kunde inte starta betalning");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundEffect />
      <Navbar onAnalyze={() => navigate("/")} />
      <main className="pt-28 pb-20 px-4 max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-display">Välj din plan</h1>
          <p className="mt-3 text-muted-foreground">Uppgradera när du är redo. Avsluta när som helst.</p>
          <div className="inline-flex mt-6 rounded-lg border border-border p-0.5">
            <button type="button" onClick={() => setIntervalState("month")}
              className={`px-4 py-1.5 rounded-md text-sm ${interval === "month" ? "bg-neon-cyan/15 text-neon-cyan" : "text-muted-foreground"}`}>Månadsvis</button>
            <button type="button" onClick={() => setIntervalState("year")}
              className={`px-4 py-1.5 rounded-md text-sm ${interval === "year" ? "bg-neon-cyan/15 text-neon-cyan" : "text-muted-foreground"}`}>Årsvis <span className="text-score-high">−17%</span></button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((p) => {
            const price = formatPrice(p, interval);
            const current = ent?.plan === p.id;
            return (
              <div key={p.id}
                className={`card-surface p-6 flex flex-col ${p.highlighted ? "border-neon-cyan/40 ring-1 ring-neon-cyan/20" : ""}`}>
                {p.highlighted && <span className="self-start mb-2 text-[10px] uppercase tracking-wide text-neon-cyan">Populärast</span>}
                <h3 className="text-lg font-bold font-display">{p.name}</h3>
                <p className="text-xs text-muted-foreground mb-4">{p.tagline}</p>
                <div className="mb-4">
                  <span className="text-2xl font-bold font-display">{price.big}</span>
                  <span className="text-xs text-muted-foreground ml-1">{price.sub}</span>
                </div>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-score-high shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={p.highlighted ? "default" : "outline"}
                  disabled={current || busy === p.id}
                  onClick={() => onCta(p.id)}
                >
                  {busy === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : current ? "Nuvarande plan" : p.cta}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">Alla priser exkl. moms. Moms/VAT hanteras vid checkout.</p>
      </main>
      <Footer />
    </div>
  );
}
