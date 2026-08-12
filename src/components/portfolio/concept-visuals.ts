import veyraDesktop from "@/assets/portfolio/concepts/veyra-desktop.webp";
import veyraMobile from "@/assets/portfolio/concepts/veyra-mobile.webp";
import veyraRum from "@/assets/portfolio/concepts/veyra-rum-och-sviter.webp";
import veyraUpplevelser from "@/assets/portfolio/concepts/veyra-upplevelser.webp";
import veyraRestaurang from "@/assets/portfolio/concepts/veyra-restaurang.webp";
import veyraBokning from "@/assets/portfolio/concepts/veyra-direktbokning.webp";

import nordformDesktop from "@/assets/portfolio/concepts/nordform-desktop.webp";
import nordformOversikt from "@/assets/portfolio/concepts/nordform-projektoversikt.webp";
import nordformDetalj from "@/assets/portfolio/concepts/nordform-projektdetalj.webp";
import nordformStudio from "@/assets/portfolio/concepts/nordform-studio.webp";
import nordformKontakt from "@/assets/portfolio/concepts/nordform-kontakt.webp";

import lumeraDesktop from "@/assets/portfolio/concepts/lumera-desktop.webp";
import lumeraMobile from "@/assets/portfolio/concepts/lumera-mobile.webp";
import lumeraKollektion from "@/assets/portfolio/concepts/lumera-kollektion.webp";
import lumeraProdukt from "@/assets/portfolio/concepts/lumera-produktdetalj.webp";
import lumeraOm from "@/assets/portfolio/concepts/lumera-om-lumera.webp";
import lumeraJournal from "@/assets/portfolio/concepts/lumera-journal.webp";

import asteronDesktop from "@/assets/portfolio/concepts/asteron-desktop.webp";
import asteronPlattform from "@/assets/portfolio/concepts/asteron-plattform.webp";
import asteronLosningar from "@/assets/portfolio/concepts/asteron-losningar.webp";
import asteronIntegrationer from "@/assets/portfolio/concepts/asteron-integrationer.webp";
import asteronDemo from "@/assets/portfolio/concepts/asteron-boka-demo.webp";

/**
 * Concept-study visuals — one complete page set per fictional brand.
 *
 * Every image here is ORIGINAL, generated with Higgsfield (GPT Image 2) for a
 * FICTIONAL working brand. Each supporting page was generated using its own
 * homepage as an image reference, so a set shares one wordmark, palette,
 * typography, spacing and art direction. None of it depicts a customer, a
 * commission or delivered work; none of it is stock or third-party imagery.
 *
 * The prompts excluded statistics, percentages, testimonials, reviews, ratings,
 * customer logos, awards, revenue/performance claims, pricing and client names,
 * so no frame can be read as a business claim.
 *
 * DOMAINS ARE NEVER BAKED INTO THE IMAGES. They are rendered below as real React
 * text in BrowserFrame — sharp at any zoom, correctly spelled, responsive, and
 * deliberately NOT links (a span, never an anchor): these hosts are illustrative.
 */

export interface ConceptPage {
  /** Optimised WebP. */
  src: string;
  /** Visible page name, rendered as React text — never read from the image. */
  label: string;
  /** Accessible description for the dialog gallery. */
  alt: string;
}

export interface ConceptVisual {
  /** Shown in the browser chrome as React text. Not clickable. */
  domain: string;
  /** Main visual: the homepage. */
  desktop: string;
  desktopAlt: string;
  /** Optional mobile view, shown on the card where it adds something. */
  mobile?: string;
  /** Browser-chrome tint, matched to the concept's own palette. */
  tint?: string;
  /** The four supporting pages. */
  pages: ConceptPage[];
}

export const conceptVisuals = {
  veyra: {
    domain: "veyra.webscore.se",
    desktop: veyraDesktop,
    desktopAlt: "Startsidan i konceptstudien Veyra Hotels: varm redaktionell hero med havsutsikt och en bokningsrad.",
    mobile: veyraMobile,
    tint: "rgba(60,38,26,0.85)",
    pages: [
      { src: veyraRum, label: "Rum och sviter", alt: "Konceptsida: rum och sviter presenterade som ett lugnt rutnät med varma interiörbilder." },
      { src: veyraUpplevelser, label: "Upplevelser", alt: "Konceptsida: upplevelser vid kusten presenterade som redaktionella kort." },
      { src: veyraRestaurang, label: "Restaurang", alt: "Konceptsida: restaurang med terrassbild i skymning och en meny i två spalter." },
      { src: veyraBokning, label: "Direktbokning", alt: "Konceptsida: direktbokning med kalender, rumssammanfattning och en tydlig bekräfta-knapp." },
    ],
  },
  nordform: {
    domain: "nordform.webscore.se",
    desktop: nordformDesktop,
    desktopAlt: "Startsidan i konceptstudien Nordform Studio: stramt skandinaviskt rutnät med arkitekturbilder.",
    tint: "rgba(232,232,230,0.9)",
    pages: [
      { src: nordformOversikt, label: "Projektöversikt", alt: "Konceptsida: projektöversikt som ett strikt rutnät av arkitekturprojekt." },
      { src: nordformDetalj, label: "Projektdetalj", alt: "Konceptsida: enskilt projekt med en stor interiörbild och en smal textspalt." },
      { src: nordformStudio, label: "Studio", alt: "Konceptsida: studiosida med en lugn bild av arbetsbord med ritningar och modeller." },
      { src: nordformKontakt, label: "Kontakt", alt: "Konceptsida: kontaktsida med ett avskalat formulär och ett blekt kartblock." },
    ],
  },
  lumera: {
    domain: "lumera.webscore.se",
    desktop: lumeraDesktop,
    desktopAlt: "Startsidan i konceptstudien Lumera Skin: mjuk premiumhandel med en omärkt serumflaska.",
    mobile: lumeraMobile,
    tint: "rgba(240,225,224,0.9)",
    pages: [
      { src: lumeraKollektion, label: "Kollektion", alt: "Konceptsida: kollektion med flera omärkta flaskor och burkar i ett lugnt rutnät." },
      { src: lumeraProdukt, label: "Produktdetalj", alt: "Konceptsida: produktdetalj med stor produktbild och en kort köpkolumn." },
      { src: lumeraOm, label: "Om Lumera", alt: "Konceptsida: varumärkesberättelse med mjuk närbild på botaniska ingredienser." },
      { src: lumeraJournal, label: "Journal", alt: "Konceptsida: journal med tre redaktionella artikelkort." },
    ],
  },
  asteron: {
    domain: "asteron.webscore.se",
    desktop: asteronDesktop,
    desktopAlt: "Startsidan i konceptstudien Asteron Systems: mörkt enterprise-gränssnitt med abstrakt dashboard.",
    tint: "rgba(23,22,46,0.92)",
    pages: [
      { src: asteronPlattform, label: "Plattform", alt: "Konceptsida: plattformssida med funktionsavsnitt och abstrakta gränssnittspaneler." },
      { src: asteronLosningar, label: "Lösningar", alt: "Konceptsida: lösningar presenterade som kort med enkla linjeikoner." },
      { src: asteronIntegrationer, label: "Integrationer", alt: "Konceptsida: integrationer som ett rutnät av abstrakta, påhittade symboler." },
      { src: asteronDemo, label: "Boka demo", alt: "Konceptsida: boka demo med ett tomt formulär och en tydlig knapp." },
    ],
  },
} satisfies Record<string, ConceptVisual>;

export type ConceptKey = keyof typeof conceptVisuals;
