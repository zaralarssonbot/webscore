# SUPABASE — provisionera databas, Auth & Storage

Den här guiden tar Webscore Work från demo-läge till **riktig persistent drift**
på Supabase: schema, Row Level Security, lagringsbuckets, signup-provisionering
och publika offert-/tilläggslänkar.

> Status: hela databaslagret (schema + RLS + RPC + storage) är klart i
> `supabase/migrations/`. På applikationssidan är **kund-vertikalen** porterad
> till det riktiga datalagret som mall; övriga vertikaler portas enligt samma
> mönster (se [avsnitt 7](#7-status-vad-som-läser-från-supabase-idag)).

---

## 1. Skapa projektet

1. Skapa ett projekt på <https://supabase.com> (välj region **EU**, t.ex.
   Frankfurt, för att hålla persondata inom EU enligt GDPR).
2. Notera från **Project Settings → API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (hemlig — endast servern)

Lägg dem i `.env.local` (se `.env.example`).

## 2. Kör migrationerna

Migrationerna ligger i `supabase/migrations/` och körs i ordning:

| Fil | Innehåll |
|---|---|
| `0001_init.sql` | Enums, 25 tabeller, FK:er, index |
| `0002_rls.sql` | Row Level Security + `auth_org_ids()` (tenant-isolering) |
| `0003_storage_auth_rpc.sql` | Rollhjälpare + rollbaserade skrivpolicies, signup-trigger, publika token-RPC:er, Storage-buckets + storage-RLS |

### Alternativ A — Supabase CLI (rekommenderas)

```bash
supabase link --project-ref <ditt-ref>
supabase db push
```

### Alternativ B — psql

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_storage_auth_rpc.sql
```

Migration `0003` är **återkörbar** (drop-if-exists / create-or-replace).

## 3. Multi-tenant & RLS — så fungerar isoleringen

Varje affärstabell har `organization_id`. RLS släpper bara igenom rader vars
org ingår i den inloggades medlemskap:

```sql
auth_org_ids()        -- mängden organization_id för auth.uid()
auth_role(org)        -- 'admin' | 'supervisor' | 'worker' i en org
auth_is_manager(org)  -- admin eller supervisor
auth_is_admin(org)    -- admin
```

- **Läsning:** alla medlemmar ser sin orgs rader.
- **Skrivning (rollstyrd, försvar på djupet):**
  - Försäljning/ekonomi (`quotes`, `quote_items`, `invoice_drafts`,
    `organization_settings`) → **endast admin**.
  - Kunder, förfrågningar, projekt, arbetsorder, planering, materialkatalog,
    tilläggsarbeten → **admin eller arbetsledare**.
  - Tid, materialposter, bilagor → **alla medlemmar** (medarbetare registrerar
    egen tid/material/foto).
- Server actions kontrollerar dessutom `can.*` (`src/lib/auth.ts`) — RLS är
  andra försvarslinjen, inte den enda.

> En tenant kan aldrig läsa eller skriva en annan tenants rader: `USING`
> (synliga rader) och `WITH CHECK` (tillåtna skrivningar) använder samma
> org-predikat.

## 4. Publika länkar (offert & tilläggsarbete — utan inloggning)

Kunder godkänner offerter/tilläggsarbeten via en länk utan konto. RLS nekar
anonym läsning, så detta går genom `SECURITY DEFINER`-RPC:er som returnerar
**endast** den rad som matchar token och bara ofarliga kolumner:

| RPC | Syfte |
|---|---|
| `get_quote_public(token)` | Läs offert + rader + kund + företagsbranding |
| `mark_quote_opened_public(token)` | Markera offert öppnad |
| `decide_quote_public(token, beslut, …)` | Registrera godkänn/avböj/ändring |
| `get_change_order_public(token)` | Läs tilläggsarbete |
| `decide_change_order_public(token, beslut, …)` | Registrera beslut |

De är `grant execute … to anon, authenticated`. Token är slumpgenererad och
oförutsägbar. **Innan skarp drift:** lägg på rate limiting (Supabase Edge /
proxy) och överväg utgångsdatum på token.

## 5. Skapa första användaren

Signup-triggern `handle_new_user()` provisionerar automatiskt vid nytt
auth-konto, styrt av `raw_user_meta_data`:

- **Nytt företag (självbetjäning):** sätt `organization_name`, `org_number`,
  `full_name` → en ny organisation skapas och användaren blir **admin** med
  medlemskap + inställningsrad.
- **Inbjuden kollega:** sätt `organization_id` + `role` → användaren kopplas
  till befintlig org med angiven roll.

Skapa admin för ett nytt företag, t.ex. via service-role (server) eller
Supabase-dashboardens **Authentication → Add user** med user metadata:

```jsonc
// raw_user_meta_data
{ "organization_name": "Akme Service AB", "org_number": "556677-8899", "full_name": "Anna Andersson" }
```

Logga sedan in på `/login` med e-post + lösenord.

## 6. Storage (bilder, kvitton, PDF)

Migration `0003` skapar tre buckets:

| Bucket | Publik | Innehåll |
|---|---|---|
| `attachments` | Ja | Arbetsfoton (före/under/efter/avvikelse) |
| `documents` | Ja | Genererade offert-/faktura-PDF:er |
| `receipts` | **Nej** | Materialkvitton — nås endast via signed URLs |

**Objektnyckel:** `"<organization_id>/<scope>/<fil>"`. Storage-RLS läser första
mappsegmentet och kräver att det är en org du tillhör — alltså samma
tenant-isolering som databasen. Privata kvitton signeras på servern
(`resolveFileUrl` i `src/lib/supabase/storage.ts`).

Koden väljer automatiskt: i Supabase-läge laddas filer upp till Storage; i
demo-läge sparas de som base64 (samma uppladdnings-UI, ingen infrastruktur).

## 7. Status: vad som läser från Supabase idag

| Område | Läser/skriver Supabase | Kommentar |
|---|---|---|
| Auth (session, login, logout, signup) | ✅ | `src/lib/auth.ts`, `src/lib/supabase/*` |
| Kunder (lista, kort, skapa/uppdatera) | ✅ | Mall: `src/lib/data/customers.ts` |
| Filuppladdning (Storage) | ✅ | `src/lib/supabase/storage.ts` |
| Övriga vertikaler (offerter, arbetsorder, tid, material, faktura, m.fl.) | ⏳ | Läser fortfarande in-memory-store; portas enligt kund-mallen |

Att portera en vertikal = följ `src/lib/data/customers.ts`:
1. Lägg radmappare i `src/lib/supabase/mappers.ts`.
2. Skapa `src/lib/data/<entitet>.ts` med dubbel-läges `list/get/upsert`.
3. Byt sidornas import från `@/lib/queries` till `@/lib/data/<entitet>` och
   `await`:a anropen (alla sidor är Server Components).
4. Gör motsvarande server action i `src/lib/actions.ts` dubbel-lägd.

## 8. Backup & dataskydd (GDPR)

- Välj EU-region. Aktivera **Point-in-Time Recovery** (Supabase Pro).
- Personuppgiftsbiträdesavtal (DPA) med Supabase finns på deras Trust Center.
- Radera-på-begäran: `delete from customers where id = …` kaskaderar via FK
  `on delete cascade` till adresser, offerter-rader m.m.
