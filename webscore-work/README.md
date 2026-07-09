# Webscore Work

Ett modernt, enkelt och professionellt SaaS-system för **offerter, arbetsorder och projekt** —
byggt för svenska serviceföretag inom bygg, måleri, städning, el, VVS, fastighetsservice,
bilverkstäder, installation och renovering.

> Känslan: _"Enklare än Excel och WhatsApp — men kraftfullt nog att driva hela vårt arbetsflöde."_

Arbetsflöde: **kundförfrågan → offert → kundgodkännande → arbetsorder → tid & material → dokumentation → fakturaunderlag.**

## Kom igång

```bash
npm install
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000). Du möts av inloggningen — välj en av
demo-användarna (inget lösenord behövs):

| Användare | Roll | Ser |
|---|---|---|
| **Anna Lind** | Administratör | Hela systemet |
| **Johan Ek** | Arbetsledare | Projekt, planering, godkännanden |
| **Erik / Sara** | Medarbetare | "Mitt arbete" — mobilanpassad vy |

Appen startar med realistisk svensk demodata (Nordic Måleri AB) så allt känns levande direkt.
Återställ när som helst via användarmenyn → **Återställ demo-data**.

## Prova hela flödet

1. **Offerter → Ny offert** — lägg till rader, se momsen och totalen räknas ut automatiskt, spara & skicka.
2. Öppna offerten → **Kopiera kundlänk** eller **Kundvy** → godkänn den som kund på `/q/[token]`.
3. Tillbaka i offerten (nu *Godkänd*) → **Skapa projekt**.
4. I projektet → **Skapa arbetsorder** och tilldela personal.
5. Logga in som **Erik** → **Mitt arbete** → starta timern, bocka av checklista, ladda upp foto, registrera material, markera klart.
6. Som **Johan/Anna** → godkänn tiden, → **Fakturaunderlag** skapas från projektet → exportera **PDF/CSV**.

## Teknik

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 · shadcn-stil-komponenter ·
Recharts · React Hook Form · Zod · Lucide · next-themes (ljust/mörkt läge) · Supabase/PostgreSQL (schema + RLS).

Se **[ARCHITECTURE.md](./ARCHITECTURE.md)** för filstruktur, databasmodell, sid- och
komponentstruktur samt implementationsplan, och **[supabase/README.md](./supabase/README.md)**
för databasen.

## Skript

```bash
npm run dev      # utvecklingsserver
npm run build    # produktionsbygge
npm run start    # kör produktionsbygget
npm run lint     # ESLint
```

## Datalager & produktion

MVP:n kör mot ett server-sidigt demolager (`src/lib/db/`) som speglar Supabase-schemat exakt,
så appen är körbar utan extern setup. För produktion: kör migrationerna i `supabase/migrations/`
(schema + Row Level Security) och byt ut `src/lib/queries.ts` + `src/lib/actions.ts` mot
Supabase-anrop — UI:t är oförändrat. Deploybar på Vercel.
