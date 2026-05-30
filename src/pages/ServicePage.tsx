import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Check, Clock, ShieldCheck, Monitor, TrendingUp, Sparkles,
  Search, MousePointerClick, Gauge, MapPin, Layout, Type, BadgeCheck, Users,
  Network, Code2, LifeBuoy, Phone,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackgroundEffect from "@/components/BackgroundEffect";
import SectionHeading from "@/components/SectionHeading";
import LeadCaptureModal from "@/components/LeadCaptureModal";
import NotFound from "@/pages/NotFound";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

interface Item {
  icon: LucideIcon;
  title: string;
  desc: string;
}

interface ServiceContent {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  icon: LucideIcon;
  title: React.ReactNode;
  /** Hero sub-line: what the service is + the problem it solves. */
  intro: string;
  /** One line tying the service to the website score ("hur betyget blir bättre"). */
  scoreTie: string;
  includes: Item[];
  why: Item[];
}

/*
 * ─────────────────────────────────────────────────────────────────────────
 * ÄRLIGHET / ÄGAREN BÖR DUBBELKOLLA:
 * Innehållet nedan beskriver tjänsterna SANT men medvetet GENERISKT där exakta
 * leveranser beror på paket/uppdrag. Inga påhittade siffror, omdömen eller
 * case-resultat förekommer. Innan detta marknadsförs som bindande löften:
 *   • Verifiera exakta leveranser per tjänst (antal sidor, vad som ingår/inte).
 *   • Bekräfta om SEO/branding är engångsinsats eller löpande.
 *   • Priser anges inte här — de bor på /pricing (Starter/Pro/Premium). Håll dem
 *     synkade med RemediationFlow-paketen om de ändras.
 *   • INTRANÄT: bekräfta om/vilka behörigheter, SSO och integrationer som ingår.
 *   • WEBBAPPAR: bekräfta vilka integrationer/datakällor som faktiskt stöds.
 *   • DRIFT: bekräfta exakt vad som ingår per nivå (SLA/svarstid, antal
 *     innehållsuppdateringar, backup-frekvens) innan det utlovas som löpande avtal.
 * ─────────────────────────────────────────────────────────────────────────
 */
