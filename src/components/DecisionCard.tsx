import { motion, useReducedMotion } from "framer-motion";
import { Target, Check, ArrowRight, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tierColor, alpha, type ScoreTier } from "@/lib/score-color";

/**
 * DecisionCard — the foundation of every recommendation Webscore gives.
 *
 * Design intent: this is NOT an AI response. It is a trusted senior consultant
 * telling you, calmly and exactly, what to do next. It reads top-to-bottom the
 * way a person explains a recommendation — the move first and biggest, then the
 * reasoning, the evidence behind it, what it means for the business, why it comes
 * first, how sure we are, and the one action to take.
 *
 * Native to the Webscore system — introduces no new visual style:
 *  - Frame   → `.card-focus` (the "one dominant card" ring) on `bg-card`. The
 *              whole-card hover-bounce of `.card-surface` is intentionally NOT
 *              used: a verdict should sit still.
 *  - Labels  → `.data-label` (JetBrains Mono eyebrow), the existing idiom.
 *  - Icon    → the tinted `w-10 rounded-xl` icon box from the result cards, in
 *              brand cyan (the leftmost stop of the brand gradient).
 *  - Evidence→ the `rounded-xl bg-secondary border-border` row from
 *              BusinessImpactCard, with a verified-observation check marker.
 *  - Accent  → the brand gradient appears on exactly one element: the action.
 *  - Motion  → a single subtle fade-up on the house ease [0.16,1,0.3,1],
 *              disabled under prefers-reduced-motion.
 *
 * Honesty: Confidence is qualitative (Hög / God / Preliminär) with a grounded
 * reason — matching the product's deliberate refusal to fabricate numbers.
 *
 * Example:
 *   <DecisionCard
 *     priorityRank={1}
 *     decision="Skriv om startsidans rubrik så den säger vad ni gör inom 3 sekunder."
 *     why="Besökaren avgör på några sekunder om de stannar. Idag förklarar rubriken inte vad ni erbjuder, så de flesta lämnar innan de förstår värdet."
 *     evidence={[
 *       "Rubriken nämner inte vilken tjänst ni säljer",
 *       "Ingen tydlig värdesats ovanför vikningen",
 *       "Första intrycket är en bild utan förklarande text",
 *     ]}
 *     businessImpact="Fler av besökarna ni redan betalar för blir kontakt — inte bara trafik."
 *     priorityReason="Hittbarhet håller tillbaka resten — så det är här vi börjar."
 *     confidence="high"
 *     confidenceReason="Vi har vägt in 41 kontroller och din uppmätta laddningstid."
 *     action={{ label: "Boka 20 min genomgång", onClick: openBooking }}
 *   />
 */

export type DecisionConfidence = "high" | "medium" | "preliminary";

interface DecisionAction {
  label: string;
  /** Use href for navigation, onClick for in-page actions (e.g. open a modal). */
  href?: string;
  onClick?: () => void;
}

export interface DecisionCardProps {
  /** Rank among all recommendations. 1 = do this before anything else. */
  priorityRank: number;
  /** 1 = the single most important recommendation, stated as a clear instruction. */
  decision: string;
  /** Why this recommendation matters — one or two calm sentences. */
  why: string;
  /** The concrete observations that support it. Keep to 2–4. */
  evidence: string[];
  /** How this affects the business, not just the website. One line. */
  businessImpact: string;
  /** Why this comes before every other recommendation. One line. */
  priorityReason: string;
  /** How confident Webscore is. */
  confidence: DecisionConfidence;
  /** Why we're that confident — what it's grounded in. One line. */
  confidenceReason: string;
  /** The one concrete next action. */
  action: DecisionAction;
  /** Optional eyebrow override (defaults derive from rank). */
  priorityLabel?: string;
  /** Optional icon override; defaults to a calm focus mark. */
  icon?: LucideIcon;
  /** Semantic priority accent — ties the lead recommendation to the score's
   *  urgency tier (defaults to the brand cyan "good" tier). */
  accentTier?: ScoreTier;
  className?: string;
}

const CONFIDENCE: Record<DecisionConfidence, { filled: number; word: string }> = {
  high: { filled: 3, word: "Stark" },
  medium: { filled: 2, word: "God" },
  preliminary: { filled: 1, word: "Preliminär" },
};

