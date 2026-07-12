import { useState } from "react";
import { motion } from "framer-motion";
import ScoreBlock from "./ScoreBlock";
import BusinessImpactCard from "./BusinessImpactCard";
import CustomerLossCard from "./CustomerLossCard";
import InlineBookingCTA from "./InlineBookingCTA";
import StickyBookingBar from "./StickyBookingBar";
import LeadCaptureModal from "./LeadCaptureModal";
import EmailReportModal from "./EmailReportModal";
import RemediationFlow from "./RemediationFlow";
import {
  ArrowRight, ArrowLeft, Globe, MapPin, Star, Mail,
  Clock, ShieldCheck, BarChart3, Users, Target, Search, MonitorSmartphone, ContactRound,
  Link2, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import DecisionCard, { type DecisionCardProps } from "@/components/DecisionCard";
import RoadmapCard from "@/components/RoadmapCard";
import ScoreInfo from "@/components/ScoreInfo";
import { prioritize, planRoadmap } from "@/lib/recommendation-engine";
import { scoreColor } from "@/lib/score-color";
import type { ScanResult } from "@/lib/scan-service";

interface ResultsSectionProps {
  domain: string;
  /** Always the COMPLETE report — assembled fully before the results view mounts. */
  data: ScanResult;
  scanId?: string;
  onNewScan?: () => void;
  /** Deliberate fresh measurement (bypasses the backend cache, rate-limited). */
  onRefresh?: () => void;
  /** Permanent, shareable report URL. When present, shows "Kopiera rapportlänk". */
  shareUrl?: string;
}

// The whole result layout appears at once; a very short stagger (≈12ms/card,
// the full cascade well under 300ms) adds a subtle ripple without making the
// user wait card-by-card.
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.012 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
};

/**
 * Map the prioritised lead recommendation onto the Decision Card. All of the
 * reasoning — impact, effort, confidence, why-this-first, and what to hold back —
 * lives in the recommendation engine; this is just the adapter to the UI.
 */
const buildDecision = (data: ScanResult): Omit<DecisionCardProps, "action"> => {
  const plan = prioritize(data);
  if (plan) {
    const { lead, priorityReason, confidenceReason } = plan;
    return {
      priorityRank: 1,
      decision: lead.decision,
      why: lead.why,
      evidence: lead.evidence,
      businessImpact: lead.businessImpact,
      priorityReason,
      confidence: lead.confidence,
      confidenceReason,
    };
  }

  // Defensive fallback if the engine has nothing to rank (no checks, no AI fields).
  return {
    priorityRank: 1,
    decision: (data.quickFix || data.opportunity || data.biggestProblem || "Gör sidans erbjudande tydligt på första skärmen.").trim(),
    why: (data.biggestProblem || data.summary || "").trim(),
    evidence: (data.weaknesses ?? []).slice(0, 3),
    businessImpact: data.businessImpact?.[0]?.trim() || "Det påverkar hur många av besökarna som tar kontakt.",
    priorityReason: "Mest att vinna på just nu.",
    confidence: "medium",
    confidenceReason: "Sammanvägt från kontrollerna av sidan.",
  };
};

