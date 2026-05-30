import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Loader2, Hash, Search, Building2, User, Phone, MapPin, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitLead } from "@/lib/scan-service";
import { markBookingClicked } from "@/lib/lead-service";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const leadSchema = z.object({
  orgNumber: z.string().trim().min(10, "Organisationsnummer krävs (10 siffror)").max(13),
  name: z.string().trim().min(1, "Kontaktperson krävs").max(100),
  email: z.string().trim().email("Vänligen ange en giltig e-postadress").max(255),
  phone: z.string().trim().min(5, "Telefonnummer krävs").max(30),
  company: z.string().trim().min(1, "Företagsnamn krävs").max(200),
});

interface AnalysisContext {
  domain?: string;
  totalScore?: number;
  summary?: string;
  biggestProblem?: string;
  industry?: string;
  competitorAvgScore?: number;
}

interface LeadCaptureModalProps {
  open: boolean;
  onClose: () => void;
  scanId?: string;
  title?: string;
  analysisContext?: AnalysisContext;
}

const LeadCaptureModal = ({ open, onClose, scanId, title = "Boka gratis analys", analysisContext }: LeadCaptureModalProps) => {
  const [orgNumber, setOrgNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [signatory, setSignatory] = useState("");
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setOrgNumber("");
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setAddress("");
      setSignatory("");
      setErrors({});
      setLookupDone(false);
    }, 300);
  };

  const handleOrgLookup = async () => {
    const cleaned = orgNumber.replace(/[\s-]/g, '');
    if (cleaned.length < 10) {
      setErrors({ orgNumber: "Ange ett giltigt organisationsnummer (10 siffror)" });
      return;
    }
    setErrors({});
    setLookupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("lookup-company", {
        body: { orgNumber: cleaned },
      });
      if (error || !data?.success) {
        setErrors({ orgNumber: data?.error || "Kunde inte hitta företaget" });
        setLookupDone(false);
        return;
      }
      const info = data.data;
      if (info.name) setCompany(info.name);
      if (info.phone) setPhone(info.phone);
      if (info.signatory) {
        setSignatory(info.signatory);
        setName(info.signatory);
      }
      if (info.address) {
        const fullAddr = [info.address, info.zipcode, info.city].filter(Boolean).join(", ");
        setAddress(fullAddr);
      }
      setLookupDone(true);
      toast({ title: "Företag hittat!", description: info.name || "Information hämtad" });
    } catch {
      setErrors({ orgNumber: "Något gick fel vid sökningen" });
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = leadSchema.safeParse({ orgNumber, name, email, phone, company });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const visibilityGap = analysisContext?.competitorAvgScore && analysisContext?.totalScore
      ? analysisContext.competitorAvgScore - analysisContext.totalScore
      : undefined;

    const estimatedLoss = analysisContext?.totalScore
      ? analysisContext.totalScore < 50 ? "15-25 kunder/mån" : analysisContext.totalScore < 70 ? "5-15 kunder/mån" : "1-5 kunder/mån"
      : undefined;

    setLoading(true);
    try {
      const leadId = await submitLead({
        name: result.data.name,
        email: result.data.email,
        company: `${result.data.company} | Org: ${orgNumber}${address ? ` | Adress: ${address}` : ""}${signatory ? ` | Firmatecknare: ${signatory}` : ""} | Tel: ${phone}`,
        scanId,
        domain: analysisContext?.domain,
        totalScore: analysisContext?.totalScore,
        visibilityGap,
        estimatedLoss,
        analysisSummary: analysisContext?.summary,
        biggestProblem: analysisContext?.biggestProblem,
        industry: analysisContext?.industry,
        leadStatus: "meeting_booked",
      });
      await markBookingClicked(leadId);
      toast({ title: "Förfrågan skickad!", description: "Vi hör av oss inom 24 timmar." });
      handleClose();
    } catch {
      toast({ title: "Något gick fel", description: "Vänligen försök igen.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-secondary/20 border border-border/20 rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-colors text-sm";
  const iconInputClass = "w-full bg-secondary/20 border border-border/20 rounded-xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-colors text-sm";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative glass-card-hero glow-border p-8 sm:p-10 max-w-md w-full my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold mb-1 font-display">{title}</h2>
            <p className="text-muted-foreground text-sm mb-6 font-light">
              Ange ditt organisationsnummer så hämtar vi företagsuppgifterna automatiskt.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Org number with lookup */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Organisationsnummer</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <input
                      type="text"
                      placeholder="XXXXXX-XXXX"
                      value={orgNumber}
                      onChange={(e) => { setOrgNumber(e.target.value); setLookupDone(false); }}
                      className={iconInputClass + " font-mono"}
                      maxLength={13}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleOrgLookup}
                    disabled={lookupLoading || orgNumber.replace(/[\s-]/g, '').length < 10}
                    className="rounded-xl px-5 shrink-0"
                    variant={lookupDone ? "outline" : "default"}
                  >
                    {lookupLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : lookupDone ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Sök
                      </>
                    )}
                  </Button>
                </div>
                {errors.orgNumber && <p className="text-score-low text-xs mt-1">{errors.orgNumber}</p>}
              </div>

              {/* Company info - shown after lookup or manually */}
              <AnimatePresence>
                {(lookupDone || company) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Company name */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Företagsnamn</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} className={iconInputClass} placeholder="Företagsnamn" maxLength={200} />
                      </div>
                      {errors.company && <p className="text-score-low text-xs mt-1">{errors.company}</p>}
                    </div>

                    {/* Address */}
                    {address && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Adress</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={iconInputClass} placeholder="Adress" />
                        </div>
                      </div>
                    )}

                    {/* Signatory */}
                    {signatory && (
                      <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Firmatecknare</label>
                        <div className="relative">
                          <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                          <input type="text" value={signatory} onChange={(e) => setSignatory(e.target.value)} className={iconInputClass} readOnly />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Contact person */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Kontaktperson</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input type="text" placeholder="Ditt namn" value={name} onChange={(e) => setName(e.target.value)} className={iconInputClass} maxLength={100} />
                </div>
                {errors.name && <p className="text-score-low text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">E-postadress</label>
                <input type="email" placeholder="E-postadress" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} maxLength={255} />
                {errors.email && <p className="text-score-low text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Telefonnummer</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input type="tel" placeholder="Telefonnummer" value={phone} onChange={(e) => setPhone(e.target.value)} className={iconInputClass} maxLength={30} />
                </div>
                {errors.phone && <p className="text-score-low text-xs mt-1">{errors.phone}</p>}
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

              <p className="text-center text-xs text-muted-foreground/50">
                Vi återkommer inom 24 timmar
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LeadCaptureModal;
