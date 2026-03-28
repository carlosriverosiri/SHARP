# Kort varsel – samlat masterdokument (utbrytning / extern AI)

> **Ett dokument räcker:** Bifoga **endast denna fil** till extern AI när du teoretiskt planerar att bryta ut kort varsel till en oberoende app.
>
> **Senast sammanslagen:** 2026-03-28
>
> **Vilken fil gäller?** `MASTER.md` är den korta kodnära översikten; **den här filen** innehåller `MASTER.md` i sin helhet plus README och del 1–7. Vid motsägelse mellan äldre avsnitt i 01–07 och *Del A* ska **Del A** och källkod prioriteras.

---

## Innehållsförteckning

| Del | Källa | Innehåll |
|-----|--------|----------|
| **A** | MASTER.md | Arkitektur, API, databas, miljö, status |
| **B** | README.md | Snabbstart, länkar till del 1–7 |
| **C** | 01-TEKNISK.md | Teknisk fördjupning |
| **D** | 02-STATISTIK.md | Statistik |
| **E** | 03-PREDIKTION.md | Prediktion |
| **F** | 04-GDPR.md | GDPR |
| **G** | 05-OPEN-SOURCE.md | Open source |
| **H** | 06-VISION.md | Vision |
| **I** | 07-AI-FORBEREDELSE.md | AI-förberedelse |

---

# DEL A – Masteröversikt (från MASTER.md)

# Kort varsel-SMS: Masterdokumentation

> Komplett översikt för systemet som fyller avbokade operationstider via SMS-utskick.
>
> **Senast uppdaterad:** 2026-03-28 (synkad med kod i `src/pages/personal/kort-varsel.astro`, `src/pages/s/[kod].astro`, `src/pages/api/kampanj/*`, `src/pages/api/pool/*`, `netlify/functions/scheduled-sms.mts`, migreringar `001`–`008`).
>
> Fördjupning: [01-TEKNISK.md](./01-TEKNISK.md) m.fl. — denna fil är den kondenserade sanningskällan för arkitektur och filpekare.

---

## Innehåll

