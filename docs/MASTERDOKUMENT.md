# Sajt-masterdokument — Södermalms Ortopedi (SHARP)

**Syfte:** Ge dig (och externa AI-assistenter) en samlad bild av vad som finns på sajten, hur den är uppbyggd, vilka delsystem som finns och var detaljerad dokumentation finns. Använd som **primär kontext** när du promptar för vidareutveckling.

**Senast genomgången mot kodbas:** 2026-04-18

**Relaterade dokument (uppdateras separat):**

- `PROJECT_INDEX.md` — snabb översikt; kan divergera från faktiska filer vid menylänkar.
- `docs/TEKNIK-OVERSIKT.md` — teknik, integrationer, modulkarta.
- `README.md` — körning, git-flöde, deploy.
- `docs/enkat/MASTERDOKUMENT.md` — patientupplevelse/enkät (enda nödvändiga bilagan för extern AI enligt repo-kommentar där).

---

## 1. Vad sajten är

- **Webbplats** för specialistortopedi (axel, knä, armbåge) med patientinformation, Q&A, intern personalportal och avancerade interna verktyg (AI Council, SMS/kampanjer, enkät m.m.).
- **Primärt språk:** svenska på rot-URL:er. **Engelska** under `/en/*` där sidor finns; navigationen kan visa fler engelska länkar än vad som har motsvarande `.astro`-filer (se avsnitt 12).
- **Hosting:** Netlify. **Domän (produktion):** `https://sodermalmsortopedi.se` (se `README.md`; `PUBLIC_SITE_URL` / `SITE` i miljö).

---

## 2. Teknikstack (kort)

| Område | Val |
|--------|-----|
| Framework | Astro 5.x (`output: 'static'` + Netlify-adapter för SSR där `prerender = false`) |
| Styling | Tailwind CSS v4 (Vite-plugin) |
| Språk | TypeScript (strict) |
| Bilder | Astro Image + Sharp |
| Sök | Pagefind (körs i `postbuild` efter `astro build`) |
| Backend i drift | Astro API routes under `src/pages/api/**`, Netlify Functions under `netlify/functions/` |
| Databas / auth | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) |
| Tester | Vitest (`npm test`), `astro check` ingår i `npm run verify` |
| CI | `.github/workflows/verify.yml` → `npm run verify` |

**Viktiga rötter:** `astro.config.mjs` (site-URL, redirects från `shortLinks.json`, sitemap i18n, inline styles mot FOUC), `netlify.toml` (build, headers, function-timeout för långa AI-anrop).

---

## 3. Arkitektur: statiska sidor vs SSR

- **Standard:** sidor **förhandsrenderas** statiskt till `dist/`.
- **SSR** (`export const prerender = false`) används för:
  - Personalportalen (`/personal/*` — inloggning, profiler, verktyg).
  - Publika dynamiska sidor som kräver serverdata, t.ex. `/e/[kod]` (enkät), `/s/[kod]` (kort länk/kampanj beroende på implementation).
  - Admin/AI-sidor som `admin/ai-council.astro`, `admin/kunskapsbas.astro`, m.fl.
  - Nästan alla filer under `src/pages/api/**` (endpoints körs på servern).

**Cookie-session:** Supabase-session i httpOnly-kakor; PWA (`public/sw.js`) undviker cache-first för `/api/` och `/personal` så inloggad data inte blandas med cache (se `docs/TEKNIK-OVERSIKT.md`).

---

## 4. Sidkartor: publika ytor

Nedan är **faktiska `.astro`-filer** under `src/pages/` (2026-04-18), grupperade efter syfte. Dynamiska rutter visas som `[param]`.

### 4.1 Startsida och generell information

| Route | Fil |
|-------|-----|
| `/` | `index.astro` |
| `/akut-remiss` | `akut-remiss.astro` |
| `/fritt-vardval-sverige` | `fritt-vardval-sverige.astro` |
| `/patientavgifter` | `patientavgifter.astro` |
| `/privatpatient-tre-val` | `privatpatient-tre-val.astro` |
| `/sok` | `sok.astro` (Pagefind) |
| `/senast-redigerade` | `senast-redigerade.astro` |

### 4.2 Sjukdomar (svenska)

