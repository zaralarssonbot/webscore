import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Check, Search } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { Button } from "@/components/ui/button";

import papajun from "@/assets/portfolio/papajun.webp";
import papajun1 from "@/assets/portfolio/papajun-1.webp";
import papajun2 from "@/assets/portfolio/papajun-2.webp";
import papajun3 from "@/assets/portfolio/papajun-3.webp";
import papajun4 from "@/assets/portfolio/papajun-4.webp";
import papajun5 from "@/assets/portfolio/papajun-5.webp";
import papajun6 from "@/assets/portfolio/papajun-6.webp";

type Badge = "Webbdesign" | "SEO" | "Branding" | "Conversion" | "AI / Automation";

interface Project {
  name: string;
  label: string;
  image: string;
  badges: Badge[];
  caseDescription: string;
  improvements: string[];
  result?: string;
  gallery?: string[];
}

const projects: Project[] = [
  {
    name: "Papa Jun",
    label: "Branding + konverteringsoptimering",
    image: papajun,
    badges: ["Webbdesign", "Branding", "SEO"],
    caseDescription: "En mysig restaurang vid Mälaren som behövde en hemsida som förmedlade deras unika atmosfär. Vi byggde en visuellt varm sajt med integrerad meny och bokningssystem.",
    improvements: ["Visuell storytelling", "Integrerad meny och bokning", "Lokal SEO för Kvicksund-området"],
    gallery: [papajun1, papajun2, papajun3, papajun4, papajun5, papajun6],
  },
];

// Restraint: category chips share one neutral style; colour is reserved for the accent.
const CHIP = { bg: "rgba(255,255,255,0.06)", text: "hsl(218 16% 74%)", border: "rgba(255,255,255,0.12)" };
const badgeColors: Record<Badge, { bg: string; text: string; border: string }> = {
  "Webbdesign": CHIP,
  "SEO": CHIP,
  "Branding": CHIP,
  "Conversion": CHIP,
  "AI / Automation": CHIP,
};
const ACCENT = { bg: "hsla(175,90%,55%,0.1)", text: "hsl(175 90% 60%)", border: "hsla(175,90%,55%,0.2)" };