- [1. Sammanfattning](#1-sammanfattning)
- [2. Systemarkitektur](#2-systemarkitektur)
- [3. Flöde och prioritering](#3-flöde-och-prioritering)
- [4. Databas](#4-databas)
- [5. SMS-hantering (46elks)](#5-sms-hantering-46elks)
- [6. Patientpool](#6-patientpool)
- [7. Intervall och gradvis utskick](#7-intervall-och-gradvis-utskick)
- [8. Patientens svarssida](#8-patientens-svarssida)
- [9. Personaldashboard](#9-personaldashboard)
- [10. Statistik och analys](#10-statistik-och-analys)
- [11. Prediktion](#11-prediktion)
- [12. AI-förberedelse och ML-pipeline](#12-ai-förberedelse-och-ml-pipeline)
- [13. GDPR och juridik](#13-gdpr-och-juridik)
- [14. Säkerhet](#14-säkerhet)
- [15. Ekonomi och ROI](#15-ekonomi-och-roi)
- [16. Open source-plan](#16-open-source-plan)
- [17. Kommersiell vision](#17-kommersiell-vision)
- [18. Filstruktur](#18-filstruktur)
- [19. Miljövariabler](#19-miljövariabler)
- [20. Migrering och databas-setup](#20-migrering-och-databas-setup)
- [21. Status och roadmap](#21-status-och-roadmap)
- [22. Relation till andra SHARP-moduler](#22-relation-till-andra-sharp-moduler)
- [Detaljdokumentation](#detaljdokumentation)

---

## 1. Sammanfattning

Kort varsel-SMS är ett system som kontaktar patienter på väntelistan när operationstider blir lediga. Patienter får SMS med länk och kan svara JA eller NEJ via en webbsida. Utskick sker gradvis (kö) med intervall som styrs av prioritetsflaggor och kampanjinställningar.

**Kärnfunktioner:**

- Patientpool med prioritering (akut / sjukskriven / ont / ålder m.m.)
- Automatiska SMS-utskick via Netlify schemalagd funktion
- Svarshantering (JA / NEJ / reserv) med atomär RPC; opt-out via SMS (STOPP m.fl.) och webb
- Statistik, trender och förberedelse för prediktion/ML (databaslagret)
- Kryptering av telefonnummer (`POOL_ENCRYPTION_KEY`); samma nyckel används även av enkätmodulens kö (se §22)

**Ekonomisk effekt (indikativ):** En avbokad operation kan kosta tiotusentals kronor i tappad kapacitet; SMS-kostnad per utskick är marginal i jämförelse.

---

## 2. Systemarkitektur

### Teknisk stack

| Komponent | Teknologi | Funktion |
|-----------|-----------|----------|
| Frontend | Astro + Tailwind CSS | SSR-sidor |
| Backend | Astro API Routes | Serverlösa HTTP-endpoints |
| Databas | Supabase (PostgreSQL) | Tabeller, RLS, triggers, RPC |
| SMS | 46elks | Utgående och inkommande (webhook) |
| Hosting | Netlify | Deploy; schemalagda funktioner |
| Grafer | Chart.js | Statistik (vid behov) |

### Arkitekturdiagram

```
[Personal] → [Astro SSR / Netlify]
                    ↓
              [Supabase DB]
                    ↓
     [Netlify Scheduled Function: scheduled-sms.mts]
                    ↓
              [46elks SMS API]
                    ↓
              [Patient mobil]
                    ↓
              [Svarssida /s/[kod]]
                    ↓
         [POST /api/kampanj/svar → registrera_ja_svar RPC]
```

### Viktiga körmoment

- **`netlify/functions/scheduled-sms.mts`:** Körs enligt cron `* * * * *` (varje minut), definierat i filens `export const config` — inte i `netlify.toml`.
- **Astro API:** Kampanj, pool, statistik, inkommande SMS-webhook.
- **RLS:** Aktiverat på kampanj-, mottagar- och pooltabeller (se migreringar).

---

## 3. Flöde och prioritering

### Huvudflöde

1. Operationstid blir ledig.
2. Personal skapar SMS-kampanj (väljer patienter, tid, filter för op-storlek/sida m.m.).
3. System skickar SMS i prioritetsordning, ett i taget, med väntetid mellan utskick.
4. Patient öppnar länk → svarar JA eller NEJ (och vid JA: preop-bekräftelse enligt UI).
5. Första giltiga JA kan ge bokad plats; senare JA kan bli reserv (RPC-semantik).
6. Kampanj avslutas manuellt eller när utfall registrerats.

### Prioriteringsordning (affärslogik)

1. **AKUT** — måste opereras snarast  
2. **Sjukskriven**  
3. **Mycket ont** (`har_ont`)  
4. **Pensionär (67+)** — styrs i praktiken av fältet `alder` i poolen  
5. **Normal**

Inom nivåer används även **operationsstorlek** (liten/stor) och **sida** (höger/vänster) för matchning mot kampanjfilter — se migrering `006-operationsstorlek.sql`.

### SMS-modeller (koncept)

| Modell | Innehåll | Användning |
|--------|----------|-------------|
| Modell A | Vag text (“kort varsel”) | Utan samtycke |
| Modell B | Detaljerad information | Med samtycke (`har_samtycke`) |

Exakt copy och villkor finns i personal-UI och `s/[kod].astro` / demosida `om-oss/kort-varsel-demo`.

---

## 4. Databas

### Huvudtabeller

**`sms_kampanjer`** — ett utskick / kampanj

| Kolumn (urval) | Beskrivning |
|----------------|-------------|
| `id` | UUID |
| `datum`, `tidsblock`, `operation_typ`, `lakare` | Operationskontext |
| `antal_platser`, `antal_fyllda` | 1–3 platser |
| `status` | `aktiv`, `fylld`, `avslutad` (inga värden `pausad` i nuvarande schema) |
| `utfall` | `fylld_via_sms`, `fylld_manuellt`, `misslyckad`, `avbruten`, `timeout` |
| `batch_intervall_minuter`, `nasta_utskick_vid` | Gradvis utskick |
| `skapad_av`, `skapad_vid` | Spårning |
| `filter_op_liten`, `filter_op_stor`, `filter_sida` | Filter (migration 006) |

**`sms_kampanj_mottagare`** — en rad per patient i en kampanj

| Kolumn (urval) | Beskrivning |
|----------------|-------------|
| `unik_kod` | Unik länkkod (UUID-format i praktiken) |
| `skickad_vid` | När SMS skickats (NULL = ej skickat) |
| `svar` | `ja`, `nej`, `reserv`, `avregistrerad` |
| `akut`, `sjukskriven`, `har_ont`, `intervall_till_nasta` | Kopierade prioritetsfält + minuter till nästa SMS |
| `utskick_timme`, `utskick_veckodag`, historikfält | Statistik/ML (migration 007–008) |

**`kort_varsel_patienter`** — patientpool

| Kolumn (urval) | Beskrivning |
|----------------|-------------|
| `telefon_krypterad`, `telefon_hash`, `telefon_masked` | Kontakt |
| `namn`, `har_samtycke` | Visning och SMS-modell |
| `lakare` | **TEXT[]** — array av läkare (migration 006; inte längre en enkel UUID-FK i baseline) |
| `flexibel_lakare` | Kan operera av annan läkare |
| `akut`, `har_ont`, `sjukskriven`, `alder` | Prioritet |
| `op_liten`, `op_stor`, `sida` | Matchning mot ledig tid |
| `status` | `tillganglig`, `kontaktad`, `reserv`, `nej`, `bokad`, `avregistrerad` |
| `utgar_vid` | Standard **7 dagar** från tillagd (auto-radering enligt `002-kort-varsel.sql`) |

### Atomiskt JA-svar

**RPC:** `registrera_ja_svar(p_unik_kod TEXT, p_bekraftat_preop BOOLEAN)` i `002-kort-varsel.sql`, anropas från `src/pages/api/kampanj/svar.ts`. Använder radlåsning för att undvika dubbelbokning. Returvärden inkluderar bland annat första JA vs reserv vs redan fylld kampanj (se funktionens `resultat` i SQL).

---

## 5. SMS-hantering (46elks)

### Utgående SMS

- **Endpoint:** `POST https://api.46elks.com/a1/sms`
- **Autentisering:** HTTP Basic (`ELKS_API_USER`, `ELKS_API_PASSWORD`)
- **Avsändare:** I kod ofta `from: 'Specialist'` — bör överensstämma med 46elks-konto och klinikens avtal

### Inkommande SMS

- **Webhook:** `POST /api/sms/inkommande` (`src/pages/api/sms/inkommande.ts`)
- **Opt-out:** Meddelande normaliseras till versaler; träff om text innehåller något av: **STOPP**, **STOP**, **AVSLUTA**, **AVREGISTRERA**, **TA BORT MIG**, **NEJ TACK**

### Automatiska svar (utgående efter händelse)

Bekräftelse-SMS skickas från samma endpoint-logik vid opt-out och i kampanjflödet vid JA/NEJ (se `inkommande.ts` och `kampanj/svar.ts`).

---

## 6. Patientpool

### Statusvärden (databas)

| Status | Beskrivning |
|--------|-------------|
| `tillganglig` | Kan kontaktas |
| `kontaktad` | SMS skickat, väntar svar |
| `reserv` | JA när tid redan fylld |
| `nej` | Tackat nej |
| `bokad` | Bekräftad bokning |
| `avregistrerad` | Opt-out eller manuellt borttagen |

### API (pool)

| Metod | Väg | Syfte |
|-------|-----|--------|
| `GET` | `/api/pool/lista` | Lista poolen |
| `POST` | `/api/pool/lagg-till` | Lägg till patient |
| `POST` | `/api/pool/uppdatera` | Uppdatera rad |
| `POST` | `/api/pool/ta-bort` | Ta bort rad |

---

## 7. Intervall och gradvis utskick

Schemalagd funktion `scheduled-sms.mts` skickar **högst ett** SMS per körning per relevant kampanj och sätter `nasta_utskick_vid` utifrån mottagarens `intervall_till_nasta`, annars kampanjens `batch_intervall_minuter`, annars **10 minuter** för “normal” patient.

Typiska intervall i kommentarer/migreringar: **AKUT 60 min**, **sjukskriven 30 min**, **mycket ont 20 min**, **normal 10 min** (eller kampanjoverride).

Personal-UI kan visa varningar om utskick riskerar att inte hinna före dagens slut — se `kort-varsel.astro`.

---

## 8. Patientens svarssida

- **URL:** `/s/[kod]` — fil `src/pages/s/[kod].astro`
- Flöde: information om tidslucka → JA/NEJ → vid behov preop-frågor → bekräftelse eller reserv/stängt läge
- Opt-out-knapp på sidan kompletterar SMS-nyckelord

---

## 9. Personaldashboard

- **URL:** `/personal/kort-varsel` — `src/pages/personal/kort-varsel.astro`

### Aktiv kampanj-indikator

- **Komponent:** `src/components/KortVarselIndikator.astro`
- **Beteende:** På sidor under `/personal` pollas `GET /api/kampanj/aktiv` var **30:e sekund**. Vid aktiv kampanj visas en **flytande knapp** nere till höger (röd = utskick pågår, gul = status `fylld` / väntar på bekräftelse). Det är inte en prick i sidhuvudet — dokumentation som säger “header” är föråldrad.

### Kampanj-API (urval)

| Metod | Väg | Syfte |
|-------|-----|--------|
| `GET` | `/api/kampanj/aktiv` | Indikator + sammanfattning |
| `GET` | `/api/kampanj/lista` | Lista kampanjer |
| `POST` | `/api/kampanj/skapa` | Skapa kampanj |
| `POST` | `/api/kampanj/svar` | Registrera patientsvar (RPC) |
| `POST` | `/api/kampanj/avsluta` | Avsluta med utfall |
| `POST` | `/api/kampanj/utoka` | Utöka mottagarlista |
| `POST` | `/api/kampanj/utoka-platser` | Fler platser |
| `GET` | `/api/kampanj/status` | Status för en kampanj |

### Övrigt

- **Demosida (publik):** `/om-oss/kort-varsel-demo` — `kort-varsel-demo.astro`
- **Profil:** Personal kan ange mobilnummer för notifieringar under `/personal/profil` (om aktiverat i er deployment)

---

## 10. Statistik och analys

### API

| Metod | Väg | Syfte |
|-------|-----|--------|
| `GET` | `/api/statistik/oversikt?dagar=30` | Översikt |
| `GET` | `/api/statistik/svarstid` | Svarstider |
| `GET` | `/api/statistik/trend?granularitet=manad&dagar=365` | Trender |

### Tekniskt

- Trigger för svarstid: **`trigger_berakna_svarstid`** på `sms_kampanj_mottagare` (migration `007-statistik.sql` — inte namnet `trg_berakna_svarstid`)
- `utskick_veckodag` i AI-migreringen: **1 = måndag … 7 = söndag** (kommentar i `008-ai-forberedelse.sql`)

---

## 11. Prediktion

Koncept: innan utskick estimera sannolikhet att fylla luckan. Matematik och viktade faktorer beskrivs i [03-PREDIKTION.md](./03-PREDIKTION.md). Kräver tillräcklig historik; regelbaserad fas före ML.

---

## 12. AI-förberedelse och ML-pipeline

- **Migration:** `008-ai-forberedelse.sql` — bland annat `patient_svarshistorik`, `sms_prediktioner`, vy `v_ml_training_data`, triggers `trg_fyll_utskick_metadata`, `trg_uppdatera_svarshistorik`
- **Export:** SQL `\COPY` från `v_ml_training_data` är det primära sättet att ta ut träningsdata
- **HTTP:** Det finns **ingen** implementerad `GET /api/ml/training-data` i nuvarande kodbas; lägg till själv om ni vill exponera samma data via API

---

## 13. GDPR och juridik

Se [04-GDPR.md](./04-GDPR.md) för djupdykning. Kort i förhållande till **schema**:

- **Auto-radering i pool:** `utgar_vid` sätts standard till **7 dagar** efter tillagd (`002-kort-varsel.sql`); funktionen `rensa_gamla_kampanjer()` i samma migrering rensar bland annat kampanjer äldre än 7 dagar.
- **Telefon:** krypterat + hash för matchning
- **IMY:** Dokumentation nämner brev 2026-01-24 — verifiera status i er interna juridiska spårning

Policytexter i tabellform med “30 dagar” ska **justeras mot faktisk retention** i SQL och era personuppgiftsbiträdesavtal.

---

## 14. Säkerhet

- **Kryptering:** `src/lib/kryptering.ts` — AES-256-CBC med nyckel från `POOL_ENCRYPTION_KEY` (samma princip som i Netlify-funktionen, som använder scrypt + dekryptering för utskick)
- **RLS** på känsliga tabeller
- **Unika koder** för publika länkar (UUID-liknande strängar)
- **Atomaritet:** `registrera_ja_svar` med radlåsning

---

## 15. Ekonomi och ROI

Indikativa siffror — uppdatera mot er kliniks nyckeltal. SMS ~0,40–0,60 kr/st (prislista 46elks). Nytta i form av minskad tom OR-tid dominerar ofta kostnaden.

---

## 16. Open source-plan

Översikt i [05-OPEN-SOURCE.md](./05-OPEN-SOURCE.md): generalisering av kliniknamn, SMS-provider-abstraktion, demo-läge m.m.

---

## 17. Kommersiell vision

Långsiktiga idéer i [06-VISION.md](./06-VISION.md).

---

## 18. Filstruktur

```
src/
  pages/
    personal/
      kort-varsel.astro          # Personaldashboard
      profil.astro               # Profil (mobil m.m.)
    s/
      [kod].astro                # Patientens svarssida
    api/
      kampanj/
        aktiv.ts lista.ts skapa.ts svar.ts avsluta.ts utoka.ts utoka-platser.ts status.ts
      pool/
        lista.ts lagg-till.ts uppdatera.ts ta-bort.ts
      statistik/
        oversikt.ts svarstid.ts trend.ts
      sms/
        inkommande.ts            # 46elks webhook
    om-oss/
      kort-varsel-demo.astro     # Publik demo/förklaring
  components/
    KortVarselIndikator.astro    # Flytande indikator på /personal/*
  lib/
    kryptering.ts                # Kryptering/dekryptering telefon

netlify/
  functions/
    scheduled-sms.mts            # Cron * * * * * — gradvis SMS

supabase/migrations/
  001-initial-setup.sql
  002-kort-varsel.sql            # Kärna: kampanj, mottagare, pool, RPC
  003-lakare.sql
  004-profilbilder.sql
  005-prioritet.sql
  006-operationsstorlek.sql
  007-statistik.sql
  008-ai-forberedelse.sql
```

Repo kan innehålla **ytterligare** migreringar (enkät, AI Council m.m.) — de påverkar inte kort varsel-tabellerna om de inte explicit ändrar dem.

---

## 19. Miljövariabler

| Variabel | Syfte |
|----------|--------|
| `PUBLIC_SUPABASE_URL` | Supabase-URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Publik nyckel (klient) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (API routes + Netlify) |
| `ELKS_API_USER`, `ELKS_API_PASSWORD` | 46elks |
| `POOL_ENCRYPTION_KEY` | Telefon kort varsel (och enkätens kö använder samma namn i drift) |
| `SITE` / `PUBLIC_SITE_URL` | Bas-URL i SMS-länkar (`scheduled-sms.mts` faller tillbaka på konfigurerad default om saknas) |

---

## 20. Migrering och databas-setup

Kör i ordning `001` … `008` (samma som ovan). På Supabase: SQL Editor eller CLI enligt er rutin.

---

## 21. Status och roadmap

### Klart (implementation i kod)

- Pool, kampanj, gradvis utskick, patientwebb, STOPP-webhook, statistik-API, AI-schema/triggers, demo-sida, aktiv-indikator

### Planerat / produkt

- Regelbaserad prediktion i UI, ML, open source-paketering, multi-klinik — se respektive dokuments roadmap

---

## 22. Relation till andra SHARP-moduler

- **Enkät (SMS-enkät):** Separat datamodell under `enkat_*`-tabeller och egna Netlify-funktioner — se `docs/enkat/MASTERDOKUMENT.md`. **Gemensamt:** 46elks, Supabase, ofta `SITE` / `PUBLIC_SITE_URL`, och **`POOL_ENCRYPTION_KEY`** för krypterad telefon i kö/utskick.
- **Kort varsel** ska inte förväxlas med enkätmodulen i dokumentation eller prompts.

---

## Detaljdokumentation

| Dokument | Fil |
|----------|-----|
| Teknisk spec | [01-TEKNISK.md](./01-TEKNISK.md) |
| Statistik | [02-STATISTIK.md](./02-STATISTIK.md) |
| Prediktion | [03-PREDIKTION.md](./03-PREDIKTION.md) |
| GDPR | [04-GDPR.md](./04-GDPR.md) |
| Open Source | [05-OPEN-SOURCE.md](./05-OPEN-SOURCE.md) |
| Vision | [06-VISION.md](./06-VISION.md) |
| AI-förberedelse | [07-AI-FORBEREDELSE.md](./07-AI-FORBEREDELSE.md) |
| **En fil för extern AI (utbrytning)** | [MASTER-DOCUMENT.md](./MASTER-DOCUMENT.md) — hela MASTER + README + 01–07 |


---

# DEL B - README (docs/kort-varsel/README.md)

# Kort varsel-SMS: Dokumentation

> System för att fylla avbokade operationstider via SMS-utskick

**Utbrytning / extern AI:** Allt i **en** fil (denna README + `MASTER.md` + del 1–7) finns i [MASTER-DOCUMENT.md](./MASTER-DOCUMENT.md). Bygg om med (från repo-rot): `powershell -ExecutionPolicy Bypass -File docs/kort-varsel/build-master-document.ps1` (eller `pwsh` om du har PowerShell 7).

---

## Innehåll

| # | Dokument | Beskrivning |
|---|----------|-------------|
| 1 | [Teknisk dokumentation](./01-TEKNISK.md) | Huvuddokumentation - arkitektur, API:er, prioriteringslogik |
| 2 | [Statistik](./02-STATISTIK.md) | Statistikfunktionen - svarstider, trender, dashboard |
| 3 | [Prediktion](./03-PREDIKTION.md) | Prediktionssystem - beräkna chans att fylla utskick |
| 4 | [GDPR](./04-GDPR.md) | GDPR-compliance, 46elks, IMY-kommunikation |
| 5 | [Open Source](./05-OPEN-SOURCE.md) | Plan för att göra systemet tillgängligt som öppen källkod |
| 6 | [Vision](./06-VISION.md) | Kommersiell vision och långsiktig roadmap |
| 7 | [AI-förberedelse](./07-AI-FORBEREDELSE.md) | Datasamling och schema för framtida ML/AI-integration |

---

## Snabbstart

### Vad är Kort varsel-SMS?

Ett system som automatiskt kontaktar patienter på väntelistan när operationstider blir lediga. Patienter får SMS och kan svara JA/NEJ via en enkel webbsida.

### Flöde

```
1. Tid blir ledig → Personal skapar SMS-utskick
2. System skickar SMS i prioritetsordning (AKUT → Sjukskriven → Ont → Normal)
3. Patient klickar länk → Svarar JA/NEJ
4. Personal ringer JA-svar → Bokar tiden
5. Utskick avslutas automatiskt eller manuellt
```

### Prioriteringsordning

1. 🚨 **AKUT** - Måste opereras snarast
2. 📋 **Sjukskriven** - Väntar på att återgå i arbete
3. 🔥 **Mycket ont** - Hög smärtnivå
4. 👴 **Pensionär (67+)** - Flexibla tider
5. ⏰ **Normal** - Standardprioritering

### Smart intervall

Tid mellan SMS anpassas automatiskt baserat på:
- Dagar till operation (längre tid → längre intervall)
- Tid på dagen (närmare 16:00 → kortare intervall)
- Manuell justering möjlig

---

## Teknisk stack

| Komponent | Teknologi |
|-----------|-----------|
| Frontend | Astro + Tailwind CSS |
| Backend | Astro API Routes |
| Databas | Supabase (PostgreSQL) |
| SMS | 46elks |
| Hosting | Netlify |
| Grafer | Chart.js |

---

## Relaterade filer i kodbasen

```
src/pages/personal/kort-varsel.astro   # Huvudsidan för personal
src/pages/s/[kod].astro                 # Patientens svarssida
src/pages/api/kampanj/                  # API-endpoints för utskick
src/pages/api/pool/                     # API-endpoints för patientpool
src/pages/api/statistik/                # API-endpoints för statistik
src/pages/om-oss/kort-varsel-demo.astro # Offentlig demosida
supabase/migrations/                    # Databasschema
```

---

## Status

- ✅ Patientpool med prioritering
- ✅ SMS-utskick med gradvis eskalering
- ✅ Svarshantering (JA/NEJ/STOPP)
- ✅ Smart intervall-logik
- ✅ Statistik och dashboard
- ✅ Trendanalys
- ✅ AI-förberedelse (datasamling aktiv)
- 📋 Regelbaserad prediktion (planerad, kräver 500+ datapunkter)
- 📋 ML-modell (planerad, kräver 2000+ datapunkter)
- 📋 Open source-release (planerad)


---

# DEL C - 01 Teknisk (01-TEKNISK.md)

# 📱 Kort varsel SMS - Specifikation

> **Status:** ✅ Implementerad (fas 1-3 klar) | ⏳ Juridisk granskning pågår (IMY)  
> **Prioritet:** Hög  
> **Senast uppdaterad:** 2026-01-24

---

## 🔧 Teknisk översikt (för framtida referens)

### Vad är detta system?

**Kort varsel SMS** är ett internt verktyg för att fylla lediga operationstider. När en patient avbokar kan personal snabbt skicka SMS till andra patienter på väntelistan och få svar via en webbsida.

> 📱 **Interaktiv demo:** Det finns en publik demosida som förklarar systemet för personal och patienter:  
> **URL:** `/om-oss/kort-varsel-demo`  
> **Fil:** `src/pages/om-oss/kort-varsel-demo.astro`

### Teknologier som används

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SYSTEMARKITEKTUR                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐              │
│   │   NETLIFY   │     │  SUPABASE   │     │   46ELKS    │              │
│   │  (hosting)  │────▶│ (databas)   │     │   (SMS)     │              │
│   └─────────────┘     └─────────────┘     └─────────────┘              │
│         │                   │                   │                       │
│         │                   │                   │                       │
│   ┌─────▼─────────────────────────────────────▼─────┐                  │
│   │              ASTRO FRAMEWORK                     │                  │
│   │         (webbsidor + API-endpoints)              │                  │
│   └─────────────────────────────────────────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Komponenter förklarade

| Komponent | Vad det är | Används till | Webbadress |
|-----------|------------|--------------|------------|
| **Astro** | Webbramverk (som WordPress men kod) | Bygger hemsidan, hanterar logik | astro.build |
| **Supabase** | Databas + inloggning (som Firebase) | Lagrar data, hanterar användare | supabase.com |
| **46elks** | Svensk SMS-leverantör | Skickar/tar emot SMS | 46elks.se |
| **Netlify** | Hosting (som en webserver) | Publicerar hemsidan, kör schemalagda jobb | netlify.com |
| **GitHub** | Kodförvaring (som Dropbox för kod) | Versionshanterar all kod | github.com |

### Supabase - vad används?

Supabase är vår "backend" och ersätter traditionella databaser + serverlogik.

| Supabase-del | Vad det gör | Hur vi använder det |
|--------------|-------------|---------------------|
| **Database** | PostgreSQL-databas | Lagrar utskick, patienter, svar |
| **Auth** | Inloggningssystem | Personal loggar in med mejl/lösenord |
| **Row Level Security (RLS)** | Säkerhet på radnivå | Förhindrar obehörig åtkomst |
| **Functions** | Databasfunktioner | Atomära operationer (t.ex. "först till kvarn") |
| **Storage** | Fillagring | Profilbilder för personal |

**Inloggningsuppgifter:** Se `.env`-filen eller Supabase Dashboard.

### 46elks - SMS-leverantör

46elks är ett svenskt företag som hanterar SMS.

| Funktion | API-endpoint | Beskrivning |
|----------|--------------|-------------|
| **Skicka SMS** | `POST api.46elks.com/a1/sms` | Vi skickar, 46elks levererar till telefonen |
| **Ta emot SMS** | Webhook till vår server | 46elks ropar på `/api/sms/inkommande` |

**Kostnad:** ~0,40-0,60 kr per SMS (2026)

**Inloggningsuppgifter:** Se `.env`-filen (`ELKS_API_USER`, `ELKS_API_PASSWORD`)

### Netlify - vad kör där?

| Funktion | Beskrivning |
|----------|-------------|
| **Hosting** | Serverar hemsidan på `sodermalm.netlify.app` |
| **Serverless Functions** | API-endpoints körs som funktioner |
| **Scheduled Functions** | `scheduled-sms.mts` körs varje minut för gradvis SMS-utskick |
| **Miljövariabler** | Hemliga nycklar lagras säkert |

### Filstruktur (var finns vad?)

```
c:\Dev\ASTRO\SHARP\
│
├── src/                          ← ALL KOD FÖR HEMSIDAN
│   ├── pages/                    ← Webbsidor (.astro = HTML + logik)
│   │   ├── personal/
│   │   │   └── kort-varsel.astro ← Huvuddashboard för personal
│   │   ├── s/
│   │   │   └── [kod].astro       ← Svarssida för patienter
│   │   └── api/                  ← API-endpoints (backend-logik)
│   │       ├── kampanj/          ← Utskickshantering
│   │       ├── pool/             ← Patientpool
│   │       └── sms/              ← SMS-webhooks
│   ├── lib/                      ← Hjälpfunktioner
│   │   ├── supabase.ts           ← Databasanslutning
│   │   ├── auth.ts               ← Inloggningslogik
│   │   └── kryptering.ts         ← Kryptering av telefonnummer
│   └── components/               ← Återanvändbara delar
│
├── supabase/                     ← DATABASSCHEMA
│   ├── README.md                 ← Instruktioner
│   └── migrations/               ← SQL-filer att köra i Supabase
│       ├── 001-initial-setup.sql
│       ├── 002-kort-varsel.sql
│       └── ...
│
├── netlify/                      ← SCHEMALAGDA JOBB
│   └── functions/
│       └── scheduled-sms.mts     ← Körs varje minut
│
├── docs/                         ← DOKUMENTATION (du läser detta!)
│   └── KORT-VARSEL-SMS.md
│
├── .env                          ← HEMLIGA NYCKLAR (ALDRIG dela!)
├── package.json                  ← Projektberoenden (npm)
└── astro.config.mjs              ← Astro-konfiguration
```

### Databastabeller (i Supabase)

| Tabell | Beskrivning | Viktiga kolumner |
|--------|-------------|------------------|
| `sms_kampanjer` | Ett utskick = en ledig tid | datum, status, antal_platser |
| `sms_kampanj_mottagare` | Patienter i ett utskick | namn, svar, telefon_krypterad |
| `kort_varsel_patienter` | Patientpoolen (återanvänds) | namn, status, lakare[], akut, har_ont, op_liten, op_stor, sida |
| `lakare` | Lista av läkare | namn, aktiv |
| `profiles` | Personalens profiler | email, mobilnummer |
| `audit_logg` | Spårning av händelser | handelse_typ, detaljer |

### Miljövariabler (.env)

```env
# Supabase (databas + auth)
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx        # HEMLIG - full åtkomst!

# 46elks (SMS)
ELKS_API_USER=xxx
ELKS_API_PASSWORD=xxx

# Kryptering
POOL_ENCRYPTION_KEY=xxx              # För telefonnummer (AES-256)

# URL
SITE=https://sodermalm.netlify.app   # Används i SMS-länkar
```

### Säkerhet & GDPR

| Aspekt | Hur det hanteras |
|--------|------------------|
| **Telefonnummer** | Krypteras med AES-256 innan lagring |
| **Auto-radering** | Patienter raderas efter utgångsdatum |
| **Inloggning** | Endast behörig personal via Supabase Auth |
| **RLS** | Databasnivå-säkerhet förhindrar obehörig åtkomst |
| **Service Role Key** | Används endast server-side, aldrig i klient |

### Hur systemet fungerar (översikt)

```
1. PERSONAL SKAPAR UTSKICK
   └── /personal/kort-varsel.astro
       └── Anropar /api/kampanj/skapa.ts
           └── Sparar i Supabase: sms_kampanjer + sms_kampanj_mottagare
           └── Skickar SMS via 46elks

2. PATIENT FÅR SMS
   └── SMS innehåller länk: specialist.se/s/abc123
   
3. PATIENT KLICKAR LÄNK
   └── /s/[kod].astro renderas
       └── Visar JA/NEJ-knappar
       
4. PATIENT SVARAR
   └── Anropar /api/kampanj/svar.ts
       └── Atomär SQL-funktion (förhindrar dubbelbokningar)
       └── Uppdaterar sms_kampanj_mottagare.svar
       
5. GRADVIS UTSKICK (om aktiverat)
   └── scheduled-sms.mts körs varje minut
       └── Kollar: "Ska nästa SMS skickas nu?"
       └── Skickar till nästa patient i kön
       
6. UTSKICK AVSLUTAS
   └── Automatiskt när alla platser fyllda
   └── Eller manuellt av personal
```

### Om du behöver felsöka

| Problem | Var du hittar info |
|---------|-------------------|
| SMS skickas inte | Kolla `.env` (46elks-nycklar), Netlify logs |
| Inloggning fungerar inte | Supabase Dashboard → Auth |
| Data saknas | Supabase Dashboard → Table Editor |
| Webbsidan kraschar | Netlify → Deploys → View logs |
| Schemalagt jobb | Netlify → Functions → scheduled-sms |

### Kontaktinfo för tjänster

| Tjänst | Support | Dokumentation |
|--------|---------|---------------|
| Supabase | support@supabase.io | docs.supabase.com |
| 46elks | support@46elks.se | 46elks.se/docs |
| Netlify | support@netlify.com | docs.netlify.com |
| Astro | Discord community | docs.astro.build |

### 🚀 Snabbstart för ny utvecklare

Om du tar över projektet, gör så här:

**1. Klona projektet**
```bash
git clone https://github.com/ditt-repo/SHARP.git
cd SHARP
npm install
```

**2. Skapa `.env`-fil**
Kopiera `.env.example` (om den finns) eller skapa ny med variabler ovan.
Hämta nycklar från:
- Supabase Dashboard → Settings → API
- 46elks Dashboard → API Keys
- Netlify Dashboard → Site settings → Environment variables

**3. Starta lokal utveckling**
```bash
npm run dev
```
Öppna `http://localhost:4321/personal/kort-varsel`

**4. Förstå koden**
- Börja med `src/pages/personal/kort-varsel.astro` (huvudvyn)
- Titta på `src/pages/api/kampanj/skapa.ts` (hur utskick skapas)
- Läs `supabase/migrations/002-kort-varsel.sql` (databasstrukturen)

**5. Databasändringar**
- Gör aldrig direkta ändringar i Supabase Dashboard
- Skapa ny migration i `supabase/migrations/`
- Kör SQL i Supabase → SQL Editor
- Committa migrationen till Git

### Vanliga frågor (FAQ)

**Q: Var lagras patientdata?**
A: I Supabase (PostgreSQL-databas). Telefonnummer krypteras med AES-256.

**Q: Hur skickas SMS?**
A: Via 46elks API. Koden finns i `src/pages/api/kampanj/skapa.ts`.

**Q: Vad kostar det att driva?**
A: Supabase Free tier (0 kr), Netlify Free tier (0 kr), 46elks ~0,50 kr/SMS.

**Q: Hur lägger man till en ny läkare?**
A: I Supabase Dashboard → Table Editor → `lakare` → Insert row.

**Q: Hur ändrar man SMS-texten?**
A: I `src/pages/api/kampanj/skapa.ts`, sök efter `smsText`.

**Q: Vem kan logga in?**
A: Endast användare skapade i Supabase Auth (Dashboard → Authentication → Users).

---

## Ändringshistorik

| Datum | Ändring |
|-------|---------|
| 2026-01-24 | **Sida (HÖ/VÄ):** Höger/vänster sida för operationen, påverkar prioritering inom varje nivå |
| 2026-01-24 | **Läkare som array:** Flera läkare kan väljas per patient (ersätter flexibel_lakare) |
| 2026-01-24 | **Pensionärsålder 67+:** Patienter 67+ markeras tydligt som pensionärer |
| 2026-01-24 | **Renare patientpool:** Utskicksskapande flyttat till egen flik, enklare registreringsvy |
| 2026-01-24 | **Operationsstorlek:** Liten (5-15 min) / Stor (15-60 min) / Båda för flexibel schemaläggning |
| 2026-01-24 | **Förenklad patientpool:** Renare registreringsvy utan onödiga block |
| 2026-01-24 | **Prioritetsbaserade intervall:** AKUT (60 min), sjukskriven (30 min), ont (20 min) |
| 2026-01-24 | **Opt-out:** Patienter kan avregistrera sig via webben eller SMS (STOPP) |
| 2026-01-24 | **Ålder & sortering:** Ålder beräknas från personnummer, sorterbara kolumner |
| 2026-01-24 | **Utöka utskick:** Lägg till fler patienter till aktivt utskick |
| 2026-01-24 | **SQL-filer flyttade:** Ny struktur i `supabase/migrations/` |
| 2026-01-23 | **Läkare:** Läkare-dropdown, "flexibel läkare"-alternativ |
| 2026-01-22 | **Patientpool:** Ny modell med persistent patientlista, reservhantering, NEJ-spårning |
| 2026-01-22 | **Ny modell:** Stöd för 1-3 platser per utskick + tidsblock istället för exakt klockslag |
| 2026-01-22 | Implementation påbörjad: Dashboard, svarssida, API:er, databas-schema |

---

## 1. Bakgrund och syfte

### Problemet

| Situation | Kostnad |
|-----------|---------|
| Operation ställs in med kort varsel | ~10 000 kr förlorat |
| Väntelista | 2 månader |
| Outnyttjad kapacitet | Lokaler, personal, utrustning står still |

### Lösningen

Ett system för att snabbt kontakta patienter på väntelistan och fylla lediga operationstider.

**Flöde:**
```
Inställd operation → Personal skapar utskick (1-3 platser) → SMS skickas →
Patient klickar länk → Bekräftar pre-op fråga → Svarar JA →
Får bekräftelse + personal notifieras → Personal ringer patient → Bokar in
```

**Princip:** Först till kvarn. De första N som svarar JA får platserna. Övriga blir reserv.

### Flera platser per utskick

Systemet stödjer 1-3 lediga platser per utskick:

| Antal platser | Användningsfall |
|---------------|-----------------|
| **1 plats** | Standard - en patient ställde in |
| **2-3 platser** | Flera avbokningar samma dag, eller planerat "lucka-i-programmet" |

**Tidsblock istället för exakt tid:** Eftersom operationsordningen bestäms sent och patienter ofta reserverar hela dagen, anger vi valfritt tidsblock (förmiddag/eftermiddag) istället för exakt klockslag.

---

## 1b. Patientpool (ny modell)

Istället för att mata in patienter manuellt för varje utskick finns en **persistent patientpool** där alla kort varsel-patienter samlas.

### Översikt

```
┌─────────────────────────────────────────────────────────────────┐
│  📱 Kort varsel - Patientpool                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ + Lägg till patienter (namn, telefon, samtycke)           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Tillgängliga (8)   ⭐ Reserv (2)   ❌ NEJ (4)   ✅ Bokade (1) │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Patientstatus

| Status | Beskrivning | Åtgärd |
|--------|-------------|--------|
| **Tillgänglig** | Redo att kontaktas | Kan väljas till utskick |
| **Kontaktad** | Fått SMS, ej svarat | Väntar på svar |
| **⭐ Reserv** | Svarade JA men fick ej plats | Prioriteras i nästa utskick! |
| **❌ NEJ** | Tackade nej | Uppdatera journalsystemet, ta bort |
| **✅ Bokad** | Fick en tid | Visas som referens |

### Tillgängliga patienter (ny layout)

Listan visar nu mer information och är sortierbar:

```
┌─ Tillgängliga (8) ────────────────────────────────────────────┐
│  [Prio ↕] [Namn ↕]           [Ålder ↕] [Läkare ↕] [Dagar ↕]  │
├──────────────────────────────────────────────────────────────┤
│  ☐ 🚨    Anna Andersson         68      Dr. Siri      3d    │
│  ☐ 📋🔥  Karl Karlsson          45      Dr. Lindberg  5d    │
│  ☐ 🔥    Erik Eriksson          72      Dr. Siri      2d    │
│  ☐       Lisa Larsson           55      Dr. Lindberg  6d    │
│  ...                                                          │
│                                                                │
│  [☑️ Välj alla]  [📤 Skapa utskick med valda]                │
└────────────────────────────────────────────────────────────────┘
```

**Kolumner:**
- **Prio:** 🚨 AKUT, 📋 Sjukskriven, 🔥 Ont (kan kombineras)
- **Namn:** Fullständigt namn (click-to-copy)
- **Ålder:** Beräknad från personnummer (grön = 65+ pensionär)
- **Läkare:** Vilken läkare patienten tillhör
- **Dagar:** Dagar kvar till ordinarie operation (orange = ≤7 dagar)

**Sortering:** Klicka på kolumnrubriken för att sortera. AKUT-patienter är **alltid överst** oavsett annan sortering.

**"Dagar kvar":** Baserat på patientens ordinarie operationsdatum, inte 7 dagar från tillägg.

### Reservlista (prioriteras!)

Patienter som svarade JA men inte fick plats (någon annan hann före):

```
┌─ ⭐ Reserv (2) ────────────────────────────────────────────────┐
│ ⭐ Erik Eriksson     svarade JA 22/1   ← Prioritera!          │
│ ⭐ Maria Månsson     svarade JA 22/1   ← Prioritera!          │
│                                                                │
│ 💡 Dessa har visat att de är motiverade och snabba.           │
│    Läggs automatiskt först i kön vid nästa utskick.           │
└────────────────────────────────────────────────────────────────┘
```

### NEJ-lista (uppdatera journalsystemet)

Patienter som tackat nej måste markeras i journalsystemet:

```
┌─ ❌ Tackat NEJ (4) ────────────────────────────────────────────┐
│ Per Persson       nej 22/1   [✓ Hanterad] [🗑️ Ta bort]       │
│ Sara Svensson     nej 22/1   [✓ Hanterad] [🗑️ Ta bort]       │
│ Olle Olsson       nej 21/1   [✓ Hanterad] [🗑️ Ta bort]       │
│                                                                │
│ 💡 Klicka "Hanterad" när du uppdaterat journalsystemet.       │
│    Patienten tas bort från listan (eller auto-raderas).       │
└────────────────────────────────────────────────────────────────┘
```

### Bokade (referens)

```
┌─ ✅ Bokade (1) ────────────────────────────────────────────────┐
│ Anna Andersson    bokad tis 28/1 förmiddag                    │
│                                                                │
│ 💡 Visas som referens. Tas bort automatiskt efter op-datum.   │
└────────────────────────────────────────────────────────────────┘
```

### Arbetsflöde med patientpool

```
1. Personal lägger till patienter från journalsystemet
   (namn, telefon, samtycke - en gång)
        ↓
2. Avbokning inkommer
        ↓
3. Personal väljer patienter från poolen + skapar utskick
        ↓
4. Patienter svarar:
   - JA (får plats) → Status: Bokad
   - JA (ej plats)  → Status: Reserv ⭐
   - NEJ            → Status: NEJ ❌
   - Ej svarat      → Tillbaka till Tillgänglig
        ↓
5. Vid nästa avbokning: Reserv ⭐ prioriteras automatiskt
        ↓
6. NEJ-patienter: Uppdatera journal → Markera hanterad → Ta bort
        ↓
7. Auto-radering efter 7 dagar (GDPR)
```

### Fördelar

| Utan pool (nuvarande) | Med pool |
|----------------------|----------|
| Mata in alla patienter varje gång | Mata in en gång, återanvänd |
| Vet inte vem som tackat NEJ | Tydlig NEJ-lista för journaluppdatering |
| Reservpatienter "försvinner" | Reserv prioriteras automatiskt |
| Manuell hantering | Automatisk statusuppdatering |

---

## 1c. Smart intervall-logik (hybrid)

Systemet använder en **hybrid approach** för SMS-intervall som kombinerar:
1. **Dagar till operation** - avgör basintervall
2. **Tidspress** - justerar om det är sent på dagen innan
3. **Manuell override** - personal kan alltid ändra

### Automatiskt förval baserat på dagar

| Dagar kvar | Intervall | Logik |
|------------|-----------|-------|
| **Samma dag** | 5 min | Desperat läge - maximal hastighet |
| **1 dag (dagen innan)** | 5-10 min | Måste lösas idag - högt tempo |
| **2 dagar** | 10 min | Gott om tid men vill lösa snart |
| **3+ dagar** | 20 min | Lugnt tempo - systemet tuggar på |

### Tidspress (dagen innan operation)

Om det är **dagen innan** operation justeras intervallet baserat på klockan:

| Tid på dagen | Justering | Anledning |
|--------------|-----------|-----------|
| Före 12:00 | Normal | Gott om tid kvar |
| 12:00-14:00 | -25% | Börjar bli press |
| 14:00-16:00 | -50% | Stressläge |
| Efter 16:00 | Minimum (5 min) | Desperat - hinner knappt |

### Automatisk varning

Om tiden inte räcker visas en varning:

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Med 10 min intervall och 8 patienter tar det 80 min.       │
│     Du har ca 45 min kvar till 16:00.                          │
│     Rekommenderat intervall: 5 min.                            │
│                                                                 │
│     [Använd rekommenderat intervall]                           │
└─────────────────────────────────────────────────────────────────┘
```

### Prioriteringsordning (sortering)

Patienter sorteras **alltid efter medicinsk prioritet** (oavsett intervall):

```
1. 🚨 AKUT-patienter (alltid först!)
2. 📋 Sjukskrivna (ont + funktionsbortfall)
3. 🔥 Patienter med mycket ont
4. 👴 Pensionärer (67+) - flexibla tider
5. ⏰ Övriga (normal prioritet)
```

Inom varje prioritetsnivå sorteras i följande ordning:

1. **Sida (HÖ/VÄ)** - Rätt sida först om utskicket angett önskad sida
2. **Planerat operationsdatum** - Patienter med längst väntetid först (de är mest motiverade att flytta fram sin operation)

### Manuell override

Personal kan **alltid** ändra intervallet manuellt:

```
┌─────────────────────────────────────────────────────────────────┐
│  Tid mellan varje SMS-utskick                                   │
│                                                                 │
│  [ 10 minuter ▼ ]  [Auto]                                      │
│                                                                 │
│  💡 Rekommenderat intervall: 10 minuter                        │
│     2 dagar kvar - normalt tempo                               │
└─────────────────────────────────────────────────────────────────┘
```

- **"Auto"-badge** visas när systemet valt intervallet
- Ändrar personal intervallet försvinner "Auto"
- Vid nytt datum återställs auto-valet

| Intervall | Användningsfall |
|-----------|-----------------|
| **5 min** | Samma dag eller sent dagen innan |
| **10 min** | Dagen innan (normalläge) eller 2 dagar kvar |
| **15-20 min** | 2-3 dagar kvar |
| **30-60 min** | 3+ dagar kvar - lugnt tempo |

---

## 1d. Operationsstorlek

Systemet stödjer klassificering av operationer efter tidsåtgång för att matcha patienter med rätt lediga tidsblock.

### Operationsklasser

| Storlek | Tidsåtgång | Ikon | Beskrivning |
|---------|------------|------|-------------|
| **Liten** | 5-15 min | 🔹 | Korta ingrepp som injektioner, små exkisioner |
| **Stor** | 15-60 min | 🔷 | Standard-operationer som artroskopi, ligamentplastik |
| **Båda** | Flexibel | L+S | Patienten kan fylla antingen ett litet eller stort tidsblock |

### Användning vid registrering

Vid registrering av patient i poolen väljer man:

```
┌─────────────────────────────────────────────────────────────────┐
│  Operationsstorlek *                                            │
│                                                                 │
│  [☑️ 🔹 Liten]     [☑️ 🔷 Stor]                                 │
│     5-15 min          15-60 min                                 │
│                                                                 │
│  💡 Kryssa i båda om patienten kan fylla antingen ett litet    │
│     eller stort utrymme                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Varför detta är viktigt

| Scenario | Lösning |
|----------|---------|
| Alla stora operationer är bokade, men ett litet tidsblock är ledigt | Filtrera på patienter med liten operation |
| Ett stort tidsblock är ledigt, ingen stor operation finns | Patienter med "båda" kan fylla utrymmet med en liten operation |
| Behöver fylla ett specifikt tidsblock | Filtrera på rätt operationsstorlek vid utskicksskapande |

### Filtrering vid utskicksskapande

Framtida funktion: Vid utskicksskapande kan man filtrera vilka patienter som kontaktas baserat på om den lediga tiden passar en liten eller stor operation.

---

## 1e. Sida (HÖ/VÄ)

Systemet stödjer registrering av vilken sida som ska opereras för att optimera utrustningsbyten under operationsdagen.

### Bakgrund

Vid operationsdagar (t.ex. axelkirurgi) opereras normalt alla vänster-axlar först, sedan alla höger-axlar. Detta beror på att flytta utrustning mellan höger och vänster sida är tidskrävande.

### Användning

**Vid patientregistrering:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Sida *                                                          │
│                                                                 │
│  [○ HÖ]     [○ VÄ]                                              │
│                                                                 │
│  💡 Vilken sida ska opereras?                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Vid utskicksskapande:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Önskad sida *                                                   │
│                                                                 │
│  [○ HÖ]     [○ VÄ]                                              │
│                                                                 │
│  💡 Patienter med rätt sida prioriteras inom varje nivå         │
└─────────────────────────────────────────────────────────────────┘
```

### Prioriteringslogik

Sidan fungerar som en sekundär sortering inom varje prioritetsnivå:

```
Sorteringsordning (om utskick önskar HÖ):

1. Akut + HÖ
2. Akut + VÄ
3. Mycket ont + HÖ
4. Mycket ont + VÄ
5. Sjukskriven + HÖ
6. Sjukskriven + VÄ
7. Vanlig + HÖ
8. Vanlig + VÄ
```

Detta skapar en "drift" mot rätt sida utan att äventyra den medicinska prioriteringen.

### Visning i patientlistan

| Kolumn | Visas som | Betydelse |
|--------|-----------|-----------|
| **Sida** | HÖ | Höger sida |
| **Sida** | VÄ | Vänster sida |
| **Sida** | - | Ej angiven |

---

## 1f. Patient-avregistrering (opt-out)

Patienter kan välja att **avregistrera sig** från kort varsel-listan. Detta kan göras på två sätt:

### Via webben (rekommenderat)

På svarssidan (`/s/[kod]`) finns en knapp:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [ ✅ JA, jag kan ]    [ ❌ NEJ, jag kan inte ]                 │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [ Jag vill inte längre få dessa förfrågningar ]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Effekt:** Patienten markeras som "avregistrerad" i systemet och får inga fler kort varsel-SMS.

### Via SMS (backup)

Patienten kan svara **STOPP** på ett SMS. Systemet känner igen:
- STOPP
- STOP
- AVSLUTA
- AVREGISTRERA
- TA BORT MIG

**Bekräftelse-SMS skickas:**
```
Du är nu avregistrerad från våra kortvarselsms.
Din ordinarie operationstid påverkas inte.
/Södermalms Ortopedi
```

### Visuell indikation i utskicksvy

Avregistrerade patienter markeras tydligt:

```
┌─ Utskick: Ledig tid 28/1 ────────────────────────────────────────┐
│                                                                  │
│  🚫 Anna Andersson    avregistrerad   → Ändra i kalender        │
│  ✅ Karl Karlsson     JA              📞 Ring!                   │
│  ❌ Erik Eriksson     NEJ                                        │
│  ⏳ Lisa Larsson      väntar                                     │
│                                                                  │
│  💡 "Ändra i kalender" = byt från "operation kortvarsel"        │
│     till "operation" i kalendersystemet                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. SMS-samtycke (Hälsodeklaration)

### Formulering för hälsodeklarationen

```
☑️ Jag godkänner SMS-kommunikation om mina bokningar, 
   inklusive förfrågan om lediga operationstider vid avbokningar.
```

**Notering:** Patienten har redan loggat in med BankID - ingen separat underskrift behövs.

### Effekt av samtycke

| Med samtycke | Utan samtycke |
|--------------|---------------|
| Tydliga SMS med namn, datum, operationstyp | Vaga SMS utan hälsoinformation |
| Tydlig juridisk grund (GDPR Art. 9(2)(a)) | Berättigat intresse (osäkrare) |

---

## 3. Två SMS-modeller

Personal väljer automatiskt rätt mall baserat på om patienten har godkänt SMS-kommunikation.

### Modell A: Vag formulering (utan samtycke)

```
Hej! Vi har en ledig operationsplats hos Södermalms Ortopedi 
tis 28/1.

Kan du komma med kort varsel?
Svara här: specialist.se/s/x7k9m2

OBS: Först till kvarn!
/Södermalms Ortopedi
```

**Med flera platser:**
```
Hej! Vi har 2 lediga operationsplatser hos Södermalms Ortopedi 
tis 28/1 (förmiddag).
...
```

### Modell B: Tydlig formulering (med samtycke)

```
Hej Anna! Vi har en ledig operationsplats för axeloperation 
tis 28/1 (förmiddag).

Kan du komma med kort varsel?
Svara här: specialist.se/s/x7k9m2

OBS: Först till kvarn - flera har fått denna förfrågan!
/Södermalms Ortopedi
```

**Med flera platser:**
```
Hej Anna! Vi har 2 lediga operationsplatser för axeloperation 
tis 28/1 (förmiddag).
...
```

### Dynamisk text

| Antal platser | Text i SMS |
|---------------|------------|
| 1 | "en ledig operationsplats" |
| 2 | "2 lediga operationsplatser" |
| 3 | "3 lediga operationsplatser" |

| Tidsblock | Text i SMS |
|-----------|------------|
| Inget | "tis 28/1" |
| Förmiddag | "tis 28/1 (förmiddag)" |
| Eftermiddag | "tis 28/1 (eftermiddag)" |

---

## 4. Gradvis SMS-utskick (Batchning)

De flesta som är intresserade svarar inom 10-15 minuter. Istället för att skicka alla SMS samtidigt kan man välja att skicka **en patient i taget** med ett visst intervall.

### Dynamiskt intervall baserat på tillgänglig tid

Systemet föreslår intervall automatiskt baserat på hur bråttom det är:

| Situation | Föreslagen intervall | Logik |
|-----------|---------------------|-------|
| Operation om 3+ dagar | 20 min | Gott om tid - ge varje patient chans att svara |
| Operation om 1-2 dagar | 10 min | Standard |
| Operation imorgon, <3h kvar till deadline | 5 min | Bråttom - snabbare utskick |
| Operation imorgon, <1h kvar till deadline | 2 min | Mycket bråttom |

### Inställningar vid utskicksskapande

```
┌─────────────────────────────────────────────────────────────────┐
│  Utskicksmetod:                                                 │
│                                                                 │
│  ○ Skicka alla direkt                                          │
│  ● Skicka gradvis (en i taget)                                 │
│                                                                 │
│    Intervall: [10 ▼] minuter mellan varje SMS                  │
│                                                                 │
│    💡 Rekommenderat intervall: 10 min                          │
│       (Operation om 2 dagar, deadline 18:00)                   │
│                                                                 │
│    → 10 patienter × 10 min = ~90 min totalt                    │
│       (om ingen svarar JA innan)                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Manuell justering:** Personal kan alltid ändra intervallet. T.ex. om man bara har 30 minuter kvar och 10 patienter → sätt 3 min intervall.

### Fördelar

- **Mindre "slöseri"** - Om patient 1 svarar JA på 5 min, behöver patient 2-10 aldrig få SMS
- **Minskad FOMO** - Färre får "tiden tagen"-SMS
- **Lägre kostnad** - Färre SMS skickas totalt
- **Rättvisare** - Varje patient får rimlig tid att svara

### Exempel: Bråttom-scenario

```
Klockan är 15:00
Operation: Imorgon 08:00
Deadline: 17:00 (2 timmar kvar)
Patienter: 10 st

Föreslagen intervall: 5 min
→ 10 × 5 = 50 min (hinner precis innan deadline)

Flöde:
15:00  Patient 1 får SMS
15:05  Patient 2 får SMS (om ingen svarat JA)
15:10  Patient 3 får SMS (om ingen svarat JA)
...
15:45  Patient 10 får SMS (om ingen svarat JA)
17:00  Deadline - utskicket stängs
```

### Exempel: Gott om tid

```
Operation: Om 3 dagar
Ingen deadline satt
Patienter: 10 st

Föreslagen intervall: 20 min
→ 10 × 20 = 200 min (~3 timmar)

Flöde:
14:00  Patient 1 får SMS
14:20  Patient 2 får SMS (om ingen svarat JA)
14:40  Patient 3 får SMS (om ingen svarat JA)
...
```

### Flöde sammanfattning

```
┌──────────────────────────────────────────────────────────────────┐
│  Patient 1 får SMS                                               │
│       ↓ vänta [intervall] minuter                               │
│  Ingen JA? → Patient 2 får SMS                                  │
│       ↓ vänta [intervall] minuter                               │
│  Ingen JA? → Patient 3 får SMS                                  │
│       ...                                                        │
├──────────────────────────────────────────────────────────────────┤
│  Om någon svarar JA → Stoppa automatiskt                        │
│  Resterande patienter får aldrig något SMS                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Svarssida för patient

**URL:** `specialist.se/s/[unik-kod]`

> **Säkerhet:** Koden ska vara minst 16 tecken (UUID v4 eller slumpsträng) - inte sekventiella ID:n.

### Steg 1: Pre-op bekräftelse

Innan patienten kan svara JA måste de bekräfta en fråga. Dessutom visas en **dynamisk varning om blodförtunnande** beroende på hur långt fram i tiden operationen är.

#### Variant A: Operation imorgon (1 dag)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [Logo: Södermalms Ortopedi]                                   │
│                                                                 │
│                    📅 Ledig tid                                 │
│                                                                 │
│  Hej Anna!                                                      │
│                                                                 │
│  En operationstid har blivit ledig:                            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📅  Imorgon tisdag 28 januari, kl 08:00                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Innan du svarar, bekräfta följande:                           │
│                                                                 │
│  ☐ Jag har inga öppna sår eller pågående infektioner          │
│    i området som ska opereras.                                  │
│                                                                 │
│  ⚠️ OBS: Tar du blodförtunnande medicin?                       │
│  Då hinner du troligen inte sätta ut den i tid.                │
│  Kontakta oss på 08-123 45 67 innan du svarar JA.              │
│                                                                 │
│  ┌───────────────────────┐    ┌───────────────────────┐        │
│  │    ✅ JA, jag kan     │    │    ❌ NEJ, jag kan    │        │
│  │       komma!          │    │       inte            │        │
│  └───────────────────────┘    └───────────────────────┘        │
│         (aktiveras när rutan kryssas)                           │
│                                                                 │
│  ⚠️ Flera patienter har fått denna förfrågan.                  │
│  Först till kvarn!                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Variant B: Operation om 2 dagar

```
┌─────────────────────────────────────────────────────────────────┐
│  ...                                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📅  Onsdag 29 januari, kl 08:00 (om 2 dagar)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Innan du svarar, bekräfta följande:                           │
│                                                                 │
│  ☐ Jag har inga öppna sår eller pågående infektioner          │
│    i området som ska opereras.                                  │
│                                                                 │
│  💊 Tar du blodförtunnande medicin?                            │
│  När vi ringer dig får du instruktioner om hur du ska göra.    │
│  Vanligtvis sätts blodförtunnande ut ca 2 dagar innan.         │
│                                                                 │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

#### Variant C: Operation om 3+ dagar

```
┌─────────────────────────────────────────────────────────────────┐
│  ...                                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📅  Torsdag 30 januari, kl 08:00 (om 3 dagar)          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Innan du svarar, bekräfta följande:                           │
│                                                                 │
│  ☐ Jag har inga öppna sår eller pågående infektioner          │
│    i området som ska opereras.                                  │
│                                                                 │
│  (Ingen varning om blodförtunnande - tillräckligt med tid)     │
│                                                                 │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Sammanfattning: Dynamisk blodförtunnande-varning

| Dagar till op | Visas | Text |
|---------------|-------|------|
| **1 dag (imorgon)** | ⚠️ Varning | "Tar du blodförtunnande? Kontakta oss innan du svarar JA." |
| **2 dagar** | 💊 Info | "När vi ringer får du instruktioner. Vanligtvis sätts det ut ca 2 dagar innan." |
| **3+ dagar** | Ingen | - |

**Viktigt:** Patienten ska aldrig själv sätta ut blodförtunnande utan läkarordination. Texten för 2 dagar informerar endast om att de kommer få instruktioner vid uppringning.

**Notering:** JA-knappen är grå/inaktiv tills checkboxen kryssas i.

### Steg 2a: Efter JA-svar (första patienten)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                       ✅ Tack!                                  │
│                                                                 │
│  Du har svarat JA till tiden tisdag 28/1 kl 08:00.             │
│                                                                 │
│  Vi bokar nu in dig och ringer upp dig inom kort.              │
│                                                                 │
│  Vid frågor: 08-123 45 67                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Steg 2b: Efter JA-svar (reserv)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                       ⏰ Du är reserv                           │
│                                                                 │
│  Tack för din snabba respons!                                  │
│  En annan patient hann precis före denna gång.                 │
│                                                                 │
│  Eftersom du svarade snabbt har vi noterat att du är alert.   │
│  Om denna tid mot förmodan inte fungerar för den andra         │
│  patienten kontaktar vi dig i första hand.                     │
│                                                                 │
│  Vi skickar en ny förfrågan så fort nästa tid dyker upp!       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Steg 2c: Om utskicket är avslutat

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              ⏰ Denna förfrågan är avslutad                     │
│                                                                 │
│  Tiden är nu bokad.                                             │
│  Din ordinarie tid kvarstår.                                    │
│                                                                 │
│  Vi återkommer om nya kortvarseltider uppstår!                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Steg 3: Efter NEJ-svar

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              Tack för ditt svar!                                │
│                                                                 │
│  Vi noterar att du inte kan komma denna gång.                  │
│  Din ordinarie tid kvarstår.                                    │
│                                                                 │
│  💡 Ångrar du dig?                                              │
│  Ring oss på 08-123 45 67 så länge tiden fortfarande är        │
│  ledig - först till kvarn gäller!                              │
│                                                                 │
│  Vi återkommer vid nya kortvarseltider!                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Automatiska SMS-svar

### 6.1 När patient svarar JA (första patienten)

```
Tack för att du kan komma med kort varsel!
Vi bokar nu in dig och ringer upp dig inom kort.
/Södermalms Ortopedi
```

### 6.2 När patient svarar JA (reserv)

```
Tack för din snabba respons!
En annan patient hann precis före denna gång.

Eftersom du svarade snabbt har vi noterat dig.
Om tiden inte fungerar för den andre kontaktar vi dig först!

Vi återkommer vid nästa lediga tid.
/Södermalms Ortopedi
```

### 6.3 När tiden är fylld - till de som ej svarat

Alla patienter som **inte svarat ännu** får automatiskt:

```
Hej! Tiden vi frågade om har nu blivit bokad.
Din ordinarie tid kvarstår.

Vi återkommer vid nästa lediga tid!
/Södermalms Ortopedi
```

### 6.4 Ångra NEJ-svar

**Notering:** Det skickas inget SMS när patient svarar NEJ - de ser bara bekräftelsen på webbsidan med information om att de kan ringa om de ångrar sig.

#### När kan patient ångra sig?

| Situation | Kan ångra sig? |
|-----------|---------------|
| Svarat NEJ, tiden fortfarande ledig | ✅ Ja - ring kliniken |
| Svarat NEJ, någon annan svarat JA men ej bekräftad | ✅ Ja - kan bli reserv |
| "Tiden bokad"-SMS har gått ut | ❌ Nej - för sent |

**Princip:** Tiden är inte slutgiltigt bokad förrän personal har ringt och bekräftat med patienten som svarade JA. Fram till dess kan NEJ-svarare ringa och "ta tillbaka" sitt svar.

---

## 7. Dashboard för personal

**URL:** `/personal/kort-varsel`

### 7.1 Skapa utskick

```
┌─────────────────────────────────────────────────────────────────┐
│  📱 Skapa kort varsel-utskick                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Ledig tid                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Datum: [28 jan 2026 ▼]    Tid: [08:00 ▼]               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Operationstyp (valfritt):                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [ Axeloperation                                    ▼ ] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Mottagare (klistra in från väntelista):                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Anna Andersson, 0701234567, ✓samtycke                   │   │
│  │ Karl Karlsson, 0709876543, ✗samtycke                    │   │
│  │ Erik Eriksson, 0701111111, ✓samtycke                    │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Sortering (valfritt - påverkar vem som får SMS först):        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☐ Stark smärta först                                    │   │
│  │ ☐ Sjukskrivna först                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│  (Kräver att info finns i inklistrade data)                    │
│                                                                 │
│  Utskicksmetod:                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Skicka alla direkt                                    │   │
│  │ ● Skicka gradvis (en i taget)                           │   │
│  │   Intervall: [10 ▼] min  (💡 rekommenderat)             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📱 Notifiera personal vid JA-svar:                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ☑️ Maria Sköterska (073-111 22 33)                      │   │
│  │ ☑️ Dr. Carlito (070-444 55 66)                          │   │
│  │ ☐ Anna Reception (070-777 88 99)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │           🚀 Skicka utskick                           │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Notering om sortering:** Detta är inte medicinsk prioritering utan praktiska faktorer. Patienter med stark smärta eller sjukskrivning har ofta mest att vinna på en snabbare operation.

### 7.2 Realtidsvy av svar

```
┌─────────────────────────────────────────────────────────────────┐
│  📱 Utskick: Ledig tid 28/1 kl 08:00                           │
│  Status: ⏳ Väntar på svar                                      │
│  Utskick: Gradvis (3 st var 10:e min)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 Skickade: 6/10    ✅ JA: 0    ❌ NEJ: 2    ⏳ Väntar: 4    │
│      Nästa batch om: 4:32                                       │
│                                                                 │
│  Mottagare:                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✉️ Anna Andersson      skickat  14:30  (ej svarat)      │   │
│  │ ❌ Karl Karlsson       NEJ      14:35                    │   │
│  │ ❌ Erik Eriksson       NEJ      14:38                    │   │
│  │ ✉️ Lisa Larsson        skickat  14:40  (ej svarat)      │   │
│  │ ✉️ Maria Månsson       skickat  14:40  (ej svarat)      │   │
│  │ ✉️ Olle Olsson         skickat  14:40  (ej svarat)      │   │
│  │ ⏸️ Per Persson         väntar   (batch 3)               │   │
│  │ ⏸️ Sara Svensson       väntar   (batch 3)               │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📱 Notifierar: Maria Sköterska, Dr. Carlito                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 När någon svarar JA

```
┌─────────────────────────────────────────────────────────────────┐
│  📱 Utskick: Ledig tid 28/1 kl 08:00                           │
│  Status: ✅ FYLLD                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🎉 Anna Andersson svarade JA kl 14:52!                 │   │
│  │                                                          │   │
│  │  📞 Ring henne: 070-123 45 67                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📊 Skickade: 6/10    ✅ JA: 1    🔄 Reserv: 1    ❌ NEJ: 2   │
│      ⏸️ Batch 3-4 stoppade automatiskt                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ Anna Andersson      JA     14:52  ← RING HENNE!      │   │
│  │ 🔄 Karl Karlsson       JA     14:55  ← Reserv           │   │
│  │ ❌ Erik Eriksson       NEJ    14:38                      │   │
│  │ ⏹️ Per Persson         -      (aldrig skickat)          │   │
│  │ ⏹️ Sara Svensson       -      (aldrig skickat)          │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Om Anna inte kan: ┌────────────────────────────────────────┐  │
│                    │ 📞 Ring reserv: Karl Karlsson          │  │
│                    │    070-987 65 43                        │  │
│                    └────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Automatisk stängning (tidsgräns)

Om operationen är nästa dag vill man inte att någon svarar JA klockan 24:00 - personal kan inte agera på det. Därför kan man sätta en **sista svarstid**.

#### Inställning vid kampanjskapande

```
┌─────────────────────────────────────────────────────────────────┐
│  ⏰ Sista svarstid (valfritt):                                  │
│                                                                 │
│  Operation: imorgon 28/1 kl 08:00                              │
│                                                                 │
│  ○ Ingen tidsgräns (patienter kan svara när som helst)         │
│  ● Stäng kampanjen automatiskt kl: [18:00 ▼]                   │
│                                                                 │
│  💡 Rekommendation: Sätt tidsgräns om operationen är           │
│     inom 24 timmar.                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Beteende vid tidsgräns

| Situation | Vad händer |
|-----------|------------|
| Klockan passerar tidsgränsen | Kampanjen stängs automatiskt |
| Ingen har svarat JA | Status: "misslyckad" |
| Patient försöker svara efter stängning | Ser "Denna förfrågan är avslutad" |

#### Automatisk föreslagen tidsgräns

| Dagar till operation | Föreslagen tidsgräns |
|---------------------|----------------------|
| 1 dag (imorgon) | 18:00 samma dag |
| 2 dagar | 20:00 dagen innan |
| 3+ dagar | Ingen (valfritt) |

**Notering:** Personal kan alltid stänga kampanjen manuellt innan tidsgränsen.

---

### 7.5 Avsluta kampanj manuellt

Ibland behöver man avsluta en kampanj manuellt - antingen för att tiden fylldes på annat sätt, eller för att ge upp efter att ha provat tillräckligt.

```
┌─────────────────────────────────────────────────────────────────┐
│  📱 Utskick: Ledig tid 28/1 kl 08:00                           │
│  Status: ⏳ Väntar på svar                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 Skickade: 10/10    ✅ JA: 0    ❌ NEJ: 4    ⏳ Väntar: 6   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Ingen har svarat JA ännu. Vad vill du göra?            │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  📤 Skicka till fler patienter (+10 st)         │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  ✅ Tiden fylld på annat sätt (stäng kampanj)   │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │                                                          │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  ❌ Ge upp - tiden förblir tom (stäng kampanj)  │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Kampanjutfall (för statistik)

| Utfall | Beskrivning | Sparas som |
|--------|-------------|------------|
| **Fylld via SMS** | Någon svarade JA och bekräftades | `fylld_via_sms` |
| **Fylld på annat sätt** | Personal fyllde tiden manuellt (t.ex. mottagningspatient) | `fylld_manuellt` |
| **Misslyckad** | Ingen svarade JA, tiden förblev tom | `misslyckad` |
| **Avbruten** | Kampanjen avbröts innan alla svar kom in | `avbruten` |

### 7.6 Skicka till fler patienter

Om första batchen inte ger resultat kan man utöka kampanjen:

```
┌─────────────────────────────────────────────────────────────────┐
│  📤 Skicka till fler patienter                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Redan kontaktade: 10 patienter                                │
│  Väntar på svar från: 6 patienter                              │
│                                                                 │
│  Lägg till fler mottagare:                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Lisa Larsson, 0702222222, ✓samtycke                     │   │
│  │ Per Persson, 0703333333, ✓samtycke                      │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ⚠️ De ursprungliga 10 har redan fått SMS - de får inget nytt. │
│                                                                 │
│  ┌───────────────────────────────────────────────────────┐     │
│  │        📤 Skicka till nya patienter (+10 st)          │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.7 Bekräfta efter uppringning

När personal har ringt patienten som svarade JA:

```
┌─────────────────────────────────────────────────────────────────┐
│  📱 Utskick: Ledig tid 28/1 kl 08:00                           │
│  Status: ✅ FYLLD - Väntar på bekräftelse                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🎉 Anna Andersson svarade JA!                                 │
│  📞 Ring henne: 070-123 45 67                                  │
│                                                                 │
│  Gick samtalet bra?                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ✅ Ja, bokningen är bekräftad                          │   │
│  │     (Kampanjen avslutas, övriga får "tiden bokad"-SMS)  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ❌ Nej, hon kunde inte (ring reserv istället)          │   │
│  │     → Karl Karlsson (reserv): 070-987 65 43             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🔄 Ingen av dem kunde - fortsätt vänta på svar         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.8 Statistik (aggregerad)

Enkel statistik för att följa upp och förbättra systemet. **Ej personbaserad** - endast aggregerade siffror.

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Statistik - Kort varsel                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Totalt (senaste 30 dagarna):                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Kampanjer skapade:     12                              │   │
│  │  Kampanjer fyllda:      10  (83% fyllnadsgrad)          │   │
│  │    - via SMS:           8                               │   │
│  │    - manuellt:          2                               │   │
│  │  Misslyckade:           2                               │   │
│  │  SMS skickade totalt:   87                              │   │
│  │  Uppskattad besparing:  ~100 000 kr                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Effektivitet:                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SMS per fylld tid:          8,7 st (snitt)             │   │
│  │  Mediantid till första JA:   8 min                      │   │
│  │  Svarsfrekvens (inom 1h):    45%                        │   │
│  │  Behövde utöka kampanj:      3 av 12 (25%)              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Svarsmönster:                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  JA-svar:          32%                                  │   │
│  │  NEJ-svar:         28%                                  │   │
│  │  Ingen respons:    40%                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Nyckeltal: SMS per fylld tid** - Visar hur effektivt systemet är. Lågt tal = bra (få SMS behövs för att fylla en tid).

**Notering:** Statistiken lagras aggregerat och innehåller inga personuppgifter. Används för att optimera systemet (t.ex. batch-storlek, intervall).

---

## 8. Indikator på hemsidan (Aktiv kampanj)

En liten röd indikator visas i hörnet av hemsidan när det finns en **pågående, ofylld** kort varsel-kampanj. Detta gör att kollegor som inte skapat kampanjen ändå ser att det pågår en förfrågan.

### Varför detta behövs

- Läkare A skapar kampanj för en ledig tid
- Läkare B har mottagning och ser den "tomma" tiden i schemat
- Utan indikator: B kanske bokar in en ny patient → dubbelbokad tid
- Med indikator: B ser röda ikonen → vet att tiden kanske fylls

### Utseende

```
┌─────────────────────────────────────────────────────────────────┐
│  [Header - Södermalms Ortopedi]                    🔴 [👤]     │
│                                                    ↑            │
│                                        Röd prick = aktiv        │
│                                        kampanj pågår            │
└─────────────────────────────────────────────────────────────────┘
```

### Beteende

| Status | Indikator |
|--------|-----------|
| Ingen aktiv kampanj | Ingen ikon visas |
| Pågående kampanj (ej fylld) | 🔴 Röd prick (pulserar) |
| Kampanj fylld men ej bekräftad | 🟡 Gul prick |
| Klick på ikonen | Går till `/personal/kort-varsel` |

### Implementation

Lägg till en liten komponent i headern som:
1. Pollar `/api/kampanj/aktiv` var 30:e sekund (endast om inloggad)
2. Visar röd/gul prick om det finns aktiv kampanj
3. Klickbar - tar användaren till dashboard

---

## 9. Personalregister för notifikationer

Varje personal registrerar sitt mobilnummer i sin profil.

### Hantering i `/personal/profil`

```
┌─────────────────────────────────────────────────────────────────┐
│  👤 Min profil                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Namn: Maria Sköterska                                          │
│  E-post: maria@kliniken.se                                      │
│                                                                 │
│  📱 Mobilnummer för SMS-notifikationer:                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 073-111 22 33                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ☑️ Jag vill kunna ta emot kort varsel-notifikationer          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Varför detta är viktigt

- **Sjuksköterskan** som skickar kampanjen behöver veta när någon svarar JA
- **Läkaren** som har mottagning behöver veta så hen inte sätter in någon annan patient på den "tomma" tiden
- **Flera kan väljas** - alla relevanta får notifikation

---

## 10. GDPR, Patientdatalagen och juridik

### ⏳ Pågående granskning hos IMY

**Status:** Begäran om vägledning skickad till Integritetsskyddsmyndigheten (IMY).

| Datum | Händelse | Status |
|-------|----------|--------|
| 2026-01-24 | Mejl skickat till imy@imy.se | ⏳ Väntar på svar |

**Frågeställningar som ställts till IMY:**

1. Eftersom systemet är helt fristående från journalsystemet, data skrivs in manuellt, och ingen medicinsk information hanteras - omfattas det av Patientdatalagen, eller endast av GDPR?
2. Är det tillåtet att använda en molntjänst inom EU (Frankfurt) för denna typ av notifieringsdata?
3. Finns det ytterligare åtgärder som rekommenderas?

**Systemets karaktär (beskrivet för IMY):**

- Helt fristående från journalsystemet - ingen teknisk koppling
- All patientdata skrivs in manuellt av personal
- Inte ett bokningssystem och inte ett tvåvägs-SMS-system
- Endast ett notifieringsverktyg där patienten kan signalera intresse
- Patienten kontaktas därefter per telefon för faktisk bokning
- SMS skickas endast till patienter som aktivt samtyckt

**Uppdatering:** Detta avsnitt uppdateras när svar inkommer från IMY.

---

### Översikt: Rättslig grund

Detta system hanterar **känsliga personuppgifter** (hälsodata) och lyder under:

| Lag/förordning | Relevans | Krav |
|----------------|----------|------|
| **GDPR** | All personuppgiftsbehandling | Samtycke eller annan rättslig grund |
| **Patientdatalagen (PDL)** | Vården behandlar patientuppgifter | Journalföringsskyldighet, sekretess |
| **Offentlighets- och sekretesslagen** | Privat vård | Tystnadsplikt |

### Rättslig grund för behandling

Vi använder **två olika rättsliga grunder** beroende på om patienten gett samtycke:

| Grund | GDPR-artikel | När det gäller |
|-------|--------------|----------------|
| **Uttryckligt samtycke** | Art. 9(2)(a) | Patient har kryssat i samtycke på hälsodeklarationen |
| **Berättigat intresse** | Art. 6(1)(f) | Patient saknar samtycke (vagt SMS-innehåll) |

**Viktigt:** Behandlingen av känsliga uppgifter (hälsodata) kräver normalt uttryckligt samtycke. Därför är samtyckesrutan på hälsodeklarationen central.

---

### Hur samtycke inhämtas

#### Steg 1: Hälsodeklarationen (externt system)

När patienten fyller i sin hälsodeklaration (före första besöket) finns en samtyckesruta:

```
┌─────────────────────────────────────────────────────────────────┐
│  HÄLSODEKLARATION                                               │
│  ...                                                            │
│                                                                 │
│  ☐ Jag godkänner SMS-kommunikation om mina bokningar,          │
│    inklusive förfrågan om lediga operationstider vid           │
│    avbokningar.                                                 │
│                                                                 │
│  💡 Patienten har redan loggat in med BankID vid detta         │
│     tillfälle, vilket utgör en giltig elektronisk signatur.    │
└─────────────────────────────────────────────────────────────────┘
```

#### Steg 2: Journalsystemet

- Samtyckesuppgiften dokumenteras i journalen
- Personal ser i journalen om samtycke finns
- Vid inmatning i kort varsel-systemet anges samtyckesstatus

#### Steg 3: Kort varsel-systemet

```
┌─ Lägg till patient ──────────────────────────────────────────────┐
│                                                                  │
│  Namn: [Anna Andersson        ]                                 │
│  Telefon: [070-123 45 67      ]                                 │
│                                                                  │
│  ☑️ Patienten har godkänt SMS-kommunikation                     │
│     (enligt hälsodeklaration i journalsystemet)                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

### SMS-innehåll baserat på samtycke

Systemet anpassar **automatiskt** SMS-texten beroende på samtyckesstatus:

#### MED samtycke (tydlig formulering)
```
Hej Anna! Vi har en ledig operationsplats för axeloperation 
tis 28/1 (förmiddag).

Kan du komma med kort varsel?
Svara här: specialist.se/s/x7k9m2

/Södermalms Ortopedi
```
✅ Innehåller: namn, operationstyp, datum

#### UTAN samtycke (vag formulering)
```
Hej! Vi har en ledig operationsplats hos Södermalms Ortopedi 
tis 28/1.

Kan du komma med kort varsel?
Svara här: specialist.se/s/x7k9m2

/Södermalms Ortopedi
```
⚠️ Innehåller INTE: namn, operationstyp (endast datum och mottagning)

**Logik:** Utan samtycke skickas ett "anonymt" SMS som inte avslöjar patientens hälsotillstånd för den som råkar se telefonen.

---

### Patientens rättigheter

| Rättighet | Hur det implementeras |
|-----------|----------------------|
| **Rätt till information** | Samtyckesfrågan förklarar vad uppgifterna används till |
| **Rätt till tillgång** | Patienten kan begära registerutdrag (via mottagningen) |
| **Rätt till radering** | Auto-radering efter utgångsdatum + manuell på begäran |
| **Rätt till invändning** | Opt-out via webben eller SMS (STOPP) |
| **Rätt att återkalla samtycke** | Kan meddela mottagningen när som helst |

### Opt-out (avregistrering)

Patienten kan avregistrera sig från kort varsel-listan på två sätt:

1. **Via webben:** Knapp på svarssidan "Jag vill inte längre få dessa förfrågningar"
2. **Via SMS:** Svara STOPP på ett mottaget SMS

**Effekt:** Patienten markeras som `avregistrerad` och får inga fler kort varsel-SMS. Ordinarie bokningar påverkas inte.

---

### Datalagring och radering

| Uppgift | Lagringsform | Lagringstid | Raderingsmetod |
|---------|--------------|-------------|----------------|
| Patientnamn | Klartext | Till utgångsdatum | Automatisk (cron) |
| Telefonnummer | **AES-256 krypterat** | Till utgångsdatum | Automatisk |
| Telefon-hash | SHA-256 | Till utgångsdatum | Automatisk |
| Svar (ja/nej) | Klartext | Till kampanj raderas | Automatisk |
| Tidpunkt för svar | Timestamp | Till kampanj raderas | Automatisk |

**Utgångsdatum:** Baserat på patientens ordinarie operationsdatum (inte 7 dagar från tillägg).

**Kryptering:** Telefonnummer krypteras med AES-256 så att endast systemet kan dekryptera dem för SMS-utskick. Om databasen läcker är numren oläsbara.

---

### Tredjepartsleverantörer (Personuppgiftsbiträden)

Dessa tjänster behandlar personuppgifter för vår räkning:

| Leverantör | Land | Tjänst | Data de ser |
|------------|------|--------|-------------|
| **46elks** | 🇸🇪 Sverige | SMS-leverans | Telefonnummer + SMS-text |
| **Supabase** | 🇺🇸 USA | Databas + Auth | All lagrad data (krypterad) |
| **Netlify** | 🇺🇸 USA | Hosting | Trafikloggar, IP-adresser |

---

#### 🇸🇪 46elks - Personuppgiftsbiträdesavtal

**Status:** Svenskt bolag - GDPR gäller automatiskt.

| Info | Detaljer |
|------|----------|
| **DPA tillgängligt** | ✅ Ja, standard PUB-avtal |
| **Hur man får det** | Kontakta support@46elks.se eller ladda ner |
| **URL** | https://46elks.se/gdpr |
| **Datalagring** | Sverige/EU |

**Att göra:** Mejla 46elks och begär PUB-avtal, eller ladda ner från deras GDPR-sida.

---

#### 🇺🇸 Supabase - Data Processing Agreement

**Status:** Amerikanskt bolag med GDPR-compliance och SCC.

| Info | Detaljer |
|------|----------|
| **DPA tillgängligt** | ✅ Ja, ingår i Terms of Service |
| **SCC (Standard Contractual Clauses)** | ✅ Ja, för EU→USA överföring |
| **Hur man får det** | Dashboard → Settings → Legal, eller mejla privacy@supabase.io |
| **URL** | https://supabase.com/docs/company/privacy |
| **Datalagring** | Välj EU-region vid projektuppsättning! |

**Att göra:** 
1. Se till att Supabase-projektet är i **EU-region** (Frankfurt)
2. Ladda ner/acceptera DPA via Dashboard eller mejl
3. Spara kopia av avtalet

---

#### 🇺🇸 Netlify - Data Processing Agreement

**Status:** Amerikanskt bolag med GDPR-compliance och SCC.

| Info | Detaljer |
|------|----------|
| **DPA tillgängligt** | ✅ Ja |
| **SCC (Standard Contractual Clauses)** | ✅ Ja, för EU→USA överföring |
| **Hur man får det** | Mejla privacy@netlify.com eller via Trust Center |
| **URL** | https://www.netlify.com/gdpr-ccpa/ |
| **Datalagring** | Globalt CDN (data kan finnas i flera regioner) |

**Att göra:**
1. Mejla Netlify och begär DPA
2. Spara kopia av avtalet

---

#### Mall för att begära DPA (engelska)

```
Subject: Request for Data Processing Agreement (DPA)

Hi,

We are using [SERVICE NAME] for our healthcare application 
in Sweden and need to ensure GDPR compliance.

Could you please provide us with:
1. Your Data Processing Agreement (DPA)
2. Information about Standard Contractual Clauses (SCC) 
   for EU-US data transfers
3. Confirmation of technical security measures

Our organization details:
- Company: [Företagsnamn]
- Organization number: [Org.nr]
- Contact: [Din mejl]
- Account/Project ID: [Om tillämpligt]

Thank you,
[Ditt namn]
```

---

#### Checklista: DPA-avtal

| Leverantör | Avtal begärt | Avtal mottaget | Sparat |
|------------|--------------|----------------|--------|
| 46elks | ☐ | ☐ | ☐ |
| Supabase | ☐ | ☐ | ☐ |
| Netlify | ☐ | ☐ | ☐ |

**Tips:** Spara alla DPA-avtal i en mapp, t.ex. `docs/avtal/` eller i företagets dokumenthanteringssystem.

---

#### Varför USA-leverantörer kräver extra åtgärder

Efter **Schrems II-domen (2020)** räcker det inte med bara DPA för överföring av personuppgifter till USA. Leverantören måste också ha:

1. **Standard Contractual Clauses (SCC)** - Godkända av EU-kommissionen
2. **Tekniska skyddsåtgärder** - T.ex. kryptering så att leverantören inte kan läsa datan
3. **Supplementary measures** - Extra skyddsåtgärder vid behov

✅ Både Supabase och Netlify har uppdaterat sina avtal efter Schrems II.

✅ Vi krypterar telefonnummer med AES-256, vilket är en teknisk skyddsåtgärd som gör att även om Supabase skulle tvingas lämna ut data, är telefonnumren oläsbara utan vår krypteringsnyckel.

---

### Säkerhetsåtgärder

| Åtgärd | Implementation |
|--------|----------------|
| **Kryptering i vila** | Telefonnummer krypteras med AES-256 |
| **Kryptering i transit** | HTTPS för all kommunikation |
| **Åtkomstkontroll** | Endast inloggad personal |
| **Row Level Security** | Databasnivå-skydd i Supabase |
| **Audit-logg** | Alla händelser loggas |
| **Korta svarskoder** | Minst 16 tecken, ej gissningsbara |

---

### Checklista för GDPR-efterlevnad

#### Före lansering
- [ ] Samtyckesruta tillagd i hälsodeklarationen
- [ ] Informationstext om databehandling på svarssidan
- [ ] DPA undertecknat med 46elks
- [ ] DPA undertecknat med Supabase
- [ ] DPA undertecknat med Netlify
- [ ] Dokumentation om behandlingen i registret (art. 30)

#### Löpande
- [ ] Kontrollera att auto-radering fungerar
- [ ] Hantera eventuella registerutdragsbegäranden
- [ ] Hantera opt-out/avregistreringar
- [ ] Uppdatera dokumentation vid ändringar

---

### Vad som lagras (sammanfattning)

| Data | Lagras | Krypterad | Radering |
|------|--------|-----------|----------|
| Patientnamn | ✅ Ja | ❌ Nej | Auto |
| Telefonnummer | ✅ Ja | ✅ AES-256 | Auto |
| Telefon-hash | ✅ Ja | - (hash) | Auto |
| Samtyckesstatus | ✅ Ja | ❌ Nej | Auto |
| Svar (ja/nej) | ✅ Ja | ❌ Nej | Auto |
| Prioritet (akut/ont) | ✅ Ja | ❌ Nej | Auto |
| Operationsstorlek | ✅ Ja | ❌ Nej | Auto |
| Svars-tidpunkt | ✅ Ja | ❌ Nej | Auto |

---

## 11. Teknisk implementation

### Filstruktur

```
src/pages/
├── personal/
│   ├── kort-varsel.astro       ← Dashboard för personal
│   └── profil.astro            ← Personalens profilsida
├── s/
│   └── [kod].astro             ← Svarssida för patient (med opt-out)
└── api/
    ├── kampanj/
    │   ├── skapa.ts            ← Skapa kampanj + skicka SMS (med prioritet)
    │   ├── status.ts           ← Hämta status (för polling)
    │   ├── svar.ts             ← Registrera patientsvar (ja/nej/avregistrera)
    │   ├── utoka.ts            ← Lägg till fler mottagare till aktiv kampanj
    │   ├── avsluta.ts          ← Stäng kampanj (med utfall + notifiera)
    │   ├── aktiv.ts            ← Finns aktiv kampanj? (för header-indikator)
    │   └── lista.ts            ← Lista kampanjer
    ├── pool/
    │   ├── lagg-till.ts        ← Lägg till patient i pool (med dublettkontroll)
    │   ├── lista.ts            ← Lista patienter i pool
    │   └── ta-bort.ts          ← Ta bort patient från pool
    └── sms/
        └── inkommande.ts       ← Webhook för STOPP-sms (opt-out)

netlify/
└── functions/
    └── scheduled-sms.mts       ← Schemalagd funktion för gradvis utskick

supabase/                       ← NY MAPP!
├── README.md                   ← Instruktioner
├── schema.sql                  ← Placeholder
└── migrations/
    ├── 001-initial-setup.sql   ← Audit, statistik, mallar
    ├── 002-kort-varsel.sql     ← Kampanjer, mottagare, patientpool
    ├── 003-lakare.sql          ← Läkare-tabell
    ├── 004-profilbilder.sql    ← Avatar-stöd
    └── 005-prioritet.sql       ← Prioritetsfält (akut, ont, sjukskriven)

src/lib/
└── kryptering.ts               ← AES-256 kryptering av telefonnummer
```

### Databas (Supabase)

```sql
-- Personal med mobilnummer
ALTER TABLE profiles ADD COLUMN mobilnummer TEXT;
ALTER TABLE profiles ADD COLUMN vill_ha_notifikationer BOOLEAN DEFAULT false;

-- Kampanjer
CREATE TABLE sms_kampanjer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum DATE NOT NULL,
  tid TIME NOT NULL,
  operation_typ TEXT,
  skapad_av UUID REFERENCES auth.users(id),
  skapad_vid TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'aktiv',        -- 'aktiv', 'fylld', 'avslutad'
  -- Tidsgräns
  sista_svarstid TIMESTAMPTZ,         -- NULL = ingen tidsgräns
  -- Utfall (för statistik)
  utfall TEXT,                        -- 'fylld_via_sms', 'fylld_manuellt', 'misslyckad', 'avbruten', 'timeout'
  fylld_av_patient UUID,              -- Första JA
  reserv_patient UUID,                -- Andra JA (reserv)
  fylld_vid TIMESTAMPTZ,
  avslutad_vid TIMESTAMPTZ,
  -- Batchning
  batch_storlek INTEGER DEFAULT 10,   -- Alla om 10
  batch_intervall INTEGER DEFAULT 0,  -- 0 = skicka alla direkt
  nasta_batch_vid TIMESTAMPTZ,
  -- Statistik
  antal_sms_skickade INTEGER DEFAULT 0
);

-- Personal som ska notifieras
CREATE TABLE sms_kampanj_notifieringar (
  kampanj_id UUID REFERENCES sms_kampanjer(id) ON DELETE CASCADE,
  personal_id UUID REFERENCES auth.users(id),
  notifierad_vid TIMESTAMPTZ,
  PRIMARY KEY (kampanj_id, personal_id)
);

-- Mottagare
CREATE TABLE sms_kampanj_mottagare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampanj_id UUID REFERENCES sms_kampanjer(id) ON DELETE CASCADE,
  namn TEXT NOT NULL,
  telefon_hash TEXT NOT NULL,
  telefon_masked TEXT NOT NULL,       -- "070-123****"
  unik_kod TEXT UNIQUE NOT NULL,      -- Minst 16 tecken!
  har_samtycke BOOLEAN DEFAULT false,
  batch_nummer INTEGER DEFAULT 1,     -- Vilken batch
  skickad_vid TIMESTAMPTZ,            -- NULL = ej skickat ännu
  svar TEXT,                          -- 'ja', 'nej', 'reserv', NULL
  svar_ordning INTEGER,               -- 1 = första JA, 2 = reserv
  svar_vid TIMESTAMPTZ,
  bekraftat_preop BOOLEAN DEFAULT false,
  notifierad_om_fylld BOOLEAN DEFAULT false
);

-- Index
CREATE INDEX idx_mottagare_unik_kod ON sms_kampanj_mottagare(unik_kod);
CREATE INDEX idx_kampanj_status ON sms_kampanjer(status);

-- ATOMÄR FUNKTION: Förhindrar race conditions
-- Returnerar 'first', 'reserve', eller 'already_filled'
CREATE OR REPLACE FUNCTION registrera_ja_svar(
  p_unik_kod TEXT,
  p_bekraftat_preop BOOLEAN
) RETURNS TEXT AS $$
DECLARE
  v_kampanj_id UUID;
  v_mottagare_id UUID;
  v_status TEXT;
  v_result TEXT;
BEGIN
  -- Hämta mottagare och kampanj
  SELECT m.id, m.kampanj_id, k.status
  INTO v_mottagare_id, v_kampanj_id, v_status
  FROM sms_kampanj_mottagare m
  JOIN sms_kampanjer k ON k.id = m.kampanj_id
  WHERE m.unik_kod = p_unik_kod
  FOR UPDATE;  -- Lås raden
  
  IF v_status = 'fylld' OR v_status = 'avslutad' THEN
    -- Redan fylld, men registrera som reserv om möjligt
    UPDATE sms_kampanj_mottagare
    SET svar = 'reserv', svar_vid = NOW(), 
        svar_ordning = 2, bekraftat_preop = p_bekraftat_preop
    WHERE id = v_mottagare_id AND svar IS NULL;
    
    RETURN 'reserve';
  END IF;
  
  -- Försök markera kampanjen som fylld (atomärt)
  UPDATE sms_kampanjer
  SET status = 'fylld', fylld_av_patient = v_mottagare_id, fylld_vid = NOW()
  WHERE id = v_kampanj_id AND status = 'aktiv';
  
  IF FOUND THEN
    -- Vi var först!
    UPDATE sms_kampanj_mottagare
    SET svar = 'ja', svar_vid = NOW(), 
        svar_ordning = 1, bekraftat_preop = p_bekraftat_preop
    WHERE id = v_mottagare_id;
    
    RETURN 'first';
  ELSE
    -- Någon annan hann före
    UPDATE sms_kampanj_mottagare
    SET svar = 'reserv', svar_vid = NOW(), 
        svar_ordning = 2, bekraftat_preop = p_bekraftat_preop
    WHERE id = v_mottagare_id;
    
    RETURN 'reserve';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Auto-radera efter 7 dagar via Supabase scheduled function
```

---

## 12. Kostnad

**Uppskattad kostnad per kampanj:** ~10-20 kr

Med gradvis utskick kan kostnaden bli lägre om någon svarar snabbt.

**Jämförelse:** Kampanjkostnad ~15 kr vs inställd operation ~10 000 kr

---

## 13. Nästa steg

### Fas 1: Grundsystem (✅ Klart)

1. ✅ Specifikation klar (detta dokument)
2. ✅ Databasschema designat (`supabase/migrations/`)
3. ✅ Bygga `/personal/kort-varsel` (dashboard)
4. ✅ Bygga `/s/[kod]` (svarssida med pre-op bekräftelse)
5. ✅ Bygga API-endpoints (skapa, svar, status, avsluta, lista)
6. ✅ Atomär SQL-funktion för race conditions
7. ✅ Gradvis SMS-utskick via Netlify Scheduled Functions
8. ✅ Header-indikator för aktiv kampanj
9. ✅ Personalprofil med mobilnummer

### Fas 2: Patientpool (✅ Klart)

| Uppgift | Status |
|---------|--------|
| ✅ Patientpool-tabell | `kort_varsel_patienter` med krypterade telefonnummer |
| ✅ Krypterad lagring | AES-256 för telefonnummer |
| ✅ Pool-dashboard | Tillgängliga / Reserv / NEJ / Bokade |
| ✅ Dublettkontroll | Varnar om telefonnummer redan finns |
| ✅ Läkare-stöd | Dropdown för läkare + "flexibel läkare" |
| ✅ Utgångsdatum | Baserat på ordinarie operationsdatum |
| ✅ Välj från pool | Checkbox-lista + "Skapa kampanj med valda" |
| ✅ Utöka kampanj | Lägg till fler patienter till aktiv kampanj |

### Fas 3: Prioritet & Opt-out (✅ Klart)

| Uppgift | Status |
|---------|--------|
| ✅ Prioritetsfält | AKUT, Sjukskriven, Mycket ont |
| ✅ Automatiska intervall | 60/30/20/10 min baserat på prioritet |
| ✅ Ålder från personnummer | Beräknas och visas (pensionär = grön) |
| ✅ Sorterbara kolumner | Prio, Namn, Ålder, Läkare, Dagar |
| ✅ Opt-out via webb | Knapp på svarssidan |
| ✅ Opt-out via SMS | STOPP-kommando webhook |
| ✅ Avregistrerings-markering | Tydlig i kampanjvy med åtgärdsförslag |

### Fas 4: Integration och produktion (⬜ Planerad)

| Uppgift | Beskrivning |
|---------|-------------|
| ⬜ Samtyckesfråga | Lägg till i hälsodeklarationen (externt system) |
| ⬜ 46elks webhook | Konfigurera inkommande SMS |
| ⬜ Produktion | Testa med riktig personal |
| ⬜ Utbildning | Visa personal hur systemet fungerar |
| ⬜ Statistik-dashboard | Visualisera framgång över tid |

### Databasschema

SQL-filer finns nu i `supabase/migrations/`:

```
supabase/
├── README.md                   ← Instruktioner
└── migrations/
    ├── 001-initial-setup.sql   ← Grundtabeller
    ├── 002-kort-varsel.sql     ← Kampanjer & patientpool
    ├── 003-lakare.sql          ← Läkare
    ├── 004-profilbilder.sql    ← Avatars
    ├── 005-prioritet.sql       ← Prioritetsfält
    └── 006-operationsstorlek.sql ← Liten/stor operation + sida (HÖ/VÄ)
```

Se `supabase/README.md` för instruktioner om hur man kör migrations.

### Prioriteringsordning vid kampanj

```
1. 🚨 AKUT-patienter (alltid först!)
2. 📋 Sjukskrivna
3. 🔥 Patienter med mycket ont
4. ⭐ Reservpatienter (svarade JA men fick ej plats)
5. Tillgängliga (aldrig kontaktade)
6. Kontaktade (fått SMS men ej svarat) - SIST
```

---

*Specifikation skapad 2026-01-22*  
*Implementation påbörjad 2026-01-22*  
*Patientpool-modell tillagd 2026-01-22*  
*Prioritet & opt-out tillagt 2026-01-24*  
*SQL-filer flyttade till supabase/ 2026-01-24*


---

# DEL D - 02 Statistik (02-STATISTIK.md)

# Specifikation: Avancerad statistik för Kort varsel-SMS

> **Status:** Planering  
> **Prioritet:** Medel (kräver dataunderlag först)  
> **Beroenden:** Minst 100-200 utskick för meningsfull statistik  
> **Senast uppdaterad:** 2026-01-24

---

## Prioriteringsordning för implementation

### 🥇 Fas 1: Svarstid per kategori (HÖGST PRIORITET)

**Varför viktigast:** Svarstiden avgör hur vi ska sätta intervall. Om vi vet att 90% av AKUT-patienter svarar inom 30 minuter behöver vi inte vänta 60 minuter.

```
┌─────────────────────────────────────────────────────────────┐
│  ⏱️ MEDEL SVARSTID                                         │
│                                                             │
│  🚨 AKUT        ████████████████████  18 min               │
│  📋 Sjukskriven ██████████████████████████  21 min         │
│  🔥 Mycket ont  ████████████████████████████████  25 min   │
│  👴 Pensionär   ██████████████  14 min                     │
│  ⏰ Normal      ████████████████████████████████████  32 min│
│                                                             │
│  💡 Insikt: Om ingen svarat inom 60 min → troligen ej      │
│     intresserad. Systemet kan gå vidare till nästa.        │
└─────────────────────────────────────────────────────────────┘
```

**Mål:** Svara på frågan *"När kan vi anta att en patient inte är intresserad?"*

### 🥈 Fas 2: Tid på dagen

**Varför viktigt:** Hjälper planera *när* utskick ska startas för bäst respons.

- Förmiddag (08-12) vs Eftermiddag (12-16) vs Kväll (16-20)
- Svarstid och svarsfrekvens per tidsblock

### 🥉 Fas 3: Interaktiva grafer

**Varför viktigt:** Visuellt intryck vid demonstration och presentation.

> *"Bilden av grafen är det man kommer ihåg - inte siffran '4 patienter fler per månad'"*

- Svarstidsfördelning som interaktivt histogram
- Hover-effekter för detaljer
- Professionellt utseende som bygger förtroende

### 📊 Fas 4+: Övrig statistik

- Svarsfrekvens per kategori (JA/NEJ/Ingen svar)
- Statistik per läkare, sida, operationsstorlek
- Väntetidskorrelation
- Trendanalys över tid

---

## 1. Syfte

Statistikfunktionen ska ge insikter som möjliggör:

1. **Optimering av intervall** - Hur lång tid behöver olika patientgrupper för att svara?
2. **Prioriteringsvalidering** - Är vår prioriteringsordning optimal?
3. **Resursplanering** - Vilka dagar/tider fungerar bäst?
4. **Trendanalys** - Förbättras vi över tid?

---

## 2. Datakällor

### 2.1 Befintliga tabeller

```sql
-- Utskicksdata
sms_kampanjer:
  - id, datum, skapad_vid, avslutad_vid
  - status, utfall
  - lakare, operation_typ, tidsblock
  - filter_sida, filter_op_liten, filter_op_stor

-- Mottagardata (viktigast för statistik)
sms_kampanj_mottagare:
  - id, kampanj_id, namn
  - skickad_vid        -- När SMS skickades
  - svar               -- 'ja', 'nej', null
  - svarad_vid         -- När patienten svarade
  - prioritet          -- 'akut', 'ont', 'sjukskriven', null
  - sida               -- 'höger', 'vänster', null
  - op_liten, op_stor  -- boolean

-- Patientpool (för ytterligare kontext)
kort_varsel_patienter:
  - alder, utgar_vid (planerat op-datum)
  - lakare[]
```

### 2.2 Data som behöver läggas till

För fullständig statistik behöver vi spara mer data vid utskicksskapande:

```sql
-- Lägg till i sms_kampanj_mottagare:
ALTER TABLE sms_kampanj_mottagare ADD COLUMN IF NOT EXISTS
  alder INTEGER,                           -- Patientens ålder vid utskick
  planerat_op_datum DATE,                  -- Planerat operationsdatum
  dagar_till_planerad_op INTEGER,          -- Beräknat: planerat_op - utskick_datum
  svarstid_minuter INTEGER;                -- Beräknat: svarad_vid - skickad_vid
```

---

## 3. Statistikvyer

### 3.1 Översikt (Dashboard)

**Tidsperiod:** Valbar (30 / 90 / 365 dagar / Allt)

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 ÖVERSIKT                                          [30d ▼]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Utskick            Fyllda via SMS      Svarsfrekvens              │
│  ┌────────┐         ┌────────┐          ┌────────┐                 │
│  │   47   │         │   38   │          │  72%   │                 │
│  │        │         │  81%   │          │        │                 │
│  └────────┘         └────────┘          └────────┘                 │
│                                                                     │
│  Medel svarstid     SMS per fylld       Snabbaste svar             │
│  ┌────────┐         ┌────────┐          ┌────────┐                 │
│  │ 23 min │         │  2.4   │          │  3 min │                 │
│  └────────┘         └────────┘          └────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Svarstidsanalys per prioritet

**Mål:** Förstå hur snabbt olika patientgrupper svarar

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⏱️ SVARSTID PER PRIORITET                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Kategori        Antal    Medel     Median    Min    Max    Std    │
│  ─────────────────────────────────────────────────────────────────  │
│  🚨 AKUT           23     18 min    12 min    2m     67m    15m    │
│  📋 Sjukskriven    45     21 min    15 min    3m     89m    18m    │
│  🔥 Mycket ont     67     25 min    19 min    4m     95m    21m    │
│  👴 Pensionär      34     14 min     9 min    2m     45m    11m    │
│  ⏰ Normal         89     32 min    25 min    5m    120m    28m    │
│                                                                     │
│  [Visa histogram ▼]                                                 │
│                                                                     │
│  Svarstidsfördelning (alla kategorier):                            │
│                                                                     │
│  0-5 min   ████████████████████  28%                               │
│  5-15 min  ██████████████████████████████  42%                     │
│  15-30 min ████████████  17%                                        │
│  30-60 min ██████  9%                                               │
│  60+ min   ███  4%                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Insikt:** Om pensionärer svarar snabbast (14 min medel), kanske de bör få kortare intervall?

### 3.3 Svarsfrekvens per kategori

**Mål:** Förstå vilka grupper som är mest benägna att tacka JA

```
┌─────────────────────────────────────────────────────────────────────┐
│  📈 SVARSFREKVENS PER KATEGORI                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Kategori        Totalt    JA       NEJ      Inget     JA-rate    │
│  ─────────────────────────────────────────────────────────────────  │
│  🚨 AKUT           23      18        3         2        78%        │
│  📋 Sjukskriven    45      31        9         5        69%        │
│  🔥 Mycket ont     67      42       15        10        63%        │
│  👴 Pensionär      34      28        4         2        82%  ⭐    │
│  ⏰ Normal         89      48       25        16        54%        │
│                                                                     │
│  ────────────────────────────────────────────────────────────────   │
│  TOTALT           258     167       56        35        65%        │
│                                                                     │
│  💡 Insikt: Pensionärer har högst JA-rate (82%). Överväg att       │
│     prioritera dem högre i algoritmen?                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 Statistik per operationsstorlek

**Mål:** Se om liten/stor operation påverkar svarsbenägenhet

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔹🔷 OPERATIONSSTORLEK                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Storlek     Antal    JA-rate    Medel svarstid    Ingen svar     │
│  ─────────────────────────────────────────────────────────────────  │
│  🔹 Liten      98       71%         19 min           11%           │
│  🔷 Stor      160       62%         26 min           16%           │
│                                                                     │
│  💡 Insikt: Patienter med liten operation svarar snabbare och      │
│     oftare JA. Kanske för att de har färre förberedelser?          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.5 Statistik per läkare

**Mål:** Se om vissa läkare har patienter som svarar bättre

```
┌─────────────────────────────────────────────────────────────────────┐
│  👨‍⚕️ PER LÄKARE                                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Läkare          Utskick     Fyllda    JA-rate   Medel svarstid   │
│  ─────────────────────────────────────────────────────────────────  │
│  Dr. Andersson        12        10       75%         18 min        │
│  Dr. Bergström        15        11       68%         24 min        │
│  Dr. Carlsson          8         7       81%         15 min        │
│  Dr. Eriksson         12         9       62%         29 min        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.6 Sida (HÖ/VÄ) - Statistik

**Mål:** Se om höger/vänster sida påverkar något

```
┌─────────────────────────────────────────────────────────────────────┐
│  ↔️ SIDA (HÖ/VÄ)                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Sida      Antal    JA-rate    Medel svarstid                      │
│  ─────────────────────────────────────────────────────────────────  │
│  HÖ (höger)  134      66%         22 min                           │
│  VÄ (vänster) 124     64%         23 min                           │
│                                                                     │
│  💡 Minimal skillnad - sida verkar inte påverka svarsbenägenhet    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.7 Väntetid till planerad operation

**Mål:** Validera hypotesen att patienter med lång väntetid är mer motiverade

```
┌─────────────────────────────────────────────────────────────────────┐
│  📅 VÄNTETID TILL PLANERAD OPERATION                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Väntetid           Antal    JA-rate    Medel svarstid             │
│  ─────────────────────────────────────────────────────────────────  │
│  < 1 vecka            15       40%         35 min                   │
│  1-2 veckor           28       52%         28 min                   │
│  2-4 veckor           45       65%         22 min                   │
│  1-2 månader          67       74%         18 min                   │
│  2-3 månader          58       82%         14 min      ⭐          │
│  > 3 månader          45       85%         12 min      ⭐          │
│                                                                     │
│  💡 Bekräftat: Längre väntetid → Högre JA-rate och snabbare svar   │
│     Vår prioritering av lång väntetid är korrekt!                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.8 Tid på dagen

**Mål:** Se när patienter svarar bäst

```
┌─────────────────────────────────────────────────────────────────────┐
│  🕐 TID PÅ DAGEN (när SMS skickades)                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Tid          Antal    JA-rate    Medel svarstid                   │
│  ─────────────────────────────────────────────────────────────────  │
│  08:00-10:00    45       72%         15 min        ⭐              │
│  10:00-12:00    67       68%         18 min                        │
│  12:00-14:00    52       61%         25 min                        │
│  14:00-16:00    48       64%         22 min                        │
│  16:00-18:00    34       58%         32 min                        │
│  18:00-20:00    12       50%         45 min                        │
│                                                                     │
│  💡 Morgon (08-10) har bäst svarsfrekvens och snabbast svar        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.9 Veckodag

**Mål:** Se om vissa dagar fungerar bättre

```
┌─────────────────────────────────────────────────────────────────────┐
│  📆 VECKODAG                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Dag         Antal    JA-rate    Medel svarstid                    │
│  ─────────────────────────────────────────────────────────────────  │
│  Måndag        52       65%         21 min                         │
│  Tisdag        48       68%         19 min                         │
│  Onsdag        45       70%         18 min        ⭐               │
│  Torsdag       42       66%         20 min                         │
│  Fredag        38       58%         28 min                         │
│  Lördag         8       45%         42 min                         │
│  Söndag         5       40%         55 min                         │
│                                                                     │
│  💡 Onsdag fungerar bäst. Undvik helger.                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.10 Trendanalys

**Mål:** Se förbättring över tid

```
┌─────────────────────────────────────────────────────────────────────┐
│  📈 TREND ÖVER TID                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  JA-rate per månad:                                                │
│                                                                     │
│  90% │                                          ●                  │
│  80% │                              ●     ●                        │
│  70% │               ●     ●                                       │
│  60% │     ●                                                       │
│  50% │ ●                                                           │
│      └────────────────────────────────────────────────             │
│        Jan   Feb   Mar   Apr   Maj   Jun                           │
│                                                                     │
│  Medel svarstid per månad:                                         │
│                                                                     │
│  40m │ ●                                                           │
│  30m │     ●                                                       │
│  25m │          ●                                                  │
│  20m │               ●     ●     ●     ●                           │
│      └────────────────────────────────────────────────             │
│        Jan   Feb   Mar   Apr   Maj   Jun                           │
│                                                                     │
│  💡 JA-rate ökar stadigt. Svarstiden har stabiliserats på ~20 min  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Databasändringar

### 4.1 Nya kolumner i sms_kampanj_mottagare

```sql
-- Migration: 007-statistik.sql

-- Lägg till statistikkolumner
ALTER TABLE sms_kampanj_mottagare 
  ADD COLUMN IF NOT EXISTS alder INTEGER,
  ADD COLUMN IF NOT EXISTS planerat_op_datum DATE,
  ADD COLUMN IF NOT EXISTS dagar_till_planerad_op INTEGER,
  ADD COLUMN IF NOT EXISTS svarstid_sekunder INTEGER;

-- Kommentarer
COMMENT ON COLUMN sms_kampanj_mottagare.alder IS 'Patientens ålder vid SMS-utskick';
COMMENT ON COLUMN sms_kampanj_mottagare.planerat_op_datum IS 'Patientens ordinarie planerade operationsdatum';
COMMENT ON COLUMN sms_kampanj_mottagare.dagar_till_planerad_op IS 'Dagar mellan utskicksdatum och planerad op';
COMMENT ON COLUMN sms_kampanj_mottagare.svarstid_sekunder IS 'Sekunder mellan skickad_vid och svarad_vid';

-- Index för snabba aggregeringar
CREATE INDEX IF NOT EXISTS idx_mottagare_prioritet ON sms_kampanj_mottagare(prioritet);
CREATE INDEX IF NOT EXISTS idx_mottagare_svar ON sms_kampanj_mottagare(svar);
CREATE INDEX IF NOT EXISTS idx_mottagare_svarad_vid ON sms_kampanj_mottagare(svarad_vid);
```

### 4.2 Trigger för automatisk svarstidsberäkning

```sql
-- Automatiskt beräkna svarstid när svar registreras
CREATE OR REPLACE FUNCTION berakna_svarstid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.svarad_vid IS NOT NULL AND NEW.skickad_vid IS NOT NULL THEN
    NEW.svarstid_sekunder := EXTRACT(EPOCH FROM (NEW.svarad_vid - NEW.skickad_vid))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_berakna_svarstid
  BEFORE UPDATE ON sms_kampanj_mottagare
  FOR EACH ROW
  WHEN (OLD.svarad_vid IS DISTINCT FROM NEW.svarad_vid)
  EXECUTE FUNCTION berakna_svarstid();
```

### 4.3 View för aggregerad statistik

```sql
-- View: Statistik per prioritet
CREATE OR REPLACE VIEW statistik_per_prioritet AS
SELECT 
  prioritet,
  COUNT(*) as antal,
  COUNT(CASE WHEN svar = 'ja' THEN 1 END) as antal_ja,
  COUNT(CASE WHEN svar = 'nej' THEN 1 END) as antal_nej,
  COUNT(CASE WHEN svar IS NULL AND skickad_vid IS NOT NULL THEN 1 END) as ingen_svar,
  ROUND(100.0 * COUNT(CASE WHEN svar = 'ja' THEN 1 END) / NULLIF(COUNT(*), 0), 1) as ja_procent,
  ROUND(AVG(svarstid_sekunder) / 60.0, 1) as medel_svarstid_min,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY svarstid_sekunder) / 60.0, 1) as median_svarstid_min
FROM sms_kampanj_mottagare
WHERE skickad_vid IS NOT NULL
GROUP BY prioritet;

-- View: Statistik per väntetid
CREATE OR REPLACE VIEW statistik_per_vantetid AS
SELECT 
  CASE 
    WHEN dagar_till_planerad_op < 7 THEN '< 1 vecka'
    WHEN dagar_till_planerad_op < 14 THEN '1-2 veckor'
    WHEN dagar_till_planerad_op < 30 THEN '2-4 veckor'
    WHEN dagar_till_planerad_op < 60 THEN '1-2 månader'
    WHEN dagar_till_planerad_op < 90 THEN '2-3 månader'
    ELSE '> 3 månader'
  END as vantetid_grupp,
  COUNT(*) as antal,
  ROUND(100.0 * COUNT(CASE WHEN svar = 'ja' THEN 1 END) / NULLIF(COUNT(*), 0), 1) as ja_procent,
  ROUND(AVG(svarstid_sekunder) / 60.0, 1) as medel_svarstid_min
FROM sms_kampanj_mottagare
WHERE skickad_vid IS NOT NULL AND dagar_till_planerad_op IS NOT NULL
GROUP BY 1
ORDER BY MIN(dagar_till_planerad_op);
```

---

## 5. API-endpoints

### 5.1 Hämta översiktsstatistik

```
GET /api/statistik/oversikt?dagar=30

Response:
{
  "period": "30 dagar",
  "utskick": 47,
  "fyllda_via_sms": 38,
  "fyllda_procent": 81,
  "totalt_sms": 258,
  "sms_per_fylld": 2.4,
  "medel_svarstid_min": 23,
  "svarsfrekvens_procent": 72
}
```

### 5.2 Statistik per prioritet

```
GET /api/statistik/prioritet?dagar=90

Response:
{
  "data": [
    {
      "prioritet": "akut",
      "antal": 23,
      "ja": 18, "nej": 3, "ingen_svar": 2,
      "ja_procent": 78,
      "medel_svarstid_min": 18,
      "median_svarstid_min": 12
    },
    ...
  ]
}
```

### 5.3 Statistik per dimension

```
GET /api/statistik/dimension?typ=operationsstorlek&dagar=90
GET /api/statistik/dimension?typ=lakare&dagar=90
GET /api/statistik/dimension?typ=sida&dagar=90
GET /api/statistik/dimension?typ=vantetid&dagar=90
GET /api/statistik/dimension?typ=tid_pa_dagen&dagar=90
GET /api/statistik/dimension?typ=veckodag&dagar=90
```

### 5.4 Trenddata

```
GET /api/statistik/trend?granularitet=manad&dagar=365

Response:
{
  "data": [
    { "period": "2026-01", "ja_procent": 52, "medel_svarstid_min": 38 },
    { "period": "2026-02", "ja_procent": 61, "medel_svarstid_min": 32 },
    ...
  ]
}
```

---

## 6. UI-implementation

### 6.1 Placering

Statistiken placeras i **Historik-fliken**, i en ny sektion ovanför utskickslistan:

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Patientpool] [Skapa SMS-utskick] [Aktiva] [Historik]             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─── STATISTIK ───────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │  [Översikt] [Svarstid] [Svarsfrekvens] [Trender] [Detaljer] │   │
│  │                                                              │   │
│  │  (Vald vy visas här)                                        │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─── UTSKICKSLISTA ───────────────────────────────────────────┐   │
│  │  (Befintlig lista med alla utskick)                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 Komponenter

- **Periondväljare**: Dropdown (30d / 90d / 365d / Allt)
- **Nyckeltalskort**: Stora siffror med trend-pilar
- **Tabeller**: Sorterbara, med färgkodning
- **Grafer**: Enkla stapeldiagram (histogram) och linjediagram (trend)
- **Insiktsbox**: Automatiska tips baserat på data

### 6.3 Teknologi

- **Grafer**: Chart.js (redan diskuterat tidigare, finns kanske i demosidan)
- **Data**: Fetch från API-endpoints
- **Caching**: Statistik cachas i 5 min (ändras inte ofta)

---

## 7. Implementationsordning (uppdaterad)

> **Prioriteringsprincip:** Fokusera på det som ger mest värde först - svarstidsanalys.

### 🥇 Sprint 1: Svarstid per kategori ✅ KLAR

**Mål:** Visa svarstid för AKUT, Sjukskriven, Ont, Pensionär, Normal

#### 1a. Datagrund (1h)
- [x] Skapa migration 007-statistik.sql
- [x] Lägg till `svarstid_sekunder` i `sms_kampanj_mottagare`
- [x] Skapa trigger för automatisk svarstidsberäkning
- [x] Vyer för aggregerad statistik (`v_svarstid_per_kategori`, `v_svarstid_per_timme`)

#### 1b. API för svarstid (1h)
- [x] `GET /api/statistik/svarstid` - returnerar svarstid per kategori
- [x] Medel, median, min, max per kategori
- [x] JA-rate per kategori

#### 1c. UI: Svarstidstabell + stapeldiagram (2h)
- [x] Tabell med svarstid per kategori i Historik-fliken
- [x] Horisontellt stapeldiagram med färgkodning per kategori
- [x] Periodväljare (30d / 90d / Allt)
- [x] Tid på dagen-diagram

**Uppskattad tid Sprint 1:** 4 timmar → **Implementerad 2026-01-24**

---

### 🥈 Sprint 2: Tid på dagen ✅ KLAR

**Mål:** Visa svarstid och svarsfrekvens baserat på när SMS skickades

> **OBS:** Implementerad som del av Sprint 1 - API:et inkluderar redan tid-på-dagen-data.

#### 2a. API (inkluderat i Sprint 1)
- [x] Tid-på-dagen-data i `/api/statistik/svarstid`
- [x] Grupperad på tidsblock (08-10, 10-12, etc.)

#### 2b. UI (inkluderat i Sprint 1 & 3)
- [x] Chart.js-diagram med svarstid per tidsblock
- [x] Färgkodning (grön/gul/röd) baserat på svarstid

**Implementerad 2026-01-24**

---

### 🥉 Sprint 3: Interaktiva grafer med Chart.js ✅ KLAR

**Mål:** Professionellt utseende med interaktiva grafer

#### 3a. Integrera Chart.js (1h)
- [x] Chart.js redan installerat (v4.5.1)
- [x] Dynamisk import för bättre prestanda

#### 3b. Kategori-diagram (1.5h)
- [x] Horisontellt stapeldiagram per kategori
- [x] Färgkodning per prioritet (röd/orange/amber/sky)
- [x] Rika tooltips med medel, median, antal, JA-rate
- [x] Animerad inladdning (800ms, easeOutQuart)

#### 3c. Tid-på-dagen-diagram (1h)
- [x] Vertikalt stapeldiagram per tidsblock
- [x] Dynamisk färgkodning (grön ≤15min, gul ≤25min, röd >25min)
- [x] Tooltips med svarstid, antal, JA-rate

**Implementerad 2026-01-24**

---

### 📊 Sprint 4: Utökad statistik ✅ KLAR

#### 4a. Översikt/Dashboard
- [x] Nyckeltalskort (SMS-utskick, fyllda tider, SMS skickade, JA-rate)
- [x] Trend-pilar (jämför med föregående period)
- [x] API endpoint `/api/statistik/oversikt`

#### 4b. Svarsfrekvens per kategori
- [x] JA / NEJ / Ingen svar per kategori
- [x] Staplat stapeldiagram med Chart.js

#### 4c. Statistik per dimension
- [x] Per operationsstorlek (Liten/Stor)
- [x] Per sida (Höger/Vänster/Ej angiven)
- [x] Visuella progress bars med fördelning

#### 4d. Trendanalys
- [x] API endpoint `/api/statistik/trend`
- [x] Linjediagram med veckodata
- [x] JA-rate, svarstid och SMS-volym över tid
- [x] Interaktiva tooltips

#### 4e. Polish (delvis)
- [x] Laddningsindikatorer
- [ ] Export till CSV (framtida)

**Implementerad 2026-01-24**

---

### Sammanfattning

| Sprint | Fokus | Status | Datum |
|--------|-------|--------|-------|
| **1** | Svarstid per kategori | ✅ Klar | 2026-01-24 |
| **2** | Tid på dagen | ✅ Klar | 2026-01-24 |
| **3** | Interaktiva grafer | ✅ Klar | 2026-01-24 |
| **4** | Utökad statistik | ✅ Klar | 2026-01-24 |

**Alla sprints implementerade:** 2026-01-24

Implementerade funktioner:
- [x] API endpoint `/api/statistik/svarstid`
- [x] API endpoint `/api/statistik/oversikt`
- [x] API endpoint `/api/statistik/trend`
- [x] Databasmigrering med trigger för svarstidsberäkning
- [x] Dashboard med nyckeltalskort och trendpilar
- [x] Svarsfördelning per kategori (staplat diagram)
- [x] Statistik per dimension (op-storlek, sida)
- [x] Trendanalys med linjediagram
- [x] Chart.js-grafer med animationer
- [x] Interaktiva tooltips
- [x] Periodväljare (30d/90d/All tid)
- [x] Detaljerad tabell med alla mätvärden

---

## 8. Framtida utbyggnad

### Möjliga tillägg

1. **Export till Excel** - Ladda ner statistik som CSV
2. **Jämförelse** - Jämför två perioder
3. **Notifieringar** - "Din JA-rate har ökat med 10% denna månad!"
4. **Prediktioner** - "Baserat på historik behövs troligen 3 SMS för detta utskick"
5. **A/B-testning** - Testa olika intervall och mät resultat

### Integrationsmöjligheter

- **Power BI / Looker** - Export för avancerad analys
- **Webhook** - Skicka statistik till externt system

---

## 9. Öppna frågor

1. **Anonymisering**: Ska vi visa statistik per läkare? (Kan vara känsligt)
2. **Minsta datamängd**: Hur många datapunkter krävs för att visa en kategori? (5? 10?)
3. **Grafbibliotek**: Chart.js eller något enklare?
4. **Real-time**: Ska statistiken uppdateras live eller räcker 5 min cache?

---

*Nästa steg: Granska denna spec och ge feedback innan implementation påbörjas.*


---

# DEL E - 03 Prediktion (03-PREDIKTION.md)

# Specifikation: Prediktioner för Kort varsel-SMS

> **Status:** Koncept / Framtida utveckling  
> **Beroenden:** Minst 200-500 utskick för tillförlitliga prediktioner  
> **Senast uppdaterad:** 2026-01-24

---

## 1. Övergripande vision

### Problemet vi löser

Idag startar personalen ett utskick och hoppas att någon svarar JA. De vet inte:
- Hur många SMS som troligen behövs för att fylla tiden
- Om de borde vänta till imorgon för bättre chanser
- Vilka patienter som har störst chans att tacka ja

### Lösningen

Ett prediktionssystem som **innan utskicket startas** kan säga:

> *"Baserat på historisk data: För att fylla denna tid med **90% säkerhet** behöver du kontakta **5 patienter**. Med nuvarande patientpool (3 AKUT, 2 Sjukskrivna) uppskattar vi **85% chans** att fylla tiden."*

---

## 2. Grundläggande matematik

### 2.1 JA-sannolikhet per kategori

Från historisk data kan vi beräkna:

| Kategori | JA-rate (av svar) | Svarsfrekvens | **Effektiv JA-rate** |
|----------|-------------------|---------------|----------------------|
| AKUT | 75% | 80% | **60%** |
| Sjukskriven | 65% | 70% | **45.5%** |
| Mycket ont | 55% | 65% | **35.75%** |
| Normal | 40% | 50% | **20%** |

**Effektiv JA-rate** = JA-rate × Svarsfrekvens

### 2.2 Sannolikhet att få minst ett JA

Om vi skickar till N patienter med individuella JA-sannolikheter p₁, p₂, ..., pₙ:

```
P(minst ett JA) = 1 - (1-p₁)(1-p₂)...(1-pₙ)
```

**Exempel:**
- Patient 1: AKUT (60% chans) → (1-0.60) = 0.40
- Patient 2: Sjukskriven (45.5%) → (1-0.455) = 0.545
- Patient 3: Normal (20%) → (1-0.20) = 0.80

```
P(minst ett JA) = 1 - (0.40 × 0.545 × 0.80) = 1 - 0.1744 = 82.56%
```

### 2.3 Hur många SMS för X% säkerhet?

**Formel för homogen grupp (samma kategori):**
```
N = ln(1 - målsannolikhet) / ln(1 - effektiv_ja_rate)
```

**Exempel: 90% säkerhet med Normal-patienter (20% JA-rate):**
```
N = ln(1 - 0.90) / ln(1 - 0.20) = ln(0.10) / ln(0.80) = -2.303 / -0.223 ≈ 10.3
```
→ **11 SMS behövs**

**Samma beräkning med AKUT-patienter (60% JA-rate):**
```
N = ln(0.10) / ln(0.40) = -2.303 / -0.916 ≈ 2.5
```
→ **3 SMS behövs**

---

## 3. Prediktionsmodell

### 3.1 Inputdata

För varje utskick samlar vi:

```typescript
interface PrediktionInput {
  // Patientpool
  patienter: {
    kategori: 'AKUT' | 'Sjukskriven' | 'Mycket ont' | 'Normal';
    opStorlek: 'liten' | 'stor';
    sida: 'höger' | 'vänster' | null;
    dagarTillPlaneradOp: number;
  }[];
  
  // Utskicksparametrar
  dagarTillUtskickDatum: number;
  tidPaDagen: number; // timme (8-18)
  lakare: string;
  onskatSida: 'höger' | 'vänster' | null;
}
```

### 3.2 Outputdata

```typescript
interface PrediktionOutput {
  // Huvudprediktion
  chansAttFylla: number; // 0-100%
  antalSmsForMal: {
    mal90: number; // SMS för 90% säkerhet
    mal95: number; // SMS för 95% säkerhet
    mal99: number; // SMS för 99% säkerhet
  };
  
  // Tidsuppskattning
  forvantatTidTillFylld: {
    minuter: number;
    konfidensintervall: [number, number]; // [min, max]
  };
  
  // Rekommendationer
  rekommendationer: string[];
  
  // Patientranking
  patientRanking: {
    patientIndex: number;
    jaSannolikhet: number;
    bidragTillMal: number; // Hur mycket ökar chansen?
  }[];
}
```

### 3.3 Viktade faktorer

Utöver kategori påverkar flera faktorer JA-sannolikheten:

| Faktor | Påverkan på JA-rate | Källa |
|--------|---------------------|-------|
| Tid på dagen | ±15% | Historisk data |
| Veckodag | ±10% | Historisk data |
| Dagar till planerad op | ±20% | Korrelationsanalys |
| Matchande sida | +10% | Hypotes (behöver valideras) |
| Matchande läkare | +5% | Hypotes |

**Justerad sannolikhet:**
```
p_justerad = p_bas × faktor_tid × faktor_veckodag × faktor_vantetid × ...
```

---

## 4. Användargränssnitt

### 4.1 Innan utskicksstart

När användaren fyller i utskicksformuläret visas en prediktionspanel:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔮 PREDIKTION                                                  │
│                                                                 │
│  Med nuvarande urval (12 patienter):                           │
│                                                                 │
│  ┌───────────────────────────────────────┐                     │
│  │  ████████████████████░░░░  82%        │  Chans att fylla    │
│  └───────────────────────────────────────┘                     │
│                                                                 │
│  📊 För att nå 90% säkerhet:                                   │
│     • Behöver kontakta: 5 patienter                            │
│     • Du har: 12 matchande (tillräckligt ✅)                    │
│                                                                 │
│  ⏱️ Uppskattad tid till fylld:                                 │
│     • ~45 minuter (30-75 min)                                  │
│                                                                 │
│  💡 Rekommendationer:                                          │
│     • Starta före kl 14 för bäst svarsfrekvens                │
│     • 3 AKUT-patienter finns - hög chans att fylla snabbt     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Patientranking

Visa en rankad lista med bidrag till målet:

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 OPTIMAL ORDNING                                             │
│                                                                 │
│  #  Patient       Kategori     JA-chans   Kumulativ chans     │
│  ─────────────────────────────────────────────────────────────  │
│  1  Anna S.       🚨 AKUT       58%        58%                 │
│  2  Erik L.       📋 Sjukskr.   42%        76%                 │
│  3  Maria K.      🚨 AKUT       55%        89%                 │
│  4  Johan B.      🔥 Ont        33%        93% ← 90% uppnått   │
│  5  Lisa A.       ⏰ Normal     18%        94%                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ℹ️ Med 4 patienter når du 93% chans att fylla tiden.         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Dashboard-widget

På översiktssidan, en snabb indikator:

```
┌─────────────────────────────────────┐
│  Senaste 30 dagarna                 │
│                                     │
│  🎯 Prediktionsnoggrannhet: 87%     │
│     (Systemet förutsåg rätt i 87%   │
│      av fallen)                     │
│                                     │
│  📈 Trend: Förbättras (+3%)         │
└─────────────────────────────────────┘
```

---

## 5. Teknisk implementation

### 5.1 Databasändringar

```sql
-- Tabell för att lagra prediktioner (för validering)
CREATE TABLE sms_prediktioner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampanj_id UUID REFERENCES sms_kampanjer(id),
  
  -- Prediktion vid start
  prediktion_chans DECIMAL(5,2),      -- Förutsagd chans (0-100)
  prediktion_antal_sms INTEGER,       -- Förväntat antal SMS
  prediktion_tid_minuter INTEGER,     -- Förväntad tid
  
  -- Utfall (fylls i när utskicket avslutas)
  faktiskt_antal_sms INTEGER,
  faktisk_tid_minuter INTEGER,
  kampanj_fylld BOOLEAN,
  
  -- Metadata
  skapad_vid TIMESTAMPTZ DEFAULT NOW()
);

-- Index för analys
CREATE INDEX idx_prediktioner_kampanj ON sms_prediktioner(kampanj_id);
```

### 5.2 API-endpoint

```typescript
// POST /api/statistik/prediktion
interface PrediktionRequest {
  patientIds: string[];           // Valda patienter
  kampanjDatum: string;           // YYYY-MM-DD
  startTid: number;               // Timme (8-18)
  lakare?: string;
  onskatSida?: 'höger' | 'vänster';
}

interface PrediktionResponse {
  chansAttFylla: number;
  antalSmsFor90: number;
  antalSmsFor95: number;
  forvantatTidMinuter: number;
  konfidensintervall: [number, number];
  patientRanking: PatientRank[];
  rekommendationer: string[];
  dataunderlag: {
    antalHistoriskaUtskick: number;
    senastUppdaterad: string;
  };
}
```

### 5.3 Beräkningslogik

```typescript
function beraknaPredikion(
  patienter: Patient[],
  historiskData: HistoriskData
): PrediktionOutput {
  
  // 1. Hämta basfrekvenser från historisk data
  const basfrekvenser = hamtaBasfrekvenser(historiskData);
  
  // 2. Beräkna justerad JA-sannolikhet per patient
  const patientSannolikheter = patienter.map(p => {
    let sannolikhet = basfrekvenser[p.kategori].effektivJaRate;
    
    // Justera för tid på dagen
    sannolikhet *= tidPaDagenFaktor(utskickStartTid);
    
    // Justera för väntetid
    sannolikhet *= vantetidFaktor(p.dagarTillPlaneradOp);
    
    // Justera för matchande sida
    if (p.sida === onskatSida) {
      sannolikhet *= 1.10; // +10%
    }
    
    return Math.min(sannolikhet, 0.95); // Cap vid 95%
  });
  
  // 3. Sortera patienter efter sannolikhet (högst först)
  const rankadiePatienter = sorteraEfterSannolikhet(
    patienter, 
    patientSannolikheter
  );
  
  // 4. Beräkna kumulativ sannolikhet
  let kumulativChans = 0;
  let antalFor90 = 0;
  
  for (let i = 0; i < rankadiePatienter.length; i++) {
    const p = patientSannolikheter[rankadiePatienter[i].index];
    kumulativChans = 1 - (1 - kumulativChans) * (1 - p);
    
    if (kumulativChans >= 0.90 && antalFor90 === 0) {
      antalFor90 = i + 1;
    }
  }
  
  // 5. Uppskatta tid baserat på historiska svarstider
  const forvantatTid = beraknaForvantatTid(
    rankadiePatienter.slice(0, antalFor90),
    historiskData
  );
  
  return {
    chansAttFylla: kumulativChans * 100,
    antalSmsFor90: antalFor90,
    forvantatTidMinuter: forvantatTid,
    // ...
  };
}
```

---

## 6. Validering och förbättring

### 6.1 Mätning av noggrannhet

Efter varje utskick jämför vi prediktion med utfall:

```typescript
interface PrediktionValidering {
  // Var prediktionen rätt?
  predikteradChans: number;    // T.ex. 85%
  faktisktUtfall: boolean;     // Fylldes tiden?
  
  // Avvikelse
  predikteratAntalSms: number; // T.ex. 4
  faktisktAntalSms: number;    // T.ex. 6
  avvikelse: number;           // +2 SMS (50% mer)
}
```

### 6.2 Kontinuerlig förbättring

Systemet förbättras över tid genom:

1. **Bayesiansk uppdatering** - Justera basfrekvenser med nya data
2. **Anomalidetektering** - Flagga utskick som avviker kraftigt
3. **A/B-testning** - Testa olika viktningar av faktorer

### 6.3 Krav på dataunderlag

| Mått | Minimum | Rekommenderat |
|------|---------|---------------|
| Totalt antal utskick | 100 | 500+ |
| Utskick per kategori | 20 | 100+ |
| Tidsperiod | 3 månader | 12 månader |

---

## 7. Exempel på rekommendationer

Systemet kan ge kontextuella rekommendationer:

### Vid låg chans (<50%)

> *"⚠️ Låg chans att fylla (42%). Överväg att:*
> - *Utöka patienturvalet (ta med fler kategorier)*
> - *Vänta till imorgon (bättre svarsfrekvens på måndagar)*
> - *Starta tidigare på dagen (bäst före kl 11)"*

### Vid hög chans men få patienter

> *"✅ Hög chans (88%) men tunn marginal. Du har exakt 3 AKUT-patienter - om alla säger NEJ finns inga fler. Överväg att inkludera Sjukskrivna som backup."*

### Vid optimal situation

> *"🎯 Utmärkt utgångsläge! Med 8 patienter (3 AKUT, 2 Sjukskrivna) förväntar vi att tiden fylls inom 30 minuter med 95% säkerhet."*

---

## 8. Framtida utökningar

### 8.1 Maskininlärning

Med tillräckligt med data kan vi träna en ML-modell:

- **Features:** Alla patientegenskaper, tid, veckodag, läkare, etc.
- **Target:** Binärt (fylld/ej fylld) eller antal SMS till fylld
- **Modell:** Logistisk regression → Random Forest → Gradient Boosting

### 8.2 Realtidsjustering

Under pågående utskick:

> *"📊 Uppdaterad prediktion: Efter 2 NEJ-svar har chansen sjunkit till 65%. Överväg att utöka med 2 patienter för att nå 90% igen."*

### 8.3 Simulering

"Vad händer om"-scenarier:

> *"Om du lägger till 2 Sjukskrivna patienter ökar chansen från 72% till 89%."*

---

## 9. Implementationsordning

### Fas 1: Grundläggande prediktion (MVP)
- [ ] Beräkna basfrekvenser från historisk data
- [ ] Enkel sannolikhetsberäkning per patient
- [ ] Visa chans att fylla i utskicksformuläret
- [ ] Uppskattad tid till fylld

### Fas 2: Patientranking
- [ ] Optimal ordning baserat på sannolikhet
- [ ] Kumulativ chans-visualisering
- [ ] "Antal SMS för 90%"-indikator

### Fas 3: Rekommendationer
- [ ] Kontextuella tips baserat på situation
- [ ] Varningar vid låg chans
- [ ] Förslag på förbättringar

### Fas 4: Validering & förbättring
- [ ] Lagra prediktioner i databas
- [ ] Jämför med utfall
- [ ] Beräkna och visa noggrannhet
- [ ] Justera modellen baserat på feedback

---

## 10. Sammanfattning

Ett prediktionssystem ger personalen **förhandsinformation** som hjälper dem:

1. **Fatta bättre beslut** - Ska vi starta nu eller vänta?
2. **Optimera patienturval** - Vilka ska vi kontakta först?
3. **Sätta realistiska förväntningar** - Hur lång tid tar det troligen?
4. **Förbättra över tid** - Lära av historiska mönster

Det viktigaste är att börja samla data nu, så att vi har tillräckligt underlag när vi implementerar prediktionerna.


---

# DEL F - 04 GDPR (04-GDPR.md)

# GDPR och SMS-hantering

> **Dokument:** Dataskyddsdokumentation för SMS-tjänster  
> **Senast uppdaterad:** 2026-01-24  
> **Ansvarig:** Carlos Rivero Siri, verksamhetschef

---

## SMS-leverantör: 46elks

### Företagsinformation
- **Företag:** 46elks AB
- **Tjänst:** SMS API för patientkommunikation
- **Webbplats:** https://46elks.com
- **Kontakt:** 0766 86 10 04

### Bekräftad efterlevnad (2026-01-24)

Följande bekräftades via e-post från 46elks (Adham):

| Krav | Status | Detaljer |
|------|--------|----------|
| LEK 2022:482 | ✅ Bekräftat | 46elks är registrerad telekomoperatör som följer Lag (2022:482) om elektronisk kommunikation |
| Datalagring | ✅ Sverige | Egna servrar i Stockholm, Uppsala och Göteborg |
| Dataskyddspolicy | ✅ Dokumenterad | https://46elks.com/data-protection |

---

## Vår datahantering

### Vilken data skickas till 46elks?

| Data | Syfte | Lagringstid hos 46elks |
|------|-------|------------------------|
| Telefonnummer | Leverera SMS | Enligt deras policy |
| SMS-innehåll | Meddelandetext | Enligt deras policy |

### Vilken data lagrar vi själva?

| Data | Lagring | Skydd |
|------|---------|-------|
| Telefonnummer | Supabase (krypterat) | AES-256 kryptering |
| Telefon-hash | Supabase | SHA-256 för dubblettdetektering |
| Patientnamn | Supabase | RLS-skyddad |
| SMS-status | Supabase | Skickad/Besvarad/etc |

---

## Rättslig grund för behandling

### Berättigat intresse (Artikel 6.1.f GDPR)

SMS-utskick för kort varsel-bokning baseras på:

1. **Patientens intresse:** Möjlighet att få tidigare operationstid
2. **Klinikens intresse:** Effektivt utnyttjande av OP-kapacitet
3. **Samhällsintresse:** Kortare vårdköer

### Samtycke

- Patienter kan när som helst avregistrera sig genom att svara **STOPP**
- Samtycke registreras i patientpoolen
- Opt-out respekteras omedelbart

---

## Tekniska skyddsåtgärder

### Kryptering
```
Telefonnummer i vila:  AES-256 (ENCRYPTION_KEY i .env)
Telefonnummer i transit: HTTPS/TLS till 46elks API
Databaskommunikation:   TLS till Supabase
```

### Åtkomstkontroll
- Endast inloggad personal kan se patientdata
- Supabase Row Level Security (RLS) aktiverat
- Inga telefonnummer visas i klartext i UI

### Loggning
- SMS-utskick loggas med tidsstämpel
- Svar loggas för spårbarhet
- Ingen känslig data i serverloggar

---

## Patienträttigheter

| Rättighet | Hur vi uppfyller |
|-----------|------------------|
| Rätt till information | Info på hemsidan om SMS-systemet |
| Rätt till tillgång | Patient kan begära registerutdrag |
| Rätt till radering | Svara STOPP eller kontakta kliniken |
| Rätt till invändning | Samtycke kan återkallas när som helst |

---

## Myndighetskontakt

### IMY - Integritetsskyddsmyndigheten

**Status:** Väntar på svar (skickat 2026-01-24)

Vi har begärt vägledning från IMY gällande:

1. **Patientdatalagen vs GDPR** - Eftersom systemet är fristående från journalsystemet och data skrivs in manuellt, omfattas det av PDL eller endast GDPR?
2. **EU-molntjänster** - Är det tillåtet att använda molntjänst inom EU (Frankfurt) för notifieringsdata?
3. **Ytterligare rekommendationer**

#### Skickad förfrågan till IMY

```
Till: dso@imy.se
Datum: 2026-01-24
Ämne: Vägledning - fristående SMS-notifiering för avbokade operationstider

Hej,

Jag driver en privat ortopedisk specialistklinik och har utvecklat ett 
internt notifieringssystem för att informera patienter om lediga 
operationstider. Jag vill säkerställa att lösningen följer gällande 
lagstiftning och ber om vägledning.

BAKGRUND
När patienter avbokar operationer vill vi kunna informera andra patienter 
på väntelistan om att en tid blivit ledig.

Viktiga avgränsningar:
- Systemet är helt fristående från vårt journalsystem
- Ingen teknisk koppling eller automatisk dataöverföring
- All patientdata skrivs in manuellt av personal
- Detta är inte ett bokningssystem och inte ett tvåvägs-SMS-system

Flödet är:
1. Personal skriver manuellt in patientuppgifter
2. Systemet skickar ett informations-SMS (envägskommunikation)
3. Patienten klickar på en länk och markerar intresse via webbsida
4. Personal kontaktar patienten per telefon för att slutföra bokning

Ingen aktiv SMS-dialog sker mellan patient och system.
All medicinsk dokumentation och tidsbokning sker uteslutande i det 
fristående journalsystemet.

TEKNISK LÖSNING
- Databas: Supabase (servrar i Frankfurt, EU)
- SMS-leverantör: 46elks (svensk operatör, reglerad av LEK)
- Webbhotell: Netlify (EU)

Data som lagras:
- Patientnamn
- Telefonnummer (krypterat med AES-256)
- Prioritetsgrupp (1, 2 eller 3 - inga medicinska detaljer)
- Svarsstatus (intresserad/ej intresserad)

Data raderas automatiskt efter 30 dagar. Personnummer lagras inte.

Säkerhetsåtgärder:
- Kryptering i vila och under transport
- Row Level Security på databasnivå
- Endast behörig personal har åtkomst
- Loggning av alla åtkomster
- Personuppgiftsbiträdesavtal (DPA) med Supabase

SAMTYCKE
SMS skickas endast till patienter som aktivt samtyckt till att kontaktas 
vid lediga operationstider. Samtycket inhämtas via vår digitala 
hälsodeklaration. Patienten kan avregistrera sig via länk i SMS:et.

MINA FRÅGOR
1. Eftersom systemet är helt fristående från journalsystemet, data skrivs 
   in manuellt, och ingen medicinsk information hanteras - omfattas det 
   av Patientdatalagen, eller endast av GDPR?
2. Är det tillåtet att använda en molntjänst inom EU (Frankfurt) för 
   denna typ av notifieringsdata?
3. Finns det ytterligare åtgärder ni rekommenderar?

Jag uppskattar all vägledning ni kan ge.

Med Vänlig Hälsning
Carlos Rivero Siri, verksamhetschef
Södermalms Ortopedi / Siri Stockholm AB
```

#### Svar från IMY

*Väntar på svar - uppdateras när svar inkommer*

---

## Bilagor

### E-postbekräftelse från 46elks

```
Från: Adham, 46elks
Datum: 2026-01-24
Ämne: Re: GDPR-frågor

Hej Carlos,

Kul och välkommen! 

1. Bekräftelse att ni regleras av LEK 2022:482/ePrivacy
Svar: Vi bekräftar att 46elks är en registrerad telekomoperatör som 
följer den svenska Lag (2022:482) om elektronisk kommunikation (LEK).

2. Information om var SMS-data lagras geografiskt
Svar: Vi driftar och äger våra egna servar i Sverige. Servrarna samt 
SMS-data lagras i Stockholm, Uppsala samt Göteborg. 

3. Er dataskyddspolicy/data protection policy
Svar: Jag hänvisar dig till https://46elks.com/data-protection som 
är vår data protection policy. 

Har du några andra frågor eller funderingar är det bara att skriva 
här eller ringa på 0766 86 10 04.

Trevlig helg! 

Hälsningar,
Adham
46elks
```

---

## Länkar

- [46elks Data Protection Policy](https://46elks.com/data-protection)
- [Lag (2022:482) om elektronisk kommunikation](https://www.riksdagen.se/sv/dokument-lagar/dokument/svensk-forfattningssamling/lag-2022482-om-elektronisk-kommunikation_sfs-2022-482)
- [GDPR (EU 2016/679)](https://eur-lex.europa.eu/legal-content/SV/TXT/?uri=CELEX%3A32016R0679)
- [IMY - Integritetsskyddsmyndigheten](https://www.imy.se/)

---

*Detta dokument är en del av Södermalms Ortopedis GDPR-dokumentation.*


---

# DEL G - 05 Open source (05-OPEN-SOURCE.md)

# Open Source-plan: Kort varsel-SMS

> **Status:** Planering  
> **Målgrupp:** Ortopedkliniker, dagkirurgi, andra vårdgivare med schemalagda ingrepp  
> **Problemet vi löser:** Fylla luckor i operationsschemat med minimal administration

---

## Bakgrund

Alla ortopedkliniker har samma problem: patienter avbokar, och tomma OP-tider kostar pengar och förlänger köer. Detta system automatiserar processen att hitta ersättare via SMS.

### Varför open source?

- Löser ett universellt problem inom vården
- Ingen kommersiell produkt gör detta bra idag
- Kan anpassas till lokala behov (språk, prioriteringslogik, SMS-leverantör)
- Bygger goodwill och kan leda till samarbeten

---

## Ekonomisk bakgrund: Marginalintäktens kraft

### Samuelson och marginalekonomi

Paul Samuelson, Nobelpristagare i ekonomi 1970, formaliserade i sin klassiska lärobok *Economics* (1948) principerna för **marginalanalys** - hur företag maximerar vinst genom att analysera kostnaden och intäkten för varje ytterligare enhet.

Kärninsikten: **När fasta kostnader redan är täckta, genererar ytterligare försäljning exceptionellt hög vinstmarginal.**

### Tillämpning på operationsverksamhet

En operationssal har stora **fasta kostnader** som måste betalas oavsett beläggning:

| Kostnad | Typ | Betalas oavsett om salen används |
|---------|-----|----------------------------------|
| Personal (anestesi, op-ssk, undersköterska) | Fast | ✅ Ja |
| Lokalhyra | Fast | ✅ Ja |
| Utrustning, avskrivningar | Fast | ✅ Ja |
| Försäkringar, administration | Fast | ✅ Ja |

När dessa kostnader redan är täckta av planerade operationer, blir **marginalkostnaden** för en extra operation mycket låg:

| Kostnad | Typ | Ungefärlig andel av intäkt |
|---------|-----|----------------------------|
| Förbrukningsmaterial (suturer, implantat) | Rörlig | ~10-20% |
| Läkemedel | Rörlig | ~5-10% |
| Städning | Rörlig | ~1-2% |
| **Totalt rörlig kostnad** | | **~15-30%** |

### Konsekvens: Extremt hög vinstmarginal

> *"En obesatt operationstid som fylls via kort varsel kan generera **50-70% ren vinstmarginal** eftersom de fasta kostnaderna redan är täckta av det ordinarie schemat."*

**Räkneexempel:**
```
Intäkt för en knäartroskopi:        25 000 kr
- Rörliga kostnader (material):     - 5 000 kr
= Täckningsbidrag:                  20 000 kr (80%)

Om salen annars stått tom:
- Förlorad intäkt:                  25 000 kr
- Sparade rörliga kostnader:        + 5 000 kr
= Förlorat täckningsbidrag:         20 000 kr
```

### Varför detta motiverar systemet

1. **ROI på minuter:** Ett SMS-utskick kostar ~0.50 kr och tar 30 sekunder att initiera. Potentiell vinst: 20 000 kr.

2. **Varje fylld tid räknas:** Till skillnad från "vanliga" patienter där marginalerna är lägre, ger kort varsel-patienter nästan maximal vinst.

3. **Dubbel effekt:** Förutom direkt vinst kortas kön, vilket förbättrar patientnöjdhet och minskar risk för komplikationer av fördröjd vård.

### Sammanfattning

Samuelson visade att rationella företag fokuserar på marginalen - där varje ytterligare enhet ger högst avkastning. För en operationsklinik är **den obesatta tiden som fylls via kort varsel** exakt en sådan marginalenhet: låg kostnad, hög intäkt, maximal vinst.

Detta gör ett välfungerande kort varsel-system till en av de mest lönsamma investeringarna en klinik kan göra.

---

## Kärnfunktioner att inkludera

### Måste ha (MVP)
- [ ] Patientpool med prioriteringssystem
- [ ] SMS-utskick med gradvis eskalering
- [ ] Svarshantering (JA/NEJ/STOPP)
- [ ] Kampanjhantering (skapa, avsluta, historik)
- [ ] Grundläggande statistik

### Trevligt att ha
- [ ] Operationsstorlek (liten/stor)
- [ ] Sida (HÖ/VÄ) med prioritering
- [ ] Pensionärsprioritering (flexibla tider)
- [ ] Flera läkare per patient
- [ ] Schemalagda utskick

### Kan utelämnas (klinikspecifikt)
- Specifika operationstyper
- Integration med journalsystem
- Avancerad rapportering

---

## Teknisk arkitektur

### Stack
```
Frontend:    Astro (SSR)
Backend:     Astro API routes + Supabase
Databas:     PostgreSQL (via Supabase)
SMS:         46elks (eller konfigurerbar)
Hosting:     Netlify / Vercel
```

### Miljövariabler som behövs
```env
# Databas
SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# SMS (46elks eller annan leverantör)
SMS_PROVIDER=46elks          # 46elks | twilio | mock
ELKS_API_USER=
ELKS_API_PASSWORD=

# Kryptering
ENCRYPTION_KEY=              # 32 tecken för AES-256

# Klinikinfo (konfigurerbar)
CLINIC_NAME="Min Klinik"
SMS_SENDER_NAME="MinKlinik"  # Max 11 tecken
```

---

## Förenklingar för open source

### 1. Demo-läge
```typescript
// Om SMS_PROVIDER=mock, logga istället för att skicka
if (process.env.SMS_PROVIDER === 'mock') {
  console.log(`[DEMO] SMS till ${telefon}: ${meddelande}`);
  return { success: true, demo: true };
}
```

### 2. Seed-data
```sql
-- demo-data.sql
INSERT INTO kort_varsel_patienter (namn, telefon_hash, ...) VALUES
  ('Demo Patient 1', 'xxx', ...),
  ('Demo Patient 2', 'xxx', ...);
```

### 3. One-click deploy
- Netlify Deploy-knapp i README
- Supabase-projekt med färdiga migrations
- Steg-för-steg guide med skärmdumpar

---

## Dokumentation som behövs

```
/docs/
  README.md                 # Översikt + snabbstart
  INSTALLATION.md           # Detaljerad setup-guide
  SUPABASE-SETUP.md         # Skapa projekt, köra migrations
  SMS-PROVIDERS.md          # Konfigurera 46elks/Twilio/etc
  DEPLOYMENT.md             # Netlify/Vercel deployment
  CUSTOMIZATION.md          # Ändra texter, prioriteringslogik
  GDPR.md                   # Dataskydd och kryptering
  CONTRIBUTING.md           # Hur man bidrar
```

---

## Vad som behöver anonymiseras/generaliseras

| Nuvarande | Open source |
|-----------|-------------|
| "Södermalms Ortopedi" | `${CLINIC_NAME}` |
| Specifika läkarnamn | Konfigurerbar lista |
| Svenska texter | i18n-redo (sv som default) |
| 46elks | Abstrakt SMS-interface |

---

## Licensval

**Rekommendation: MIT eller Apache 2.0**

- Tillåter kommersiell användning
- Kräver inte att ändringar delas
- Enkelt för sjukhus/kliniker att använda

---

## Roadmap

### Fas 1: Stabilisera (nu)
- [x] Kärnfunktionalitet klar
- [ ] Testa i produktion
- [ ] Fixa buggar som upptäcks
- [ ] Dokumentera kända begränsningar

### Fas 2: Förbereda (senare)
- [ ] Extrahera till eget repo
- [ ] Ta bort klinikspecifik kod
- [ ] Skapa demo-läge
- [ ] Skriva dokumentation

### Fas 3: Publicera
- [ ] Skapa GitHub-repo
- [ ] Deploy-knapp i README
- [ ] Skriv blogginlägg / LinkedIn
- [ ] Kontakta ortopedföreningar?

---

## Potentiella samarbetspartners

- Sveriges Ortopedingenjörers Förening
- Privata vårdgivare (Capio, Aleris, etc.)
- Regioner med köproblem
- Nordiska motsvarigheter

---

## Risker och utmaningar

| Risk | Mitigation |
|------|------------|
| GDPR-oro | Tydlig dokumentation om kryptering |
| Teknisk komplexitet | Bra installationsguide |
| Support-börda | FAQ + GitHub Discussions |
| Ingen använder det | Marknadsför via rätt kanaler |

---

## Nästa konkreta steg

1. **Kortsiktigt:** Fortsätt utveckla och testa i produktion
2. **Mellanterm:** Skriv ner alla konfigurationer som behövs
3. **Långsiktigt:** Extrahera, dokumentera, publicera

---

*Senast uppdaterad: 2026-01-24*


---

# DEL H - 06 Vision (06-VISION.md)

# Kort Varsel App - Kommersiell Projektplan

> "Framtidens vårdadministration byggs inte av programmerare - den byggs av vårdpersonal med AI som verktyg."

---

## Executive Summary

**Kort Varsel** är en SMS-baserad tjänst för att snabbt fylla avbokade operationstider. Det som började som en intern funktion för Södermalms Ortopedi har potential att bli:

1. **En fristående SaaS-produkt** för privata vårdgivare
2. **En första byggsten** för ett framtida AI-drivet patienthanteringssystem
3. **Ett proof-of-concept** för hur vården kan bygga egna digitala verktyg utan traditionell IT-avdelning

---

## Vision

### Kortsiktig (2024-2025)
En enkel, effektiv tjänst som löser ETT problem riktigt bra: **Fyll avbokade tider snabbt.**

### Medellång (2025-2027)
En patientpool-plattform som hanterar:
- Kort varsel-bokningar
- Väntelistor
- Patient-kommunikation (SMS/e-post)
- Grundläggande patientregister (GDPR-säkert)

### Långsiktig (2027+)
Grunden för ett **AI-native journalsystem** - ett system där AI inte är ett tillägg utan kärnan i hur systemet fungerar och utvecklas.

---

## Problemet vi löser

### För vårdgivaren
| Problem | Kostnad |
|---------|---------|
| Avbokad operation = tom sal | 15 000 - 50 000 kr/timme i förlorad intäkt |
| Manuell ringning tar tid | 30-60 min personalarbete |
| Svårt nå patienter dagtid | Missade samtal, telefonsvarare |
| Ingen överblick över "alertta" patienter | Börjar om från början varje gång |

### För patienten
- Vill ofta få operation snabbare
- Svårt att svara på samtal under arbetstid
- Uppskattar SMS - kan svara när det passar

---

## Ekonomin: Varför marginalen är magisk

### Samuelson och marginalanalys

Paul Samuelson, Nobelpristagare i ekonomi 1970, formaliserade i *Economics* principen att **vinsten maximeras på marginalen** - de sista enheterna ett företag producerar har ofta högst vinstmarginal eftersom fasta kostnader redan är täckta.

### Tillämpning: Den obesatta OP-tiden

En kirurgklinik har enorma fasta kostnader som måste betalas oavsett beläggning:

| Fast kostnad | Betalas oavsett om salen används |
|--------------|----------------------------------|
| Personal (anestesi, op-ssk) | ✅ Ja |
| Lokal, utrustning | ✅ Ja |
| Administration | ✅ Ja |

När en patient avbokar och tiden förblir tom **förlorar kliniken hela intäkten men sparar nästan ingenting**. De rörliga kostnaderna (material, förbrukning) är bara 15-30% av intäkten.

### Konsekvens: Extrem lönsamhet

> **En obesatt tid som fylls via kort varsel kan generera 50-70% ren vinstmarginal.**

| | Tom tid | Fylld via kort varsel |
|-|---------|----------------------|
| Intäkt | 0 kr | 25 000 kr |
| Rörliga kostnader | 0 kr | -5 000 kr |
| **Täckningsbidrag** | **0 kr** | **20 000 kr** |

### ROI för systemet

| Investering | Kostnad |
|-------------|---------|
| Supabase (databas) | ~100 kr/mån |
| 46elks (SMS) | ~0.50 kr/SMS |
| Utvecklingstid | Engångskostnad |

| Avkastning | Värde |
|------------|-------|
| 1 fylld tid/vecka | ~80 000 kr/mån i täckningsbidrag |
| 2 fyllda tider/vecka | ~160 000 kr/mån |

**Payback-tid: < 1 dag.**

---

## Produkten: Kort Varsel App

### Kärnfunktioner (v1.0 - Klar!)

✅ **Patientpool**
- Lägg till patienter manuellt (namn, telefon, samtycke)
- Kryptering av telefonnummer (GDPR)
- Auto-radering efter 7 dagar
- Status-spårning: tillgänglig → kontaktad → bokad/nej

✅ **SMS-kampanjer**
- Skapa kampanj för specifikt datum
- Välj antal platser (1-3)
- "Först till kvarn"-logik
- Atomär hantering (inga dubbelbokning)

✅ **Patient-svarssida**
- Mobilvänlig länk i SMS
- JA/NEJ med ett klick
- Preop-bekräftelse inbyggd
- Reserv-hantering

✅ **Personal-notifikationer**
- SMS till vald personal vid JA-svar
- Dashboard för kampanjöversikt

### Planerade funktioner (v2.0)

🔲 **Förbättrad patientpool**
- Läkarfiltrering (vilka patienter passar vilken kirurg)
- Flexibel-markering (kan ta annan läkare)
- Prioritetskö (reserv-patienter först)
- Anteckningar per patient

🔲 **Intelligent utskick**
- Automatisk batchning (skicka till 3, vänta, skicka till nästa 3)
- Tidsbaserad eskalering
- Smart ordning baserat på historik

🔲 **Statistik & Insikter**
- Fyllnadsgrad per kampanj
- Svarstider
- "Alertta" patienter (svarar snabbt)
- Ekonomisk impact

🔲 **Multi-klinik**
- Separata konton per klinik
- Delad patientpool (opt-in)
- Admin-dashboard

---

## Personalportalen som kortlek (framtid)

> Personalportalen ses som en rad små kort som tillsammans skapar stor nytta.

### Servicekort att lägga till

🔲 **FASS-API (biverkningar)**
- Snabb sökning på läkemedel
- Fokus på biverkningar och varningsflaggor
- Ingen dosering i detta kort (endast säkerhetsinfo)

🔲 **Pendeltåg i realtid (Trafiklab)**
- Real Time API för avgångar, störningar och positioner
- Begränsat till **Södra Station** (snabb översikt på väg hem)
- Möjlighet att trigga SMS vid större störningar

🔲 **Parkerings-API (servicenätter)**
- Visar senaste servicenatt i närområdet
- Hjälper personal som kör bil att hitta parkering
- Begränsat till gator runt kliniken

---

## Teknisk Arkitektur

### Nuvarande stack (beprövad, enkel, skalbar)

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  Astro (SSR) + Tailwind CSS                         │
│  Hostad på Netlify (CDN, auto-deploy)               │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    BACKEND                           │
│  Astro API Routes (serverless)                      │
│  Netlify Functions                                  │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                   DATABASE                           │
│  Supabase (PostgreSQL)                              │
│  - Row Level Security                               │
│  - Real-time subscriptions                          │
│  - Edge Functions                                   │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                  INTEGRATIONER                       │
│  46elks - SMS                                       │
│  (Framtid: BankID, Swish, e-signering)             │
└─────────────────────────────────────────────────────┘
```

### Varför denna stack?

| Egenskap | Fördel |
|----------|--------|
| **Serverless** | Ingen server att underhålla, skalar automatiskt |
| **Supabase** | Postgres-kraft med Firebase-enkelhet |
| **Astro** | Snabbt, SEO-vänligt, flexibelt |
| **Netlify** | Git-push = deploy, gratis SSL, global CDN |
| **46elks** | Svensk SMS-leverantör, GDPR-compliant |

### Framtida utbyggnad

```
                    ┌──────────────────┐
                    │   AI-LAGER       │
                    │  (Claude/GPT)    │
                    │                  │
                    │  • Prioritering  │
                    │  • Textförslag   │
                    │  • Analys        │
                    └────────┬─────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
       ▼                     ▼                     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ KORT VARSEL │     │ VÄNTELISTA  │     │  BOKNING    │
│   (KLAR)    │     │  (NÄSTA)    │     │  (FRAMTID)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ PATIENTREGISTER  │
                    │  (Grunddata)     │
                    └──────────────────┘
```

---

## AI-Strategin: Varför detta är annorlunda

### Traditionell vårdIT
```
Behov → Upphandling → Leverantör → 2 år implementation → 
Driftavtal → Ändringsförfrågan → 6 mån väntetid → Frustration
```

### AI-Native utveckling
```
Behov → Beskriv för AI → Prototyp på 1 dag → Test → 
Iteration → Produktion på 1 vecka → Ändring? Samma dag.
```

### Konkreta exempel från detta projekt

| Funktion | Traditionell tid | Med AI |
|----------|------------------|--------|
| SMS-integration | 2-4 veckor | 2 timmar |
| Databas-schema | 1 vecka | 30 minuter |
| Svars-UI | 1-2 veckor | 3 timmar |
| Buggfix | Beroende på leverantör | 10 minuter |

### Implikationen

**Du behöver inte anställa programmerare.**

Du behöver:
1. En person som förstår verksamheten (du)
2. AI som skriver koden (Claude, GPT, etc.)
3. Grundläggande infrastruktur (Supabase, Netlify)
4. Eventuellt: En teknisk rådgivare några timmar/månad

---

## Affärsmodell

### Alternativ 1: Intern användning
- Ingen extern försäljning
- Kostnad: ~500 kr/mån (Supabase + SMS)
- Värde: Ökad fyllnadsgrad, minskad admin

### Alternativ 2: SaaS för kollegor
**Prissättning per månad:**

| Plan | Pris | Innehåll |
|------|------|----------|
| **Starter** | 990 kr | 1 klinik, 100 SMS/mån, 1 användare |
| **Professional** | 2 490 kr | 1 klinik, 500 SMS/mån, 5 användare |
| **Enterprise** | 4 990 kr | Multi-klinik, obegränsat SMS, API |

**Potentiella kunder:**
- Privata ortopedkliniker (50+ i Sverige)
- Dagkirurgi-enheter
- Ögonkliniker
- Tandvård (större kedjor)
- Veterinärkliniker

### Alternativ 3: White-label / Licensiering
- Sälj tekniken till journalsystem-leverantörer
- De integrerar i sin produkt
- Engångsavgift + royalty

---

## Utvecklingsfaser

### Fas 1: Stabilisering (Nu - Q1 2024)
**Mål:** Robust intern användning

- [ ] Testa alla scenarier (flera platser, reserv, timeout)
- [ ] Fixa DNS för sodermalmsortopedi.se
- [ ] Förbättra felhantering
- [ ] Dokumentation för personal
- [ ] Backup-rutiner

**Kostnad:** 0 kr (egen tid)
**Tid:** 2-4 veckor

### Fas 2: Patientpool 2.0 (Q2 2024)
**Mål:** Fullständig patientpool-hantering

- [ ] Import från Excel/CSV
- [ ] Sök och filtrera
- [ ] Bulk-operationer
- [ ] Historik per patient
- [ ] Läkar-koppling fullt ut

**Kostnad:** 0 kr (egen tid med AI)
**Tid:** 4-6 veckor

### Fas 3: Multi-användare (Q3 2024)
**Mål:** Redo för flera kliniker

- [ ] Användarhantering (roller)
- [ ] Klinik-separering
- [ ] Audit-logg
- [ ] Onboarding-flöde

**Kostnad:** ~5 000 kr (eventuell extern granskning)
**Tid:** 6-8 veckor

### Fas 4: Kommersialisering (Q4 2024)
**Mål:** Första externa kund

- [ ] Marknadsföringssida
- [ ] Betalningsintegration (Stripe)
- [ ] Support-system
- [ ] Juridisk granskning (användarvillkor, GDPR)

**Kostnad:** 10 000 - 20 000 kr
**Tid:** 8-12 veckor

---

## Risker och mitigation

| Risk | Sannolikhet | Impact | Mitigation |
|------|-------------|--------|------------|
| GDPR-incident | Låg | Hög | Kryptering, auto-radering, audit-logg |
| SMS-leverantör ändrar villkor | Låg | Medel | Abstraktion, alternativ leverantör |
| Supabase-avbrott | Låg | Hög | Backup-rutiner, möjlighet byta databas |
| Konkurrent kopierar | Medel | Låg | First-mover, nischfokus, relationer |
| AI-utveckling stannar | Mycket låg | Medel | Koden finns, kan underhållas traditionellt |

---

## Slutsats

### Det unika med detta projekt

1. **Byggt av domänexpert** - Du förstår problemet på djupet
2. **AI-native från start** - Inte legacy att dra med
3. **Minimalt beroende** - Ingen leverantör som kan hålla dig gisslan
4. **Skalbart men enkelt** - Börjar smått, kan växa

### Rekommendation

**Fortsätt bygga internt.** Använd det. Förfina det. När det fungerar felfritt för dig:

1. Visa för kollegor informellt
2. Mät intresse
3. Besluta om kommersialisering

**Du sitter på något värdefullt** - inte bara produkten, utan *processen*. 

Att en 65-årig kirurg kan bygga en fungerande SMS-tjänst på några dagar med AI är ett bevis på vart vi är på väg. Det är en story som säljer - inte bara produkten, utan visionen.

---

## Nästa steg

1. ✅ Testa systemet ordentligt internt (pågår)
2. ⬜ Dokumentera användning för personal
3. ⬜ Samla feedback efter 10 kampanjer
4. ⬜ Besluta om nästa fas

---

*Dokument skapat: 2024-01-23*
*Författare: AI (Claude) i samarbete med Carlos*


---

# DEL I - 07 AI-forberedelse (07-AI-FORBEREDELSE.md)

# AI-förberedelse för Kort varsel-SMS

> **Status:** Förberedande datasamling aktiv  
> **Datum:** 2026-01-25  
> **Mål:** Samla data för framtida ML-modeller

---

## 1. Översikt

Detta dokument beskriver de tekniska förberedelserna för att kunna integrera AI/ML i kort varsel-systemet i framtiden.

### Vad samlas nu?

| Data | Var | Syfte |
|------|-----|-------|
| Svarstid per patient | `sms_kampanj_mottagare.svarstid_sekunder` | Prediktera hur snabbt olika grupper svarar |
| Utskickstimme | `sms_kampanj_mottagare.utskick_timme` | Analysera optimal tid på dagen |
| Veckodag | `sms_kampanj_mottagare.utskick_veckodag` | Analysera bästa veckodag |
| Patienthistorik | `patient_svarshistorik` | Individuell JA-sannolikhet |
| Prediktioner | `sms_prediktioner` | Validera modellnoggrannhet |

---

## 2. Databasschema

### 2.1 Nya kolumner i `sms_kampanj_mottagare`

```sql
utskick_timme INTEGER           -- 0-23
utskick_veckodag INTEGER        -- 1=mån, 7=sön
patient_tidigare_forfragan INT  -- Antal tidigare förfrågningar
patient_tidigare_ja INT         -- Antal tidigare JA-svar
patient_tidigare_nej INT        -- Antal tidigare NEJ-svar
```

### 2.2 Ny tabell: `patient_svarshistorik`

Aggregerad statistik per patient (telefon_hash):

```sql
antal_forfragan INT
antal_ja INT
antal_nej INT
medel_svarstid_sekunder INT
historisk_ja_rate DECIMAL(5,4)  -- 0.0000 - 1.0000
```

### 2.3 Ny tabell: `sms_prediktioner`

Sparar prediktioner före utskick för validering:

```sql
-- Input
prediktion_chans DECIMAL        -- Förutsagd chans (0-100%)
prediktion_antal_sms INT        -- Förväntat antal SMS
input_antal_akut INT            -- Snapshot av patientmix

-- Utfall (fylls i efteråt)
faktiskt_fylld BOOLEAN
faktiskt_antal_sms INT
prediktion_korrekt BOOLEAN      -- Stämde prediktionen?
```

---

## 3. ML-redo View

En view `v_ml_training_data` samlar alla features i ett format lämpligt för ML-träning:

```sql
SELECT * FROM v_ml_training_data LIMIT 5;
```

**Features:**
- `target_ja` - Target variable (1/0)
- `feat_akut`, `feat_sjukskriven`, `feat_har_ont` - Prioritetskategorier
- `feat_alder`, `feat_pensionar` - Ålder
- `feat_sida_hoger`, `feat_op_liten`, `feat_op_stor` - Operationstyp
- `feat_timme`, `feat_veckodag`, `feat_morgon`, `feat_helg` - Tidpunkt
- `feat_historisk_ja_rate` - Patientens tidigare JA-rate

---

## 4. Triggers (automatiska)

### 4.1 `trg_fyll_utskick_metadata`
Fyller automatiskt i `utskick_timme` och `utskick_veckodag` när SMS skickas.

### 4.2 `trg_uppdatera_svarshistorik`
Uppdaterar `patient_svarshistorik` automatiskt när svar registreras:
- Räknar antal förfrågningar, JA, NEJ
- Beräknar historisk JA-rate
- Uppdaterar medel svarstid

---

## 5. Användning i kod

### 5.1 Hämta patienthistorik före utskick

```typescript
// I skapa.ts - hämta historik för varje patient
const { data: historik } = await supabaseAdmin
  .rpc('hamta_patient_historik', { p_telefon_hash: telefonHash });

// Spara i mottagare-data
{
  patient_tidigare_forfragan: historik?.tidigare_forfragan || 0,
  patient_tidigare_ja: historik?.tidigare_ja || 0,
  patient_tidigare_nej: historik?.tidigare_nej || 0,
}
```

### 5.2 Spara prediktion före utskick

```typescript
// Skapa prediktion-post
await supabaseAdmin.from('sms_prediktioner').insert({
  kampanj_id: kampanj.id,
  prediktion_chans: beraknadChans,
  prediktion_antal_sms: beraknatAntalSms,
  input_antal_patienter: mottagare.length,
  input_antal_akut: mottagare.filter(m => m.akut).length,
  // ...
});
```

### 5.3 Validera prediktion efter kampanj

```typescript
// När kampanj avslutas, uppdatera prediktion
await supabaseAdmin.from('sms_prediktioner')
  .update({
    faktiskt_fylld: kampanj.status === 'fylld',
    faktiskt_antal_sms: antalSkickadeSms,
    faktiskt_tid_minuter: tidTillFylld,
    validerad_vid: new Date().toISOString(),
    prediktion_korrekt: Math.abs(beraknadChans - faktiskChans) < 15,
  })
  .eq('kampanj_id', kampanjId);
```

---

## 6. ML-pipeline (framtida)

### Fas 1: Regelbaserad (nu → 500 datapunkter)
```
Statistik → Fasta vikter → Beräknad sannolikhet
```

### Fas 2: Enkel ML (500+ datapunkter)
```
v_ml_training_data → Logistisk regression → Sannolikhet per patient
```

### Fas 3: Avancerad ML (2000+ datapunkter)
```
Historisk data → XGBoost/Random Forest → Ranking + konfidensintervall
```

### Fas 4: LLM-assisterad (valfritt)
```
All data → GPT/Claude → Naturliga rekommendationer + förklaringar
```

---

## 7. Exportera träningsdata

### CSV för extern analys

```sql
\COPY (SELECT * FROM v_ml_training_data) TO '/tmp/training_data.csv' CSV HEADER;
```

### JSON för API

```typescript
// GET /api/ml/training-data
const { data } = await supabaseAdmin
  .from('v_ml_training_data')
  .select('*')
  .limit(10000);
```

---

## 8. Mätvärden att följa

| Mätvärde | Beskrivning | Mål |
|----------|-------------|-----|
| **Datapunkter** | Antal rader i `v_ml_training_data` | 500+ för Fas 2 |
| **Prediktionsnoggrannhet** | `prediktion_korrekt = true` % | >70% |
| **Feature coverage** | Andel rader med alla features ifyllda | >90% |
| **Historik-täckning** | Andel patienter med `historisk_ja_rate` | >50% |

### SQL för att kontrollera status

```sql
-- Antal datapunkter
SELECT COUNT(*) FROM v_ml_training_data;

-- Prediktionsnoggrannhet
SELECT 
  COUNT(*) as totalt,
  COUNT(*) FILTER (WHERE prediktion_korrekt) as korrekta,
  ROUND(100.0 * COUNT(*) FILTER (WHERE prediktion_korrekt) / COUNT(*), 1) as procent
FROM sms_prediktioner
WHERE validerad_vid IS NOT NULL;

-- Historik-täckning
SELECT 
  COUNT(*) as totalt,
  COUNT(*) FILTER (WHERE feat_historisk_ja_rate IS NOT NULL) as med_historik,
  ROUND(100.0 * COUNT(*) FILTER (WHERE feat_historisk_ja_rate IS NOT NULL) / COUNT(*), 1) as procent
FROM v_ml_training_data;
```

---

## 9. Säkerhet och GDPR

### Viktigt
- **Ingen persondata i ML-data** - endast `telefon_hash` (ej reversibelt)
- **Aggregerad historik** - individuella svar kopplas ej till namn
- **Lokal träning möjlig** - data behöver inte lämna servern

### Vid export
- Ta bort `telefon_hash` om data lämnar systemet
- Använd endast aggregerade mätvärden i rapporter

---

## 10. Nästa steg

1. ✅ **Kör migration** `008-ai-forberedelse.sql` i Supabase
2. 🔄 **Samla data** - varje utskick ger värdefull information
3. 📊 **Övervaka** - kolla datapunkter månadsvis
4. 🎯 **Vid 500+ datapunkter** - implementera regelbaserad prediktion
5. 🤖 **Vid 2000+ datapunkter** - överväg ML-modell

---

*Dokumentet uppdateras när fler AI-funktioner implementeras.*