- Översikt: `sjukdomar/index.astro`
- Axel: `sjukdomar/axel/index.astro` + sidor: `ac-ledsartros`, `nyckelbensleden-ur-led`, `parsonage-turner`, `parsonage-turner-v2`
- Knä: `sjukdomar/kna/index.astro` (undermeny: “kommer snart” i `Header.astro`)
- Armbåge: `sjukdomar/armbage/index.astro`, `distal-bicepsruptur`

**Obs:** I `Header.astro` finns länk till `/sjukdomar/axel/supraskapular-neuropati` — motsvarande fil saknas i `src/pages/sjukdomar/` (engelsk motsvarighet finns under `/en/diseases/shoulder/suprascapular-neuropathy`).

### 4.3 Operationer

- Översikt: `operation/index.astro`
- Implementerat exempel: `operation/axel/lateral-klavikelresektion.astro` (använder `OperationLayout` + modulära `src/components/operation/*`)

### 4.4 Rehab (svenska)

- `rehab/index.astro` (översikt; underliggande programsidor kan vara få jämfört med menyer — verifiera mot `Header.astro`)

### 4.5 Fråga doktorn

- Content collection: `src/content/fraga-doktorn/*.md` — **649** markdown-filer (schema i `src/content/config.ts`).
- Dynamik: `fraga-doktorn/[...slug].astro`, `fraga-doktorn/[kategori]/index.astro`, `fraga-doktorn/{axel,kna,armbage}/[topic].astro`, index och hjälpsidor (`index.astro`, `senaste.astro`, `tack.astro`, `amne/[tag].astro`, `sjukdom/[condition].astro`).

### 4.6 Info / policy

- `info/kallelse-operation.astro`, `info/kallelse-operation-forsakring.astro`, `info/recept-policy.astro`

### 4.7 Om oss

- `om-oss/index.astro`
- `om-oss/vart-team/dr-carlos-rivero-siri.astro`
- AI-relaterade informationsidor: `om-oss/ai-council.astro`, `om-oss/ai-council-affar.astro`, `om-oss/ai-council-elixir.astro`, `om-oss/kort-varsel-demo.astro`, `om-oss/kort-varsel-dokumentation.astro`

### 4.8 Engelska (`/en`)

Filer som finns under `src/pages/en/`:

- `en/index.astro`, `en/urgent-referral.astro`
- `en/diseases/shoulder/` — `ac-joint-horizontal-paradigm`, `ac-joint-dislocation`, `suprascapular-neuropathy`
- `en/rehab/` — `index`, `shoulder/index`, `ac-joint-dislocation-type-i-ii`, `suprascapular-nerve-decompression`

**Viktigt:** Den engelska navigationen i `Header.astro` pekar på många rutter (t.ex. `/en/diseases`, `/en/surgery`, `/en/patient`, `/en/about`, `/en/ask-the-doctor`, `/en/diseases/elbow/...`) som **inte** alla har motsvarande filer i repot. Vid arbete med engelska ytan: verifiera route ↔ fil innan du antar att länken fungerar.

### 4.9 Kortlänkar och omdirigeringar

- **Byggredirects:** `astro.config.mjs` läser `src/data/shortLinks.json` och genererar `redirects` (+ manuella, t.ex. `/copy-links` → `/personal/lankar-sms`, `/nyckelbensleden-ur-led`).
- **Dynamisk SMS-länk:** `s/[kod].astro` (SSR).
- **`/copy-links`:** `copy-links.astro` med `prerender = false` (vidare till länkverktyget enligt config).

### 4.10 Publik enkät

- `e/[kod].astro` — patientsvar med kod från SMS (SSR).

### 4.11 Luckor i förhållande till äldre indexering

`PROJECT_INDEX.md` nämner bland annat `/vardgivare`, `/vara-forsakringsbolag` och `/forsakringsbolag` som statiska sidor. **Motsvarande fristående `.astro`-filer i roten saknas i repot** (2026-04-18), medan länkar till `/vardgivare` och `/vara-forsakringsbolag` finns i `Header.astro` och `om-oss/index.astro`, och startsidan länkar till `/forsakringsbolag`. Detta bör rättas (sidor eller redirects) om 404 ska undvikas.

---

## 5. Personalportal och roller

