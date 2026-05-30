import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles, Search, ChevronLeft, ChevronRight } from "lucide-react";

import invito from "@/assets/portfolio/invito.webp";
import midnightgrill from "@/assets/portfolio/midnightgrill.webp";
import sakaitokyo from "@/assets/portfolio/sakaitokyo.webp";
import wendtviks from "@/assets/portfolio/wendtviks.webp";
import papajun from "@/assets/portfolio/papajun.webp";
import nordstrom from "@/assets/portfolio/nordstrom.webp";
import nordstrom1 from "@/assets/portfolio/nordstrom-1.webp";
import nordstrom2 from "@/assets/portfolio/nordstrom-2.webp";
import nordstrom3 from "@/assets/portfolio/nordstrom-3.webp";
import nordstrom4 from "@/assets/portfolio/nordstrom-4.webp";
import nordstrom5 from "@/assets/portfolio/nordstrom-5.webp";
import nordstrom6 from "@/assets/portfolio/nordstrom-6.webp";
import nordstrom7 from "@/assets/portfolio/nordstrom-7.webp";
import nordstrom8 from "@/assets/portfolio/nordstrom-8.webp";
import papajun1 from "@/assets/portfolio/papajun-1.webp";
import papajun2 from "@/assets/portfolio/papajun-2.webp";
import papajun3 from "@/assets/portfolio/papajun-3.webp";
import papajun4 from "@/assets/portfolio/papajun-4.webp";
import papajun5 from "@/assets/portfolio/papajun-5.webp";
import papajun6 from "@/assets/portfolio/papajun-6.webp";
import wendtviks1 from "@/assets/portfolio/wendtviks-1.webp";
import wendtviks2 from "@/assets/portfolio/wendtviks-2.webp";
import wendtviks3 from "@/assets/portfolio/wendtviks-3.webp";
import wendtviks4 from "@/assets/portfolio/wendtviks-4.webp";
import wendtviks5 from "@/assets/portfolio/wendtviks-5.webp";
import wendtviks6 from "@/assets/portfolio/wendtviks-6.webp";
import wendtviks7 from "@/assets/portfolio/wendtviks-7.webp";
import invito1 from "@/assets/portfolio/invito-1.webp";
import invito2 from "@/assets/portfolio/invito-2.webp";
import invito3 from "@/assets/portfolio/invito-3.webp";
import invito4 from "@/assets/portfolio/invito-4.webp";
import invito5 from "@/assets/portfolio/invito-5.webp";
import invito6 from "@/assets/portfolio/invito-6.webp";
import midnightgrill1 from "@/assets/portfolio/midnightgrill-1.webp";
import midnightgrill2 from "@/assets/portfolio/midnightgrill-2.webp";

type Badge = "Webbdesign" | "SEO" | "Branding" | "Conversion" | "AI / Automation";

interface Project {
  name: string;
  label: string;
  image: string;
  badges: Badge[];
  caseDescription: string;
  improvements: string[];
  result: string;
  gallery?: string[];
}

