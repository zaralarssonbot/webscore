import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackgroundEffect from "@/components/BackgroundEffect";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

const Integritetspolicy = () => {
  const navigate = useNavigate();

  useDocumentMeta({
    title: "Integritetspolicy | Webscore",
    description:
      "Så behandlar Webscore dina personuppgifter: vilka uppgifter vi samlar in, varför, hur länge vi sparar dem och dina rättigheter enligt GDPR.",
    canonical: "https://webscore.se/integritetspolicy",
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <BackgroundEffect />
      <Navbar onAnalyze={() => navigate("/")} />

      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-32 pb-28">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <span className="data-label text-[0.72rem] text-neon-blue inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> Legal
          </span>
          <h1 className="font-display font-semibold tracking-[-0.03em] leading-[1.1] text-3xl sm:text-4xl mt-4 mb-3">
            Integritetspolicy för webscore.se
          </h1>
          <p className="data-label text-[0.72rem] text-muted-foreground/80">
            Senast uppdaterad: 25 juni 2026
          </p>
        </motion.header>

        {/* Body */}
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="guide-prose"
        >
          <h2>1. Personuppgiftsansvarig</h2>
          <p>
            Webscore Sverige AB, org.nr 559591-4408, driver webscore.se. Postadress: Södertäljevägen 27,
            155 33 Nykvarn. Frågor om dina personuppgifter:{" "}
            <a href="mailto:info@webscore.se">info@webscore.se</a>.
          </p>

          <h2>2. Vilka uppgifter vi samlar in</h2>
          <ul>
            <li>Den webbadress/domän du anger för analys.</li>
            <li>Om du begär en rapport, offert eller bokning: din e-postadress (och ev. namn).</li>
            <li>Teknisk data från analysen av den angivna webbplatsen.</li>
          </ul>

          <h2>3. Varför vi behandlar uppgifterna (ändamål &amp; laglig grund)</h2>
          <ul>
            <li>För att leverera analysen du begärt (fullgörande av din begäran).</li>
            <li>
              För att kontakta dig om våra tjänster, om du lämnat din e-post (samtycke/berättigat
              intresse). Du kan när som helst be oss sluta.
            </li>
          </ul>

          <h2>4. Hur länge vi sparar</h2>
          <p>
            Så länge det behövs för ändamålet, som längst 24 månader, därefter raderas uppgifterna.
            Du kan begära radering tidigare.
          </p>

          <h2>5. Tjänster vi använder (personuppgiftsbiträden)</h2>
          <ul>
            <li>Supabase (databas och serverfunktioner, servrar inom EU/Irland) – lagrar dina uppgifter och kör analysen.</li>
            <li>
              Google – PageSpeed Insights och Gemini analyserar den angivna webbplatsen, Google Fonts
              levererar typsnitt och skärmbilder lagras och levereras via Google Cloud.
            </li>
            <li>Firecrawl – hämtar och analyserar den angivna webbplatsen, inklusive skärmbild.</li>
          </ul>
          <p>Google och Firecrawl kan behandla data utanför EU, med tillämpliga skyddsåtgärder.</p>

          <h2>6. Dina rättigheter (GDPR)</h2>
          <p>
            Du har rätt till tillgång, rättelse, radering, invändning, begränsning och
            dataportabilitet. Kontakta <a href="mailto:info@webscore.se">info@webscore.se</a>. Du kan
            också klaga till Integritetsskyddsmyndigheten (IMY),{" "}
            <a href="https://imy.se" target="_blank" rel="noopener noreferrer">
              imy.se
            </a>
            .
          </p>

          <h2>7. Cookies och spårning</h2>
          <p>
            webscore.se sätter inga cookies för dig som besökare och använder ingen analys- eller
            annonsspårning (t.ex. Google Analytics eller Meta-pixel). Vi visar därför ingen
            cookie-banner – det finns inget samtycke att inhämta. Vårt interna admingränssnitt använder
            nödvändig, funktionell lagring (localStorage) för inloggning, vilket inte berör vanliga
            besökare. Sajten laddar typsnitt via Google Fonts, vilket innebär att din IP-adress delas
            med Google för att leverera typsnitten.
          </p>

          <h2>8. Ändringar</h2>
          <p>
            Vi kan uppdatera policyn. Senaste versionen finns alltid på den här sidan.
          </p>
        </motion.article>
      </main>

      <Footer />
    </div>
  );
};

export default Integritetspolicy;
