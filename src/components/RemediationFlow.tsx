import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, Loader2, Phone, User, Building2, Sparkles, X, Rocket, Search, MapPin, Shield, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitLead } from "@/lib/scan-service";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const contactSchema = z.object({
  orgNumber: z.string().trim().min(10, "Organisationsnummer krävs (10 siffror)").max(13),
  name: z.string().trim().min(1, "Kontaktperson krävs").max(100),
  phone: z.string().trim().min(5, "Telefonnummer krävs").max(30),
  company: z.string().trim().min(1, "Företagsnamn krävs").max(200),
});

interface CompanyData {
  name: string | null;
  address: string | null;
  phone: string | null;
  signatory: string | null;
  city: string | null;
  zipcode: string | null;
  orgNumber: string;
}

interface RemediationFlowProps {
  open: boolean;
  onClose: () => void;
  weaknesses: string[];
  score: number;
  scanId?: string;
}

type Step = "problems" | "packages" | "contact" | "confirmation";

const packages = [
  {
    tier: "STARTER",
    name: "Grundpaket",
    description: "Perfekt för dig som behöver komma igång med en professionell närvaro på nätet.",
    price: "995 kr",
    priceNote: "eller 11 940 kr engångspris · exkl. moms",
    color: "hsl(var(--neon-cyan))",
    colorBg: "hsla(175,95%,50%,0.06)",
    colorBorder: "hsla(175,95%,50%,0.15)",
    colorGlow: "hsla(175,95%,50%,0.2)",
    features: [
      "Upp till 4 sidor (t.ex. Start, Om oss, Tjänster, Kontakt)",
      "Mobilanpassad & responsiv design",
      "Anpassad design utifrån din profil",
      "Kontaktformulär",
      "Google Maps-integration",
      "Grundläggande SEO-optimering",
      "Leverans inom 2 veckor",
      "30 dagars support efter lansering",
    ],
    cta: "Kom igång",
  },
  {
    tier: "PRO",
    name: "Tillväxtpaket",
    description: "För dig som vill synas, växa och konvertera besökare till kunder.",
    price: "1 495 kr",
    priceNote: "eller 17 940 kr engångspris · exkl. moms",
    color: "hsl(var(--neon-cyan))",
    colorBg: "hsla(175,95%,50%,0.06)",
    colorBorder: "hsla(175,95%,50%,0.15)",
    colorGlow: "hsla(175,95%,50%,0.25)",
    popular: true,
    includes: "ALLT I GRUNDPAKETET, PLUS:",
    features: [
      "Upp till 8 sidor",
      "Onlinebokning eller beställningsformulär",
      "Avancerad SEO + Google Business-setup",
      "Snabbladdad bildoptimering",
      "Integration med sociala medier",
      "2 st innehållsuppdateringar ingår (1 år)",
      "Cookiebanner & GDPR-anpassning",
      "90 dagars support efter lansering",
    ],
    cta: "Välj Pro",
  },
  {
    tier: "PREMIUM",
    name: "Premiumpaket",
    description: "Helhetslösningen för dig som vill ha maximal effekt och frihet att växa.",
    price: "1 995 kr",
    priceNote: "eller 23 940 kr engångspris · exkl. moms",
    color: "hsl(var(--neon-cyan))",
    colorBg: "hsla(175,95%,50%,0.06)",
    colorBorder: "hsla(175,95%,50%,0.15)",
    colorGlow: "hsla(175,95%,50%,0.25)",
    includes: "ALLT I TILLVÄXTPAKETET, PLUS:",
    features: [
      "Obegränsat antal sidor",
      "Automatiserade e-postutskick (t.ex. bokningsbekräftelse, nyhetsbrev)",
      "CRM-integration (koppla ihop kunddata)",
      "6 st redaktionella redigeringar/år (text, bilder, priser)",
      "Prioriterad support – svar inom 24h",
      "Månadsrapport med besöksstatistik",
      "Lokal SEO-strategi inkluderad",
      "12 månaders support efter lansering",
    ],
    cta: "Välj Premium",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const RemediationFlow = ({ open, onClose, weaknesses, score, scanId }: RemediationFlowProps) => {
  const [step, setStep] = useState<Step>("problems");
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [orgNumber, setOrgNumber] = useState("");
  const [name, setName] = useState("");
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
      setStep("problems");
      setSelectedPackage(null);
      setOrgNumber("");
      setName("");
      setPhone("");
      setCompany("");
      setAddress("");
      setSignatory("");
      setErrors({});
      setLookupDone(false);
    }, 300);
  };

  const handleSelectPackage = (tier: string) => {
    setSelectedPackage(tier);
    setStep("contact");
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
      const info = data.data as CompanyData;
      if (info.name) setCompany(info.name);
      if (info.phone) setPhone(info.phone);
      if (info.signatory) setName(info.signatory);
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
    const result = contactSchema.safeParse({ orgNumber, name, phone, company });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    try {
      await submitLead({
        name: result.data.name,
        email: result.data.phone,
        company: `${result.data.company} | Org: ${orgNumber} | Paket: ${selectedPackage}${address ? ` | Adress: ${address}` : ""}`,
        scanId,
      });
      setStep("confirmation");
    } catch {
      toast({ title: "Något gick fel", description: "Vänligen försök igen.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

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
          <div className="absolute inset-0 bg-background/90 backdrop-blur-xl" />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 30 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button onClick={handleClose} className="absolute top-4 right-4 z-10 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-6 h-6" />
            </button>

            <AnimatePresence mode="wait">
              {/* STEP 1: Problems */}
              {step === "problems" && (
                <motion.div key="problems" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35 }} className="rounded-3xl border border-neon-cyan/15 bg-card/70 backdrop-blur-xl shadow-2xl p-8 sm:p-12">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-score-low/10 border border-score-low/15 text-score-low text-sm font-medium mb-4">
                      <AlertTriangle className="w-4 h-4" />
                      {weaknesses.length} problem identifierade
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold font-display mb-2">
                      Det här håller din hemsida <span className="text-score-low">tillbaka</span>
                    </h2>
                    <p className="text-muted-foreground font-light max-w-lg mx-auto">
                      Vår AI har identifierat följande problem som påverkar din synlighet, trovärdighet och försäljning.
                    </p>
                  </div>

                  <div className="space-y-3 max-w-2xl mx-auto mb-10">
                    {weaknesses.map((w, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + i * 0.08 }}
                        className="flex items-start gap-3 p-4 rounded-xl bg-score-low/5 border border-score-low/10 hover:border-score-low/25 transition-all"
                      >
                        <span className="w-6 h-6 rounded-lg bg-score-low/10 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-score-low font-display">{i + 1}</span>
                        <span className="text-sm font-light leading-relaxed">{w}</span>
                      </motion.div>
                    ))}
                  </div>

                  <div className="text-center">
                    <Button variant="glow" size="xl" onClick={() => setStep("packages")} className="group">
                      Visa lösningar
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Packages */}
              {step === "packages" && (
                <motion.div key="packages" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35 }}>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold font-display mb-2">
                      Välj rätt paket för <span className="gradient-text">ditt företag</span>
                    </h2>
                    <p className="text-muted-foreground font-light max-w-lg mx-auto">
                      Alla paket inkluderar modern design, SEO-optimering och mobilanpassning.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-5">
                    {packages.map((pkg, i) => (
                      <motion.div
                        key={pkg.tier}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.12, duration: 0.5 }}
                        className={`card-surface p-6 sm:p-7 relative overflow-hidden flex flex-col group ${pkg.popular ? "ring-1" : ""}`}
                        style={{
                          borderColor: pkg.colorBorder,
                          ...(pkg.popular ? { boxShadow: `0 0 40px ${pkg.colorGlow}, inset 0 0 40px ${pkg.colorBg}`, ringColor: pkg.color } : {}),
                        }}
                      >
                        {/* Top accent */}
                        <div className="accent-line-top" style={{ background: `linear-gradient(90deg, transparent, ${pkg.color}, transparent)` }} />

                        {/* Tier badge */}
                        <div className="inline-flex self-start data-label text-[0.58rem] px-3 py-1 rounded-full mb-4" style={{ color: pkg.color, background: pkg.colorBg, border: `1px solid ${pkg.colorBorder}` }}>
                          {pkg.tier}
                        </div>

                        {pkg.popular && (
                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider" style={{ background: pkg.color, color: "hsl(var(--background))" }}>
                            POPULÄRAST
                          </div>
                        )}

                        <h3 className="text-xl font-bold font-display mb-1">{pkg.name}</h3>
                        <p className="text-muted-foreground text-sm font-light mb-4 leading-relaxed">{pkg.description}</p>

                        <div className="mb-1">
                          <span className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight" style={{ color: pkg.color }}>{pkg.price}</span>
                          <span className="text-muted-foreground text-sm font-light"> /mån</span>
                        </div>
                        <p className="text-xs text-muted-foreground/60 font-light mb-5">{pkg.priceNote}</p>

                        <div className="border-t border-border/10 pt-4 mb-6 flex-1">
                          {pkg.includes && (
                            <p className="data-label text-[0.5rem] text-muted-foreground/50 mb-3">{pkg.includes}</p>
                          )}
                          <ul className="space-y-2.5">
                            {pkg.features.map((f, j) => (
                              <li key={j} className="flex items-start gap-2.5 text-sm font-light">
                                <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: pkg.color }} />
                                {f}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <Button
                          onClick={() => handleSelectPackage(pkg.tier)}
                          size="lg"
                          className="w-full rounded-xl font-semibold text-base group/btn"
                          style={{
                            background: pkg.popular ? pkg.color : "transparent",
                            color: pkg.popular ? "hsl(var(--background))" : "hsl(var(--foreground))",
                            border: pkg.popular ? "none" : `1px solid ${pkg.colorBorder}`,
                            boxShadow: pkg.popular ? `0 0 20px ${pkg.colorGlow}` : "none",
                          }}
                        >
                          {pkg.cta}
                          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Contact form */}
              {step === "contact" && (
                <motion.div key="contact" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.35 }} className="rounded-3xl border border-neon-cyan/15 bg-card/70 backdrop-blur-xl shadow-2xl p-8 sm:p-12 max-w-lg mx-auto">
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/15 text-primary text-sm font-medium mb-4">
                      <Sparkles className="w-4 h-4" />
                      {selectedPackage}
                    </div>
                    <h2 className="text-2xl font-bold font-display mb-2">Ange ditt organisationsnummer</h2>
                    <p className="text-muted-foreground font-light text-sm">Vi hämtar automatiskt dina företagsuppgifter</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Org number with lookup button */}
                    <div>
                      <label className="data-label text-[0.55rem] text-muted-foreground/60 mb-1.5 block">Organisationsnummer</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                          <input
                            type="text"
                            placeholder="XXXXXX-XXXX"
                            value={orgNumber}
                            onChange={(e) => { setOrgNumber(e.target.value); setLookupDone(false); }}
                            className="w-full bg-secondary/20 border border-border/20 rounded-xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-colors text-sm font-mono"
                            maxLength={13}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleOrgLookup}
                          disabled={lookupLoading || orgNumber.replace(/[\s-]/g, '').length < 10}
                          className="rounded-xl px-5 shrink-0"
                          variant="glow"
                        >
                          {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                      </div>
                      {errors.orgNumber && <p className="text-score-low text-xs mt-1.5 ml-1">{errors.orgNumber}</p>}
                    </div>

                    {/* Auto-filled company info */}
                    <AnimatePresence>
                      {lookupDone && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          className="space-y-4 overflow-hidden"
                        >
                          {/* Success indicator */}
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 p-3 rounded-xl bg-score-high/5 border border-score-high/15"
                          >
                            <div className="w-6 h-6 rounded-full bg-score-high/15 flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-score-high" />
                            </div>
                            <span className="text-sm text-score-high font-medium">Företag identifierat</span>
                          </motion.div>

                          {/* Company name */}
                          <div>
                            <label className="data-label text-[0.55rem] text-muted-foreground/60 mb-1.5 block">Företagsnamn</label>
                            <div className="relative">
                              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                              <input
                                type="text"
                                placeholder="Företagsnamn"
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                className="w-full bg-secondary/20 border border-border/20 rounded-xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-colors text-sm"
                                maxLength={200}
                              />
                            </div>
                            {errors.company && <p className="text-score-low text-xs mt-1.5 ml-1">{errors.company}</p>}
                          </div>

                          {/* Address */}
                          {address && (
                            <div>
                              <label className="data-label text-[0.55rem] text-muted-foreground/60 mb-1.5 block">Adress</label>
                              <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                                <input
                                  type="text"
                                  value={address}
                                  onChange={(e) => setAddress(e.target.value)}
                                  className="w-full bg-secondary/20 border border-border/20 rounded-xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-colors text-sm"
                                  readOnly
                                />
                              </div>
                            </div>
                          )}

                          {/* Signatory / Contact person */}
                          <div>
                            <label className="data-label text-[0.55rem] text-muted-foreground/60 mb-1.5 block">Kontaktperson / Firmatecknare</label>
                            <div className="relative">
                              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                              <input
                                type="text"
                                placeholder="Kontaktperson"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-secondary/20 border border-border/20 rounded-xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-colors text-sm"
                                maxLength={100}
                              />
                            </div>
                            {errors.name && <p className="text-score-low text-xs mt-1.5 ml-1">{errors.name}</p>}
                          </div>

                          {/* Phone */}
                          <div>
                            <label className="data-label text-[0.55rem] text-muted-foreground/60 mb-1.5 block">Telefonnummer</label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                              <input
                                type="tel"
                                placeholder="Telefonnummer"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-secondary/20 border border-border/20 rounded-xl pl-11 pr-4 py-3.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-colors text-sm"
                                maxLength={30}
                              />
                            </div>
                            {errors.phone && <p className="text-score-low text-xs mt-1.5 ml-1">{errors.phone}</p>}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground/70 pt-1">
                            <Shield className="w-3.5 h-3.5" />
                            <span>Uppgifterna hämtas från offentliga register och kan redigeras</span>
                          </div>

                          <Button type="submit" variant="glow" size="xl" className="w-full mt-2" disabled={loading}>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Skicka förfrågan <ArrowRight className="w-5 h-5" /></>}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </form>
                </motion.div>
              )}

              {/* STEP 4: Confirmation */}
              {step === "confirmation" && (
                <motion.div key="confirmation" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 20, stiffness: 200 }} className="rounded-3xl border border-neon-cyan/15 bg-card/70 backdrop-blur-xl shadow-2xl p-10 sm:p-14 max-w-lg mx-auto text-center relative overflow-hidden">
                  {/* Background glow — single teal */}
                  <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 30%, hsla(175,95%,50%,0.08) 0%, transparent 60%)" }} />

                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2, damping: 15 }}
                    className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center relative"
                    style={{ background: "hsla(175,95%,50%,0.1)", border: "2px solid hsla(175,95%,50%,0.3)", boxShadow: "0 0 40px hsla(175,95%,50%,0.2), 0 0 80px hsla(175,95%,50%,0.1)" }}
                  >
                    <Rocket className="w-9 h-9 text-primary" />
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="text-2xl sm:text-3xl font-bold font-display mb-4 relative"
                  >
                    Tack för din <span className="gradient-text">förfrågan!</span>
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-muted-foreground font-light leading-relaxed max-w-md mx-auto mb-8 relative text-sm sm:text-base"
                  >
                    Vi kontaktar dig inom <span className="text-primary font-semibold">24 timmar</span> för att gå igenom resultatet och visa hur din hemsida kan utvecklas till ett starkare verktyg för{" "}
                    <span className="text-foreground font-medium">ökad synlighet</span>,{" "}
                    <span className="text-foreground font-medium">fler affärer</span> och{" "}
                    <span className="text-foreground font-medium">högre förtroende</span>{" "}
                    hos dina kunder.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Button variant="glow-outline" size="lg" onClick={handleClose}>
                      Stäng
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RemediationFlow;
