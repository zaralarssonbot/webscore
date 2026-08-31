import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import SpatialHero from "@/immersive/spatial/SpatialHero";
import ConceptStudy, { type ConceptStudyData } from "./ConceptStudy";
import BrightWorld from "./BrightWorld";
import { conceptVisuals } from "@/components/portfolio/concept-visuals";
import FeaturedReveal from "./FeaturedReveal";
import s2Desktop from "@/assets/immersive/bw-s2-monolith-desktop.webp";
import s2Mobile from "@/assets/immersive/bw-s2-monolith-mobile.webp";
import wMark from "@/assets/brand/webscore-w-mark.webp";
import "./immersive.css";

/**
 * WEBSCORE — the homepage.
 *
 * Positioning: Webscore is a creative technology studio; the site itself is the
 * proof of capability. The website-analysis product still exists and still
 * works, but it lives at /analys now rather than owning the homepage.
 *
 * The page is one journey in two rooms. The Spatial film is the approach; the
 * portal hands over to #F1F4F8, and everything from that point to the footer is
 * the bright world — one ground, one type colour, one button. There is no
 * second, darker half any more, which is why the WebGL lattice and its static
 * fallback are gone rather than retired: both existed only to give a near-black
 * page some atmosphere, and there is no near-black page left for them to sit
 * behind. The film is the only moving image on the site now.
 *
 * Structural contract, unchanged: every word of content is semantic HTML, and
 * the film is decorative — if it never decodes the page still reads and
 * converts.
 */

const NAV = [
  { id: "projekt", label: "Utvalt arbete" },
  { id: "tjanster", label: "Vad vi gör" },
  { id: "kontakt", label: "Kontakt" },
];

