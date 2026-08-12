import {
  type ConceptVisual,
} from "@/components/portfolio/concept-visuals";

/**
 * Presentational frames for the concept studies.
 *
 * Data (image imports, domains, page labels and alt text) lives in
 * `concept-visuals.ts` so this file only exports components — keeping React Fast
 * Refresh happy and the split between content and presentation explicit.
 *
 * Domains are NEVER baked into the generated images: BrowserFrame renders them
 * as real React text, so they stay sharp and correctly spelled, and they are
 * <span>s rather than links because these hosts are illustrative.
 */

/* ─────────────────────────── Shared frames ─────────────────────────── */

/**
 * Browser chrome. The address bar holds the domain as real React text so it
 * stays crisp and correctly spelled at every size. It is a <span>: these hosts
 * illustrate a concept and must not be clickable.
 */
export const BrowserFrame = ({
  domain,
  children,
  tint = "rgba(255,255,255,0.06)",
  className = "",
}: {
  domain: string;
  children: React.ReactNode;
  tint?: string;
  className?: string;
}) => (
  <div className={`h-full w-full overflow-hidden rounded-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ${className}`}>
    <div className="flex items-center gap-1.5 px-3 py-2" style={{ background: tint }}>
      <span className="h-2 w-2 rounded-full bg-white/25" />
      <span className="h-2 w-2 rounded-full bg-white/20" />
      <span className="h-2 w-2 rounded-full bg-white/15" />
      <span className="ml-2 flex-1 truncate rounded-md bg-black/25 px-2 py-[3px] font-mono text-[0.58rem] tracking-wide text-white/60 sm:text-[0.62rem]">
        {domain}
      </span>
    </div>
    <div className="relative h-[calc(100%-1.9rem)] w-full overflow-hidden">{children}</div>
  </div>
);

/** Small phone, used only where a mobile view genuinely adds something. */
export const PhoneFrame = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`overflow-hidden rounded-[0.9rem] border-[3px] border-black/60 shadow-[0_12px_28px_rgba(0,0,0,0.55)] ${className}`}
  >
    <div className="relative h-full w-full overflow-hidden bg-white">{children}</div>
  </div>
);

/**
 * Card preview: the homepage in browser chrome, plus a phone for the two
 * directions where the mobile view is part of the argument. Decorative — the
 * card body carries the readable text, so the wrapper is aria-hidden upstream.
 */
export const ConceptShot = ({ visual }: { visual: ConceptVisual }) => (
  <div className="relative h-full w-full">
    <BrowserFrame domain={visual.domain} tint={visual.tint}>
      <img src={visual.desktop} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
    </BrowserFrame>
    {visual.mobile && (
      <PhoneFrame className="absolute -bottom-3 right-3 h-[58%] w-[22%]">
        <img src={visual.mobile} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
      </PhoneFrame>
    )}
  </div>
);
