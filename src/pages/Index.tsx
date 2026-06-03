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
import { createScan, fetchScreenshot, fetchGoogleBusiness, runAnalysis, type ScanResult, type GoogleBusinessData } from "@/lib/scan-service";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

type AppState = "hero" | "loading" | "results";

const Index = () => {
  useDocumentMeta({
    title: "Webscore – Få betyg på din hemsida",
    description:
      "Analysera din hemsida på 60 sekunder. Få ett tydligt betyg, se vad som håller sidan tillbaka och upptäck var den kan förbättras — gratis och utan förpliktelser.",
    canonical: "https://webscore.se/",
  });
  const [state, setState] = useState<AppState>("hero");
  const [domain, setDomain] = useState("");
  const [scanId, setScanId] = useState<string>();
  const [analysisData, setAnalysisData] = useState<ScanResult | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [googleBusiness, setGoogleBusiness] = useState<GoogleBusinessData | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const webTestRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = async (inputDomain: string) => {
    setDomain(inputDomain);
    setState("loading");
    setScreenshotUrl(null);
    setAnalysisError(null);
    setGoogleBusiness(null);
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const [id, screenshot, gbp] = await Promise.all([
        createScan(inputDomain),
        fetchScreenshot(inputDomain),
        fetchGoogleBusiness(inputDomain),
      ]);
      setScanId(id);
      if (screenshot) setScreenshotUrl(screenshot);
      if (gbp?.found) setGoogleBusiness(gbp);

      const result = await runAnalysis(id, inputDomain);
      setAnalysisData(result);
      setState("results");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Något gick fel.";
      setAnalysisError(message);
      setState("hero");
    }
  };

  const handleReset = () => {
    setState("hero");
    setDomain("");
    setScanId(undefined);
    setAnalysisData(null);
    setScreenshotUrl(null);
    setAnalysisError(null);
    setGoogleBusiness(null);
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

            {/* Subtle light-gray band behind all card sections so the white
                cards lift off the page. One continuous band → no hard seams. */}
            <div className="surface-band">
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
            </div>
            <Footer />
          </motion.div>
        )}

        {state === "loading" && (
          <motion.div key="loading" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <LoadingState onComplete={() => {}} screenshotUrl={screenshotUrl} domain={domain} />
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
            <ResultsSection domain={domain} data={analysisData} scanId={scanId} onNewScan={handleReset} googleBusiness={googleBusiness} />
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
