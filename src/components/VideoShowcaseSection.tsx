import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import LazyVideo from "@/components/LazyVideo";
import SectionHeading from "@/components/SectionHeading";

/**
 * AI-STUDIO — visual concepts, NOT client work.
 *
 * Every clip here is AI-generated: idea material we produce to show a possible
 * direction before anything is built. The real, delivered client work lives in
 * PortfolioSection and must never be confused with this. That separation is
 * carried three ways, so no single element has to do the work alone:
 *   1. the section heading + intro say it in plain Swedish,
 *   2. a standing note under the intro states it outright and points to the
 *      portfolio,
 *   3. every single tile carries an always-visible "AI-KONCEPT" marker.
 *
 * Labels describe the creative direction, the visual style and the kind of
 * business the idea would suit. They never name a customer, a campaign or a
 * result, because none of these were made for a customer.
 */

// 4-col grid, 3 rows — all 12 cells filled.
const videos = [
  {
    src: "/videos/branding-1.mp4",
    label: "Filmisk ton för tjänsteföretag",
    span: "sm:col-span-2 sm:row-span-2",
  },
  {
    src: "/videos/branding-10.mp4",
    label: "Produkt i rörelse – fordon",
    span: "sm:col-span-1 sm:row-span-2",
  },
  {
    src: "/videos/branding-3.mp4",
    label: "Färgstark produktfilm – handel",
    span: "sm:col-span-1 sm:row-span-1",
  },
  {
    src: "/videos/branding-4.mp4",
    label: "Aptitretande matbild – restaurang",
    span: "sm:col-span-1 sm:row-span-1",
  },
  {
    src: "/videos/branding-12.mp4",
    label: "Overklig kampanjidé som fastnar",
    span: "sm:col-span-2 sm:row-span-1",
  },
  {
    src: "/videos/branding-11.mp4",
    label: "Rå, dramatisk nattkänsla",
    span: "sm:col-span-1 sm:row-span-1",
  },
  {
    src: "/videos/branding-7.mp4",
    label: "Nostalgiskt, redaktionellt bildspråk",
    span: "sm:col-span-1 sm:row-span-1",
  },
];

const VideoShowcaseSection = () => {
  return (
    <section id="ai-studio" className="relative z-10 py-24 sm:py-32 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="AI-STUDIO"
          title={<>Idéer vi tar fram <span className="gradient-text">med AI</span></>}
          subtitle="Innan vi bygger något testar vi hur det skulle kunna se ut. Här är visuella riktningar vi skapat med AI – för hemsidor, kampanjer och digitalt innehåll."
          className="mb-8 sm:mb-10"
        />

        {/* The disclosure, stated plainly and up front — one calm line, not a
            disclaimer buried in small print. */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-14 sm:mb-16 flex max-w-2xl items-start gap-3 rounded-2xl border border-neon-cyan/15 bg-neon-cyan/[0.04] px-5 py-4 text-[0.875rem] leading-[1.7] text-muted-foreground"
        >
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-neon-cyan" aria-hidden="true" />
          <span>
            Allt i det här avsnittet är <span className="font-medium text-foreground">koncept skapade med AI</span> — idéer och
            stilprov, inte utfört kunduppdrag. Riktiga projekt vi levererat hittar du under{" "}
            <a href="#portfolio" className="text-neon-cyan underline-offset-2 hover:underline">
              Riktiga kundprojekt
            </a>
            .
          </span>
        </motion.p>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 grid-rows-none sm:grid-rows-[200px_200px_200px] md:grid-rows-[200px_200px_200px] gap-3 sm:gap-4">
          {videos.map((video, i) => (
            <motion.div
              key={video.src}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className={`${video.span} relative group min-h-[180px] sm:min-h-0`}
            >
              {/* Video — edges feathered with a soft mask so each clip melts
                  into the dark page instead of sitting in a hard box. */}
              <LazyVideo
                src={video.src}
                poster={video.src.replace(/\.mp4$/, "-poster.webp")}
                className="absolute inset-0 w-full h-full object-cover rounded-2xl transition-transform duration-700 group-hover:scale-[1.04]"
                style={{
                  maskImage: "radial-gradient(125% 125% at 50% 50%, #000 70%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(125% 125% at 50% 50%, #000 70%, transparent 100%)",
                }}
              />

              {/* Soft hover lift — outer glow only, no hard outline */}
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ boxShadow: "0 0 40px hsla(175,90%,55%,0.12)" }}
              />

              {/* Per-clip marker — ALWAYS visible, including on touch devices where
                  there is no hover. No tile can be screenshotted or scrolled past
                  without the AI origin travelling with it. */}
              <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full border border-neon-cyan/25 bg-background/70 px-2.5 py-1 backdrop-blur-md">
                <Sparkles className="h-2.5 w-2.5 text-neon-cyan" aria-hidden="true" />
                <span className="data-label text-[0.62rem] leading-none text-foreground/90">AI-KONCEPT</span>
              </span>

              {/* Label — also always visible (it used to appear on hover only, so
                  phones never saw it), lifting slightly on hover. */}
              <div className="absolute bottom-0 left-0 right-0 rounded-b-2xl bg-gradient-to-t from-background/85 via-background/45 to-transparent p-4 pt-8">
                <span className="data-label text-[0.68rem] leading-tight text-foreground/85 transition-colors duration-300 group-hover:text-foreground">
                  {video.label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VideoShowcaseSection;
