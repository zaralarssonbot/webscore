# Webscore Work — arkitektur

Offert-, arbetsorder- och projektsystem för svenska serviceföretag.
Arbetsflöde: **förfrågan → offert → kundgodkännande → arbetsorder → tid & material → dokumentation → fakturaunderlag**.

Stack: **Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn-stil-komponenter · Recharts · React Hook Form · Zod · Supabase/PostgreSQL (schema + RLS)**.

---

## 1. Informationsarkitektur (sidstruktur)

| Område | Route | Roller | Vyer |
|---|---|---|---|
| Inloggning | `/login` | alla | Välj demo-användare |
| Översikt | `/dashboard` | alla | Nyckeltal, dagens arbetsorder, aktivitet, diagram |
| Mitt arbete (mobil) | `/my-work`, `/my-work/[id]` | medarbetare, arbetsledare | Stora knappar, timer, checklista, foto |
| Förfrågningar | `/inquiries` | admin, arbetsledare | Tabell + Kanban |
| Kunder | `/customers`, `/customers/[id]` | admin, arbetsledare | Register, kundkort med flikar |
| Offerter | `/quotes`, `/quotes/new`, `/quotes/[id]`, `/quotes/[id]/edit` | admin, arbetsledare | Pipeline, editor, detalj, PDF |
| Publik offert | `/q/[token]` | **kund (ingen inloggning)** | Läs, godkänn, avböj, begär ändring |
| Projekt | `/projects`, `/projects/[id]` | alla | Översikt, arbetsorder, tilläggsarbeten, faktura |
| Arbetsorder | `/work-orders`, `/work-orders/new`, `/work-orders/[id]`, `.../edit` | alla | Tabell + Kanban, detalj med flikar |
| Kalender | `/calendar` | alla | Månadsvy, filter per personal/status |
| Tidrapporter | `/time` | alla | Poster, godkännande, summeringar |
| Material | `/materials` | alla | Lista + marginaler |
| Fakturaunderlag | `/invoices`, `/invoices/[id]` | admin, arbetsledare | Lista, detalj, PDF, CSV |
| Publikt tilläggsarbete | `/co/[token]` | **kund** | Godkänn/avböj |
| Rapporter | `/reports` | admin, arbetsledare | Diagram & nyckeltal |
| Team | `/team` | admin | Användare & behörigheter |
| Inställningar | `/settings` | admin | Företag, offerter, utseende, notiser |
| PDF/print | `/quotes/[id]/print`, `/invoices/[id]/print` | inloggad | Ren utskriftslayout |

Navigationen (`components/app/nav-config.ts`) filtreras per roll. Desktop = minimerbar vänstermeny, mobil = bottenmeny + drawer.

---

## 2. Databasmodell

Hela domänmodellen finns typad i `src/lib/types.ts` och speglas 1:1 av PostgreSQL-schemat i `supabase/migrations/0001_init.sql` (25 tabeller, enums, FK:er, index) med Row Level Security i `0002_rls.sql`.

```
organizations ─┬─ organization_members ── users
               ├─ organization_settings
               ├─ customers ── customer_addresses
               ├─ inquiries
               ├─ quotes ──┬─ quote_items
               │           └─ quote_approvals
               ├─ projects ←──────── (från godkänd quote)
               ├─ work_orders ──┬─ work_order_assignments
               │                ├─ checklists ── checklist_items
               │                ├─ time_entries
               │                ├─ material_entries
               │                └─ attachments
               ├─ materials (katalog)
               ├─ change_orders ── change_order_approvals
               ├─ invoice_drafts ── invoice_draft_items
               ├─ notifications
               └─ activity_logs
```

**Multi-tenant:** varje affärstabell har `organization_id`. RLS-policyer släpper bara igenom rader där `organization_id` finns i den inloggades medlemskap (`auth_org_ids()`). Publika offert-/tilläggslänkar nås via token genom en `SECURITY DEFINER`-RPC (stub finns), inte via vanlig RLS.

### Datalager (MVP)
Appen kör mot ett **server-sidigt, muterbart demolager** (`src/lib/db/`) som speglar exakt samma form som Supabase-schemat. Det gör att appen är **körbar direkt med levande demodata** utan att först provisionera Supabase. Läsning sker via `src/lib/queries.ts` (scopas alltid på `organization_id`) och mutationer via server actions i `src/lib/actions.ts`. Att byta till Supabase = byt ut dessa två moduler; UI:t är oförändrat.

---

## 3. Filstruktur