const projects: Project[] = [
  {
    name: "Wendt & Viks Bygg",
    label: "Modern hemsida för fler leads",
    image: wendtviks,
    badges: ["Webbdesign", "SEO", "Conversion"],
    caseDescription: "Ett etablerat byggföretag som behövde en digital närvaro som matchade deras professionalism. Vi byggde en tydlig, förtroendeskapande sajt optimerad för att generera förfrågningar.",
    improvements: ["Lead-generering genom formulär", "SEO för bygg-relaterade sökord", "Tydlig tjänstestruktur och CTA:er"],
    result: "3x fler förfrågningar via hemsidan jämfört med tidigare.",
    gallery: [wendtviks1, wendtviks2, wendtviks3, wendtviks4, wendtviks5, wendtviks6, wendtviks7],
  },
  {
    name: "Papa Jun",
    label: "Branding + konverteringsoptimering",
    image: papajun,
    badges: ["Webbdesign", "Branding", "SEO"],
    caseDescription: "En mysig restaurang vid Mälaren som behövde en hemsida som förmedlade deras unika atmosfär. Vi byggde en visuellt varm sajt med integrerad meny och bokningssystem.",
    improvements: ["Visuell storytelling", "Integrerad meny och bokning", "Lokal SEO för Kvicksund-området"],
    result: "Ökad synlighet lokalt och fler bordsbokningar online.",
    gallery: [papajun1, papajun2, papajun3, papajun4, papajun5, papajun6],
  },
  {
    name: "Nordström & Partners",
    label: "SEO-fokuserad redesign för advokatbyrå",
    image: nordstrom,
    badges: ["Webbdesign", "SEO", "Branding", "Conversion"],
    caseDescription: "En prestigefull advokatbyrå som behövde en digital närvaro som utstrålade kompetens och förtroende. Vi levererade en elegant, mörk design med tydliga konverteringsvägar.",
    improvements: ["Premiumkänsla i design", "SEO för juridiska söktermer", "Konverteringsoptimerade kontaktytor"],
    result: "Markant ökning av kvalificerade konsultationsförfrågningar.",
    gallery: [
      nordstrom1,
      nordstrom2,
      nordstrom3,
      nordstrom4,
      nordstrom5,
      nordstrom6,
      nordstrom7,
      nordstrom8,
    ],
  },
  {
    name: "Invito",
    label: "Modern hemsida för eventbranschen",
    image: invito,
    badges: ["Webbdesign", "Branding", "Conversion"],
    caseDescription: "En exklusiv eventplattform som behövde en digital närvaro i klass med sina fysiska upplevelser. Vi skapade en visuellt slående hemsida med fokus på konvertering och varumärkeskänsla.",
    improvements: ["Helt ny visuell identitet online", "Konverteringsoptimerade landningssidor", "Premium känsla genom typografi och bildval"],
    result: "Ökad bokningsgrad och starkare varumärkesuppfattning hos målgruppen.",
    gallery: [invito1, invito2, invito3, invito4, invito5, invito6],
  },
  {
    name: "Midnight Grill",
    label: "SEO-fokuserad redesign för restaurang",
    image: midnightgrill,
    badges: ["Webbdesign", "SEO", "Conversion"],
    caseDescription: "Stockholms mest eftertraktade burgare förtjänade en hemsida som matchade smakupplevelsen. Vi byggde en mörk, stämningsfull sajt med fokus på lokal SEO och beställningar.",
    improvements: ["Lokal SEO-strategi för Stockholm", "Online-beställning integrerat", "Mobiloptimerad menyupplevelse"],
    result: "Fördubblad onlinetrafik och 40% fler onlinebeställningar.",
    gallery: [midnightgrill1, midnightgrill2],
  },
  {
    name: "Sakai Tokyo",
    label: "Branding + konverteringsoptimering",
    image: sakaitokyo,
    badges: ["Webbdesign", "Branding"],
    caseDescription: "En premium japansk restaurang med omakase-upplevelser. Vi skapade en minimalistisk, elegant digital upplevelse som speglar restaurangens filosofi om hantverk och precision.",
    improvements: ["Exklusiv varumärkeskänsla", "Bokningssystem integrerat", "Storytelling genom visuell design"],
    result: "Starkare varumärke och fler bokningar via hemsidan.",
  },
];

const filters: { label: string; value: Badge | "Alla" }[] = [
  { label: "Alla", value: "Alla" },
  { label: "Hemsidor", value: "Webbdesign" },
  { label: "SEO", value: "SEO" },
  { label: "Branding", value: "Branding" },
  { label: "AI / Automation", value: "AI / Automation" },
];

const badgeColors: Record<Badge, { bg: string; text: string; border: string }> = {
  "Webbdesign": { bg: "hsla(175,90%,55%,0.1)", text: "hsl(175 90% 60%)", border: "hsla(175,90%,55%,0.2)" },
  "SEO": { bg: "hsla(215,90%,55%,0.1)", text: "hsl(215 90% 60%)", border: "hsla(215,90%,55%,0.2)" },
  "Branding": { bg: "hsla(260,90%,55%,0.1)", text: "hsl(260 90% 65%)", border: "hsla(260,90%,55%,0.2)" },
  "Conversion": { bg: "hsla(25,90%,55%,0.1)", text: "hsl(25 90% 60%)", border: "hsla(25,90%,55%,0.2)" },
  "AI / Automation": { bg: "hsla(330,90%,55%,0.1)", text: "hsl(330 90% 65%)", border: "hsla(330,90%,55%,0.2)" },
};

