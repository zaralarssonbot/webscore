import { Link } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import { useEntitlements } from "@/hooks/useEntitlements";
import { billingEnabled } from "@/lib/account/limits";

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

/** Trial countdown / past-due / cancel-at-period-end banners for the app shell. */
export default function SubscriptionBanner() {
  const { data: ent } = useEntitlements();
  if (!billingEnabled() || !ent) return null;

  const sub = ent.subscription;
  const status = ent.status;

  if (status === "past_due" || status === "unpaid") {
    return (
      <Banner tone="warn">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Din senaste betalning misslyckades. <Link to="/app/billing" className="underline">Uppdatera betalmetod</Link> för att behålla din plan.</span>
      </Banner>
    );
  }
  if (status === "trialing" && sub?.trial_end) {
    const d = daysUntil(sub.trial_end);
    if (d != null && d >= 0) {
      return (
        <Banner tone="info">
          <Clock className="w-4 h-4 shrink-0" />
          <span>Din provperiod avslutas om {d} {d === 1 ? "dag" : "dagar"}. <Link to="/app/billing" className="underline">Hantera prenumeration</Link>.</span>
        </Banner>
      );
    }
  }
  if (sub?.cancel_at_period_end && sub.current_period_end) {
    const d = daysUntil(sub.current_period_end);
    return (
      <Banner tone="info">
        <Clock className="w-4 h-4 shrink-0" />
        <span>Din plan avslutas om {d} dagar. <Link to="/app/billing" className="underline">Återaktivera</Link>.</span>
      </Banner>
    );
  }
  return null;
}

function Banner({ tone, children }: { tone: "info" | "warn"; children: React.ReactNode }) {
  const cls = tone === "warn"
    ? "border-score-low/30 bg-score-low/[0.08] text-score-low"
    : "border-neon-cyan/25 bg-neon-cyan/[0.06] text-foreground";
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${cls}`}>
      {children}
    </div>
  );
}
