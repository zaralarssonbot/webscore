import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ConceptVisual } from "@/components/portfolio/concept-visuals";

/* ────────────────────────────────────────────────────────────────────────────
   CONCEPT STUDY — a card that behaves like the thing it is showing.

   The four studies were being presented as a single flat screenshot each,
   cropped to 16:9.6 with `object-position: top`, which cut Nordform's image grid
   and Lumera's hero mid-element. Meanwhile every study already carried four
   fully-realised supporting pages that nothing on this page could reach: the
   depth was generated, paid for, and invisible.

   Two changes, both earning their weight:

   1. The preview SCROLLS. It is a website in a browser frame, so it behaves like
      one — hover or focus the card and the page travels to its own foot. That
      shows the whole composition instead of a crop, and it is one transform on
      one element, composited, no layout, no repaint.

   2. The supporting pages are reachable. A row of four thumbnails under the
      meta, and a real dialog to read them at size.

   Nothing here claims a customer. Every study keeps its visible Konceptstudie
   tag and its sentence stating it is not a commission.
   ──────────────────────────────────────────────────────────────────────────── */

export interface ConceptStudyData {
  id: string;
  name: string;
  sector: string;
  line: string;
  visual: ConceptVisual;
}

/** Browser chrome. The label is React text, never baked into the image. */
function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="shot">
      <div className="shot-bar">
        <i /><i /><i />
        <span className="shot-host shot-host-concept">{label}</span>
      </div>
      <div className="shot-view">{children}</div>
    </div>
  );
}

/* ─────────────────────────────── the dialog ─────────────────────────────── */

function PageDialog({
  study, index, onClose, onIndex,
}: {
  study: ConceptStudyData;
  index: number;
  onClose: () => void;
  onIndex: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Every page in one list so the arrows walk the whole study, homepage first.
  const pages = [
    { src: study.visual.desktop, label: "Startsida", alt: study.visual.desktopAlt },
    ...study.visual.pages,
  ];
  const page = pages[index];

  useEffect(() => {
    // Focus lands inside the dialog, and goes back where it came from on close —
    // handled by the caller, which still owns the trigger.
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); onIndex((index + 1) % pages.length); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); onIndex((index - 1 + pages.length) % pages.length); return; }
      if (e.key !== "Tab") return;
      // Trap: the dialog is the only thing reachable while it is open.
      const focusable = ref.current?.querySelectorAll<HTMLElement>("button, [href], [tabindex]:not([tabindex='-1'])");
      if (!focusable || !focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll while the dialog owns the screen.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, pages.length, onClose, onIndex]);

  return (
    <div
      className="cs-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={`${study.name} — konceptstudie, ${page.label}`}
      ref={ref}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cs-dialog-inner">
        <header className="cs-dialog-head">
          <div>
            <p className="cs-dialog-tag">◇ Konceptstudie</p>
            <h3>{study.name}</h3>
          </div>
          <button ref={closeRef} type="button" className="cs-close" onClick={onClose} aria-label="Stäng">
            <span aria-hidden="true">✕</span>
          </button>
        </header>

        <figure className="cs-dialog-figure">
          <img src={page.src} alt={page.alt} />
          <figcaption>{page.label}</figcaption>
        </figure>

        <nav className="cs-dialog-nav" aria-label="Sidor i konceptstudien">
          {pages.map((p, i) => (
            <button
              key={p.src}
              type="button"
              className={`cs-dialog-dot${i === index ? " is-current" : ""}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => onIndex(i)}
            >
              {p.label}
            </button>
          ))}
        </nav>

        <p className="cs-dialog-note">
          Påhittat varumärke framtaget för att visa en designriktning — inte ett företag,
          en kund eller ett utfört uppdrag.
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────── the card ──────────────────────────────── */

export default function ConceptStudy({
  study, flip,
}: {
  study: ConceptStudyData;
  /** Mirrors the grid so five cards in a row do not read as one repeated card. */
  flip?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const openAt = useCallback((i: number, from: HTMLElement) => {
    returnTo.current = from;
    setOpen(i);
  }, []);
  const close = useCallback(() => {
    setOpen(null);
    // Focus goes back to whatever opened the dialog.
    returnTo.current?.focus();
  }, []);

  return (
    <>
      <article className={`work-item cs-item${flip ? " cs-flip" : ""}`}>
        {/* The study, at the size a study deserves. The browser chrome, the tag
            pill and the four-thumbnail strip are gone: at 276px those thumbnails
            resolved to something too small to read a page from, and the chrome
            repeated identical furniture around every project so the set read as
            a template rather than as work. The picture carries it now, and the
            viewer it used to need a strip to reach opens from the picture. */}
        <div className="work-visual">
          <button
            type="button"
            className="cs-open"
            onClick={(e) => openAt(0, e.currentTarget)}
            aria-label={`${study.name}: öppna studien`}
          >
            <img
              className="cs-scroll"
              src={study.visual.desktop}
              alt={study.visual.desktopAlt}
              loading="lazy"
              decoding="async"
            />
          </button>
        </div>

        <div className="work-meta">
          <h3>{study.name}</h3>
          <p className="sector">{study.sector}</p>
          <p className="line">{study.line}</p>
          {/* The identification stays, and stays plain. It is the honest part of
              the section and it should read as a sentence, not as a badge. */}
          <p className="disclaim">
            Konceptstudie — påhittat varumärke framtaget för att visa en
            designriktning, inte ett företag, en kund eller ett utfört uppdrag.
          </p>
        </div>
      </article>

      {/* Portalled out of the card, but only as far as the `.imm` root.
          The card carries `backdrop-filter` and the reveal wrapper animates a
          transform, and either one creates a stacking context that a
          `position: fixed` child cannot escape — the dialog was trapped in the
          card's layer and the fixed navbar floated over it whatever z-index it
          was given. It stops at `.imm` rather than `document.body` because both
          the dialog's styles and the palette tokens are scoped there; sent to
          the body it would render unstyled and colourless. `.imm` is safe as a
          host: `position: relative` at `z-index: auto` with `overflow: clip`
          creates no stacking context of its own. */}
      {open !== null && createPortal(
        <PageDialog study={study} index={open} onClose={close} onIndex={setOpen} />,
        document.querySelector(".imm") ?? document.body,
      )}
    </>
  );
}
