import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, ShieldCheck, Clock } from "lucide-react";
import { scoreColor } from "@/lib/score-color";
import Sparkline from "./Sparkline";
import { getSparkline } from "@/lib/account/trend-service";
import { updateDomain } from "@/lib/account/domain-service";
import type { Domain } from "@/lib/account/types";

function lastAnalyzed(iso: string | null): string {
  if (!iso) return "Aldrig analyserad";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "Analyserad idag";
  if (d === 1) return "Igår";
  return `${d} dagar sedan`;
}

export default function DomainCard({ domain, onChanged }: { domain: Domain; onChanged?: () => void }) {
  const { data: spark = [] } = useQuery({
    queryKey: ["sparkline", domain.id],
    queryFn: () => getSparkline(domain.id),
  });

  const score = domain.latest_score;
  const color = typeof score === "number" ? scoreColor(score) : null;

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    await updateDomain(domain.id, { is_favorite: !domain.is_favorite });
    onChanged?.();
  };

  return (
    <Link
      to={`/app/domains/${domain.id}`}
      className="card-surface p-5 flex flex-col gap-4 hover:border-neon-cyan/25 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{domain.display_name || domain.normalized_domain}</h3>
            {domain.verified && <ShieldCheck className="w-3.5 h-3.5 text-score-high shrink-0" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{domain.normalized_domain}</p>
        </div>
        <button
          type="button"
          onClick={toggleFavorite}
          aria-label={domain.is_favorite ? "Ta bort favorit" : "Markera som favorit"}
          className="shrink-0 text-muted-foreground hover:text-neon-cyan"
        >
          <Star className={`w-4 h-4 ${domain.is_favorite ? "fill-neon-cyan text-neon-cyan" : ""}`} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-full border-2 flex items-center justify-center text-lg font-bold font-display"
          style={color ? { borderColor: color.hsl, color: color.hsl } : { borderColor: "hsl(var(--border))" }}
        >
          {typeof score === "number" ? score : "—"}
        </div>
        <div className="flex-1 min-w-0">
          <Sparkline data={spark} color={color?.hsl ?? "hsl(var(--muted-foreground))"} />
          {domain.is_primary && (
            <span className="inline-block mt-1 text-[10px] uppercase tracking-wide text-neon-cyan">Primär</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        {lastAnalyzed(domain.last_analyzed_at)}
      </div>
    </Link>
  );
}
