import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * One subtle, premium "how this works" affordance placed beside the score and
 * the report — the single point where Webscore explains, calmly and honestly,
 * where the grade comes from. Replaces the per-metric provenance badges.
 */
const POINTS = [
  "Webscore mäter din webbplats direkt.",
  "Google PageSpeed bidrar med prestandadata.",
  "Betyget beräknas matematiskt.",
  "AI beräknar aldrig betyget.",
  "AI förklarar bara de uppmätta fynden.",
];

interface ScoreInfoProps {
  /** Accessible label for the trigger (defaults to a generic one). */
  label?: string;
  className?: string;
}

const ScoreInfo = ({ label = "Så beräknas betyget", className }: ScoreInfoProps) => (
  <Popover>
    <PopoverTrigger
      aria-label={label}
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full border border-border/60 text-muted-foreground/70 transition-colors duration-200 hover:border-neon-cyan/40 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/40 ${className ?? ""}`}
    >
      <Info className="h-3.5 w-3.5" strokeWidth={2} />
    </PopoverTrigger>
    <PopoverContent align="center" sideOffset={8} className="w-[300px] p-5">
      <p className="data-label text-[0.66rem] text-neon-cyan/85 mb-3">Så fungerar analysen</p>
      <ul className="space-y-2.5">
        {POINTS.map((point) => (
          <li key={point} className="flex items-start gap-2.5 text-[0.83rem] leading-[1.5] text-muted-foreground/90">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-neon-cyan/70" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
    </PopoverContent>
  </Popover>
);

export default ScoreInfo;
