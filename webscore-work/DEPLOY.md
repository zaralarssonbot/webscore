# DEPLOY — driftsätt Webscore Work

Den här guiden beskriver hur du tar appen till produktion för riktiga
betalande kunder. Förutsätter att Supabase är provisionerat enligt
[SUPABASE.md](./SUPABASE.md).

---

## 1. Checklista före första kunden

- [ ] Supabase-projekt i **EU-region**, migrationer `0001`–`0003` körda
- [ ] `.env`/secrets satta i hostingen (se [avsnitt 3](#3-miljövariabler))
- [ ] Första admin-användaren skapad ([SUPABASE.md §5](./SUPABASE.md#5-skapa-första-användaren))
- [ ] `NEXT_PUBLIC_APP_URL` pekar på den riktiga domänen (publika offertlänkar)
- [ ] `npx tsc --noEmit`, `npx eslint src`, `npm run build` gröna
- [ ] Backup/PITR aktiverat i Supabase
- [ ] Rate limiting på de publika token-RPC:erna (se [avsnitt 6](#6-härdning))

## 2. Hosting-alternativ

Appen är en standard Next.js 16-app (App Router, Node-runtime även för
proxyn) och kan köras på:

| Plattform | Notis |
|---|---|
| **Vercel** | Enklast. Sätt env i Project Settings. Proxy (`src/proxy.ts`) körs automatiskt. |
| **Node-server / Docker** | `npm run build` + `npm run start`. Kräver Node 20+. |

### Docker (självhostat)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "run", "start"]
```

> Sätt miljövariablerna vid `docker run`/orchestrering, inte i imagen.
> `NEXT_PUBLIC_*` läses vid **byggtid** för klienten — bygg om vid ändring.

## 3. Miljövariabler

Från `.env.example`:

| Variabel | Hemlig | Syfte |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | nej | Supabase projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | nej | Anon-nyckel (RLS-skyddad) |
| `SUPABASE_SERVICE_ROLE_KEY` | **JA** | Server-only; provisionering & signed URLs |
| `NEXT_PUBLIC_APP_URL` | nej | Bas-URL för kundlänkar (utan avslutande `/`) |

`SUPABASE_SERVICE_ROLE_KEY` får **aldrig** exponeras mot klienten. Den används
bara i server-moduler (`src/lib/supabase/server.ts → createSupabaseAdminClient`).

## 4. Bygg & starta

```bash
npm ci
npm run build
npm run start     # lyssnar på :3000
```

Sätt en reverse proxy (Nginx/Caddy) med TLS framför vid självhosting.

## 5. Proxy (sessionsförnyelse)

`src/proxy.ts` (Next 16:s ersättare för `middleware.ts`) håller Supabase-
sessionen färsk vid varje navigering. I demo-läge är den en no-op. Den kör i
Node-runtime och kräver ingen särskild konfiguration.

> Säkerhet: proxyn är **inte** enda auth-spärren. Varje sida och server action
> kontrollerar själv `requireSession`/`requireCapability`/`can.*`.

## 6. Härdning

- **RLS:** verifierad i `0002`/`0003`. Testa med två organisationer att de
  inte ser varandras data (se [avsnitt 7](#7-verifiera-i-produktionsliknande-miljö)).
- **Publika token-RPC:er:** lägg på rate limiting och överväg token-utgång.
- **Storage:** `receipts` är privat (signed URLs). `attachments`/`documents`
  är publika via URL — lägg inte känsliga dokument där.
- **CSP/headers:** överväg säkerhetsheaders i `next.config.ts` eller proxyn.
- **Loggar:** `activity_logs` ger spårbarhet per organisation.

## 7. Verifiera i produktionsliknande miljö

1. Skapa **två** organisationer + en admin i var.
2. Logga in som org A, skapa kund/offert. Logga in som org B → org A:s data ska
   **inte** synas (multi-tenant-test).
3. Skicka en offert, öppna den publika länken i inkognito, godkänn → status och
   notis ska uppdateras i org A.
4. Ladda upp en bild på en arbetsorder → ska hamna i `attachments`-bucketen
   under rätt `organization_id`-mapp.

## 8. Rollback

- **App:** distribuera föregående bygge/commit.
- **Databas:** migrationerna är additiva; använd Supabase PITR för att
  återställa data vid behov. Testa restore-rutinen innan skarp drift.