```
src/
├── app/
│   ├── layout.tsx                # rot: tema, fonts, toaster, tooltip
│   ├── page.tsx                  # redirect → /dashboard | /login
│   ├── login/                    # inloggning (välj demo-användare)
│   ├── (app)/                    # inloggat skal (sidomeny + header)
│   │   ├── layout.tsx            # auth-guard + AppShell
│   │   ├── dashboard, my-work, inquiries, customers, quotes,
│   │   ├── projects, work-orders, calendar, time, materials,
│   │   └── invoices, reports, team, settings
│   ├── (print)/                  # ren utskriftslayout (PDF)
│   ├── q/[token]/                # publik offertsida (kund)
│   └── co/[token]/               # publikt tilläggsarbete (kund)
├── components/
│   ├── ui/                       # shadcn-stil-primitiver (20 st)
│   ├── app/                      # AppShell, nav, header, sök, notiser, tema
│   ├── shared/                   # PageHeader, StatCard, StatusBadge, EmptyState …
│   ├── charts/                   # Recharts-wrappers
│   ├── customers / quotes / work / invoices   # modulkomponenter
│   └── theme-provider.tsx
└── lib/
    ├── types.ts                  # domänmodell
    ├── status.ts                 # svenska etiketter + statusfärger
    ├── calc.ts                   # offert-/material-beräkningar
    ├── validation.ts             # Zod-scheman
    ├── auth.ts                   # session + rollbehörigheter (can.*)
    ├── queries.ts                # läsning (scopad på org)
    ├── actions.ts                # server actions (mutationer)
    └── db/                       # seed + muterbar store
supabase/
├── migrations/0001_init.sql      # schema
├── migrations/0002_rls.sql       # Row Level Security
└── README.md
```

---

## 4. Komponentstruktur

**Primitiver** (`components/ui/`): button, card, badge, input, label, textarea, select, dialog, dropdown-menu, table, tabs, separator, avatar, checkbox, switch, popover, tooltip, scroll-area, sonner.

**Återanvändbara byggblock** som efterfrågades:
`AppShell` (sidomeny/header/mobilnav) · `PageHeader` · `StatCard` · `StatusBadge` · `DataTable` (via `ui/table`) · `EmptyState` · `SearchInput` · `GlobalSearch` · `CustomerForm` · `QuoteEditor` · `QuotePreview` · `QuoteStatusTimeline` · `WorkOrdersClient` (kort/kanban) · `TimeTracker` · `MaterialForm` · `ImageUploader` · `ActivityFeed` · `InvoicePreview` · `ConfirmationDialog` · `NotificationDropdown`.

**Statusfärger** (`lib/status.ts`): grå = utkast/ej startad · blå = planerad/skickad · lila = väntar på åtgärd · orange = pausad/försenad · grön = godkänd/slutförd · röd = avböjd/problem.

---

## 5. Roller & behörigheter

`lib/auth.ts → can.*` är den enda källan för behörighetslogik (speglas av RLS):

- **Administratör** — allt: företag, användare, kunder, offerter, planering, fakturaunderlag, rapporter, inställningar.
- **Arbetsledare** — projekt, arbetsorder, tilldelning, tid-/arbetsgodkännande, material, rapporter.
- **Medarbetare** — egna arbetsorder, starta/pausa/avsluta, tid, material, foto, avvikelser, markera klart.
- **Kund** — ingen inloggning; säker tokenlänk för att läsa/godkänna offert och tilläggsarbete.

---

## 6. Implementationsplan (status)

| # | Steg | Status |
|---|---|---|
| 1 | Designsystem + tema (ljus/mörk) + UI-primitiver | ✅ |
| 2 | Domänmodell, datalager, server actions, demodata | ✅ |
| 3 | Autentisering + app-skal (sidomeny, header, mobilnav) | ✅ |
| 4 | Dashboard + kundregister | ✅ |
| 5 | Offerter (editor, beräkningar, PDF, pipeline, publik sida, godkännande, → projekt) | ✅ |
| 6 | Arbetsorder, tid, material, bilddokumentation, fakturaunderlag, mobilvy | ✅ |
| 7 | Förfrågningar, projekt, kalender, rapporter, team, inställningar, Supabase-schema + RLS | ✅ |

Hela MVP-kedjan (inloggning → offert → kundgodkännande → projekt → arbetsorder → tid/material/foto → fakturaunderlag → PDF) är **fullt fungerande**, inte mockups.

---

## 7. Säkerhet

- Cookie-baserad session (httpOnly, `getSession`/`requireSession`); förberedd för Supabase-JWT.
- Rollbaserad åtkomst (`can.*`) + multi-tenant via `organization_id` i alla läsningar.
- Row Level Security på alla tabeller (`auth_org_ids()`); publika länkar via token (`SECURITY DEFINER`-RPC).
- Zod-validering i formulär och server actions.
- Filuppladdning: typkontroll (`image/*`) + storleksgräns (4 MB).
- Aktivitetslogg för spårbarhet. Inga känsliga nycklar i frontend.

## 8. Internationalisering

UI:t är på svenska. All text är samlad i komponenter/`status.ts`, vilket gör det enkelt att lyfta ut till en i18n-katalog senare. Formatering (valuta/datum) sker via `Intl` med `sv-SE`-locale i `lib/utils.ts`.