const PortfolioSection = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const scrollToContact = () => {
    setSelectedProject(null);
    document.getElementById("webtest")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <section id="portfolio" className="relative z-10 py-24 sm:py-32 px-6">
        <div className="max-w-6xl mx-auto">

          <SectionHeading
            eyebrow="PORTFOLIO"
            title={<>Projekt som visar vad rätt hemsida{" "}<span className="gradient-text">faktiskt kan göra</span></>}
            subtitle="Vi bygger inte bara snygga sidor — vi skapar hemsidor som stärker varumärket, ökar förtroendet och driver fler affärer."
            className="mb-14 sm:mb-16"
          />

          {/* Single featured project — centered at a comfortable card width */}
          <div className="flex justify-center">
            {projects.map((project) => {
                const accentColor = ACCENT;
                return (
                <motion.div
                  key={project.name}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }}
                  onClick={() => setSelectedProject(project)}
                  className="group relative cursor-pointer w-full max-w-sm"
                >
                  {/* Card with layered depth + gradient top-line on hover */}
                  <div className="card-surface overflow-hidden">
                    {/* Ambient glow behind card on hover */}
                    <div
                      className="absolute -inset-1 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl -z-10"
                      style={{ background: `radial-gradient(ellipse at 50% 80%, ${accentColor.bg.replace('0.1', '0.25')}, transparent 70%)` }}
                    />

                    {/* Circular avatar frame */}
                    <div className="flex justify-center pt-8 pb-2 relative">
                      {/* Glow ring */}
                      <div
                        className="absolute top-6 w-28 h-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-lg"
                        style={{ background: `radial-gradient(circle, ${accentColor.text.replace(')', ' / 0.3)')}, transparent 70%)` }}
                      />
                      {/* Circle image */}
                      <div
                        className="w-24 h-24 rounded-full overflow-hidden border-2 transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_30px_hsla(175,90%,55%,0.2)] relative z-10"
                        style={{ borderColor: accentColor.border }}
                      >
                        <img
                          src={project.image}
                          alt={project.name}
                          width={96}
                          height={96}
                          className="w-full h-full object-cover object-top transition-transform duration-[2000ms] ease-out group-hover:scale-[1.15]"
                          loading="lazy"
                        />
                      </div>
                    </div>

                    {/* Rectangular preview */}
                    <div className="relative w-full aspect-[16/10] overflow-hidden mx-auto px-4 pb-1">
                      <div className="rounded-xl overflow-hidden border border-border/20 relative h-full">
                        <img
                          src={project.image}
                          alt={project.name}
                          width={384}
                          height={240}
                          className="w-full h-full object-cover object-top transition-transform duration-[2500ms] ease-out group-hover:scale-[1.06] group-hover:translate-y-[-8%]"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-60 group-hover:opacity-30 transition-opacity duration-500" />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-400">
                          <div className="px-4 py-2 rounded-full bg-[hsl(214_84%_44%)] text-white text-[0.8125rem] font-semibold flex items-center gap-2 shadow-[0_4px_16px_hsla(214,82%,46%,0.45)]">
                            <Search className="w-3.5 h-3.5" />
                            Visa projekt
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-5 pt-4 space-y-2.5 text-center">
                      <h3 className="font-semibold font-display text-[0.9375rem] tracking-[-0.01em]">
                        {project.name}
                      </h3>
                      <p className="text-[0.8125rem] text-muted-foreground leading-[1.6]">
                        {project.label}
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {project.badges.map((badge) => (
                          <span
                            key={badge}
                            className="data-label text-[0.72rem] px-2.5 py-1 rounded-full border"
                            style={{
                              background: badgeColors[badge].bg,
                              color: badgeColors[badge].text,
                              borderColor: badgeColors[badge].border,
                            }}
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
                );
              })}
          </div>

        </div>
      </section>

      {/* Modal / Lightbox */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedProject(null)}
          >
            <div className="absolute inset-0 bg-background/95" />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-border/40 bg-card shadow-2xl flex flex-col lg:flex-row"
            >
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center border border-border/30 hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Left: Scrollable website preview with browser chrome */}
              <div className="lg:w-[55%] flex flex-col bg-muted/30">
                <div className="flex items-center gap-1.5 px-4 py-2.5 bg-secondary/90 border-b border-border/30 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                  <div className="flex-1 ml-3 px-3 py-1 rounded-md bg-background/50 text-[0.78rem] text-muted-foreground truncate">
                    {selectedProject.name.toLowerCase().replace(/\s+/g, '')}.se
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 max-h-[35vh] lg:max-h-none">
                  <img
                    src={selectedProject.image}
                    alt={selectedProject.name}
                    loading="lazy"
                    className="w-full h-auto object-cover object-top"
                  />
                  {selectedProject.gallery && selectedProject.gallery.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 border-t border-border/30">
                      {selectedProject.gallery.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`${selectedProject.name} screenshot ${idx + 1}`}
                          className="w-full h-auto rounded-xl object-cover border border-border/20 cursor-pointer hover:opacity-80 hover:scale-[1.02] transition-all duration-300"
                          loading="lazy"
                          onClick={(e) => { e.stopPropagation(); setZoomedImage(img); }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Project info */}
              <div className="lg:w-[45%] overflow-y-auto p-5 sm:p-8 space-y-5 sm:space-y-6">
                <div className="flex flex-wrap gap-1.5">
                  {selectedProject.badges.map((badge) => (
                    <span
                      key={badge}
                      className="text-[0.78rem] font-medium px-2.5 py-1 rounded-full border"
                      style={{
                        background: badgeColors[badge].bg,
                        color: badgeColors[badge].text,
                        borderColor: badgeColors[badge].border,
                      }}
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-semibold font-display tracking-[-0.02em] mb-1">
                    {selectedProject.name}
                  </h3>
                  <p className="text-primary text-[0.875rem] font-medium">{selectedProject.label}</p>
                </div>

                <p className="text-muted-foreground text-[0.9375rem] leading-[1.75]">
                  {selectedProject.caseDescription}
                </p>

                <div className="rounded-xl p-5 space-y-3 bg-secondary border border-border">
                  <h4 className="text-[0.8125rem] font-semibold tracking-[0.1em] uppercase text-primary/80">
                    Vad som förbättrades
                  </h4>
                  <ul className="space-y-2">
                    {selectedProject.improvements.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[0.875rem] text-foreground/90">
                        <Check className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button onClick={scrollToContact} size="lg" className="group/cta w-full">
                  Vill du ha något liknande?
                  <ArrowRight className="w-4 h-4 transition-transform duration-[180ms] group-hover/cta:translate-x-1" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoomed gallery image */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setZoomedImage(null)}
          >
            <div className="absolute inset-0 bg-background/95" />
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.25 }}
              src={zoomedImage}
              alt="Zoomed screenshot"
              className="relative max-w-[90vw] max-h-[90vh] rounded-2xl border border-border/30 shadow-2xl object-contain"
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center border border-border/30 hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PortfolioSection;