const SERVICES: Record<string, ServiceContent> = {
  hemsidor: {
    metaTitle: "Hemsidor som säljer – Webscore",
    metaDescription:
      "Vi bygger moderna, snabba hemsidor som får besökare att stanna, förstå och ta kontakt. Se hur en sida byggd för konvertering höjer ditt betyg.",
    eyebrow: "TJÄNST · HEMSIDOR",
    icon: Monitor,
    title: <>Hemsidor som <span className="gradient-text">säljer</span></>,
    intro:
      "En snygg sida räcker inte. Vi bygger hemsidor som leder besökaren hela vägen från första intryck till kontakt – med tydligt budskap, snabb laddning och en struktur som övertygar.",
    scoreTie:
      "Ett lågt betyg beror oftast på att sidan inte är byggd för att övertyga. Det här är hur vi vänder på det.",
    includes: [
      { icon: Layout, title: "Modern, responsiv design", desc: "Anpassad efter din profil och byggd för att se rätt ut på mobil, surfplatta och dator." },
      { icon: MousePointerClick, title: "Struktur som leder till handling", desc: "Tydligt budskap och call-to-action som gör nästa steg självklart för besökaren." },
      { icon: Gauge, title: "Snabb och teknisk grund", desc: "Optimerad laddtid och kod som både mobiler och Google gillar." },
      { icon: Search, title: "SEO-grund från start", desc: "Rätt titlar, rubriker och struktur på plats så du har en bas att synas på." },
      { icon: ShieldCheck, title: "Tydliga kontaktvägar", desc: "Formulär, klickbart telefonnummer och enkla sätt att höra av sig." },
    ],
    why: [
      { icon: Users, title: "Fler besökare blir kunder", desc: "Samma trafik, fler kontakter – en sida byggd för konvertering arbetar dygnet runt." },
      { icon: BadgeCheck, title: "Förtroende direkt", desc: "Ett professionellt första intryck gör att besökaren vågar ta nästa steg." },
      { icon: Gauge, title: "Ingen tappas på vägen", desc: "Snabb, mobilvänlig sida förlorar inte besökare innan de hunnit läsa." },
    ],
  },
  seo: {
    metaTitle: "SEO & synlighet – Webscore",
    metaDescription:
      "Syns du inte när dina kunder söker finns du knappt. Vi förbättrar det som avgör om Google visar dig – och om besökaren klickar.",
    eyebrow: "TJÄNST · SEO",
    icon: TrendingUp,
    title: <>SEO & <span className="gradient-text">synlighet</span></>,
    intro:
      "Syns du inte när dina kunder söker, finns du knappt. Vi arbetar med det som faktiskt avgör om du dyker upp i Google – och om besökaren väljer att klicka på just dig.",
    scoreTie:
      "Betyget på SEO & synlighet visar hur lätt du är att hitta. Det här är arbetet som lyfter det.",
    includes: [
      { icon: Search, title: "Teknisk SEO-genomgång", desc: "Titlar, metabeskrivningar, rubrikstruktur och indexering – grunden som måste sitta." },
      { icon: Type, title: "Innehåll kring rätt sökningar", desc: "Text och rubriker byggda kring vad dina kunder faktiskt söker efter." },
      { icon: MapPin, title: "Lokal synlighet", desc: "Optimerad Google Business-närvaro så du syns i sökningar nära dig." },
      { icon: Gauge, title: "Hastighet & mobil", desc: "Snabbhet och mobilanpassning påverkar både ranking och om besökaren stannar." },
      { icon: Layout, title: "Tydlig intern struktur", desc: "Logisk länkning så sökmotorer – och besökare – hittar runt på sidan." },
    ],
    why: [
      { icon: TrendingUp, title: "Trafik du inte betalar per klick för", desc: "Högre organisk synlighet ger ett jämnt flöde av besökare över tid." },
      { icon: Users, title: "Rätt besökare", desc: "De som söker det du erbjuder är redan köpbenägna – de konverterar bättre." },
      { icon: MapPin, title: "Köpklara lokala kunder", desc: "Att synas i \"nära mig\"-sökningar fångar kunder i beslutsögonblicket." },
    ],
  },
  branding: {
    metaTitle: "Branding & design – Webscore",
    metaDescription:
      "Folk köper av dem de litar på. Vi gör ditt varumärke tydligt, sammanhängande och självklart att välja.",
    eyebrow: "TJÄNST · BRANDING & DESIGN",
    icon: Sparkles,
    title: <>Branding & <span className="gradient-text">design</span></>,
    intro:
      "Folk köper av dem de litar på. Vi gör ditt varumärke tydligt, sammanhängande och självklart att välja – så att rätt känsla finns där redan innan kunden hört av sig.",
    scoreTie:
      "Förtroende-betyget speglar om sidan känns trygg att välja. Branding är hur den känslan byggs.",
    includes: [
      { icon: Sparkles, title: "Tydlig visuell identitet", desc: "Färg, typografi och känsla som hänger ihop och känns genomtänkt." },
      { icon: Type, title: "Budskap och ton", desc: "Ett tydligt \"varför just du\" som går igen i texten över hela sidan." },
      { icon: BadgeCheck, title: "Förtroendesignaler", desc: "Omdömen, trygghetsmärken och tydlig kontaktinfo där de gör mest nytta." },
      { icon: Layout, title: "Konsekvent uttryck", desc: "Samma röda tråd genom hela upplevelsen – inget som känns hopplockat." },
    ],
    why: [
      { icon: BadgeCheck, title: "Du sticker ut", desc: "Ett tydligt varumärke gör skillnad bland konkurrenter som ser likadana ut." },
      { icon: ShieldCheck, title: "Lägre tröskel att höra av sig", desc: "Känns det tryggt och proffsigt vågar fler ta första kontakten." },
      { icon: TrendingUp, title: "Utrymme att ta bättre betalt", desc: "En premiumkänsla låter dig prissätta efter värde, inte bara pris." },
    ],
  },

  // ── VI BYGGER ──────────────────────────────────────────────────────────
  intranat: {
    metaTitle: "Intranät & interna portaler – Webscore",
    metaDescription:
      "Vi bygger intranät och interna portaler som samlar information, rutiner och verktyg på ett ställe – så teamet hittar rätt och jobbar smidigare.",
    eyebrow: "TJÄNST · INTRANÄT",
    icon: Network,
    title: <>Intranät & interna <span className="gradient-text">portaler</span></>,
    intro:
      "Ett intranät samlar information, rutiner och verktyg på ett ställe – så att teamet hittar rätt, jobbar likadant och slipper leta. Vi bygger interna portaler kring hur ni faktiskt arbetar.",
    scoreTie:
      "Samma hantverk som på er publika sajt – fast riktat inåt: tydligt, snabbt och enkelt att använda.",
    includes: [
      { icon: Layout, title: "Samlad ingång", desc: "En tydlig startpunkt för dokument, rutiner, länkar och verktyg." },
      { icon: Search, title: "Sök & struktur", desc: "Logisk struktur och sök så att rätt information går att hitta snabbt." },
      { icon: Users, title: "Roller & vyer", desc: "Innehåll anpassat efter team och roll (exakt behörighetsnivå bestäms ihop med er)." },
      { icon: ShieldCheck, title: "Säker inloggning", desc: "Skyddad åtkomst så att intern information stannar internt." },
      { icon: Gauge, title: "Byggt för vardagen", desc: "Snabbt och enkelt nog att faktiskt användas varje dag." },
    ],
    why: [
      { icon: Clock, title: "Mindre letande", desc: "Allt på ett ställe sparar tid varje dag." },
      { icon: Users, title: "Samma arbetssätt", desc: "Teamet jobbar likadant när rutiner och verktyg finns samlade." },
      { icon: ShieldCheck, title: "Kontroll & trygghet", desc: "Intern information på en plats ni själva styr över." },
    ],
  },
  webbappar: {
    metaTitle: "Webbappar, system & skräddarsydd mjukvara – Webscore",
    metaDescription:
      "Webbappar, system och skräddarsydd mjukvara byggd kring hur ni faktiskt jobbar – för att automatisera, samla data och ta bort manuellt arbete.",
    eyebrow: "TJÄNST · WEBBAPPAR & SYSTEM",
    icon: Code2,
    title: <>Webbappar, system & <span className="gradient-text">skräddarsydd mjukvara</span></>,
    intro:
      "När en standardlösning inte räcker bygger vi den själva. Webbappar och system formade efter era processer – för att automatisera, samla data och ta bort manuellt arbete.",
    scoreTie:
      "Vi börjar i problemet, inte i tekniken – och bygger bara det som faktiskt gör skillnad.",
    includes: [
      { icon: MousePointerClick, title: "Byggt kring era processer", desc: "Funktioner formade efter hur ni faktiskt arbetar – inte tvärtom." },
      { icon: Layout, title: "Tydligt gränssnitt", desc: "Verktyg som är enkla nog att använda utan manual." },
      { icon: Gauge, title: "Automatisering", desc: "Vi tar bort återkommande manuellt arbete där det går." },
      { icon: ShieldCheck, title: "Säkert & robust", desc: "Byggt för att hålla, med skydd av känslig data." },
      { icon: Network, title: "Integrationer", desc: "Kan kopplas till verktyg och datakällor ni redan använder (vilka avgörs av ert behov)." },
    ],
    why: [
      { icon: Clock, title: "Sparad tid", desc: "Automatisering ersätter timmar av manuellt arbete." },
      { icon: TrendingUp, title: "Skalar med er", desc: "Ett system som växer i takt med verksamheten." },
      { icon: BadgeCheck, title: "Ert eget – inte en hyllvara", desc: "En lösning som passar exakt, inte ett verktyg ni tvingas anpassa er efter." },
    ],
  },

  // ── VI HÅLLER DET IGÅNG ────────────────────────────────────────────────
  drift: {
    metaTitle: "Drift, underhåll & support – Webscore",
    metaDescription:
      "Vi håller din sajt och dina system uppdaterade, säkra och igång – med löpande underhåll, övervakning och support så du slipper tänka på det.",
    eyebrow: "TJÄNST · DRIFT & SUPPORT",
    icon: LifeBuoy,
    title: <>Drift, underhåll & <span className="gradient-text">support</span></>,
    intro:
      "En lansering är starten, inte målet. Vi håller din sajt och dina system uppdaterade, säkra och igång – med löpande underhåll, övervakning och en kontakt att höra av sig till.",
    scoreTie:
      "Ett bra betyg är en startpunkt, inte ett mål. Vi ser till att det håller i sig över tid.",
    includes: [
      { icon: ShieldCheck, title: "Uppdateringar & säkerhet", desc: "Löpande uppdateringar och säkerhetsfixar så sårbarheter inte hinner uppstå." },
      { icon: Gauge, title: "Övervakning & drifttid", desc: "Vi håller koll så att problem fångas innan de drabbar dina besökare." },
      { icon: Layout, title: "Innehållsuppdateringar", desc: "Hjälp att hålla texter, bilder och sidor aktuella (omfattning enligt avtal)." },
      { icon: Clock, title: "Säkerhetskopiering", desc: "Regelbundna backuper så inget går förlorat." },
      { icon: Phone, title: "En kontakt att nå", desc: "Support när något krånglar – utan att leta efter rätt person." },
    ],
    why: [
      { icon: ShieldCheck, title: "Tryggt över tid", desc: "Sajten förblir säker och uppdaterad utan att du behöver agera." },
      { icon: Clock, title: "Du slipper tänka på det", desc: "Vi sköter det tekniska så du kan fokusera på verksamheten." },
      { icon: Gauge, title: "Presterar fortsatt", desc: "Underhåll håller hastighet och kvalitet uppe på sikt." },
    ],
  },
};

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

const IconBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="w-11 h-11 rounded-xl flex items-center justify-center border border-white/[0.08] bg-white/[0.03] text-neon-cyan shrink-0">
    {children}
  </div>
);

const ServicePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [bookingOpen, setBookingOpen] = useState(false);

  const content = slug ? SERVICES[slug] : undefined;

  // Always call hooks before any early return.
  useDocumentMeta({
    title: content?.metaTitle ?? "Tjänst – Webscore",
    description: content?.metaDescription,
    canonical: content ? `https://webscore.se/tjanster/${slug}` : undefined,
  });

  if (!content) return <NotFound />;

  const HeroIcon = content.icon;

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundEffect />
      <Navbar onAnalyze={() => navigate("/")} />

      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-28 space-y-28">
        {/* HERO */}
        <section className="text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex mb-6">
              <IconBadge><HeroIcon className="w-5 h-5" /></IconBadge>
            </div>
            <span className="data-label text-[0.6rem] text-neon-cyan/70 mb-4 block">{content.eyebrow}</span>
            <h1 className="font-display font-semibold tracking-[-0.035em] leading-[1.06] text-4xl sm:text-5xl md:text-[3.25rem]">
              {content.title}
            </h1>
            <p className="text-muted-foreground/85 mt-6 leading-[1.7] text-[1.0625rem] max-w-2xl mx-auto">
              {content.intro}
            </p>

            {/* Tie to the score */}
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-4 py-2 text-[0.8125rem] text-muted-foreground/80">
              <Gauge className="w-3.5 h-3.5 text-neon-cyan shrink-0" />
              {content.scoreTie}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
              <Button variant="glow-gradient" size="xl" className="group glow-precision" onClick={() => navigate("/")}>
                Gör en gratis analys
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="glow-outline" size="xl" onClick={() => setBookingOpen(true)}>
                Boka 20 min genomgång
              </Button>
            </div>
          </motion.div>
        </section>

        {/* DET HÄR INGÅR */}
        <section>
          <SectionHeading
            eyebrow="DET HÄR INGÅR"
            title={<>Vad du <span className="gradient-text">får</span></>}
            subtitle="Exakt omfattning anpassas efter ditt företag och valt paket – det här är grunden vi alltid arbetar utifrån."
            className="mb-12"
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {content.includes.map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                className="card-surface p-6 flex items-start gap-4"
              >
                <IconBadge><item.icon className="w-5 h-5" /></IconBadge>
                <div>
                  <h3 className="font-display font-semibold text-[0.9375rem] tracking-[-0.01em] mb-1.5 flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-neon-cyan shrink-0" />
                    {item.title}
                  </h3>
                  <p className="text-[0.875rem] text-muted-foreground/80 leading-[1.65]">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* VARFÖR DET SPELAR ROLL */}
        <section>
          <SectionHeading
            eyebrow="VARFÖR DET SPELAR ROLL"
            title={<>Vad det <span className="gradient-text">ger dig</span></>}
            className="mb-12"
          />
          <div className="grid sm:grid-cols-3 gap-4">
            {content.why.map((item, i) => (
              <motion.div
                key={item.title}
                custom={i}
                variants={reveal}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-50px" }}
                className="card-surface p-6"
              >
                <IconBadge><item.icon className="w-5 h-5" /></IconBadge>
                <h3 className="font-display font-semibold text-[0.9375rem] tracking-[-0.01em] mt-4 mb-1.5">{item.title}</h3>
                <p className="text-[0.8125rem] text-muted-foreground/80 leading-[1.65]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="card-surface p-8 sm:p-10 text-center relative overflow-hidden"
          >
            <div className="accent-line-top accent-line-cyan" />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, hsla(175,95%,50%,0.05) 0%, transparent 60%)" }} />
            <h2 className="text-xl sm:text-2xl font-bold mb-2 relative font-display">Börja med att se var du står</h2>
            <p className="text-muted-foreground mb-7 font-light relative max-w-lg mx-auto text-sm leading-[1.7]">
              Kör en gratis analys av din hemsida på 60 sekunder – så ser du exakt vad som kan förbättras. Vill du gå igenom det tillsammans bokar du en kostnadsfri genomgång.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
              <Button variant="glow-gradient" size="xl" className="group glow-precision" onClick={() => navigate("/")}>
                Gör en gratis analys
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button variant="glow" size="xl" className="glow-precision" onClick={() => setBookingOpen(true)}>
                Boka 20 min genomgång
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 sm:gap-6 mt-6 text-[11px] text-muted-foreground/50 font-light relative">
              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Tar 20 min</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Ingen förpliktelse</span>
              <Link to="/pricing" className="flex items-center gap-1 text-neon-cyan/70 hover:text-neon-cyan transition-colors">
                Se priser <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />

      <LeadCaptureModal
        open={bookingOpen}
        onClose={() => setBookingOpen(false)}
        title="Boka gratis genomgång"
      />
    </div>
  );
};

export default ServicePage;
