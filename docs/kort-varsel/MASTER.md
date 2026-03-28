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
