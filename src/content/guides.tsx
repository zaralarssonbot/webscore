import type { ReactNode } from "react";

/*
 * ─────────────────────────────────────────────────────────────────────────
 * GUIDER — filbaserat innehåll (ingen databas). Lägg till en artikel genom att
 * lägga till ett objekt i `guides`; lägg sedan dess `/guider/<slug>` i både
 * public/sitemap.xml och ROUTES i scripts/prerender.mjs (annars indexeras den
 * inte). Varje artikel har egen meta/canonical/OG via GuideArticle.
 *
 * ÄRLIGHET / ÄGAREN BÖR DUBBELKOLLA:
 *   • Prisintervallen i "Vad kostar en hemsida 2026?" är GENERELLA och
 *     indikativa för svensk marknad — justera mot dina faktiska priser. Exakta
 *     priser bor på /pricing; artikeln länkar dit i stället för att låsa siffror.
 *     Sök "OWNER-VERIFY" nedan.
 *   • Inga påhittade kundcase, omdömen eller resultatsiffror förekommer.
 * ─────────────────────────────────────────────────────────────────────────
 */

export interface Guide {
  slug: string;
  /** Card + H1 title */
  title: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  /** Short card/summary line */
  excerpt: string;
  /** Rough reading estimate, in minutes */
  readingMin: number;
  updated: string;
  /** Tied service page for the closing CTA */
  related: { label: string; href: string };
  body: ReactNode;
}

