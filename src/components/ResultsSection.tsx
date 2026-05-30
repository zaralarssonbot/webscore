import { useState } from "react";
import { motion } from "framer-motion";
import ScoreBlock from "./ScoreBlock";
import BiggestProblemCard from "./BiggestProblemCard";
import BusinessImpactCard from "./BusinessImpactCard";
import CustomerLossCard from "./CustomerLossCard";
import InlineBookingCTA from "./InlineBookingCTA";
import StickyBookingBar from "./StickyBookingBar";
import LeadCaptureModal from "./LeadCaptureModal";
import EmailReportModal from "./EmailReportModal";
import RemediationFlow from "./RemediationFlow";
import {
  ArrowRight, ArrowLeft, Globe, MapPin, Palette, MousePointerClick, Star, Mail,
  Clock, ShieldCheck, BarChart3, Users, Crown, Target, Search, MonitorSmartphone, ContactRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScanResult, GoogleBusinessData } from "@/lib/scan-service";

interface ResultsSectionProps {
  domain: string;
  data: ScanResult;
  scanId?: string;
  onNewScan?: () => void;
  googleBusiness?: GoogleBusinessData | null;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const } },
};

const ResultsSection = ({ domain, data, scanId, onNewScan }: ResultsSectionProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [remediationOpen, setRemediationOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const openModal = (title: string) => {
    setModalTitle(title);
    setModalOpen(true);
  };

  const handleBook = () => setRemediationOpen(true);

  return (
    <>
      <motion.section
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-5xl mx-auto px-4 pb-32 space-y-8"
      >
        {/* Back */}
        {onNewScan && (
          <motion.div variants={fadeUp}>
            <Button variant="ghost" onClick={onNewScan} className="text-muted-foreground hover:text-foreground gap-2 hover:bg-secondary/30">
              <ArrowLeft className="w-4 h-4" /> Ny analys
            </Button>
          </motion.div>
        )}

        {/* Domain tag */}
        <motion.div variants={fadeUp} className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-5 py-2.5 text-sm text-muted-foreground">
            <Globe className="w-3.5 h-3.5 text-neon-cyan" />
            Resultat för <span className="font-mono text-foreground">{domain}</span>
          </span>
        </motion.div>

        {/* Expert positioning */}
        <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground/70 font-light leading-relaxed">
            Den här analysen är baserad på erfarenhet av vad som faktiskt fungerar för företag online – inte bara tekniska mätvärden.
          </p>
        </motion.div>

        {/* Trust badges row */}
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 sm:gap-6 text-[11px] text-muted-foreground/60 font-light">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3 text-neon-cyan/50" />
            Baserat på verklig data
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-neon-cyan/50" />
            Expertgranskning
          </span>
          <span className="flex items-center gap-1.5 hidden sm:flex">
            <Users className="w-3 h-3 text-neon-cyan/50" />
            Jämför med företag i ditt område
          </span>
        </motion.div>

        {/* 1. Score + Summary (Insikt) */}
        <motion.div variants={fadeUp}>
          <ScoreBlock score={data.score} screenshotUrl={data.pageInfo?.screenshotUrl} domain={domain} categoryScores={data.categoryScores} summary={data.summary} />
        </motion.div>

        {/* 2. Biggest Problem (Problem) */}
        {data.biggestProblem && (
          <motion.div variants={fadeUp}>
            <BiggestProblemCard problem={data.biggestProblem} />
          </motion.div>
        )}

        {/* 3. Competitors (Konkurrentgap) */}
        {data.nearbyCompetitors && data.nearbyCompetitors.length > 0 && (
          <motion.div variants={fadeUp}>
            <div className="card-surface p-6 sm:p-8 relative overflow-hidden">
              <div className="accent-line-top accent-line-cyan" />

               <div className="flex items-center gap-3 mb-6 relative">
                <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/15">
                  <MapPin className="w-4 h-4 text-neon-cyan" />
                </div>
                <div>
                  <h2 className="text-base font-semibold font-display">Här är varför de får kunderna före dig</h2>
                  <p className="data-label text-[0.5rem] text-muted-foreground/50 mt-0.5">Företag i ditt område som presterar bättre</p>
                </div>
              </div>

              <div className="space-y-2.5 relative">
               {data.nearbyCompetitors.map((comp, i) => {
                  const isTop = i === 0;
                  const sc = comp.score >= 80
                    ? { bg: "hsla(160,85%,50%,0.07)", text: "hsl(var(--score-high))", glow: "hsla(160,85%,50%,0.12)", border: isTop ? "hsla(160,85%,50%,0.25)" : "hsla(160,85%,50%,0.12)" }
                    : { bg: "hsla(40,95%,55%,0.07)", text: "hsl(var(--score-mid))", glow: "hsla(40,95%,55%,0.12)", border: isTop ? "hsla(40,95%,55%,0.25)" : "hsla(40,95%,55%,0.12)" };
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] as const }} className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-300 group/card relative ${isTop ? "bg-secondary/15 ring-1 ring-inset" : "bg-secondary/8 hover:bg-secondary/15"}`} style={{ borderColor: sc.border, ...(isTop ? { ringColor: sc.border } : {}) }}>
                      {isTop && (
                        <div className="absolute -top-2.5 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border" style={{ background: sc.bg, borderColor: sc.border, color: sc.text }}>
                          <Crown className="w-2.5 h-2.5" /> Bäst positionerad
                        </div>
                      )}
                      <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 font-bold text-base font-mono tabular-nums" style={{ background: sc.bg, color: sc.text, boxShadow: `0 0 14px ${sc.glow}` }}>
                        {comp.score}
                      </div>
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=32`}
                        alt=""
                        className="w-5 h-5 rounded shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{comp.name}</span>
                          <a
                            href={comp.url || `https://${comp.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-neon-cyan/60 hover:text-neon-cyan font-mono truncate hidden sm:inline transition-colors"
                          >
                            {comp.domain} ↗
                          </a>
                        </div>
                        <span className="text-xs text-foreground/70 font-light">{comp.strength}</span>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {comp.cta_count != null && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neon-cyan/8 text-neon-cyan border border-neon-cyan/12 flex items-center gap-0.5">
                              <MousePointerClick className="w-2.5 h-2.5" />{comp.cta_count} CTA
                            </span>
                          )}
                          {comp.design_rating != null && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neon-cyan/8 text-neon-cyan border border-neon-cyan/12 flex items-center gap-0.5 font-mono tabular-nums">
                              <Palette className="w-2.5 h-2.5" />{comp.design_rating}/5
                            </span>
                          )}
                          {comp.has_reviews && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-score-mid/8 text-score-mid border border-score-mid/12 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5" />Omdömen
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="text-xs font-bold px-2.5 py-1 rounded-full font-mono tabular-nums" style={{ color: sc.text, background: sc.bg }}>
                          +{comp.score - data.score}
                        </div>
                        {comp.distance_km && (
                          <span className="text-[10px] text-foreground/50 font-light flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {comp.distance_km.toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <p className="text-sm text-muted-foreground font-light mt-5 leading-relaxed relative">
                De är tydligare, enklare att välja och syns bättre online. Det gör att de vinner kunderna före dig.
              </p>
            </div>
          </motion.div>
        )}

        {/* Mid-page CTA – after competitors */}
        <motion.div variants={fadeUp}>
          <InlineBookingCTA onBook={handleBook} />
        </motion.div>

        {/* 4. Business Impact (Affärseffekt) */}
        {data.businessImpact && data.businessImpact.length > 0 && (
          <motion.div variants={fadeUp}>
            <BusinessImpactCard impacts={data.businessImpact} />
          </motion.div>
        )}

        {/* 5. Customer Loss Risk */}
        <motion.div variants={fadeUp}>
          <CustomerLossCard score={data.score} />
        </motion.div>

        {/* Urgency nudge */}
        <motion.div variants={fadeUp} className="text-center">
          <p className="text-sm text-muted-foreground/70 font-light italic max-w-lg mx-auto leading-relaxed">
            "Företag i din bransch förbättrar ofta detta först när de ser hur mycket kunder de tappar."
          </p>
        </motion.div>

        {/* Expert identity line */}
        <motion.div variants={fadeUp} className="text-center">
          <p className="text-xs text-muted-foreground/50 font-light italic max-w-lg mx-auto">
            Denna analys speglar hur företag som presterar bäst online är uppbyggda idag.
          </p>
        </motion.div>

        {/* Service offering section */}
        <motion.div variants={fadeUp} className="card-surface p-6 sm:p-8 relative overflow-hidden">
          <div className="accent-line-top accent-line-cyan" />

          <div className="flex items-center gap-3 mb-4 relative">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-neon-cyan/15" style={{ background: "hsla(175,95%,50%,0.08)" }}>
              <Target className="w-4.5 h-4.5 text-neon-cyan" />
            </div>
            <div>
              <h2 className="text-base font-semibold font-display">Vi bygger hemsidor som faktiskt genererar kunder</h2>
              <p className="data-label text-[0.5rem] text-muted-foreground/50 mt-0.5">Expertis inom hemsidor, SEO och digital synlighet</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground font-light leading-relaxed mb-5 relative">
            Webscore visar var problemet finns. Vi hjälper företag att bygga upp rätt struktur – så att hemsidan inte bara ser bra ut, utan faktiskt driver fler förfrågningar, klick och försäljning.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative">
            {[
              { icon: MonitorSmartphone, text: "Hemsidor byggda för konvertering" },
              { icon: Search, text: "SEO som driver rätt trafik" },
              { icon: Globe, text: "Optimerad Google Business-närvaro" },
              { icon: ContactRound, text: "Content och branding som skapar förtroende" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-3 p-3 rounded-xl border border-neon-cyan/8 bg-neon-cyan/[0.03]"
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-neon-cyan/12" style={{ background: "hsla(175,95%,50%,0.06)" }}>
                  <item.icon className="w-3.5 h-3.5 text-neon-cyan" />
                </div>
                <span className="text-sm text-muted-foreground font-light">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Email capture – simplified */}
        <motion.div variants={fadeUp} className="card-surface p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/15 shrink-0">
            <Mail className="w-5 h-5 text-neon-cyan" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-semibold font-display">Vill du ha en personlig genomgång?</p>
            <p className="text-xs text-muted-foreground font-light">Lämna din e-post så går vi igenom rapporten och hör av oss.</p>
          </div>
          <Button variant="glow-outline" size="lg" onClick={() => setEmailModalOpen(true)} className="shrink-0">
            <Mail className="w-4 h-4 mr-1.5" /> Få en genomgång
          </Button>
        </motion.div>

        {/* 5. Final CTA (Lösning) */}
        <motion.div variants={fadeUp} className="card-surface p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="accent-line-top accent-line-cyan" />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, hsla(175,95%,50%,0.05) 0%, transparent 60%)" }} />
          <h2 className="text-xl sm:text-2xl font-bold mb-2 relative font-display">Vill du se exakt hur detta kan förbättras för er?</h2>
          <p className="text-muted-foreground mb-6 font-light relative max-w-lg mx-auto text-sm">
            Vi går igenom din sida och visar vad som bör byggas om för att få bättre resultat.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
            <Button variant="glow" size="xl" onClick={handleBook} className="group glow-precision">
              Boka 20 min genomgång <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="glow-outline" size="xl" onClick={() => setEmailModalOpen(true)}>
              Få en personlig genomgång
            </Button>
          </div>
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-5 text-[11px] text-muted-foreground/50 font-light relative">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Tar 20 min
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3" />
              Ingen förpliktelse
            </span>
          </div>
        </motion.div>
      </motion.section>

      {/* Sticky booking bar */}
      <StickyBookingBar onBook={handleBook} score={data.score} />

      <LeadCaptureModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        scanId={scanId}
        title={modalTitle}
        analysisContext={{
          domain,
          totalScore: data.score,
          summary: data.summary,
          biggestProblem: data.biggestProblem,
          industry: data.industry,
          competitorAvgScore: data.nearbyCompetitors && data.nearbyCompetitors.length > 0
            ? Math.round(data.nearbyCompetitors.reduce((s, c) => s + c.score, 0) / data.nearbyCompetitors.length)
            : undefined,
        }}
      />
      <EmailReportModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        scanId={scanId}
        reportData={{
          domain,
          score: data.score,
          summary: data.summary,
          biggestProblem: data.biggestProblem,
          industry: data.industry,
          categoryScores: data.categoryScores,
          competitors: data.nearbyCompetitors?.map((c) => ({ name: c.name, score: c.score })),
          businessImpact: data.businessImpact,
        }}
      />
      <RemediationFlow open={remediationOpen} onClose={() => setRemediationOpen(false)} weaknesses={data.weaknesses} score={data.score} scanId={scanId} />
    </>
  );
};

export default ResultsSection;