/** Three calm segments — qualitative, never a percentage. */
const ConfidenceMeter = ({ confidence }: { confidence: DecisionConfidence }) => {
  const { filled, word } = CONFIDENCE[confidence];
  return (
    <span className="flex items-center gap-2">
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "h-3 w-1.5 rounded-full transition-colors",
              i < filled ? "bg-neon-cyan" : "bg-border",
            )}
          />
        ))}
      </span>
      <span className="text-[0.9rem] font-medium text-foreground tabular-nums">{word}</span>
    </span>
  );
};

const MetaCell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <p className="data-label text-[0.62rem] text-muted-foreground/55">{label}</p>
    <div className="text-[0.9rem] text-muted-foreground/85 leading-[1.55]">{children}</div>
  </div>
);

const DecisionCard = ({
  priorityRank,
  decision,
  why,
  evidence,
  businessImpact,
  priorityReason,
  confidence,
  confidenceReason,
  action,
  priorityLabel,
  icon: Icon = Target,
  accentTier = "good",
  className,
}: DecisionCardProps) => {
  const reduce = useReducedMotion();
  const eyebrow = priorityLabel ?? (priorityRank === 1 ? "BÖRJA HÄR" : "NÄSTA STEG");
  // Semantic priority accent — the lead recommendation carries the score's
  // urgency colour so the highest priority reads instantly.
  const accent = tierColor(accentTier);

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        // Frame: the "one dominant card" ring, on the standard card surface,
        // permanently elevated — no hover-bounce.
        "card-focus relative overflow-hidden rounded-2xl bg-card p-7 sm:p-8",
        className,
      )}
      aria-label="Rekommendation"
    >
      {/* Priority — the rank, read in an instant, in the urgency colour. */}
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-1.5 w-1.5 rounded-full" style={{ background: accent.hsl, boxShadow: `0 0 8px ${accent.glow}` }} aria-hidden="true" />
        <span className="data-label text-[0.64rem]" style={{ color: alpha(accent, 0.9) }}>PRIORITET {priorityRank}</span>
        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" aria-hidden="true" />
        <span className="data-label text-[0.64rem] text-muted-foreground/55">{eyebrow}</span>
      </div>

      {/* Decision + Why — the 5-second payload. */}
      <div className="mt-5 flex items-start gap-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border" style={{ borderColor: alpha(accent, 0.25), background: alpha(accent, 0.09) }}>
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} style={{ color: accent.hsl }} />
        </div>
        <div className="space-y-2.5">
          <h3 className="font-display text-xl sm:text-2xl font-semibold tracking-[-0.02em] leading-[1.25] text-foreground">
            {decision}
          </h3>
          <p className="text-[0.95rem] text-muted-foreground/85 leading-[1.7]">{why}</p>
        </div>
      </div>

      {/* Evidence — the observations behind the call. */}
      <div className="mt-6 space-y-2.5">
        <p className="data-label text-[0.62rem] text-muted-foreground/55">VAD VI SER</p>
        <ul className="space-y-2">
          {evidence.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border bg-secondary px-3.5 py-2.5"
            >
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neon-cyan/20 bg-neon-cyan/10">
                <Check className="h-3 w-3 text-neon-cyan" strokeWidth={2.5} />
              </span>
              <span className="text-[0.9rem] text-muted-foreground/85 leading-[1.55]">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Meta — plain labeled type, never a dashboard: why first · impact · confidence. */}
      <div className="mt-7 grid grid-cols-1 gap-x-6 gap-y-5 border-t border-border pt-6 sm:grid-cols-3">
        <MetaCell label={priorityRank === 1 ? "VARFÖR FÖRST" : "VARFÖR DET HÄR"}>{priorityReason}</MetaCell>
        <MetaCell label="VAD DET GER ER">{businessImpact}</MetaCell>
        <MetaCell label="VÅR BEDÖMNING">
          <div className="space-y-1">
            <ConfidenceMeter confidence={confidence} />
            <p className="text-[0.82rem] text-muted-foreground/65 leading-[1.5]">{confidenceReason}</p>
          </div>
        </MetaCell>
      </div>

      {/* Next action — the single bright element. */}
      <div className="mt-7">
        {action.href ? (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <a href={action.href}>
              {action.label}
              <ArrowRight />
            </a>
          </Button>
        ) : (
          <Button size="lg" onClick={action.onClick} className="w-full sm:w-auto">
            {action.label}
            <ArrowRight />
          </Button>
        )}
      </div>
    </motion.article>
  );
};

export default DecisionCard;