export const guides: Guide[] = [
  {
    slug: "vad-kostar-en-hemsida",
    title: "Vad kostar en hemsida 2026?",
    metaTitle: "Vad kostar en hemsida 2026? – Webscore",
    metaDescription:
      "En ärlig genomgång av vad en hemsida faktiskt kostar 2026 – vad du betalar för, vad som driver priset och hur du undviker att betala för fel sak.",
    eyebrow: "GUIDE · HEMSIDOR",
    excerpt:
      "Det korta svaret är 'det beror på' – men det är inget bra svar. Här är vad som faktiskt avgör priset, och rimliga intervall att räkna med.",
    readingMin: 5,
    updated: "Maj 2026",
    related: { label: "Läs om våra hemsidor", href: "/tjanster/hemsidor" },
    body: (
      <>
        <p>
          "Vad kostar en hemsida?" är en av de vanligaste frågorna vi får – och svaret "det beror på"
          hjälper ingen. Så låt oss vara konkreta. Priset styrs av <strong>hur mycket som ska byggas,
          hur unikt det ska vara, och vem som bygger det</strong>. Den här guiden går igenom vad du
          faktiskt betalar för, vilka intervall som är rimliga 2026, och hur du undviker att lägga
          pengar på fel saker.
        </p>

        <h2>Vad du faktiskt betalar för</h2>
        <p>
          En hemsida är inte en produkt du köper på hyllan, utan ett antal tjänster som paketeras ihop.
          Det här ingår nästan alltid – oavsett pris:
        </p>
        <ul>
          <li><strong>Design</strong> – hur sidan ser ut och känns, anpassad efter ditt företag.</li>
          <li><strong>Struktur &amp; innehåll</strong> – hur informationen ordnas och vad som faktiskt står där.</li>
          <li><strong>Teknik</strong> – att sidan laddar snabbt, fungerar på mobil och är säker.</li>
          <li><strong>Grund-SEO</strong> – att Google kan förstå och visa sidan.</li>
        </ul>
        <p>
          Skillnaden i pris handlar sällan om "fler sidor" – den handlar om hur mycket av ovanstående
          som är genomtänkt och skräddarsytt, kontra mallat och standardiserat.
        </p>

        <h2>Rimliga prisintervall 2026</h2>
        <p>
          Det här är <strong>generella, indikativa intervall</strong> för den svenska marknaden – inte
          en offert. Var ditt projekt landar beror helt på omfattning:
        </p>
        <ul>
          {/* OWNER-VERIFY: justera dessa intervall mot dina faktiska priser. */}
          <li>
            <strong>Mall- eller verktygsbaserad sida</strong> (gör-det-själv eller enkel byrålösning):
            från några tusen kronor och uppåt, ofta med en löpande månadskostnad. Snabbt och billigt –
            men sällan byggt för att sticka ut eller konvertera.
          </li>
          <li>
            <strong>Skräddarsydd sida för småföretag</strong>: den vanligaste nivån för företag som vill
            ha något eget och säljande. Här ligger de flesta seriösa projekt – som en engångskostnad
            eller utspritt som ett abonnemang.
          </li>
          <li>
            <strong>Större eller funktionsrik sida</strong> (e-handel, bokning, integrationer, system):
            mer omfattande, och priset följer komplexiteten.
          </li>
        </ul>
        <p>
          Många byråer – vi inkluderade – erbjuder idag en <strong>abonnemangsmodell</strong> där
          kostnaden sprids ut över tid i stället för en stor engångssumma. Det sänker tröskeln att
          komma igång och innebär ofta att drift och support ingår. Våra konkreta priser hittar du på{" "}
          <a href="/pricing">prissidan</a>.
        </p>

        <h2>Engångskostnad eller löpande?</h2>
        <p>
          En sida är inte "klar" vid lansering. Den behöver uppdateras, säkras och hållas snabb. Räkna
          därför med <strong>två slags kostnader</strong>: själva bygget, och löpande drift/underhåll.
          En sida som aldrig underhålls tappar i hastighet, säkerhet och ranking över tid – så den
          "billiga" lösningen kan bli dyr om du måste bygga om den efter två år.
        </p>

        <h2>Vad som driver priset uppåt</h2>
        <ul>
          <li><strong>Skräddarsydd design</strong> i stället för en köpt mall.</li>
          <li><strong>Mängden innehåll</strong> som ska skrivas, struktureras och formges.</li>
          <li><strong>Funktioner</strong> som bokning, betalning, inloggning eller integrationer.</li>
          <li><strong>Strategi</strong> – när sidan byggs för att konvertera, inte bara se fin ut.</li>
        </ul>

        <h2>Fast pris eller abonnemang?</h2>
        <p>
          Båda modellerna kan vara rätt – det beror på din situation. En <strong>engångskostnad</strong>{" "}
          passar dig som har budgeten och vill äga allt direkt. Ett <strong>abonnemang</strong> passar
          dig som hellre sprider ut kostnaden och vill att drift, uppdateringar och support ingår
          löpande. Det viktiga är att du vet vad som händer <em>efter</em> lansering: ingår ändringar,
          vem fixar om något går sönder, och äger du sidan om ni skulle gå skilda vägar? Ett lågt pris
          som låser in dig eller lämnar dig utan support är sällan billigt i längden.
        </p>

        <h2>Tre frågor att ställa innan du skriver på</h2>
        <ul>
          <li><strong>Vad är sidan tänkt att få besökaren att göra?</strong> Pratar byrån bara om design och inte om mål, är det en varningsflagga.</li>
          <li><strong>Vad ingår efter lansering?</strong> Uppdateringar, support och säkerhet – och vad kostar det löpande?</li>
          <li><strong>Äger jag sidan och innehållet?</strong> Du ska kunna ta med dig det du har betalat för.</li>
        </ul>

        <h2>Så undviker du att betala för fel sak</h2>
        <p>
          Det dyraste misstaget är att betala för en snygg sida som ingen hittar eller som inte får
          besökare att höra av sig. En hemsida är en investering som ska <strong>betala tillbaka sig i
          fler kunder</strong> – inte en kostnad du bockar av. Fråga alltid: vad är den här sidan tänkt
          att få besökaren att göra, och hur mäter vi om den lyckas?
        </p>
        <p>
          Innan du begär offerter är det värt att veta var din nuvarande sida står. Då vet du vad du
          faktiskt behöver betala för att förbättra – och slipper betala för sådant som redan fungerar.
        </p>
      </>
    ),
  },

  {
    slug: "behover-foretaget-ett-intranat",
    title: "Behöver ditt företag ett intranät? Så vet du.",
    metaTitle: "Behöver ditt företag ett intranät? Så vet du. – Webscore",
    metaDescription:
      "Ett intranät löser interna problem – men alla behöver inte ett. Här är de konkreta tecknen på att det är dags, och när det inte är värt det.",
    eyebrow: "GUIDE · INTRANÄT",
    excerpt:
      "Letar teamet ständigt efter rätt dokument eller person? Här är de konkreta tecknen på att ett intranät skulle löna sig – och när det inte gör det.",
    readingMin: 4,
    updated: "Maj 2026",
    related: { label: "Läs om intranät & portaler", href: "/tjanster/intranat" },
    body: (
      <>
        <p>
          Ett intranät låter ofta som något bara stora bolag har. Men i grunden är det enkelt: en
          <strong> intern plats där information, rutiner och verktyg samlas</strong> så att teamet
          hittar rätt och jobbar likadant. Frågan är inte om det låter fint – utan om ni faktiskt har
          problemet det löser. Här är hur du avgör det.
        </p>

        <h2>Fem tecken på att ni behöver ett intranät</h2>
        <ul>
          <li>
            <strong>Samma frågor återkommer.</strong> "Var ligger mallen?", "Vem ansvarar för det här?",
            "Hur gör vi egentligen?" – om svaren bor i folks huvuden i stället för på en plats, tappar
            ni tid varje vecka.
          </li>
          <li>
            <strong>Information ligger utspridd.</strong> Dokument i mejl, rutiner i chatten, filer på
            olika datorer. Ingen vet vilken version som gäller.
          </li>
          <li>
            <strong>Nyanställda tar lång tid att komma in.</strong> Utan en samlad ingång blir
            upplärning beroende av att rätt kollega har tid.
          </li>
          <li>
            <strong>Ni jobbar inte likadant.</strong> Olika personer gör samma sak på olika sätt, för
            att det inte finns ett tydligt "så här gör vi".
          </li>
          <li>
            <strong>Känslig information skickas slarvigt.</strong> Interna dokument i öppna kanaler är
            både ineffektivt och en risk.
          </li>
        </ul>
        <p>
          Känner du igen tre eller fler? Då kostar avsaknaden av ett intranät er redan tid och pengar –
          ni märker det bara inte som en rad i bokföringen.
        </p>

        <h2>När ni <em>inte</em> behöver ett intranät</h2>
        <p>
          Vi tjänar inget på att sälja dig något du inte behöver, så låt oss vara ärliga: är ni ett
          litet team som sitter i samma rum och redan har ordning i era delade mappar – då är ett
          intranät förmodligen overkill. Lös först problemet med enkla verktyg ni redan har. Ett
          intranät blir värt det när <strong>antalet personer, mängden information eller behovet av
          struktur</strong> har vuxit förbi vad lösa mappar klarar.
        </p>

        <h2>Vad ett bra intranät faktiskt löser</h2>
        <p>
          Det handlar inte om teknik för teknikens skull. Ett bra intranät ger:
        </p>
        <ul>
          <li><strong>En sanning.</strong> En plats där rätt version av allt finns.</li>
          <li><strong>Mindre letande.</strong> Sök och struktur gör att rätt sak hittas snabbt.</li>
          <li><strong>Tryggare hantering.</strong> Intern information bakom inloggning, inte i öppna kanaler.</li>
          <li><strong>Snabbare upplärning.</strong> Nya kan hitta svaren själva.</li>
        </ul>

        <h2>Räcker inte Teams eller Google Drive?</h2>
        <p>
          Ofta är svaret: en bra start, men inte hela lösningen. Delade mappar och chattverktyg är
          utmärkta för att <strong>lagra och prata</strong> – men sämre på att <strong>strukturera och
          guida</strong>. Ingen mapp förklarar hur ni gör något, i vilken ordning, eller var man börjar
          som ny. Ett intranät lägger ett lager av struktur ovanpå filerna: en ingång, en logik, en plats
          för "så här gör vi". Många bygger till och med sitt intranät så att det knyter ihop verktygen ni
          redan har – i stället för att ersätta dem.
        </p>

        <h2>Vad det kostar att inte ha ett</h2>
        <p>
          Kostnaden för att sakna struktur är osynlig men verklig: minuter som blir timmar i letande, fel
          som upprepas för att rutinen bara fanns i någons huvud, och nyanställda som tar längre tid att
          bli självgående. Det syns inte på en faktura – men det syns i tempot, och i hur sårbara ni är
          när en nyckelperson är borta.
        </p>

        <h2>Måste det vara dyrt och komplext?</h2>
        <p>
          Nej. Den vanligaste fällan är att bygga ett gigantiskt system som ingen orkar använda. Ett bra
          intranät börjar i <strong>vad ni faktiskt letar efter mest</strong> och löser det enkelt och
          snabbt – sedan kan det växa. Det viktigaste är inte mängden funktioner, utan att det är
          tillräckligt enkelt för att användas varje dag.
        </p>

        <h2>Hur du kommer igång</h2>
        <p>
          Börja med att lista de fem saker teamet oftast letar efter eller frågar om. Det är ert
          intranäts första innehåll. Därifrån är det lättare att se hur stort behovet egentligen är –
          och om det är värt att bygga något ordentligt.
        </p>
      </>
    ),
  },

  {
    slug: "darfor-syns-du-inte-pa-google",
    title: "Därför syns du inte på Google – och så fixar du det.",
    metaTitle: "Därför syns du inte på Google – och så fixar du det – Webscore",
    metaDescription:
      "De vanligaste anledningarna till att ditt företag inte syns på Google – förklarade i klartext – och konkreta steg för att börja ranka högre.",
    eyebrow: "GUIDE · SEO",
    excerpt:
      "Att inte synas på Google beror nästan alltid på några få, fixbara saker. Här är de vanligaste – och hur du börjar rätta till dem.",
    readingMin: 6,
    updated: "Maj 2026",
    related: { label: "Läs om SEO & synlighet", href: "/tjanster/seo" },
    body: (
      <>
        <p>
          Du har en hemsida, men när du eller dina kunder söker på det du erbjuder dyker du inte upp.
          Frustrerande – och vanligare än du tror. Den goda nyheten: det beror nästan alltid på{" "}
          <strong>några få saker som går att åtgärda</strong>. Här är de vanligaste, förklarade utan
          jargong.
        </p>

        <h2>1. Google förstår inte vad sidan handlar om</h2>
        <p>
          Google läser din sida via dess <strong>titlar, rubriker och texter</strong>. Saknas en tydlig
          sidtitel, en beskrivande rubrik (H1) och text som faktiskt nämner det du säljer – då har Google
          inget att gå på. Många snygga sidor är nästan tomma på text som en sökmotor kan förstå.
        </p>
        <p>
          <strong>Fix:</strong> ge varje sida en unik, beskrivande titel och en tydlig rubrik. Skriv som
          dina kunder söker – "takläggare i Uppsala", inte "Välkommen till oss".
        </p>

        <h2>2. Innehållet är för tunt</h2>
        <p>
          En sida med två meningar ger Google lite att ranka. Det betyder inte att du ska fylla sidan med
          tomt prat – men sidor som <strong>på riktigt svarar på vad kunden undrar</strong> rankar bättre,
          för att de är mer användbara.
        </p>
        <p>
          <strong>Fix:</strong> besvara de faktiska frågor dina kunder har. Den här guiden är ett exempel
          – den finns för att folk googlar exakt den frågan.
        </p>

        <h2>3. Sidan är långsam eller fungerar dåligt på mobil</h2>
        <p>
          Google rankar ner sidor som laddar långsamt eller är svåra att använda på mobil – för att
          besökare lämnar dem. Och de flesta sökningar görs idag på telefon.
        </p>
        <p>
          <strong>Fix:</strong> komprimera bilder, ta bort onödiga skript och se till att sidan är
          byggd mobilanpassad från grunden.
        </p>

        <h2>4. Ingen lokal närvaro</h2>
        <p>
          För lokala företag är <strong>Google Business-profilen</strong> ofta viktigare än själva
          hemsidan för att synas i "nära mig"-sökningar och på kartan. Saknas den, eller är den
          ofullständig, missar du köpklara kunder i ditt område.
        </p>
        <p>
          <strong>Fix:</strong> skapa och fyll i din Google Business-profil – adress, öppettider,
          kategori, bilder och be nöjda kunder om omdömen.
        </p>

        <h2>5. Tekniska hinder</h2>
        <p>
          Ibland är problemet osynligt: sidan kan vara <strong>blockerad från att indexeras</strong>,
          sakna en sitemap, eller ha trasiga länkar. Då spelar det ingen roll hur bra innehållet är –
          Google hittar det inte.
        </p>
        <p>
          <strong>Fix:</strong> kontrollera att sidan får indexeras, lämna in en sitemap till Google
          Search Console och åtgärda trasiga länkar.
        </p>

        <h2>Vad du inte ska lägga pengar på</h2>
        <p>
          SEO drar tyvärr till sig tomma löften. Var skeptisk mot den som <strong>garanterar
          förstaplatsen</strong> – ingen kan lova det, eftersom det är Google som bestämmer. Var också
          försiktig med att köpa "1000 länkar" eller fylla sidan med sökord tills den blir oläslig. Sånt
          fungerade för tio år sedan och kan idag straffa dig i stället. Det som håller över tid är
          tråkigt men sant: en snabb, tydlig sida med innehåll som faktiskt hjälper den som söker.
        </p>

        <h2>Var börjar jag?</h2>
        <p>
          Ta punkterna ovan i tur och ordning, och börja med grunderna som är gratis att fixa – titlar,
          rubriker och en ifylld Google Business-profil – innan du lägger pengar på något större. Ofta
          ger de enklaste åtgärderna mest effekt, just för att så många hoppar över dem. Du behöver inte
          göra allt på en gång; du behöver börja med rätt sak.
        </p>

        <h2>En realistisk förväntan</h2>
        <p>
          SEO är inte en knapp du trycker på. Det tar oftast <strong>veckor till månader</strong> innan
          förändringar syns i rankingen, för att Google behöver hitta om och bedöma din sida på nytt. Var
          skeptisk mot alla som lovar förstaplatsen "över en natt". Det som fungerar är grundarbete,
          uthålligt – inte genvägar.
        </p>
        <p>
          Det bästa första steget är att ta reda på <strong>vilka av punkterna ovan som gäller dig</strong>.
          Då vet du var du ska börja, i stället för att gissa.
        </p>
      </>
    ),
  },
];

export const getGuide = (slug?: string): Guide | undefined =>
  guides.find((g) => g.slug === slug);
