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

  return (
    <div className="glass-card-elevated p-6 sm:p-7 rounded-2xl relative overflow-hidden">
      <div className="accent-line-top" style={{ background: "linear-gradient(90deg, transparent, hsla(45,100%,55%,0.5), hsla(25,100%,58%,0.3), transparent)" }} />
      <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: "inset 0 0 80px hsla(45,100%,55%,0.02)" }} />

      <div className="flex items-center gap-3 mb-5 relative">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-amber-400/15" style={{ background: "hsla(45,100%,55%,0.08)" }}>
          <Building2 className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold font-display">Google Business Profile</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{domain}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 relative">
        {/* Rating */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/10 text-center"
        >
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
          <span className="text-2xl font-bold font-display text-amber-400">{stars.toFixed(1)}</span>
          <p className="text-[10px] text-muted-foreground mt-1">Betyg</p>
        </motion.div>

        {/* Review count */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl bg-neon-cyan/5 border border-neon-cyan/10 text-center"
        >
          <MessageSquare className="w-5 h-5 text-neon-cyan mx-auto mb-2" />
          <span className="text-2xl font-bold font-display text-neon-cyan">{data.reviewCount ?? "–"}</span>
          <p className="text-[10px] text-muted-foreground mt-1">Omdömen</p>
        </motion.div>
      </div>

      {/* Activity assessment */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-4 p-3 rounded-xl bg-secondary/10 border border-border/10"
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              background: (data.reviewCount || 0) >= 20 ? "hsl(var(--score-high))" : (data.reviewCount || 0) >= 5 ? "hsl(var(--score-mid))" : "hsl(var(--score-low))",
              boxShadow: (data.reviewCount || 0) >= 20 ? "0 0 6px hsla(160,85%,50%,0.5)" : "none",
            }}
          />
          <span className="text-xs font-medium">
            {(data.reviewCount || 0) >= 20 ? "Aktiv profil" : (data.reviewCount || 0) >= 5 ? "Måttlig aktivitet" : "Låg aktivitet"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-light leading-relaxed">
          {(data.reviewCount || 0) >= 20
            ? "Bra närvaro – kunder lämnar regelbundet omdömen"
            : (data.reviewCount || 0) >= 5
            ? "Profilen finns men skulle gynnas av fler omdömen"
            : "Få eller inga omdömen – en stor möjlighet att bygga förtroende"}
        </p>
      </motion.div>
    </div>
  );
};

export default GoogleBusinessCard;
