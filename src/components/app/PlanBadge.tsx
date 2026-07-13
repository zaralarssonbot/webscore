import type { PlanId } from "@/lib/billing/plans";

const STYLES: Record<PlanId, string> = {
  free: "bg-white/5 text-muted-foreground border-border",
  pro: "bg-neon-cyan/10 text-neon-cyan border-neon-cyan/20",
  business: "bg-neon-purple/10 text-neon-purple border-neon-purple/20",
  enterprise: "bg-score-high/10 text-score-high border-score-high/20",
};

export default function PlanBadge({ plan }: { plan: PlanId }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wide border ${STYLES[plan] ?? STYLES.free}`}>
      {plan}
    </span>
  );
}