const PortfolioSection = () => {
  const [activeFilter, setActiveFilter] = useState<Badge | "Alla">("Alla");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [page, setPage] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const filtered = activeFilter === "Alla"
    ? projects
    : projects.filter((p) => p.badges.includes(activeFilter));

  const perPage = 3;
  const totalPages = Math.ceil(filtered.length / perPage);
  const visible = filtered.slice(page * perPage, page * perPage + perPage);

  const scrollToContact = () => {
    setSelectedProject(null);
    const el = document.getElementById("web-test") || document.getElementById("final-cta");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <section id="portfolio" className="relative z-10 py-24 sm:py-32 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary mb-3 block">
              Portfolio
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold font-display tracking-[-0.02em] leading-[1.15] mb-4">
              Projekt som visar vad rätt hemsida{" "}
              <span className="gradient-text">faktiskt kan göra</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-[0.9375rem] leading-[1.75]">
              Vi bygger inte bara snygga sidor — vi skapar hemsidor som stärker varumärket,
              ökar förtroendet och driver fler affärer.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-wrap justify-center gap-2 mb-10"
          >
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => { setActiveFilter(f.value); setPage(0); }}
                className={`px-4 py-2 rounded-full text-[0.8125rem] font-medium transition-all duration-300 border ${
                  activeFilter === f.value
                    ? "bg-primary/15 border-primary/30 text-primary shadow-[0_0_20px_hsla(175,90%,55%,0.1)]"
                    : "bg-secondary/40 border-border/30 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </motion.div>

          {/* Grid — 3 at a time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {visible.map((project, i) => {
                const accentColor = project.badges[0] ? badgeColors[project.badges[0]] : badgeColors["Webbdesign"];
                return (
                <motion.div
                  key={project.name}
                  layout
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] as const }}
                  onClick={() => setSelectedProject(project)}
                  className="group relative cursor-pointer"
                >
                  {/* Card with glow + depth */}
                  <div className="glass-card rounded-2xl overflow-hidden relative transition-all duration-500 hover:shadow-[0_12px_50px_hsla(175,90%,55%,0.12)] hover:translate-y-[-4px] border border-border/30 hover:border-primary/25">
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
                          <div className="px-4 py-2 rounded-full bg-primary/30 border border-primary/30 text-primary text-[0.8125rem] font-medium flex items-center gap-2 shadow-[0_0_20px_hsla(175,90%,55%,0.15)]">
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
                            className="text-[0.6875rem] font-medium px-2.5 py-1 rounded-full border"
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
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="flex items-center justify-center gap-3 mt-10"
            >
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="w-10 h-10 rounded-full border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1.5">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPage(idx)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      idx === page
                        ? "bg-primary w-6"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="w-10 h-10 rounded-full border border-border/30 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

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
                  <div className="flex-1 ml-3 px-3 py-1 rounded-md bg-background/50 text-[0.6875rem] text-muted-foreground truncate">
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
                      className="text-[0.6875rem] font-medium px-2.5 py-1 rounded-full border"
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

                <div className="glass-card rounded-xl p-5 space-y-3">
                  <h4 className="text-[0.8125rem] font-semibold tracking-[0.1em] uppercase text-primary/80">
                    Vad som förbättrades
                  </h4>
                  <ul className="space-y-2">
                    {selectedProject.improvements.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[0.875rem] text-foreground/90">
                        <Sparkles className="w-3.5 h-3.5 text-primary mt-1 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="glass-card rounded-xl p-5">
                  <h4 className="text-[0.8125rem] font-semibold tracking-[0.1em] uppercase text-primary/80 mb-2">
                    Resultat
                  </h4>
                  <p className="text-[0.9375rem] text-foreground/90 leading-[1.7]">
                    {selectedProject.result}
                  </p>
                </div>

                <button
                  onClick={scrollToContact}
                  className="w-full flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-[0.9375rem] hover:shadow-[0_0_30px_hsla(175,90%,55%,0.25)] transition-all duration-300 hover:scale-[1.02]"
                >
                  Vill du ha något liknande?
                  <ArrowRight className="w-4 h-4" />
                </button>
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
