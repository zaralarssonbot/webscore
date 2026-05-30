import { ArrowRight, Clock, ShieldCheck, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InlineBookingCTAProps {
  onBook: () => void;
}

const meta = [
  { icon: Clock, text: "Tar 20 min" },
  { icon: ShieldCheck, text: "Ingen förpliktelse" },
  { icon: Target, text: "Visar vad som bör åtgärdas först" },
];

const InlineBookingCTA = ({ onBook }: InlineBookingCTAProps) => {
  return (
    <div className="card-surface p-6 sm:p-7 relative overflow-hidden text-center">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, hsla(175,95%,50%,0.05) 0%, transparent 60%)" }} />

      <p className="text-base sm:text-lg font-semibold font-display mb-1.5 relative tracking-[-0.01em]">
        Vill du veta exakt vad som bör ändras?
      </p>
      <p className="text-sm text-muted-foreground/80 mb-5 max-w-md mx-auto relative leading-[1.6]">
        Vi visar var du ligger efter och vad som ger störst effekt – helt kostnadsfritt.
      </p>

      <Button variant="glow" size="lg" onClick={onBook} className="group mb-5 glow-precision">
        Boka 20 min genomgång <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
      </Button>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 relative">
        {meta.map((m) => (
          <span key={m.text} className="flex items-center gap-1.5 data-label text-[0.5rem] text-muted-foreground/50">
            <m.icon className="w-3 h-3 text-neon-cyan/60" />
            {m.text}
          </span>
        ))}
      </div>
    </div>
  );
};

export default InlineBookingCTA;
