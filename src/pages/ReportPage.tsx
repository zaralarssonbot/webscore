import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import BackgroundEffect from "@/components/BackgroundEffect";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ResultsSection from "@/components/ResultsSection";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, Info, FileDown, Loader2 } from "lucide-react";
import { fetchReport, requestReportPdf, type ReportResult } from "@/lib/report-service";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const SITE_ORIGIN = "https://webscore.se";

/**
 * Public, permanent report page — /analys/:reportId.
 *
 * It ONLY reads the saved snapshot. It never re-runs the analysis and never
 * recomputes the score: the historical report renders exactly as it was saved.
 */
const ReportPage = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<ReportResult | "loading">("loading");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "error">("idle");
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    if (!reportId || pdfState === "loading") return;
    setPdfState("loading");
    setPdfError(null);
    const res = await requestReportPdf(reportId);
    if ("url" in res) {
      setPdfState("idle");
      window.open(res.url, "_blank", "noopener");
    } else {
      setPdfState("error");
      setPdfError(
        res.error === "pdf_renderer_not_configured"
          ? "PDF-tjänsten är inte aktiverad ännu. Försök igen senare."
          : "Kunde inte skapa PDF just nu. Försök igen om en stund.",
      );
    }
  };

  useEffect(() => {
    let active = true;
    setResult("loading");
    if (!reportId) { setResult({ state: "not_found" }); return; }
    fetchReport(reportId).then((r) => { if (active) setResult(r); });
    return () => { active = false; };
  }, [reportId]);

  const found = result !== "loading" && result.state === "found" ? result.data : null;
  const canonical = `${SITE_ORIGIN}/analys/${reportId}`;

  // Social metadata for the shared report (title / description / canonical / OG).
  useDocumentMeta(
    found
      ? {
          title: `Webscore ${found.report.score}/100 – ${found.domain}`,
          description:
            found.report.summary?.slice(0, 155) ||
            `Se webbanalysen för ${found.domain}: betyg ${found.report.score}/100 med konkreta förbättringar.`,
          canonical,
        }
      : {
          title: "Rapport – Webscore",
          description: "En sparad Webscore-analysrapport.",
          canonical,
          noindex: true,
        },
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundEffect />
      <Navbar onAnalyze={() => navigate("/")} />

      <div className="pt-24">
        {result === "loading" && (
          <div className="max-w-md mx-auto px-4 py-32 text-center">
            <div className="w-8 h-8 mx-auto mb-4 rounded-full border-2 border-neon-cyan/30 border-t-neon-cyan animate-spin" />
            <p className="text-sm text-muted-foreground">Laddar rapport…</p>
          </div>
        )}

        {result !== "loading" && result.state === "error" && (
          <StateCard
            icon={<AlertTriangle className="w-6 h-6 text-score-high" />}
            title="Kunde inte ladda rapporten"
            body="Vi når inte tjänsten just nu. Försök igen om en stund."
            action={<Button variant="glow-outline" onClick={() => window.location.reload()}>Försök igen</Button>}
            onHome={() => navigate("/")}
          />
        )}

        {result !== "loading" && result.state === "not_found" && (
          <StateCard
            icon={<Info className="w-6 h-6 text-neon-cyan" />}
            title="Rapporten hittades inte"
            body="Länken är felaktig, eller så är rapporten inte längre tillgänglig. Gör gärna en ny analys."
            action={<Button variant="glow" onClick={() => navigate("/")}>Analysera en hemsida</Button>}
            onHome={() => navigate("/")}
          />
        )}

        {found && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <div className="max-w-5xl mx-auto px-4 mb-4 flex items-center justify-end gap-3">
              {pdfError && <span className="text-[0.75rem] text-score-mid">{pdfError}</span>}
              <Button variant="glow-outline" size="sm" onClick={handleDownloadPdf} disabled={pdfState === "loading"} className="gap-2">
                {pdfState === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                {pdfState === "loading" ? "Skapar PDF…" : "Ladda ner PDF"}
              </Button>
            </div>
            {found.status === "partial" && (
              <div className="max-w-5xl mx-auto px-4 mb-4">
                <div className="flex items-start gap-2.5 rounded-xl border border-score-mid/25 bg-score-mid/[0.06] px-4 py-3 text-[0.8rem] text-muted-foreground">
                  <AlertTriangle className="w-4 h-4 text-score-mid shrink-0 mt-0.5" />
                  <span>
                    Delvis rapport – viss data kunde inte mätas vid analystillfället
                    {found.partialReasons?.includes("pagespeed_unavailable") ? " (Google PageSpeed var inte tillgängligt)" : ""}.
                    Betyget bygger på de kontroller som kunde genomföras.
                  </span>
                </div>
              </div>
            )}
            <ResultsSection
              domain={found.domain}
              data={found.report}
              onNewScan={() => navigate("/")}
              shareUrl={canonical}
            />
          </motion.div>
        )}
      </div>

      <Footer />
      <LeadCaptureModal open={bookingOpen} onClose={() => setBookingOpen(false)} title="Boka gratis analys" />
    </div>
  );
};

function StateCard({
  icon, title, body, action, onHome,
}: {
  icon: React.ReactNode; title: string; body: string; action: React.ReactNode; onHome: () => void;
}) {
  return (
    <div className="max-w-md mx-auto px-4 py-28 text-center">
      <div className="w-12 h-12 mx-auto mb-5 rounded-2xl border border-border bg-card flex items-center justify-center">{icon}</div>
      <h1 className="text-xl font-display font-semibold mb-2">{title}</h1>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{body}</p>
      <div className="flex items-center justify-center gap-3">
        {action}
        <Button variant="ghost" onClick={onHome} className="gap-2 text-muted-foreground">
          <ArrowLeft className="w-4 h-4" /> Till startsidan
        </Button>
      </div>
    </div>
  );
}

export default ReportPage;
