import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Loader2, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitLead } from "@/lib/scan-service";
import { markAnalysisSent, autoScheduleFollowUp } from "@/lib/lead-service";
import { type EmailReportData } from "@/lib/email-report";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().trim().email("Vänligen ange en giltig e-postadress").max(255);

interface EmailReportModalProps {
  open: boolean;
  onClose: () => void;
  scanId?: string;
  reportData: EmailReportData;
}

const EmailReportModal = ({ open, onClose, scanId, reportData }: EmailReportModalProps) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = emailSchema.safeParse(email);
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      // Save lead with analysis context
      const estimatedLoss = reportData.score < 50
        ? "15-25 kunder/mån"
        : reportData.score < 70
          ? "5-15 kunder/mån"
          : "1-5 kunder/mån";

      const leadId = await submitLead({
        name: "—",
        email: result.data,
        scanId,
        domain: reportData.domain,
        totalScore: reportData.score,
        estimatedLoss,
        analysisSummary: reportData.summary,
        biggestProblem: reportData.biggestProblem,
        industry: reportData.industry,
        leadStatus: "analysis_sent",
      });

      // Record the request and schedule a 24h follow-up for the team.
      await markAnalysisSent(leadId);
      if (scanId) {
        await autoScheduleFollowUp(scanId);
      }

      // NOTE: No email is sent yet. We only capture the request here and the
      // team follows up manually. Wire up real sending before promising a mail:
      // await supabase.functions.invoke('send-transactional-email', {
      //   body: { templateName: 'webscore-report', recipientEmail: result.data, templateData: reportData }
      // });

      setSent(true);
    } catch {
      toast({ title: "Något gick fel", description: "Försök igen.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSent(false);
      setEmail("");
      setError("");
    }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative rounded-3xl border border-neon-cyan/15 bg-card/90 backdrop-blur-xl shadow-2xl p-8 sm:p-10 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={handleClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>

            {sent ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-neon-cyan mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2 font-display">Tack – vi hör av oss!</h2>
                <p className="text-muted-foreground text-sm font-light mb-6">
                  Vi har tagit emot din förfrågan och kontaktar dig inom kort med en genomgång av din rapport och konkreta nästa steg.
                </p>
                <Button variant="glow-outline" size="lg" onClick={handleClose}>
                  Stäng
                </Button>
              </motion.div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/15">
                    <Mail className="w-5 h-5 text-neon-cyan" />
                  </div>
                  <h2 className="text-xl font-bold font-display">Få en personlig genomgång</h2>
                </div>
                <p className="text-muted-foreground text-sm mb-6 font-light">
                  Lämna din e-post så går vi igenom din rapport och hör av oss med konkreta nästa steg – kostnadsfritt och utan förpliktelser.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      placeholder="Din e-postadress"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-secondary/40 border border-border/30 rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-neon-cyan/40 transition-colors text-sm"
                      maxLength={255}
                      autoFocus
                    />
                    {error && <p className="text-score-low text-xs mt-1">{error}</p>}
                  </div>
                  <Button type="submit" variant="glow" size="lg" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Skicka förfrågan
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground/60 text-center font-light">
                    Vi delar aldrig din e-post. Du kan också boka en kostnadsfri 20‑minuters genomgång.
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EmailReportModal;
