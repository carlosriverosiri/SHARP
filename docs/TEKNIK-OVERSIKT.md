# Tekniköversikt – SHARP

Det här dokumentet sammanfattar teknik, integrationer och systemdelar i projektet. Använd som kontext när du vill planera nya funktioner eller bedöma påverkan.

---

## Plattform & hosting

- **Astro 5** som webbframework, med SSR där `prerender = false` används.
- **Netlify** som drift/hosting:
  - `@astrojs/netlify` adapter för SSR.
  - Netlify Functions (inkl. schemalagda funktioner).
  - Lång timeout för AI‑API (400s).
  - Aggressiv cache för statiska assets, HTML revalideras.

## Frontend & UI

- **Astro pages/layouts/components**.
- **Tailwind CSS v4** via Vite‑plugin.
- **Chart.js** för statistik/visualiseringar.
- **Global CSS** i `src/styles/global.css`.

## Backend/SSR & API

- Astro API routes i `src/pages/api/**`.
- SSR används för personalsidor och AI‑verktyg som kräver auth.
- **Netlify Functions** för schemalagda jobb (`netlify/functions`).

## Databas & lagring

- **Supabase** för:
  - Auth (Supabase session cookies)
  - Data för AI Council, kort‑varsel, loggning, profiler.
- Migrationer och schema i `supabase/`.
- Kryptering av känsliga fält (t.ex. telefonnummer i kort‑varsel).

## Autentisering & säkerhet

- Cookie‑baserad session (Supabase access/refresh tokens).
- Roll‑baserat (admin/personal) via app metadata.
- SSR‑sidor kräver inloggning med `arInloggad(...)`.
- Säkerhetsheaders via Netlify.

## AI‑plattform (AI Council)

- **AI Council** i `/admin/ai-council`:
  - Multi‑modell parallella svar.
  - Deliberation/faktagranskning (runda 2).
  - Syntes + supersyntes.
  - Sessionshistorik i Supabase.
  - Cross‑device draft sync.
  - Filuppladdning + multimodala modeller.

### AI‑leverantörer

- **OpenAI** (GPT/o‑serien)
- **Anthropic** (Claude)
- **Google** (Gemini)
- **xAI** (Grok)

## Externa integrations-API:er

- **PubMed** (E‑utilities) för vetenskapliga referenser.
- **SerpAPI** (Google/Scholar/News) för webbsökning i AI Council.
- **Zotero** (API) för import och PDF‑hämtning.
- **46elks** för SMS‑utskick.

## Kort‑varsel & SMS

- SMS‑kampanjer med prioritering (akut/sjukskriven/ont/normal).
- Schemalagd Netlify Function körs varje minut för gradvis utskick.
- Krypterade telefonnummer + GDPR‑anpassad loggning.

## Content & informationsflöden

- **Astro content collections** i `src/content/`.
- Data‑katalog `src/data/` (t.ex. `shortLinks.json`).
- **Dynamiska redirects** genereras från `shortLinks.json` i `astro.config.mjs`.
- **Pagefind** genererar sökindex under build.

## Media & dokument

- **Astro Image + sharp** för bildoptimering.
- PDF‑hantering via `pdf-parse` (server) och pdf.js (frontend).
- Script‑verktyg i `scripts/` för importer/optimering.

## Driftsflöde & build

- `npm run dev` (Astro dev server)
- `npm run build` (Astro build + Pagefind)
- `npm run preview` (lokal preview)
- Netlify bygger på push till `main`.

---

## Viktiga nyckelfiler

- `astro.config.mjs` – Astro/Netlify‑konfiguration + redirects
- `netlify.toml` – build, headers, functions, caching
- `src/pages/api/**` – API‑endpoints (AI, SMS, Zotero, etc.)
- `supabase/` – schema + migrationer
- `docs/ai-council/AI-COUNCIL.md` – detaljerad AI Council‑dokumentation
- `docs/LANKAR-OCH-SMS.md` – SMS‑verktyg
- `docs/ENV-KONFIGURATION.md` – miljövariabler

---

## Miljövariabler (översikt)

Exempel på centrala variabler:

- Supabase: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Auth: `PERSONAL_SESSION_SECRET`, ev. `USE_SUPABASE_AUTH`
- AI: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `XAI_API_KEY` (beroende på profil)
- Search: `SERPAPI_KEY`
- Zotero: `ZOTERO_API_KEY` (lagras i appen per användare)
- SMS: `ELKS_API_USER`, `ELKS_API_PASSWORD`
- Övrigt: `SITE`, `POOL_ENCRYPTION_KEY`

---

## Användningsmål (kort)

1. **Patientinformation & klinikinnehåll** (Astro‑sidor + content collections)
2. **Personalverktyg** (länkar, SMS, admin)
3. **AI Council** (multi‑modell analys, research, källverifiering)
4. **Kort‑varsel** (kampanjer, prioritering, automation)

---

## Systemkarta per modul

### AI Council

- **UI:** `src/pages/admin/ai-council.astro`
- **API:** `src/pages/api/ai-council/*`
- **Databas:** `ai_council_sessions`, `ai_council_projects`, `ai_profiles`
- **Integrationer:** OpenAI, Anthropic, Google, xAI, PubMed, SerpAPI, Zotero
- **Flöde (kort):** prompt/kontext → multi‑modell svar → (valfritt) deliberation → syntes/supersyntes → sparas i Supabase

