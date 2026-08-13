import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Check, PenTool } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrowserFrame, ConceptShot } from "@/components/portfolio/ConceptPreviews";
import { conceptVisuals, type ConceptVisual } from "@/components/portfolio/concept-visuals";

import papajun from "@/assets/portfolio/papajun.webp";
import papajun1 from "@/assets/portfolio/papajun-1.webp";
import papajun2 from "@/assets/portfolio/papajun-2.webp";
import papajun3 from "@/assets/portfolio/papajun-3.webp";
import papajun4 from "@/assets/portfolio/papajun-4.webp";
import papajun5 from "@/assets/portfolio/papajun-5.webp";
import papajun6 from "@/assets/portfolio/papajun-6.webp";

/**
 * Two kinds of work, never blurred together:
 *
 *   "client"  — delivered for a real customer. Papa Jun is the only one, and
 *               every claim about it already existed in this repo and is backed
 *               by the screenshots in src/assets/portfolio/papajun*.
 *   "concept" — a fictional working brand we invented to show a design
 *               direction. No customer, no commission, no delivery, and
 *               therefore no results, dates or testimonials.
 *
 * The distinction is carried by a text+icon badge on every card (never colour
 * alone, never hover-only), by the browser chrome inside each concept preview,
 * and by an explicit line in the concept dialog.
 */
type ProjectKind = "client" | "concept";

interface Project {
  id: string;
  name: string;
  kind: ProjectKind;
  /** Sector line — descriptive, never a claim about a relationship. */
  industry: string;
  /** What the design set out to do. */
  objective: string;
  /** Three capabilities/deliverables the direction demonstrates. */
  capabilities: string[];
  /** Discipline chips. */
  tags: string[];
  /**
   * Illustrative host shown in the browser chrome, as React text. Concepts use a
   * webscore.se subdomain because they are our own studies, not a client's site.
   */
  domain: string;
  /** Concepts carry a full page set (homepage + four supporting pages). */
  visual?: ConceptVisual;
  /** The client project carries real screenshots instead. */
  image?: string;
  gallery?: string[];
}

const projects: Project[] = [
  {
    id: "papajun",
    name: "Papa Jun",
    kind: "client",
    industry: "Restaurang · Kvicksund, Mälaren",
    // Preserved verbatim from the existing case copy.
    objective:
      "En mysig restaurang vid Mälaren som behövde en hemsida som förmedlade deras unika atmosfär. Vi byggde en visuellt varm sajt med integrerad meny och bokningssystem.",
    capabilities: ["Visuell storytelling", "Integrerad meny och bokning", "Lokal SEO för Kvicksund-området"],
    tags: ["Webbdesign", "Branding", "SEO"],
    domain: "papajun.se",
    image: papajun,
    gallery: [papajun1, papajun2, papajun3, papajun4, papajun5, papajun6],
  },
  {
    id: "veyra",
    name: "Veyra Hotels",
    kind: "concept",
    industry: "Boutiquehotell",
    objective:
      "Ett varmt, redaktionellt uttryck där platsen bär känslan – och där bokningen sker direkt på sajten i stället för via en förmedlare.",
    capabilities: ["Direktbokning i fokus", "Redaktionellt bildspråk", "Rums- och paketsidor"],
    tags: ["Webbdesign", "Branding", "Conversion"],
    domain: conceptVisuals.veyra.domain,
    visual: conceptVisuals.veyra,
  },
  {
    id: "verk",
    name: "Verk",
    kind: "concept",
    industry: "Digitalt magasin",
    objective:
      "Ett redaktionellt system där innehållet är gränssnittet. Typografi, bild och ljud hålls ihop av ett rutnät i stället för av dekor.",
    capabilities: ["Redaktionellt rutnät", "Artikel- och arkivvyer", "Ljud i samma system"],
    tags: ["Webbdesign", "Innehåll", "Typografi"],
    domain: conceptVisuals.verk.domain,
    visual: conceptVisuals.verk,
  },
  {
    id: "lumera",
    name: "Lumera Skin",
    kind: "concept",
    industry: "Hudvård & e-handel",
    objective:
      "Mjuk premiumhandel där produkten är hjälten. Lugn färgskala och elegant typografi gör köpet till ett självklart nästa steg.",
    capabilities: ["Produktfokuserad startsida", "Elegant editorial typografi", "Kort väg till köp"],
    tags: ["Webbdesign", "Branding", "Conversion"],
    domain: conceptVisuals.lumera.domain,
    visual: conceptVisuals.lumera,
  },
  {
    id: "asteron",
    name: "Asteron Systems",
    kind: "concept",
    industry: "Affärssystem & automation",
    objective:
      "Tryggt och tydligt för ett tekniskt erbjudande. Gränssnittsdetaljer visar produkten medan strukturen leder besökaren mot ett enda nästa steg.",
    capabilities: ["Dashboard-inspirerade detaljer", "Konverteringsdriven struktur", "Tydlig produktberättelse"],
    tags: ["Webbdesign", "Conversion"],
    domain: conceptVisuals.asteron.domain,
    visual: conceptVisuals.asteron,
  },
];

