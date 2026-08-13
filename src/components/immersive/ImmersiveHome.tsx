import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { conceptVisuals } from "@/components/portfolio/concept-visuals";
import papajun from "@/assets/portfolio/papajun.webp";
import papajun1 from "@/assets/portfolio/papajun-1.webp";
import papajun2 from "@/assets/portfolio/papajun-2.webp";
import papajun3 from "@/assets/portfolio/papajun-3.webp";
import "./immersive.css";

/**
 * THE LATTICE — Webscore's homepage.
 *
 * Ported from the approved immersive prototype. Positioning: Webscore is a
 * creative technology studio; the site itself is the proof of capability. The
 * website-analysis product still exists and still works, but it lives at
 * /analys now rather than owning the homepage.
 *
 * Structural contract, unchanged from the prototype:
 *   · Every word of content is semantic HTML. The WebGL layer is decorative and
 *     `aria-hidden`; if it never mounts the page still reads and converts.
 *   · three.js is lazy-imported and only on fine-pointer, non-mobile devices.
 *   · Coarse pointer / small screen / WebGL failure all fall back to a composed
 *     CSS atmosphere, not a stripped one.
 */

const LatticeScene = lazy(() => import("./LatticeScene"));

function useEnv() {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches,
  );
  const [coarse] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const on = () => setMobile(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return { mobile, coarse };
}

const NAV = [
  { id: "projekt", label: "Projekt" },
  { id: "tjanster", label: "Tjänster" },
  { id: "process", label: "Process" },
  { id: "om", label: "Om Webscore" },
  { id: "kontakt", label: "Kontakt" },
];

