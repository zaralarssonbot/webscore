import { Route } from "lucide-react";
import type { RoadmapPhase } from "@/lib/recommendation-engine";

/**
 * RoadmapCard — the prioritised fixes as a calm, few-week execution plan.
 *
 * Not a dashboard, no charts, no timeline, no progress bars. It reuses the
 * existing card language exactly: the `.card-surface` shell, the tinted icon box
 * and mono `.data-label` header from the result cards, the `bg-secondary` row
 * from the Decision Card's evidence list, and a quiet mono time tag. Each phase
 * holds at most a few actions, each with an approximate effort — the way a senior
 * consultant would lay out the next month.
 */

interface RoadmapCardProps {
  phases: RoadmapPhase[];
}

const RoadmapCard = ({ phases }: RoadmapCardProps) => {
  return (
    <section className="card-surface p-6 sm:p-8 relative overflow-hidden">
      {/* Header — same idiom as the result cards. */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/20 bg-neon-cyan/[0.08]">
          <Route className="h-[18px] w-[18px] text-neon-cyan" strokeWidth={2} />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold tracking-[-0.01em]">Din plan framåt</h2>
          <p className="data-label mt-0.5 text-[0.62rem] text-muted-foreground/55">DE NÄRMASTE VECKORNA</p>
        </div>
      </div>

      <div className="space-y-7">
        {phases.map((phase, pi) => (
          <div key={pi}>
            {/* Phase heading — a number, a focus label, a one-line intent. */}
            <div className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neon-cyan/12 font-mono text-[0.7rem] font-bold text-neon-cyan tabular-nums">
                {pi + 1}
              </span>
              <h3 className="font-display text-sm font-semibold text-foreground">{phase.title}</h3>
            </div>
            <p className="mb-2.5 mt-1 pl-7 text-[0.8rem] text-muted-foreground/60">{phase.intent}</p>

            {/* Actions — the evidence-row idiom, with a quiet effort tag. */}
            <ul className="space-y-2 pl-7">
              {phase.items.map((item, ii) => (
                <li
                  key={ii}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary px-3.5 py-2.5"
                >
                  <span className="text-[0.9rem] leading-snug text-muted-foreground/85">{item.action}</span>
                  <span className="shrink-0 whitespace-nowrap rounded-md border border-border px-2 py-0.5 font-mono text-[0.7rem] tabular-nums text-muted-foreground/70">
                    {item.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};

export default RoadmapCard;