const featured = projects[0];
const concepts = projects.slice(1);

/* ── Kind badge — text + icon, so it never depends on colour alone ── */
const KindBadge = ({ kind, className = "" }: { kind: ProjectKind; className?: string }) => {
  const isClient = kind === "client";
  const Icon = isClient ? BadgeCheck : PenTool;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
        isClient
          ? "border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan"
          : "border-border bg-secondary text-muted-foreground"
      } ${className}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="data-label text-[0.62rem] leading-none">{isClient ? "KUNDPROJEKT" : "KONCEPTSTUDIE"}</span>
    </span>
  );
};

const TagChips = ({ tags }: { tags: string[] }) => (
  <div className="flex flex-wrap gap-1.5">
    {tags.map((t) => (
      <span
        key={t}
        className="data-label rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[0.62rem] text-muted-foreground"
      >
        {t}
      </span>
    ))}
  </div>
);

/** Shared focus ring for the card buttons (plain <button> isn't covered by the global rule). */
const cardFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const PortfolioSection = () => {
  const [selected, setSelected] = useState<Project | null>(null);

  const scrollToContact = () => {
    setSelected(null);
    document.getElementById("webtest")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <section id="portfolio" className="relative z-10 py-24 sm:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <SectionHeading
            eyebrow="UTVALT ARBETE"
            title={<>Design som visar <span className="gradient-text">hur vi tänker</span></>}
            subtitle="Här visar vi både arbete för riktiga kunder och egna konceptstudier. Varje projekt visar hur vi arbetar med strategi, identitet, innehåll och digital upplevelse."
            className="mb-14 sm:mb-16"
          />

          {/* ── Featured: the verified customer project ── */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="mb-6 sm:mb-8"
          >
            <button
              type="button"
              onClick={() => setSelected(featured)}
              aria-label={`Visa projekt: ${featured.name} (kundprojekt)`}
              className={`card-surface card-focus group w-full cursor-pointer overflow-hidden p-0 text-left ${cardFocus}`}
            >
              <div className="grid items-stretch gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                {/* Real screenshot in browser chrome */}
                <div className="relative p-4 sm:p-6">
                  <div className="overflow-hidden rounded-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                    <div className="flex items-center gap-1.5 bg-secondary/90 px-3 py-2">
                      <span className="h-2 w-2 rounded-full bg-white/25" />
                      <span className="h-2 w-2 rounded-full bg-white/20" />
                      <span className="h-2 w-2 rounded-full bg-white/15" />
                      <span className="ml-2 flex-1 truncate rounded-md bg-background/50 px-2 py-[3px] font-mono text-[0.6rem] text-muted-foreground">
                        {featured.domain}
                      </span>
                    </div>
                    <img
                      src={featured.image}
                      alt="Startsidan för Papa Jun"
                      width={720}
                      height={450}
                      loading="lazy"
                      className="aspect-[16/10] w-full object-cover object-top transition-transform duration-[2000ms] ease-out group-hover:scale-[1.04]"
                    />
                  </div>
                </div>

                {/* Case text */}
                <div className="flex flex-col justify-center gap-4 p-6 sm:p-8 lg:pl-2">
                  <KindBadge kind="client" className="w-fit" />
                  <div>
                    <h3 className="font-display text-2xl font-semibold tracking-[-0.02em] sm:text-[1.75rem]">
                      {featured.name}
                    </h3>
                    <p className="mt-1 font-mono text-[0.78rem] text-muted-foreground/80">{featured.industry}</p>
                  </div>
                  <p className="text-[0.9375rem] leading-[1.75] text-muted-foreground">{featured.objective}</p>
                  <ul className="space-y-2">
                    {featured.capabilities.map((c) => (
                      <li key={c} className="flex items-start gap-2.5 text-[0.875rem] text-foreground/90">
                        <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-neon-cyan" aria-hidden="true" />
                        {c}
                      </li>
                    ))}
                  </ul>
                  <TagChips tags={featured.tags} />
                  <span className="data-label mt-1 inline-flex items-center gap-1.5 text-[0.68rem] text-neon-blue">
                    Visa projekt
                    <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </button>
          </motion.div>

          {/* ── Concept studies ── */}
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
            {concepts.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              >
                <button
                  type="button"
                  onClick={() => setSelected(p)}
                  aria-label={`Visa konceptstudie: ${p.name}`}
                  className={`card-surface group flex h-full w-full cursor-pointer flex-col p-4 text-left sm:p-5 ${cardFocus}`}
                >
                  {/* Preview. Decorative — the readable text lives below it. */}
                  <div className="relative mb-6 aspect-[16/10] w-full" aria-hidden="true">
                    {p.visual ? <ConceptShot visual={p.visual} /> : null}
                  </div>

                  <KindBadge kind="concept" className="mb-3 w-fit" />
                  <h3 className="font-display text-lg font-semibold tracking-[-0.01em]">{p.name}</h3>
                  <p className="mt-0.5 font-mono text-[0.72rem] text-muted-foreground/80">{p.industry}</p>
                  <p className="mt-2.5 flex-1 text-[0.875rem] leading-[1.7] text-muted-foreground">{p.objective}</p>

                  <ul className="mt-4 space-y-1.5">
                    {p.capabilities.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-[0.8125rem] text-foreground/85">
                        <Check className="mt-[0.3rem] h-3 w-3 shrink-0 text-neon-blue/80" aria-hidden="true" />
                        {c}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <TagChips tags={p.tags} />
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-neon-blue transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Project dialog (shared Radix primitive: focus trap, Esc, restore) ── */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-2xl border-border/40 bg-card p-0 sm:rounded-3xl">
          {selected && (
            <div className="flex flex-col">
              {/* Preview */}
              <div className="bg-muted/20 p-5 sm:p-7">
                {selected.kind === "concept" && selected.visual ? (
                  /* One large homepage, then the four supporting pages — the same
                     hierarchy the Papa Jun case uses. */
                  <div className="space-y-5">
                    <figure className="m-0">
                      <BrowserFrame domain={selected.visual.domain} tint={selected.visual.tint} className="!h-auto">
                        <img
                          src={selected.visual.desktop}
                          alt={selected.visual.desktopAlt}
                          loading="lazy"
                          className="block w-full"
                        />
                      </BrowserFrame>
                      <figcaption className="mt-2 text-center data-label text-[0.62rem] text-muted-foreground/80">
                        Startsida
                      </figcaption>
                    </figure>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {selected.visual.pages.map((page) => (
                        <figure key={page.label} className="m-0">
                          <img
                            src={page.src}
                            alt={page.alt}
                            loading="lazy"
                            className="block w-full rounded-lg border border-white/10"
                          />
                          {/* Page name as real React text — never read off the image. */}
                          <figcaption className="mt-2 data-label text-[0.62rem] text-muted-foreground/80">
                            {page.label}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <img
                      src={selected.image}
                      alt={`Startsidan för ${selected.name}`}
                      loading="lazy"
                      className="w-full rounded-xl border border-white/10 object-cover object-top"
                    />
                    {selected.gallery && (
                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                        {selected.gallery.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`${selected.name}, vy ${idx + 1}`}
                            loading="lazy"
                            className="w-full rounded-lg border border-white/10 object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-5 p-6 sm:p-8">
                <KindBadge kind={selected.kind} className="w-fit" />

                <div>
                  <DialogTitle className="font-display text-xl font-semibold tracking-[-0.02em] sm:text-2xl">
                    {selected.name}
                  </DialogTitle>
                  <p className="mt-1 font-mono text-[0.8rem] text-muted-foreground/80">{selected.industry}</p>
                  {/* Domain as crisp React text. Not a link — illustrative host. */}
                  <p className="mt-1.5 font-mono text-[0.8rem] text-neon-blue/90">{selected.domain}</p>
                </div>

                <DialogDescription className="text-[0.9375rem] leading-[1.75] text-muted-foreground">
                  {selected.objective}
                </DialogDescription>

                {/* Said outright inside the dialog too, so the distinction survives
                    a visitor who opened this card directly. */}
                {selected.kind === "concept" && (
                  <p className="rounded-xl border border-border bg-secondary/60 px-4 py-3 text-[0.8125rem] leading-[1.65] text-muted-foreground">
                    <span className="font-medium text-foreground">Konceptstudie.</span> {selected.name} är ett påhittat
                    varumärke som vi tagit fram för att visa en designriktning — inte ett företag, en kund eller ett
                    utfört uppdrag.
                  </p>
                )}

                <div className="space-y-3 rounded-xl border border-border bg-secondary p-5">
                  <h4 className="data-label text-[0.7rem] text-neon-blue">
                    {selected.kind === "client" ? "VAD SOM FÖRBÄTTRADES" : "VAD KONCEPTET VISAR"}
                  </h4>
                  <ul className="space-y-2">
                    {selected.capabilities.map((c) => (
                      <li key={c} className="flex items-start gap-2.5 text-[0.875rem] text-foreground/90">
                        <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-neon-cyan" aria-hidden="true" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>

                <TagChips tags={selected.tags} />

                <Button onClick={scrollToContact} size="lg" className="group/cta w-full">
                  Vill du ha något liknande?
                  <ArrowRight className="h-4 w-4 transition-transform duration-[180ms] group-hover/cta:translate-x-1" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PortfolioSection;