function Nav({ active }: { active: string }) {
  const [open, setOpen] = useState(false);

  // Close on Escape so the menu is never a keyboard trap.
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [open]);

  return (
    <header className="nav-wrap">
      <nav className="nav" aria-label="Huvudmeny">
        <a className="brand" href="#top">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">webscore</span>
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

/**
 * Mobile, coarse-pointer and WebGL-failure atmosphere. Deliberately not a flat
 * gradient: it mirrors the 3D lighting model — one warm core inside a cool
 * volume — so small screens get a composed version rather than a stripped one.
 *
 * Three stacked layers, animated only via transform/opacity on the compositor.
 * No canvas, no WebGL, and the three.js chunk is never requested.
 */
function StaticField({ reduced, progress }: { reduced: boolean; progress: MotionValue<number> }) {
  const coreY = useTransform(progress, [0, 1], ["-6%", "14%"]);
  const coreScale = useTransform(progress, [0, 0.5, 1], [1.06, 0.82, 1.12]);
  const coreFade = useTransform(progress, [0, 0.35, 0.62, 1], [0.95, 0.4, 0.5, 1]);
  const coolY = useTransform(progress, [0, 1], ["4%", "-10%"]);

  if (reduced) {
    return (
      <div className="static-field" aria-hidden="true">
        <div className="sf-cool" />
        <div className="sf-core" />
        <div className="sf-grain" />
      </div>
    );
  }
  return (
    <div className="static-field" aria-hidden="true">
      <motion.div className="sf-cool" style={{ y: coolY }} />
      <motion.div className="sf-core" style={{ y: coreY, scale: coreScale, opacity: coreFade }} />
      <div className="sf-grain" />
    </div>
  );
}

/* ── content ──────────────────────────────────────────────────────────────── */

/** A self-authored concept study. The one real engagement is PAPAJUN, above. */
interface Project {
  id: string;
  name: string;
  sector: string;
  line: string;
  /** Shown as text in the browser chrome — never baked into the image. */
  domain: string;
  image: string;
  alt: string;
}

/**
 * One real customer project and four concept studies.
 *
 * The distinction is load-bearing and must never blur: Papa Jun is a delivered
 * commission for a paying customer. The other four are fictional brands we
 * authored ourselves to show a design direction — every one carries a visible
 * "Konceptstudie" tag AND an explicit sentence stating it is not a customer or
 * a delivered assignment. No logo walls, no testimonials, no metrics.
 */
/**
 * The one real engagement, presented at more weight than the studies.
 *
 * Scope is preserved verbatim from the existing case notes — what was actually
 * delivered, nothing more. No metrics, no uplift claims, no testimonial: we did
 * not measure them, so we do not state them.
 */
const PAPAJUN = {
  name: "Papa Jun",
  sector: "Restaurang · Kvicksund, Mälaren",
  domain: "papajun.se",
  image: papajun,
  alt: "Startsidan för Papa Jun: varm restaurangsajt med meny och bokning.",
  line: "En mysig restaurang vid Mälaren som behövde en sajt som förmedlade deras atmosfär. Vi byggde en visuellt varm närvaro med integrerad meny och bokning.",
  delivered: [
    "Visuell storytelling",
    "Integrerad meny och bokning",
    "Lokal SEO för Kvicksund-området",
  ],
  gallery: [
    { src: papajun1, alt: "Papa Jun: meny presenterad som en redaktionell sida." },
    { src: papajun2, alt: "Papa Jun: sektion för catering och event." },
    { src: papajun3, alt: "Papa Jun: bokningsvy med öppettider och kontaktuppgifter." },
  ],
};

const PROJECTS: Project[] = [
  {
    id: "veyra",
    name: "Veyra Hotels",
    sector: "Boutiquehotell",
    line: "Direktbokning som en designad upplevelse, inte ett formulär.",
    domain: conceptVisuals.veyra.domain,
    image: conceptVisuals.veyra.desktop,
    alt: conceptVisuals.veyra.desktopAlt,
  },
  {
    id: "nordform",
    name: "Nordform Studio",
    sector: "Arkitektur & inredning",
    line: "Ett arkiv där arbetet bär sidan — inte dekoren.",
    domain: conceptVisuals.nordform.domain,
    image: conceptVisuals.nordform.desktop,
    alt: conceptVisuals.nordform.desktopAlt,
  },
  {
    id: "lumera",
    name: "Lumera Skin",
    sector: "Premiumhandel",
    line: "Lugn produktyta där materialet och ljuset gör försäljningen.",
    domain: conceptVisuals.lumera.domain,
    image: conceptVisuals.lumera.desktop,
    alt: conceptVisuals.lumera.desktopAlt,
  },
  {
    id: "asteron",
    name: "Asteron Systems",
    sector: "Affärssystem",
    line: "Trovärdighet genom produktyta, inte genom loggväggar.",
    domain: conceptVisuals.asteron.domain,
    image: conceptVisuals.asteron.desktop,
    alt: conceptVisuals.asteron.desktopAlt,
  },
];

const CAPS = [
  { k: "Strategi", d: "Vi börjar med affären: vem ni talar till, vad som ska hända, hur det mäts." },
  { k: "Design", d: "Ett visuellt system som håller — inte en samling skärmar." },
  { k: "Utveckling", d: "Byggt för hastighet, tillgänglighet och att faktiskt förvaltas." },
  { k: "Innehåll", d: "Text, bild och rörelse som bär budskapet hela vägen." },
  { k: "AI", d: "Där det gör verklig nytta: research, produktion, personalisering." },
];

/** The creative-technology disciplines. Kept concise: the page is the argument. */
const DISCIPLINES = [
  { k: "Design", d: "System, typografi och komposition — inte mallar." },
  { k: "Kod", d: "Vi bygger det vi ritar. Ingen överlämning som tappar detaljerna." },
  { k: "Rörelse", d: "Animation med syfte: riktning, tyngd och kontinuitet." },
  { k: "3D", d: "Realtidsgrafik i webbläsaren — som fältet bakom den här sidan." },
  { k: "AI", d: "Research, produktion och system som anpassar sig." },
];

const STEPS = [
  { n: "01", t: "Riktning", d: "Vi kartlägger mål, publik och kant. Ni får en tydlig hypotes." },
  { n: "02", t: "Form", d: "Designspråk och struktur tas fram och testas mot innehåll." },
  { n: "03", t: "Bygge", d: "Vi bygger snabbt, tillgängligt och mätbart från start." },
  { n: "04", t: "Lansering", d: "Testad övergång — och en plan för vad som händer sen." },
];

/** Restrained browser chrome. The host is React text, so it stays sharp. */
function Shot({ domain, image, alt }: { domain: string; image: string; alt: string }) {
  return (
    <div className="shot">
      <div className="shot-bar">
        <i /><i /><i />
        <span className="shot-host">{domain}</span>
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

  const { mobile, coarse } = useEnv();
  const reduced = !!useReducedMotion();
  const [webglFailed, setWebglFailed] = useState(false);
  const useWebGL = !mobile && !coarse && !webglFailed;

  const progressRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const chargeRef = useRef(0);
  const [active, setActive] = useState("");
  const [charged, setCharged] = useState(false);

  const { scrollYProgress } = useScroll();
  useEffect(() => scrollYProgress.on("change", (v) => { progressRef.current = v; }), [scrollYProgress]);

  const heroFade = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const heroLift = useTransform(scrollYProgress, [0, 0.1], [0, -60]);

  useEffect(() => {
    if (reduced || coarse) return;
    const on = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, [reduced, coarse]);

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

  // The one interactive moment: a controlled pulse through the field.
  const fire = () => {
    setCharged(true);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1400, 1);
      chargeRef.current = Math.sin(t * Math.PI);
      if (t < 1) requestAnimationFrame(tick);
      else { chargeRef.current = 0; setCharged(false); }
    };
    requestAnimationFrame(tick);
  };

  return (
    <div className="imm">
      <a className="skip" href="#main">Hoppa till innehåll</a>
      <Nav active={active} />

      {useWebGL && (
        <Suspense fallback={null}>
          <LatticeScene
            key={mobile ? "m" : "d"}
            progressRef={progressRef}
            pointerRef={pointerRef}
            chargeRef={chargeRef}
            reduced={reduced}
            mobile={mobile}
            onFailure={() => setWebglFailed(true)}
          />
        </Suspense>
      )}
      {!useWebGL && <StaticField reduced={reduced} progress={scrollYProgress} />}

      <main id="main">
        <section className="hero" id="top">
          <motion.div
            className="hero-inner"
            style={reduced ? undefined : { opacity: heroFade, y: heroLift }}
          >
            <p className="eyebrow">Kreativ teknikstudio · Sverige</p>
            <h1>Digitala upplevelser<br />som <em>inte går att ignorera.</em></h1>
            <p className="lede">
              Vi designar och bygger webbplatser, digitala upplevelser, innehåll och
              AI-drivna system för varumärken som vill märkas.
            </p>
            <div className="cta-row">
              <a className="btn btn-primary" href="#kontakt">
                Starta ett projekt <span className="arrow" aria-hidden="true">→</span>
              </a>
              <a className="btn btn-ghost" href="#projekt">Se våra projekt</a>
            </div>
          </motion.div>
          <div className="scroll-cue" aria-hidden="true"><span /><p>Scrolla</p></div>
        </section>

        <section className="transform-band" aria-labelledby="tf-h">
          <Reveal>
            <h2 id="tf-h" className="band-h">Ett system som tar form.</h2>
            <p className="band-p">
              Samma fem förmågor formar varje projekt. De arbetar tillsammans — inte som
              separata tjänster.
            </p>
          </Reveal>
          <ol className="cap-orbit">
            {CAPS.map((c, i) => (
              <Reveal as="li" key={c.k} delay={i * 0.07}>
                <span className="cap-i">{String(i + 1).padStart(2, "0")}</span>
                <h3>{c.k}</h3>
                <p>{c.d}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        <section id="projekt" className="work" aria-labelledby="work-h">
          <Reveal>
            <div className="rule" />
            <h2 id="work-h" className="section-h">Utvalt arbete</h2>
            <p className="section-lead">
              Ett verkligt kunduppdrag och fyra konceptstudier. Konceptstudierna är
              påhittade varumärken vi tagit fram för att visa hur vi tänker — inte
              utförda uppdrag.
            </p>
          </Reveal>
          <div className="work-stack">
            {/* The real engagement, given the weight of one. */}
            <Reveal>
              <article className="work-item work-featured">
                <div className="work-visual">
                  <Shot domain={PAPAJUN.domain} image={PAPAJUN.image} alt={PAPAJUN.alt} />
                </div>
                <div className="work-meta">
                  <p className="tag client">✓ Kundprojekt</p>
                  <h3>{PAPAJUN.name}</h3>
                  <p className="sector">{PAPAJUN.sector}</p>
                  <p className="line">{PAPAJUN.line}</p>
                  <ul className="delivered">
                    {PAPAJUN.delivered.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
                <div className="work-gallery">
                  {PAPAJUN.gallery.map((g) => (
                    <figure key={g.src}>
                      <img src={g.src} alt={g.alt} loading="lazy" decoding="async" />
                    </figure>
                  ))}
                </div>
              </article>
            </Reveal>

            {PROJECTS.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.05}>
                <article className="work-item">
                  <div className="work-visual">
                    <Shot domain={p.domain} image={p.image} alt={p.alt} />
                  </div>
                  <div className="work-meta">
                    <p className="tag concept">◇ Konceptstudie</p>
                    <h3>{p.name}</h3>
                    <p className="sector">{p.sector}</p>
                    <p className="line">{p.line}</p>
                    <p className="disclaim">
                      Påhittat varumärke framtaget för att visa en designriktning — inte
                      ett företag, en kund eller ett utfört uppdrag.
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="tjanster" className="caps" aria-labelledby="caps-h">
          <Reveal>
            <div className="rule" />
            <h2 id="caps-h" className="section-h">Vad vi gör</h2>
            <p className="section-lead">
              Fem förmågor i samma team. Vi lämnar inte över mellan discipliner — det är
              därför resultatet håller ihop.
            </p>
          </Reveal>
          <div className="cap-seq">
            {CAPS.map((c, i) => (
              <Reveal key={c.k} delay={i * 0.06}>
                <div className="cap-row">
                  <span className="cap-n">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{c.k}</h3>
                  <p>{c.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="teknik" className="tech" aria-labelledby="tech-h">
          <Reveal>
            <div className="rule" />
            <h2 id="tech-h" className="section-h">Kreativ teknik</h2>
            <p className="section-lead">
              Design, kod, rörelse, 3D och AI i samma team. Den här sidan är byggd med
              exakt de förmågorna — fältet bakom är realtidsgrafik, inte en video.
            </p>
          </Reveal>
          <ol className="disciplines">
            {DISCIPLINES.map((d, i) => (
              <Reveal as="li" key={d.k} delay={i * 0.06}>
                <span className="disc-i">{String(i + 1).padStart(2, "0")}</span>
                <h3>{d.k}</h3>
                <p>{d.d}</p>
              </Reveal>
            ))}
          </ol>
          <Reveal>
            <button type="button" className="btn btn-primary charge" onClick={fire} disabled={charged}>
              {charged ? "Reagerar…" : "Aktivera systemet"}
            </button>
            <p className="hint">
              {useWebGL
                ? "Knappen skickar en puls genom 3D-systemet i bakgrunden."
                : "På mindre skärmar visas en lättare, statisk version av systemet."}
            </p>
          </Reveal>
        </section>

        <section id="process" className="process" aria-labelledby="proc-h">
          <Reveal>
            <div className="rule" />
            <h2 id="proc-h" className="section-h">Så arbetar vi</h2>
            <p className="section-lead">
              Fyra steg, samma varje gång. Ni vet hela tiden var projektet står och vad
              nästa beslut är.
            </p>
          </Reveal>
          <ol className="steps">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 0.06}>
                <span className="step-n">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        <section id="om" className="about" aria-labelledby="om-h">
          <Reveal>
            <div className="rule" />
            <h2 id="om-h" className="section-h">Om Webscore</h2>
            <p className="section-lead">
              Webscore är en kreativ teknikstudio i Sverige. Strategi, design, utveckling,
              innehåll och AI ligger i samma team — och vi bygger det vi ritar.
            </p>
          </Reveal>
          <div className="about-body">
            <Reveal delay={0.05}>
              <p>
                De flesta digitala projekt tappar något mellan disciplinerna. Strategin
                lämnas över till design, designen till utveckling, och innehållet kommer
                sist. Vi arbetar tvärtom: samma team håller i hela kedjan, från första
                hypotesen till det som ligger live.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <p>
                Det är därför detaljerna överlever. Rörelsen som fanns i designen finns
                kvar i koden. Texten är skriven för ytan den sitter på. Tekniken väljs för
                att den löser problemet — inte för att den står på en lista.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p>
                Den här sidan är byggd på precis det sättet. Fältet bakom dig är
                realtidsgrafik som körs i din webbläsare — inte en video, inte en bild.
                Det är det ärligaste sättet vi vet att visa vad vi kan bygga.
              </p>
            </Reveal>
          </div>
        </section>

        <section id="kontakt" className="final" aria-labelledby="final-h">
          <Reveal>
            <p className="eyebrow final-eyebrow">Nästa steg</p>
            <h2 id="final-h" className="final-h">Låt oss bygga något människor minns.</h2>
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
                tried here and removed: it landed on the densest part of the
                converged field and diluted the close. The address is in the
                footer for anyone who wants to copy it. */}
            <p className="final-sub">Svar inom en arbetsdag · Sverige</p>
          </Reveal>
        </section>
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
