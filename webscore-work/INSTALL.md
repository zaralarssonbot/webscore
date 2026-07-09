# INSTALL — kör Webscore Work lokalt

Den här guiden tar dig från ett rent klon till en körande app på din dator.
Appen kan köras i **två lägen**:

| Läge | När | Datalagring | Inloggning |
|---|---|---|---|
| **Demo** (standard) | Snabb utvärdering, design, försäljningsdemo | In-memory (`src/lib/db`), nollställs vid omstart | Välj demo-användare, inget lösenord |
| **Supabase** | Riktig drift med betalande kunder | PostgreSQL + Auth + Storage | Riktig e-post/lösenord (Supabase Auth) |

Läget väljs **enbart** av miljövariabler — finns `NEXT_PUBLIC_SUPABASE_URL` +
`NEXT_PUBLIC_SUPABASE_ANON_KEY` körs Supabase-läget, annars demo.

---

## 1. Förkrav

- **Node.js 20+** och npm
- (För Supabase-läget) ett Supabase-projekt — se [SUPABASE.md](./SUPABASE.md)

Kontrollera:

```bash
node --version   # v20 eller senare
```

## 2. Installera beroenden

```bash
npm install
```

## 3. Miljövariabler

Kopiera mallen och fyll i efter behov:

```bash
cp .env.example .env.local
```

- **Demo-läge:** lämna alla Supabase-rader tomma. Klart.
- **Supabase-läge:** fyll i `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` och `SUPABASE_SERVICE_ROLE_KEY`
  (se [SUPABASE.md](./SUPABASE.md) för var de hämtas och hur migrationerna körs).

## 4. Starta utvecklingsservern

```bash
npm run dev
```

Öppna <http://localhost:3000>.

- I **demo-läge** möts du av en användarväljare på `/login` — välj t.ex.
  administratören och utforska hela flödet (förfrågan → offert → arbetsorder →
  fakturaunderlag).
- I **Supabase-läge** möts du av en e-post/lösenord-inloggning. Skapa första
  användaren enligt [SUPABASE.md](./SUPABASE.md#5-skapa-första-användaren).

## 5. Verifiera (samma kommandon som CI bör köra)

```bash
npx tsc --noEmit     # typkontroll
npx eslint src       # lint
npm run build        # produktionsbygge
```

Alla tre ska gå igenom. (Två ESLint-*varningar* om React Hook Forms `watch()`
är kända och ofarliga.)

## 6. Vanliga problem

| Symptom | Orsak / åtgärd |
|---|---|
| Allt nollställs vid omstart | Du kör i demo-läge (avsiktligt). Sätt Supabase-env för persistens. |
| `SUPABASE_SERVICE_ROLE_KEY is not set` | En operation som kräver service-role (provisionering/signed URL) körde utan nyckeln. Lägg till den i `.env.local`. |
| Inloggning visar användarväljare trots Supabase | `NEXT_PUBLIC_*`-variablerna saknas eller är feltavna. Starta om `npm run dev` efter ändring i `.env.local`. |
| Bilder "försvinner" efter omstart | Demo-läget sparar bilder som base64 i minnet. Riktig lagring kräver Supabase Storage (Supabase-läget). |

Se även:
- [SUPABASE.md](./SUPABASE.md) — provisionera databas, Auth, Storage, migrationer
- [DEPLOY.md](./DEPLOY.md) — driftsätta till produktion
- [ARCHITECTURE.md](./ARCHITECTURE.md) — systemöversikt
