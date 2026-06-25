import type { LucideIcon } from "lucide-react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * One reusable explainer modal shared by every clickable info card on the site.
 * Built on the radix Dialog primitive, so it gets focus-trap, Esc-to-close,
 * click-outside-to-close, focus restoration and aria-modal for free. Styled to
 * the premium dark system: card surface, Space Grotesk title, the brand
 * gradient used sparingly (icon chip + CTA), soft fade+scale enter/exit
 * (disabled under prefers-reduced-motion via index.css).
 */
export interface InfoModalData {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
}

interface InfoModalProps {
  /** The active card's content, or null when closed. */
  data: InfoModalData | null;
  onClose: () => void;
}

/** Send the visitor to the hero analyzer (the primary funnel entry) and focus it. */
const goToAnalyzer = () => {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const input = document.querySelector<HTMLInputElement>('input[placeholder="dinsida.se"]');
  if (input) {
    input.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    setTimeout(() => input.focus({ preventScroll: true }), reduce ? 0 : 500);
  } else {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }
};

const InfoModal = ({ data, onClose }: InfoModalProps) => {
  const Icon = data?.icon;
  return (
    <Dialog open={!!data} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent aria-modal="true" className="flex flex-col gap-0 w-[calc(100%-2rem)] max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border-border bg-card p-6 sm:p-8 shadow-2xl text-left">
        {Icon && (
          <div className="icon-chip w-12 h-12 rounded-2xl flex items-center justify-center mb-5">
            <Icon className="w-6 h-6" />
          </div>
        )}
        {data?.eyebrow && (
          <span className="data-label text-[0.72rem] text-neon-blue mb-2">{data.eyebrow}</span>
        )}
        <DialogTitle className="font-display font-bold text-xl sm:text-2xl tracking-[-0.02em] text-foreground">
          {data?.title}
        </DialogTitle>
        <DialogDescription className="text-[0.9375rem] text-muted-foreground leading-[1.75] mt-3">
          {data?.description}
        </DialogDescription>
        <Button onClick={() => { onClose(); goToAnalyzer(); }} size="lg" className="group w-full mt-7">
          Gör en gratis analys
          <ArrowRight className="w-4 h-4 transition-transform duration-[180ms] group-hover:translate-x-1" />
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default InfoModal;

/**
 * Shared shell for any card that opens an InfoModal — applied to a real
 * <button> so it's keyboard-focusable and Enter/Space activate it. Pairs with
 * <CardMoreIndicator/> for the hover/focus "read more" cue.
 */
export const clickableCardClass =
  "group relative cursor-pointer text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-blue/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Subtle top-right arrow that brightens + nudges on hover/focus → "läs mer". */
export const CardMoreIndicator = () => (
  <span
    aria-hidden="true"
    className="absolute top-3 right-3 text-muted-foreground/35 transition-all duration-300 group-hover:text-neon-blue group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:text-neon-blue group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5"
  >
    <ArrowUpRight className="w-4 h-4" />
  </span>
);