const ResultsSection = ({ domain, data, scanId, onNewScan, onRefresh, shareUrl }: ResultsSectionProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [remediationOpen, setRemediationOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Clipboard API unavailable (old/insecure context) — select-free fallback.
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* give up silently */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const openModal = (title: string) => {
    setModalTitle(title);
    setModalOpen(true);
  };

  const handleBook = () => setRemediationOpen(true);

  // The prioritised fixes as a short, phased execution plan (deterministic).
  const roadmap = planRoadmap(data);

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
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm text-muted-foreground">
            <Globe className="w-3.5 h-3.5 text-neon-cyan" />
            Resultat för <span className="font-mono text-foreground">{domain}</span>
          </span>
          <ScoreInfo label="Så fungerar analysrapporten" />
          {shareUrl && (
            <button
              type="button"
              onClick={handleCopyLink}
              aria-label="Kopiera rapportlänk"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-[0.72rem] text-muted-foreground hover:text-foreground hover:border-neon-cyan/30 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-neon-cyan" /> : <Link2 className="w-3.5 h-3.5" />}
              {copied ? "Kopierad!" : "Kopiera rapportlänk"}
            </button>
          )}
        </motion.div>

        {/* Measurement freshness + a restrained way to re-measure. */}
        {(data.measuredAt || onRefresh) && (
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-2 -mt-2 text-[0.72rem] text-muted-foreground/70">
            {data.measuredAt && (
              <span className="data-label">
                Mätning uppdaterad:{" "}
                {new Date(data.measuredAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {onRefresh && (
              <>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={onRefresh}
                  className="data-label text-neon-cyan/80 hover:text-neon-cyan underline-offset-2 hover:underline transition-colors"
                >
                  Gör en ny mätning
                </button>
              </>
            )}
          </motion.div>
        )}

        {/* Expert positioning */}
        <motion.div variants={fadeUp} className="text-center max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground/80 font-light leading-relaxed">
            Den här analysen bygger på 41 automatiska kontroller av din sida – faktorer som påverkar hur företag presterar online.
          </p>
        </motion.div>

        {/* Trust badges row */}
        <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 sm:gap-6 text-[12.5px] text-muted-foreground/80 font-light">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3 text-neon-blue" />
            Baserat på verklig data
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-neon-blue" />
            Expertgranskning
          </span>
          <span className="flex items-center gap-1.5 hidden sm:flex">
            <Users className="w-3 h-3 text-neon-blue" />
            Jämför med företag i ditt område
          </span>
        </motion.div>

        {/* 1. Score + Summary (Insikt) */}
        <motion.div variants={fadeUp}>
          <ScoreBlock score={data.score} screenshotUrl={data.pageInfo?.screenshotUrl} domain={domain} categoryScores={data.categoryScores} summary={data.summary} />
        </motion.div>

        {/* THE DECISION — the single recommendation that leads everything below.
            Owns the "biggest problem" (now its "why"), so there is no separate
            problem card. Streams in with the AI content; dominant in the stack. */}
        {data.biggestProblem && (
          <motion.div variants={fadeUp}>
            <DecisionCard {...buildDecision(data)} accentTier={scoreColor(data.score).tier} action={{ label: "Boka 20 min genomgång", onClick: handleBook }} />
          </motion.div>
        )}

        {/* THE PLAN — the prioritised fixes grouped into a calm, few-week roadmap. */}
        {data.biggestProblem && roadmap.length > 0 && (
          <motion.div variants={fadeUp}>
            <RoadmapCard phases={roadmap} />
          </motion.div>
        )}

        {/* 2. Competitors (Konkurrentgap) */}
        {data.nearbyCompetitors && data.nearbyCompetitors.length > 0 && (() => {
          // Only claim exact competitors when confidence is high (review-backed
          // majority). Otherwise present them honestly as similar businesses.
          const comps = data.nearbyCompetitors;
          const highConfidence = comps.filter((c) => c.has_reviews).length >= Math.ceil(comps.length / 2);
          const compTitle = highConfidence ? "Företag du konkurrerar med online" : "Liknande företag i samma område";
          const compSub = highConfidence
            ? "Företag i ditt område som presterar bra"
            : "Företag med liknande profil i din bransch";
          return (
          <motion.div variants={fadeUp}>
            <div className="card-surface p-6 sm:p-8 relative overflow-hidden">
              <div className="accent-line-top accent-line-cyan" />

               <div className="flex items-center gap-3 mb-6 relative">
                <div className="w-9 h-9 rounded-xl bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/15">
                  <MapPin className="w-4 h-4 text-neon-cyan" />
                </div>
                <div>
                  <h2 className="text-base font-semibold font-display">{compTitle}</h2>
                  <p className="data-label text-[0.72rem] text-muted-foreground/80 mt-0.5">{compSub}</p>
                </div>
              </div>

              <div className="space-y-2.5 relative">
               {data.nearbyCompetitors.map((comp, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(0.24, i * 0.03), duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }} className="flex items-center gap-3 p-3.5 rounded-xl border border-neon-cyan/12 bg-secondary/8 hover:bg-secondary/15 transition-all duration-300 relative">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${comp.domain}&sz=32`}
                        alt=""
                        className="w-6 h-6 rounded shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{comp.name}</span>
                          <a
                            href={comp.url || `https://${comp.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] text-neon-blue hover:text-neon-cyan font-mono truncate hidden sm:inline transition-colors"
                          >
                            {comp.domain} ↗
                          </a>
                        </div>
                        {comp.strength && <span className="text-xs text-foreground/70 font-light">{comp.strength}</span>}
                        {comp.has_reviews && (
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="text-[12px] px-1.5 py-0.5 rounded-full bg-score-mid/8 text-score-mid border border-score-mid/12 flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5" />Visar omdömen
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
              </div>

              <p className="text-sm text-muted-foreground font-light mt-5 leading-relaxed relative">
                Tydlighet, enkla val och bra synlighet online – sånt avgör ofta vem kunden väljer.
              </p>
            </div>
          </motion.div>
          );
        })()}

        {/* Mid-page CTA – after competitors */}
        <motion.div variants={fadeUp}>
          <InlineBookingCTA onBook={handleBook} />
        </motion.div>

        {/* 4. Business Impact (Affärseffekt) — hidden entirely if not generated */}
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
          <p className="text-sm text-muted-foreground/80 font-light italic max-w-lg mx-auto leading-relaxed">
            "Företag i din bransch förbättrar ofta detta först när de ser hur mycket kunder de tappar."
          </p>
        </motion.div>

        {/* Expert identity line */}
        <motion.div variants={fadeUp} className="text-center">
          <p className="text-xs text-muted-foreground/80 font-light italic max-w-lg mx-auto">
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
              <p className="data-label text-[0.72rem] text-muted-foreground/80 mt-0.5">Expertis inom hemsidor, SEO och digital synlighet</p>
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
                transition={{ delay: Math.min(0.24, i * 0.03), duration: 0.3 }}
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
          <h2 className="text-xl sm:text-2xl font-bold mb-2 relative font-display">Vill du se hur detta kan förbättras för er?</h2>
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
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-5 text-[12.5px] text-muted-foreground/80 font-light relative">
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
          competitors: data.nearbyCompetitors?.map((c) => ({ name: c.name })),
          businessImpact: data.businessImpact,
        }}
      />
      <RemediationFlow open={remediationOpen} onClose={() => setRemediationOpen(false)} weaknesses={data.weaknesses} score={data.score} scanId={scanId} />
    </>
  );
};

export default ResultsSection;