| Route | Innehåll |
|-------|----------|
| `/personal/index.astro` | Ingång (SSR) |
| `/personal/oversikt.astro` | Översikt |
| `/personal/profil.astro` | Profil, mobil, vårdgivarkoppling |
| `/personal/admin.astro` | Användare, roller, admin |
| `/personal/lankar-sms.astro` | Kortlänkar (Supabase `kort_lankar`) |
| `/personal/enkat.astro` | Enkät: CSV, kampanj, SMS, dashboard |
| `/personal/kort-varsel.astro` | Kort-varsel / kampanjer |
| `/personal/resurser.astro` | Resurser |
| `/personal/aterstall-losenord.astro` | Lösenordsåterställning |

**Roller:** `src/lib/portal-roles.ts` — hierarki `superadmin` > `admin` > `personal` (detaljer i `PROJECT_INDEX.md` och `docs/PERSONALPORTAL-SMOKE-TEST.md`).

**Layout:** `PortalLayout.astro` — sidonav, profilblock, named slots för sid-specifik CSS/JS.

---

## 6. Admin och AI Council (internt)

| Route | Syfte |
|-------|--------|
| `/admin/ai-council.astro` | AI Council-huvudvy (multi-modell, syntes, sessioner) |
| `/admin/ai-council/profil.astro` | AI-profil (SSR) |
| `/admin/kunskapsbas.astro` | Kunskapsbas (SSR) |
| `/admin/obesvarade.astro` | Obesvarade frågor (arbetsflöde) |

**API:** `src/pages/api/ai-council/*` — bl.a. `query`, `sessions`, `draft`, PubMed, web search (SerpAPI), Zotero, deliberation/syntes-endpoints.

**Komponenter:** `src/components/ai-council/*` + omfattande klientlogik i `src/lib/ai-council/*` och `src/lib/ai-core/*`.

**Dokumentation:** `docs/ai-council/` (t.ex. `AI-COUNCIL.md`, `KUNSKAPSBAS.md`, `UI-GUIDE.md`).

---

## 7. Patientupplevelse / enkät (modul)

- **UI:** `personal/enkat.astro`, publik `e/[kod].astro`
- **API:** `src/pages/api/enkat/*` — `upload`, `settings`, `send`, `submit`, `dashboard`, `report`, `campaigns`, `remind`, m.fl.
- **Bakgrund:** `netlify/functions/enkat-send-queue.mts`, `enkat-remind-scheduled.mts`
- **Hjälpbibliotek:** `src/lib/enkat-*.ts` (parser, stats, SMS, m.m.)
- **Enda “stora” bilagan för extern AI:** `docs/enkat/MASTERDOKUMENT.md` (inkl. utbrytning §8; se `docs/enkat/ENKAT-UTBRYTNING.md` som pekare).

---

## 8. SMS, kampanjer, pool och statistik

- **SMS:** `src/pages/api/sms/skicka.ts`, `inkommande.ts`
- **Kampanj / pool:** `src/pages/api/kampanj/*`, `src/pages/api/pool/*` (används av kort-varsel-flöden — se `docs/TEKNIK-OVERSIKT.md`)
- **Statistik:** `src/pages/api/statistik/*`
- **Schemalagt:** `netlify/functions/scheduled-sms.mts`

**Personal:** API `src/pages/api/personal/kort-lankar.ts` för kortlänkar mot Supabase.

---

## 9. Layouts och återanvändbara komponenter

| Layout | Användning |
|--------|------------|
| `BaseLayout.astro` | Standard för informationsidor |
| `OperationLayout.astro` | Operationssidor, TOC, JSON-LD |
| `RehabLayout.astro` | Rehabprogram |
| `PortalLayout.astro` | Personalportal |

**Gemensamma komponenter (urval):** `Header.astro`, `footer.astro`, `SEO.astro`, `MedicinskGranskad.astro`, `AuthorCard.astro`, `RefLink.astro`, `RefDrawer.astro`, `FooterMap.astro`, `PhoneModal.astro`, specialkomponenter som `AcJointHorizontalParadigm.astro` (Chart.js), `AcJointRtwCalculator.astro`, m.fl.

**Operation:** se `src/components/operation/` och barrel `operation/index.ts`.

