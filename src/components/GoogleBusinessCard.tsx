import { motion } from "framer-motion";
import { Star, MessageSquare, Building2 } from "lucide-react";
import type { GoogleBusinessData } from "@/lib/scan-service";

interface GoogleBusinessCardProps {
  data: GoogleBusinessData;
  domain: string;
}

const GoogleBusinessCard = ({ data, domain }: GoogleBusinessCardProps) => {
  if (!data.found) return null;

  const stars = data.rating || 0;
  const fullStars = Math.floor(stars);
  const hasHalf = stars % 1 >= 0.3;
  const reviews = data.reviewCount || 0;
  const activity = reviews >= 20
    ? { dot: "hsl(var(--score-high))", glow: true, label: "Aktiv profil", text: "Bra närvaro – kunder lämnar regelbundet omdömen" }
    : reviews >= 5
    ? { dot: "hsl(var(--score-mid))", glow: false, label: "Måttlig aktivitet", text: "Profilen finns men skulle gynnas av fler omdömen" }
    : { dot: "hsl(var(--score-low))", glow: false, label: "Låg aktivitet", text: "Få eller inga omdömen – en stor möjlighet att bygga förtroende" };

  return (
    <div className="card-surface p-6 sm:p-7 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-5 relative">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-amber-400/20 bg-amber-400/[0.08] shrink-0">
          <Building2 className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold font-display tracking-[-0.01em]">Google Business Profile</h2>
          <p className="data-label text-[0.5rem] text-muted-foreground/50 mt-0.5">{domain}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 relative">
        {/* Rating */}
        <div className="card-surface p-4 text-center bg-amber-400/[0.04] border-amber-400/10">
          <div className="flex items-center justify-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className="w-4 h-4"
                fill={i < fullStars || (i === fullStars && hasHalf) ? "hsl(45, 100%, 55%)" : "transparent"}
                stroke={i < fullStars || (i === fullStars && hasHalf) ? "hsl(45, 100%, 55%)" : "hsl(var(--muted-foreground))"}
                strokeWidth={1.5}
                style={i === fullStars && hasHalf ? { clipPath: "inset(0 50% 0 0)", position: "relative" } : {}}
              />
            ))}
          </div>
          <span className="font-mono font-bold tabular-nums text-2xl text-amber-400">{stars.toFixed(1)}</span>
          <p className="data-label text-[0.5rem] text-muted-foreground/50 mt-1">BETYG</p>
        </div>

        {/* Review count */}
        <div className="card-surface p-4 text-center bg-neon-cyan/[0.04] border-neon-cyan/10">
          <MessageSquare className="w-5 h-5 text-neon-cyan mx-auto mb-2" />
          <span className="font-mono font-bold tabular-nums text-2xl text-neon-cyan">{data.reviewCount ?? "–"}</span>
          <p className="data-label text-[0.5rem] text-muted-foreground/50 mt-1">OMDÖMEN</p>
        </div>
      </div>

      {/* Activity assessment */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="mt-4 p-3 rounded-xl bg-secondary border border-border"
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: activity.dot, boxShadow: activity.glow ? "0 0 6px hsla(160,85%,50%,0.5)" : "none" }} />
          <span className="text-xs font-medium">{activity.label}</span>
        </div>
        <p className="text-xs text-muted-foreground/80 leading-[1.6]">{activity.text}</p>
      </motion.div>
    </div>
  );
};

export default GoogleBusinessCard;
