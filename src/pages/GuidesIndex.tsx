import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackgroundEffect from "@/components/BackgroundEffect";
import SectionHeading from "@/components/SectionHeading";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { guides } from "@/content/guides";

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const GuidesIndex = () => {
  const navigate = useNavigate();

  useDocumentMeta({
    title: "Guider & insikter – Webscore",
    description:
      "Konkreta, ärliga guider om hemsidor, SEO, intranät och digital synlighet – svar på frågorna företag faktiskt googlar.",
    canonical: "https://webscore.se/guider",
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundEffect />
      <Navbar onAnalyze={() => navigate("/")} />

      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-28">
        <SectionHeading
          eyebrow="GUIDER & INSIKTER"
          title={<>Klartext om <span className="gradient-text">det digitala</span></>}
          subtitle="Konkreta svar på frågorna företag faktiskt googlar – inga säljsnack, bara det vi själva skulle vilja veta."
          className="mb-14"
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {guides.map((g, i) => (
            <motion.div
              key={g.slug}
              custom={i}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-50px" }}
            >
              <Link to={`/guider/${g.slug}`} className="card-surface p-6 group flex flex-col h-full">
                <span className="data-label text-[0.5rem] text-neon-cyan/70">{g.eyebrow}</span>
                <h2 className="font-display font-semibold text-lg mt-3 mb-2.5 tracking-[-0.01em] leading-snug">
                  {g.title}
                </h2>
                <p className="text-[0.875rem] text-muted-foreground/80 leading-[1.7] flex-1">{g.excerpt}</p>
                <div className="flex items-center justify-between mt-5">
                  <span className="data-label text-[0.5rem] text-muted-foreground/45 inline-flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> {g.readingMin} min
                  </span>
                  <span className="data-label text-[0.5rem] text-neon-blue inline-flex items-center gap-1.5">
                    Läs guiden <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-[180ms]" />
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default GuidesIndex;