### Kort‑varsel

- **UI/Admin:** `src/pages/personal/kort-varsel.astro` + admin‑API
- **API:** `src/pages/api/kort-varsel/*` + `netlify/functions/scheduled-sms.mts`
- **Databas:** `kort_varsel_patienter`, `sms_kampanjer`, `sms_kampanj_mottagare`
- **Integrationer:** 46elks (SMS)
- **Flöde (kort):** kampanj skapas → patienter prioriteras → schemalagd utskick → svar via kortlänk

### Personalportal

- **UI:** `src/pages/personal/*`
- **API:** `src/pages/api/sms/*`, `src/pages/api/pool/*`, `src/pages/api/statistik/*`
- **Databas:** `profiles`, `sms_statistik`, `audit_logg`
- **Integrationer:** 46elks, Supabase auth
- **Flöde (kort):** inloggning → verktyg (SMS, länkar, statistik) → loggning i Supabase

### Publika sidor

- **UI:** `src/pages/*` (sjukdomar, operationer, rehab, info)
- **Content:** `src/content/*`, `src/data/*`
- **Flöde (kort):** statiska sidor byggs → Pagefind‑index

---

## API‑översikt (urval)

### AI Council

- `POST /api/ai-council/query` – kör multi‑modell, syntes/supersyntes
- `GET/POST/DELETE /api/ai-council/sessions` – sessionshistorik
- `POST /api/ai-council/pubmed-search` – PubMed‑sök
- `POST /api/ai-council/web-search` – SerpAPI (Google/Scholar/News)
- `POST /api/ai-council/zotero/*` – Zotero auth/sök/import

### SMS & Länkar

- `POST /api/sms/skicka` – skicka SMS
- `GET /api/kampanj/*` – skapa/avsluta/lista kampanjer
- `GET /api/pool/*` – hantera patientpool

### Kunskapsbas (KB)

- `GET /api/kunskapsbas/projects`
- `GET /api/kunskapsbas/items`
- `POST /api/kunskapsbas/items`
- `GET /api/kunskapsbas/context`

### Statistik

- `GET /api/statistik/oversikt`
- `GET /api/statistik/svarstid`
- `GET /api/statistik/trend`

---

## Datamodeller (kärnobjekt)

- **AI Council:** session, projekt, profil, responses, syntheses
- **Kort‑varsel:** kampanj, mottagare, patientpool, prioritet
- **Personal:** profil, audit‑logg, sms‑statistik, resurser

---

## GDPR, PDL och patientsäkerhet (kort‑varsel)

Denna sammanfattning är hämtad från kort‑varsel‑dokumentationen (`docs/kort-varsel/04-GDPR.md` + `01-TEKNISK.md`).

### Personuppgifter & lagring

- **Telefonnummer** lagras krypterat (AES‑256) i Supabase.
- **Telefon‑hash** (SHA‑256) används för dubblettdetektering.
- **Patientnamn** lagras men skyddas av RLS.
- **Personnummer lagras inte** i kort‑varsel‑systemet.
- **Auto‑radering** av patienter efter utgångsdatum.

### Rättslig grund & samtycke

- **Rättslig grund:** Berättigat intresse (GDPR art. 6.1.f) för att fylla lediga operationstider.
- **Samtycke/opt‑out:** Patienten kan alltid avregistrera sig (STOPP). Samtycke registreras i patientpoolen.

### Tekniska skyddsåtgärder

- **Kryptering i vila:** AES‑256 för telefonnummer.
- **Kryptering i transit:** TLS/HTTPS till 46elks och Supabase.
- **Åtkomstkontroll:** Endast inloggad personal; RLS i Supabase.
- **Loggning:** Tidsstämplar och status loggas, **ingen känslig data i serverloggar**.
- **Service Role Key:** Endast server‑side, aldrig i klient.

### Leverantörer & dataplacering

- **46elks**: Svensk telekomoperatör, data lagras i Sverige.
- **Supabase**: Databas i EU (Frankfurt).
- **Netlify**: Hosting, EU‑miljö.

### Patienträttigheter (GDPR)

- Rätt till information, tillgång, radering och invändning.
- Opt‑out hanteras omedelbart.

### PDL‑avgränsning & IMY‑dialog

- Systemet är **fristående från journalsystemet** och patientdata **matas in manuellt**.
- IMY kontaktad för vägledning om PDL vs GDPR; svar inväntas (status i `04-GDPR.md`).

### Patientsäkerhetsaspekter

- Systemet är **inte ett bokningssystem**: slutlig bokning sker manuellt av personal.
- Ingen medicinsk journalinformation behandlas i kort‑varsel‑systemet.
- Prioriteringslogik (akut/sjukskriven/ont/normal) styr utskick men påverkar **inte** medicinsk bedömning.

---

## Nästa nivå (valfritt)

Om du vill kan jag bygga en **detaljerad karta per subsystem** med:

- exakta request/response‑scheman
- databastabeller per endpoint
- sekvensdiagram för dataflöde

