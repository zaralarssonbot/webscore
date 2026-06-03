import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackgroundEffect from "@/components/BackgroundEffect";
import NotFound from "@/pages/NotFound";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { getGuide } from "@/content/guides";

const GuideArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const guide = getGuide(slug);

  // Hooks must run before any early return.
  useDocumentMeta({
    title: guide?.metaTitle ?? "Guide – Webscore",
    description: guide?.metaDescription,
    canonical: guide ? `https://webscore.se/guider/${slug}` : undefined,
  });

  if (!guide) return <NotFound />;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundEffect />
      <Navbar onAnalyze={() => navigate("/")} />

      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-32 pb-28">
        <Link
          to="/guider"
          className="group data-label text-[0.72rem] text-muted-foreground/80 hover:text-foreground inline-flex items-center min-h-[44px] gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform duration-[180ms]" /> Alla guider
        </Link>

        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 mb-10"
        >
          <span className="data-label text-[0.72rem] text-neon-blue">{guide.eyebrow}</span>
          <h1 className="font-display font-semibold tracking-[-0.03em] leading-[1.1] text-3xl sm:text-4xl mt-4 mb-4">
            {guide.title}
          </h1>
          <div className="flex items-center gap-4 data-label text-[0.72rem] text-muted-foreground/80">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> {guide.readingMin} min läsning
            </span>
            <span>Uppdaterad {guide.updated}</span>
          </div>
        </motion.header>

        {/* Body */}
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="guide-prose"
        >
          {guide.body}
        </motion.article>

        {/* Soft CTA */}
        <div className="card-surface p-7 sm:p-8 mt-14 relative overflow-hidden text-center">
          <div className="accent-line-top accent-line-cyan" />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at center, hsla(175,95%,50%,0.05) 0%, transparent 60%)" }}
          />
          <h2 className="text-lg sm:text-xl font-bold font-display mb-2 relative">Var står din sida idag?</h2>
          <p className="text-sm text-muted-foreground/80 mb-6 max-w-md mx-auto relative leading-[1.7]">
            Kör en gratis analys på 60 sekunder och se vad som kan förbättras – inga förpliktelser.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
            <Button variant="glow-gradient" size="lg" className="group glow-precision" onClick={() => navigate("/")}>
              Gör en gratis analys
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="glow-outline" size="lg" asChild>
              <Link to={guide.related.href}>{guide.related.label}</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GuideArticle;