function Nav({ active, light }: { active: string; light?: boolean }) {
  const [open, setOpen] = useState(false);

  // Close on Escape so the menu is never a keyboard trap.
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open]);

  return (
    <header className={`nav-wrap${light ? " is-light" : ""}`}>
      <nav className="nav" aria-label="Huvudmeny">
        <a className="brand" href="#top">
          <img className="brand-mark" src={wMark} alt="" aria-hidden="true" />
          <span className="brand-name">Webscore</span>
        </a>
        <ul className="nav-links">
          {NAV.map((n) => (
            <li key={n.id}>
              <a href={`#${n.id}`} aria-current={active === n.id ? "true" : undefined}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <a className="nav-cta" href="#kontakt">Starta ett projekt</a>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? "Stäng meny" : "Öppna meny"}</span>
          <span className="bars" aria-hidden="true"><i /><i /></span>
        </button>
      </nav>
      {open && (
        <div className="mobile-menu" id="mobile-menu">
          <ul>
            {NAV.map((n) => (
              <li key={n.id}>
                <a href={`#${n.id}`} onClick={() => setOpen(false)}>{n.label}</a>
              </li>
            ))}
          </ul>
          <a className="mobile-cta" href="#kontakt" onClick={() => setOpen(false)}>
            Starta ett projekt
          </a>
        </div>
      )}
    </header>
  );
}

function Reveal({
  children,
  delay = 0,
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  as?: "div" | "li";
}) {
  const reduced = useReducedMotion();
  const C = as === "li" ? motion.li : motion.div;
  return (
    <C
      initial={reduced ? false : { opacity: 0, y: 26 }}
      whileInView={reduced ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </C>
  );
}

/* ── content ──────────────────────────────────────────────────────────────── */

/** A self-authored concept study. The one real engagement is PAPAJUN, above. */
interface Project {
  id: string;
  name: string;
  sector: string;
  line: string;
  image: string;
  alt: string;
}

/**
 * The one real engagement, presented at more weight than the studies.
 *
 * The distinction between this and PROJECTS is load-bearing and must never
 * blur: Papa Jun is a delivered commission for a paying customer, so it is the
 * only entry that carries a real host in its browser chrome.
 *
 * Scope is preserved verbatim from the existing case notes — what was actually
 * delivered, nothing more. No metrics, no uplift claims, no testimonial: we did
 * not measure them, so we do not state them.
 */

/**
 * Four self-authored concept studies. Every one carries a visible
 * "Konceptstudie" tag, an explicit sentence stating it is not a customer or a
 * delivered assignment, and — unlike Papa Jun — no host in its browser chrome.
 * No logo walls, no testimonials, no metrics.
 */
const PROJECTS: ConceptStudyData[] = [
  {
    id: "veyra",
    name: "Veyra Hotels",
    sector: "Boutiquehotell",
    line: "Direktbokning som en designad upplevelse, inte ett formulär.",
    visual: conceptVisuals.veyra,
  },
  {
    id: "verk",
    name: "Verk",
    sector: "Digitalt magasin",
    line: "Innehållet är gränssnittet — typografi, bild och ljud i ett system.",
    visual: conceptVisuals.verk,
  },
  {
    id: "lumera",
    name: "Lumera Skin",
    sector: "Premiumhandel",
    line: "Lugn produktyta där materialet och ljuset gör försäljningen.",
    visual: conceptVisuals.lumera,
  },
  {
    id: "asteron",
    name: "Asteron Systems",
    sector: "Affärssystem",
    line: "Trovärdighet genom produktyta, inte genom loggväggar.",
    visual: conceptVisuals.asteron,
  },
];

const CAPS = [
  { k: "Strategi", d: "Vi börjar med affären: vem ni talar till, vad som ska hända, hur det mäts." },
  { k: "Design", d: "Ett visuellt system som håller — inte en samling skärmar." },
  { k: "Utveckling", d: "Utvecklat för hastighet, tillgänglighet och att faktiskt förvaltas." },
  { k: "Innehåll", d: "Text, bild och rörelse som bär budskapet hela vägen." },
  { k: "AI", d: "Där det gör verklig nytta: research, produktion, personalisering." },
];


/**
 * Restrained browser chrome. The label is React text, so it stays sharp.
 *
 * The address bar shows a real host ONLY for the real engagement. A concept
 * study gets "Konceptstudie" instead: those brands have no site to visit, and
 * putting a domain-shaped string like `veyra.webscore.se` in browser chrome
 * implies a live URL a viewer could open. The frame still does its job — it
 * says "this is a website" — without asserting something untrue.
 */
function Shot({
  label,
  live,
  image,
  alt,
}: {
  label: string;
  /** True only for a real, reachable site. */
  live?: boolean;
  image: string;
  alt: string;
}) {
  return (
    <div className="shot">
      <div className="shot-bar">
        <i /><i /><i />
        <span className={`shot-host${live ? "" : " shot-host-concept"}`}>{label}</span>
      </div>
      <div className="shot-view">
        <img src={image} alt={alt} loading="lazy" decoding="async" />
      </div>
    </div>
  );
}

export default function ImmersiveHome() {
  useDocumentMeta({
    title: "Webscore — kreativ teknikstudio",
    description:
      "Webscore är en kreativ teknikstudio som designar och bygger webbplatser, digitala upplevelser, innehåll och AI-drivna system för varumärken som vill märkas.",
    canonical: "https://webscore.se/",
  });

  const [active, setActive] = useState("");
  // The chrome inverts once the page is bright under it, and from the portal
  // down it always is. Two independent signals set it, because the film reports
  // its own flatten a screen earlier than the bright world scrolls in.
  const [onBright, setOnBright] = useState(false);
  const [filmWhite, setFilmWhite] = useState(false);

  /* Light from the moment the bright world reaches the bar, and light for the
     rest of the page — because the rest of the page is the bright world.

     This was an IntersectionObserver on `.bw` and it was wrong in both
     directions. Past the bright world's own end it reported whatever it had
     last reported rather than re-evaluating, which left a white capsule on the
     dark half at 1440; and at 390 — where `.bw` is proportionally much taller
     than the root — it never reported an intersection at all, so a dark grey
     pill sat on a white page for the entire scroll. What is actually being
     asked is a comparison between two numbers, so it is one now: no thresholds,
     no root margins, no state that can be missed. One rect read per frame, and
     only on frames where the page actually moved. */
  useEffect(() => {
    const bw = document.querySelector<HTMLElement>(".bw");
    if (!bw) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      setOnBright(bw.getBoundingClientRect().top <= 96);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  /* The document canvas — what shows in the rubber-band past either end of the
     page — comes from the app's global near-black theme. The homepage now ends
     on #F1F4F8, so over-scrolling at the bottom flashed black under a white
     footer. Set for the lifetime of this page only and restored on unmount, so
     the dashboard and the admin console keep their own ground. */
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.backgroundColor;
    root.style.backgroundColor = "#f1f4f8";
    return () => { root.style.backgroundColor = prev; };
  }, []);

  useEffect(() => {
    const ids = NAV.map((n) => n.id);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <div className="imm">
      <a className="skip" href="#main">Hoppa till innehåll</a>
      <Nav active={active} light={onBright || filmWhite} />

      <main id="main">
        {/* The approved Norra Tornen sequence, scrubbed by scroll on desktop and
            held as its own first frame on phones and coarse pointers. The copy
            is the approved hero copy and the two tiers are load-bearing: the
            eyebrow gives the category and the lede the scope, so by the time
            "skapar" is read the object is already digital. Weakening either
            neighbour puts the building back in play — the film under this line
            is an aerial of a residential tower. */}
        <SpatialHero onLightChrome={setFilmWhite}>
          <h1>Kliv in i <em>det vi skapar.</em></h1>
          <p className="lede">
            Webbplatser, digitala produkter, innehåll och AI&#8209;system.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#kontakt">
              Starta ett projekt <span className="arrow" aria-hidden="true">→</span>
            </a>
          </div>
        </SpatialHero>

        {/* The computer screen expands into the website. */}
        <BrightWorld />

        {/* Everything from the portal to the footer is one room.
            `post-portal` is not decoration: it redefines the palette tokens the
            section styles already read from, so a single scope turns the whole
            second half bright instead of forty scattered colour overrides. The
            structure, the components and the grid are untouched — only the
            ground, the ink and the accent change. */}
        <div className="post-portal">

          <section id="projekt" className="work" aria-labelledby="work-h">
            <Reveal>
              <div className="rule" />
              <h2 id="work-h" className="section-h">Utvalt arbete</h2>
              {/* The distinction is stated once, plainly, and then carried by the
                  labels on the cards. "Påhittade" was the second word a reader
                  met under the portfolio heading — accurate, but it volunteered
                  the weakness before the work had been seen. */}
              <p className="section-lead">
                Ett kunduppdrag och fyra konceptstudier. Konceptstudierna är egna
                varumärken vi tagit fram för att visa hur vi tänker — de är märkta som
                sådana och är inte utförda uppdrag.
              </p>
            </Reveal>
            {/* The real engagement, given the weight of one — and given it
                once. This surface used to appear twice: as the reveal at the end
                of the bright world and again as the first card here, so the only
                client on the site was also the only thing shown twice. */}
            <FeaturedReveal />

            <div className="work-stack">

              {PROJECTS.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.05}>
                  <ConceptStudy study={p} flip={i % 2 === 1} />
                </Reveal>
              ))}
            </div>
          </section>

          {/* ONE section where there were six. "01 — Studion", "02 —
              Hantverket", "Vad vi gör", "Kreativ teknik", "Så arbetar vi" and
              "Om Webscore" each opened by saying the team does not hand off
              between disciplines — five sections, one sentence, in nearly the
              same words. It is said once here, and the monolith carries the
              section because it is the strongest image on the site and it was
              being spent on a caption. */}
          <section id="tjanster" className="caps" aria-labelledby="caps-h">
            <Reveal>
              <figure className="caps-shot">
                <picture>
                  <source media="(max-width: 860px)" srcSet={s2Mobile} />
                  <img
                    src={s2Desktop}
                    alt="En stor gjuten glasmonolit med frostade kanter står på blankt betonggolv med en tunn vattenhinna, i strykande dagsljus från höger."
                    width={2400}
                    height={1350}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              </figure>
            </Reveal>
            <Reveal>
              <h2 id="caps-h" className="section-h">Vad vi gör</h2>
              <p className="section-lead">
                Strategi, design, utveckling, innehåll och AI i samma team — och vi
                utvecklar det vi formger. Det är därför detaljerna överlever hela
                vägen till lansering.
              </p>
            </Reveal>
            <div className="cap-seq">
              {CAPS.map((c, i) => (
                <Reveal key={c.k} delay={i * 0.05}>
                  <div className="cap-row">
                    <h3>{c.k}</h3>
                    <p>{c.d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>




          <section id="kontakt" className="final" aria-labelledby="final-h">
            <Reveal>
              <p className="eyebrow final-eyebrow">Nästa steg</p>
              {/* "Bygga" is the one verb this studio cannot afford in display
                  type: the film directly above it is an aerial of a residential
                  tower, and the two together read as a construction company. */}
              <h2 id="final-h" className="final-h">Låt oss skapa något människor minns.</h2>
              <p className="final-lead">
                Berätta vad ni vill åstadkomma. Vi återkommer med en konkret bild av vad
                det skulle innebära.
              </p>
              {/* A prefilled subject makes the reply land in the right place and
                  tells the visitor what will happen when they click. */}
              <a
                className="btn btn-primary btn-lg"
                href="mailto:info@webscore.se?subject=Projektf%C3%B6rfr%C3%A5gan"
              >
                Starta ett projekt <span className="arrow" aria-hidden="true">→</span>
              </a>
              {/* One action, nothing beside it. A secondary "or email us" line was
                  tried here and removed: it diluted the close. The address is in
                  the footer for anyone who wants to copy it. */}
              <p className="final-sub">Svar inom en arbetsdag · Sverige</p>
            </Reveal>
          </section>
        </div>
      </main>

      <footer className="foot">
        <p>© {new Date().getFullYear()} Webscore — kreativ teknikstudio</p>
        {/* Deliberately minimal. The analysis product lives on at /analys but is
            not linked from here: it is a different design language, and sending a
            visitor into it mid-narrative breaks the experience this page exists to
            demonstrate. The privacy policy stays reachable because it must be,
            but it is set back rather than presented as a destination. */}
        <div className="foot-links">
          <a href="mailto:info@webscore.se">info@webscore.se</a>
          <a className="foot-legal" href="/integritetspolicy">Integritetspolicy</a>
        </div>
      </footer>
    </div>
  );
}