**Design:** färgtoner och typografi beskrivs i `PROJECT_INDEX.md` (t.ex. `#023550`, `#EBF8FF`, Inter).

**i18n:** `src/lib/siteLocale.ts`, texter för footer i `src/i18n/footer.ts`, `footerMap.ts`.

---

## 10. Data och innehåll utanför sidor

| Plats | Innehåll |
|-------|----------|
| `src/content/fraga-doktorn/` | Q&A markdown (649 filer) |
| `src/data/shortLinks.json` | Seed + redirect-källa till build |
| `src/data/conditions.ts`, `topics.ts` | Diagnos/ämnesdata |
| `public/` | Statiska tillgångar: `images/`, `video/`, `llms.txt`, `robots.txt`, `sw.js` |
| `supabase/migrations/` | Databasschema |

**Skript (exempel):** `scripts/` — import från WordPress, Q&A-import, bildoptimering, import av kortlänkar till Supabase.

---

## 11. API-katalog (översikt)

Under `src/pages/api/`:

- `ai-council/` — AI-körningar, sessioner, Zotero, PubMed, web search, m.m.
- `enkat/` — enkätflöde + tester i `_tests/`
- `kampanj/`, `pool/`, `statistik/` — kampanjer och intern statistik
- `sms/` — utgående/inkommande SMS
- `kunskapsbas/` — projekt, items, kontext
- `personal/kort-lankar.ts` — CRUD-liknande mot `kort_lankar`
- `admin/upload-avatar.ts` — avataruppladdning

Alla dessa är avsedda för **serverkörning** (Netlify Functions via Astro adapter), ofta med `prerender = false`.

---

## 12. Kända avvikelser och teknisk skuld (att kolla vid ändringar)

1. **Engelska menyer** kan peka på rutter utan motsvarande `src/pages/en/**`-filer.
2. **Svensk axelmeny:** länk till `supraskapular-neuropati` utan motsvarande sida under `sjukdomar/axel/`.
3. **Vårdgivare / försäkringsbolag:** flera URL:er nämns i UI (`/vardgivare`, `/vara-forsakringsbolag`, `/forsakringsbolag`) men fristående sidfiler saknas i repot — risk för 404 om inga Netlify-redirects lagts dit utanför repot.
4. **`PROJECT_INDEX.md`** — användbar men kan vara **inaktuell** på punktnivå; denna fil prioriterar **inventering av filsystem**.

---

## 13. Arbetsflöde, bygge och kvalitet

| Kommando | Betydelse |
|----------|-----------|
| `npm run dev` | Utvecklingsserver |
| `npm run build` | Produktion + `postbuild` (Pagefind) |
| `npm run verify` | Test + `astro check` + build (samma som CI) |
| `npm run preview` | Förhandsvisning av `dist/` |

**Deploy:** Netlify kör build enligt `netlify.toml`; produktionssajt enligt README.

**Promptbibliotek:** `prompts/README.md` — mallar för Q&A, diagnossidor, rehab, översättning, AI Council, patient-SMS m.m.

---

## 14. Hur du använder detta dokument när du promptar

1. **Börja med målet:** publik sida, personalverktyg, API eller innehåll (markdown).
2. **Ange rutt eller fil:** t.ex. “ändra `/sjukdomar/axel/ac-ledsartros`” eller “endpoint `/api/enkat/send`”.
3. **Bifoga vid behov:**  
   - Enkät: `docs/enkat/MASTERDOKUMENT.md`  
   - AI Council: `docs/ai-council/AI-COUNCIL.md`  
   - Länkar/SMS: `docs/LANKAR-OCH-SMS.md`  
   - Miljö: `docs/ENV-KONFIGURATION.md`
4. **Påminn om SSR:** om sidan har `prerender = false` eller ligger under `api/`, ska ändringar testas i deploy-liknande miljö, inte bara statisk preview av en enstaka sida.
5. **Uppdatera detta masterdokument** vid större nya moduler (ny huvudsektion, ny API-grupp, ny content-typ) så det fortsätter spegla sanningen i repot.

---

*Detta dokument är avsett att vara den samlade “kartan” över sajten. Faktarutor om antal filer och exakta listor bör vid tvivel verifieras med projektets filträd eller `npm run verify`.*
