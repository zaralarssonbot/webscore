import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BackgroundEffect from "@/components/BackgroundEffect";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

import ServicesSection from "@/components/ServicesSection";
import ProcessSection from "@/components/ProcessSection";
import WhyUsSection from "@/components/WhyUsSection";
import HomePricingSection from "@/components/HomePricingSection";
import PortfolioSection from "@/components/PortfolioSection";
import VideoShowcaseSection from "@/components/VideoShowcaseSection";

import FinalCTASection from "@/components/FinalCTASection";
import Footer from "@/components/Footer";
import LoadingState from "@/components/LoadingState";
import ResultsSection from "@/components/ResultsSection";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import { createScan, fetchScreenshot, runAnalysis, generateSummary, fetchRealCompetitors, type ScanResult } from "@/lib/scan-service";
import { saveReport } from "@/lib/report-service";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

type AppState = "hero" | "loading" | "results";

const Index = () => {
  useDocumentMeta({
    title: "Webscore – Få betyg på din hemsida",
    description:
      "Analysera din hemsida på 30 sekunder. Få ett tydligt betyg, se vad som håller sidan tillbaka och upptäck var den kan förbättras — gratis och utan förpliktelser.",
    canonical: "https://webscore.se/",
  });
  const [state, setState] = useState<AppState>("hero");
  const [domain, setDomain] = useState("");
  const [scanId, setScanId] = useState<string>();
  const [analysisData, setAnalysisData] = useState<ScanResult | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // True once the COMPLETE report is assembled — releases the gauge 99→100 and
  // reveals the fully-populated report (no streaming, no skeletons).
  const [scanComplete, setScanComplete] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const webTestRef = useRef<HTMLDivElement>(null);

  const shareUrl = reportId ? `${window.location.origin}/analys/${reportId}` : undefined;

  const handleAnalyze = async (inputDomain: string, forceRefresh = false) => {
    setDomain(inputDomain);
    setState("loading");
    setScanComplete(false);
    setScreenshotUrl(null);
    setAnalysisError(null);
    setReportId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      // The screenshot only enriches the LOADING preview — fire-and-forget so it
      // never blocks or delays the report.
      fetchScreenshot(inputDomain)
        .then((s) => { if (s) setScreenshotUrl(s); })
        .catch(() => {});

      // Critical path — the score cannot exist without these.
      const id = await createScan(inputDomain);
      setScanId(id);
      const result = await runAnalysis(id, inputDomain, { forceRefresh });

      // Enrichment — the report is revealed ONLY after ALL of this finishes, so
      // the page opens fully populated: no streaming, no skeletons, no empty
      // cards. A failure degrades gracefully (the section is simply hidden) and
      // never blocks or aborts the core report.
      const summary = await generateSummary(result, inputDomain).catch(() => null);
      const competitors = summary
        ? await fetchRealCompetitors(inputDomain, summary.industry, result.score).catch(() => null)
        : null;

      // Assemble the COMPLETE report. The AI only fills prose fields; the
      // deterministic engine's strengths/weaknesses/opportunity stay authoritative.
      const complete: ScanResult = {
        ...result,
        ...(summary
          ? {
              summary: summary.summary,
              biggestProblem: summary.biggestProblem,
              businessImpact: summary.businessImpact,
              quickFix: summary.quickFix,
              industry: summary.industry,
              businessSummary: summary.businessSummary,
              aiInsight: summary.aiInsight,
            }
          : {}),
        nearbyCompetitors: competitors && competitors.length > 0 ? competitors : undefined,
      };
      setAnalysisData(complete);

      // Persist the complete report → permanent shareable URL. Best-effort and
      // non-blocking: the results still show even if saving fails. On success we
      // update the browser URL to the report route (no navigation / re-run), so
      // refreshing or sharing reopens the exact saved report.
      saveReport(inputDomain, complete).then((id) => {
        if (id) {
          setReportId(id);
          window.history.replaceState(null, "", `/analys/${id}`);
        }
      });

      // Everything is ready — release the loader to 100 %, then reveal at once.
      setScanComplete(true);
      window.setTimeout(() => setState("results"), 1600);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Något gick fel.";
      setAnalysisError(message);
      setState("hero");
    }
  };

  // Deliberate fresh measurement — bypasses the backend cache (rate-limited there).
  const handleRefresh = () => {
    if (domain && state !== "loading") handleAnalyze(domain, true);
  };

  const handleReset = () => {
    setState("hero");
    setScanComplete(false);
    setDomain("");
    setScanId(undefined);
    setAnalysisData(null);
    setScreenshotUrl(null);
    setAnalysisError(null);
    setReportId(null);
    // Restore the home URL (the analysis updated it to /analys/:id).
    if (window.location.pathname.startsWith("/analys/")) {
      window.history.replaceState(null, "", "/");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToHero = () => {
    heroRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToWebTest = () => {
    webTestRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundEffect />
      <Navbar onAnalyze={scrollToHero} />

      <AnimatePresence mode="wait">
        {state === "hero" && (
          <motion.div key="hero" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <div ref={heroRef}>
              <HeroSection
                onAnalyze={handleAnalyze}
                onBookMeeting={() => setBookingOpen(true)}
                errorMessage={analysisError}
              />
            </div>

            <ServicesSection />
            <ProcessSection />
            <PortfolioSection />
            <VideoShowcaseSection />
            <WhyUsSection />
            <HomePricingSection />

            <div ref={webTestRef}>
              <FinalCTASection
                onAnalyze={handleAnalyze}
                onBookMeeting={() => setBookingOpen(true)}
              />
            </div>
            <Footer />
          </motion.div>
        )}

        {state === "loading" && (
          <motion.div key="loading" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <LoadingState complete={scanComplete} onComplete={() => setState("results")} screenshotUrl={screenshotUrl} domain={domain} />
          </motion.div>
        )}

        {state === "results" && analysisData && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="pt-24"
          >
            <ResultsSection domain={domain} data={analysisData} scanId={scanId} onNewScan={handleReset} onRefresh={handleRefresh} shareUrl={shareUrl} />
            <Footer />
          </motion.div>
        )}
      </AnimatePresence>

      <LeadCaptureModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        title="Boka gratis analys"
      />
    </div>
  );
};

export default Index;
