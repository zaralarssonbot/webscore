import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { startCheckout } from "@/lib/billing/billing-service";

const MESSAGES: Record<string, string> = {
  analyses_month: "Du har nått din månadsgräns för analyser.",
  pdf_month: "Du har nått din månadsgräns för PDF-rapporter.",
  domains_active: "Du har nått din gräns för antal domäner.",
  monitoring: "Automatisk övervakning ingår i Pro och uppåt.",
  competitors_per_domain: "Konkurrentspårning ingår i Pro och uppåt.",
  ai: "Full AI-analys ingår i Pro och uppåt.",
};

export default function UpgradeDialog({
  open,
  onOpenChange,
  metric,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  metric?: string;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const upgrade = async () => {
    setBusy(true);
    const r = await startCheckout("pro", "month");
    setBusy(false);
    if (r.url) window.location.href = r.url;
    else toast.error(r.error ?? "Kunde inte starta betalning");
  };

  const msg = (metric && MESSAGES[metric]) || "Den här funktionen kräver en högre plan.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-neon-cyan" /> Uppgradera för mer
          </DialogTitle>
          <DialogDescription>{msg} Uppgradera för högre gränser och fler funktioner.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button className="flex-1" onClick={upgrade} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Uppgradera till Pro"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => { onOpenChange(false); navigate("/plans"); }}>
            Se alla planer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
