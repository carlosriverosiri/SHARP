# Kort Varsel-SMS: Masterdokumentation

> Komplett dokumentation for systemet som fyller avbokade operationstider via SMS-utskick.
>
> Senast uppdaterad: 2026-02-18

---

## Innehall

- [1. Sammanfattning](#1-sammanfattning)
- [2. Systemarkitektur](#2-systemarkitektur)
- [3. Flode och prioritering](#3-flode-och-prioritering)
- [4. Databas](#4-databas)
- [5. SMS-hantering (46elks)](#5-sms-hantering-46elks)
- [6. Patientpool](#6-patientpool)
- [7. Smart intervall-logik](#7-smart-intervall-logik)
- [8. Patientens svarssida](#8-patientens-svarssida)
- [9. Personaldashboard](#9-personaldashboard)
- [10. Statistik och analys](#10-statistik-och-analys)
- [11. Prediktion](#11-prediktion)
- [12. AI-forberedelse och ML-pipeline](#12-ai-forberedelse-och-ml-pipeline)
- [13. GDPR och juridik](#13-gdpr-och-juridik)
- [14. Sakerhet](#14-sakerhet)
- [15. Ekonomi och ROI](#15-ekonomi-och-roi)
- [16. Open source-plan](#16-open-source-plan)
- [17. Kommersiell vision](#17-kommersiell-vision)
- [18. Filstruktur](#18-filstruktur)
- [19. Miljovanvariabler](#19-miljovariabler)
- [20. Migrering och databas-setup](#20-migrering-och-databas-setup)
- [21. Status och roadmap](#21-status-och-roadmap)
- [Detaljdokumentation](#detaljdokumentation)

---

## 1. Sammanfattning

Kort Varsel-SMS ar ett system som automatiskt kontaktar patienter pa vantelistan nar operationstider blir lediga. Patienter far SMS med en lank och kan svara JA eller NEJ via en enkel webbsida. Systemet skickar SMS i prioritetsordning med adaptiva intervall beroende pa hur lang tid det ar kvar till operationen.

**Karnfunktioner:**
- Patientpool med prioritering och filtrering
- Automatiska SMS-utskick med gradvis eskalering
- Svarshantering (JA / NEJ / STOPP for opt-out)
- Smart intervall-logik baserad pa tid och bradskegrad
- Statistik, trender och prediktionsforberedelse
- GDPR-compliant med kryptering och IMY-kontakt

**Ekonomisk effekt:** En avbokad operation kostar ~10 000-50 000 kr i forlorad intakt. Systemet kostar ~100 kr/manad + ~0,50 kr per SMS. En fylld lucka per vecka ger ~80 000 kr/manad i bidrag.

---

## 2. Systemarkitektur

### Teknisk stack

| Komponent | Teknologi | Funktion |
|-----------|-----------|----------|
| Frontend | Astro + Tailwind CSS | SSR-renderade sidor |
| Backend | Astro API Routes | Serverlosa endpoints |
| Databas | Supabase (PostgreSQL) | Tabeller, RLS, triggers |
| SMS | 46elks | Skicka/ta emot SMS |
| Hosting | Netlify | Deploy, schemalagda funktioner |
| Grafer | Chart.js | Statistikvisualisering |

### Arkitekturdiagram

```
[Personal] → [Astro SSR / Netlify]
                    ↓
              [Supabase DB]
                    ↓
            [Netlify Scheduled Function]
                    ↓
              [46elks SMS API]
                    ↓
              [Patient mobil]
                    ↓
              [Svarssida /s/[kod]]
                    ↓
              [Supabase → uppdatera status]
```

### Serverlos arkitektur

- **Netlify Functions:** `scheduled-sms.mts` kor varje minut och skickar nasta SMS i kon
- **Astro API Routes:** Hanterar CRUD for kampanjer, pool, statistik
- **Supabase RLS:** Radnivasakerhet -- personal ser bara sin kliniks data
- **46elks Webhook:** Inkommande SMS tas emot via `/api/sms/inkommande`

---

## 3. Flode och prioritering

### Huvudflode

```
1. Operationstid blir ledig
2. Personal skapar SMS-kampanj (valjer patienter, prioritet, tid)
3. System skickar SMS i prioritetsordning, ett i taget
4. Patient klickar lank → svarar JA/NEJ pa webbsida
5. Forsta JA-svar: Personal ringer och bekraftar
6. Utskick avslutas (automatiskt vid JA eller manuellt)
```

### Prioriteringsordning

| Prio | Kategori | Beskrivning |
|------|----------|-------------|
| 1 | AKUT | Maste opereras snarast |
| 2 | Sjukskriven | Vantar pa att aterga i arbete |
| 3 | Mycket ont | Hog smartniva |
| 4 | Pensionar (67+) | Flexibla tider |
| 5 | Normal | Standardprioritering |

Inom varje prioritetsniva sorteras patienter efter:
- **Operationsstorlek** (Liten: 5-15 min, Stor: 15-60 min, Bada)
- **Sida** (HO/VA) -- for optimering av operationsutrustning

### SMS-modeller

| Modell | Innehall | Anvandning |
|--------|----------|------------|
| Modell A | Vag text ("kort varsel") | Utan samtycke |
| Modell B | Detaljerad ("avbokad tid [datum]") | Med samtycke |

Texten anpassas dynamiskt baserat pa antal platser (1-3) och tidsblock.

---

## 4. Databas

### Huvudtabeller

**`sms_kampanjer`** -- Varje SMS-utskick

| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| id | UUID | Primar nyckel |
| skapad_av | UUID | Personalens ID |
| status | TEXT | `aktiv`, `avslutad`, `pausad` |
| resultat | TEXT | `fylld_via_sms`, `fylld_manuellt`, `misslyckad`, `avbruten`, `timeout` |
| antal_platser | INTEGER | 1-3 |
| tidsblock | TEXT | T.ex. "Morgon (08-12)" |
| intervall_minuter | INTEGER | Minuter mellan SMS |
| created_at | TIMESTAMPTZ | Skapad |

**`sms_kampanj_mottagare`** -- Varje patient i ett utskick

| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| id | UUID | Primar nyckel |
| kampanj_id | UUID | FK till kampanj |
| patient_id | UUID | FK till patientpool |
| unik_kod | TEXT | >= 16 tecken, UUID v4 |
| status | TEXT | `vantar`, `skickad`, `ja_svar`, `nej_svar`, `timeout` |
| svarstid_sekunder | INTEGER | Auto-beraknad via trigger |
| utskick_timme | INTEGER | Timme vid utskick (0-23) |
| utskick_veckodag | INTEGER | Veckodag (0=sondag) |

**`kort_varsel_patienter`** -- Patientpoolen

| Kolumn | Typ | Beskrivning |
|--------|-----|-------------|
| id | UUID | Primar nyckel |
| telefon_krypterad | TEXT | AES-256-krypterat telefonnummer |
| telefon_hash | TEXT | SHA-256-hash for deduplicering |
| namn | TEXT | Patientens namn |
| prioritet | INTEGER | 1-5 |
| status | TEXT | `Tillganglig`, `Kontaktad`, `Reserv`, `NEJ`, `Bokad` |
| operationsstorlek | TEXT | `liten`, `stor`, `bada` |
| sida | TEXT | `HO`, `VA`, `Bada` |
| lakare_id | UUID | FK till lakare |

### Atomisk JA-svar-funktion

```sql
registrera_ja_svar(p_unik_kod TEXT, p_bekraftat_preop BOOLEAN)
```

Anvander `FOR UPDATE` radlasning for att forhindra race conditions. Returnerar:
- `'first'` -- Forsta JA-svar, tiden ar bokad
- `'reserve'` -- Tiden redan fylld, patienten ar reserv
- `'already_filled'` -- Utskicket ar redan avslutat

---

## 5. SMS-hantering (46elks)

### Utgaende SMS

- **Endpoint:** `POST https://api.46elks.com/a1/sms`
- **Autentisering:** HTTP Basic Auth (`ELKS_API_USER:ELKS_API_PASSWORD`)
- **Kostnad:** ~0,40-0,60 kr per SMS
- **Avsandare:** Konfigurerat kliniknamn

### Inkommande SMS

- **Webhook:** `/api/sms/inkommande`
- **Opt-out-nyckelord:** STOPP, STOP, AVSLUTA, AVREGISTRERA, TA BORT MIG

### Automatiska svar

| Haendelse | SMS-svar |
|-----------|----------|
| Forsta JA | Bekraftelse med instruktioner |
| JA som reserv | Info om reservplats |
| Tid fylld | Tack for intresse |

---

## 6. Patientpool

### Patientstatus

| Status | Beskrivning |
|--------|-------------|
| Tillganglig | Kan kontaktas |
| Kontaktad | SMS skickat, vantar svar |
| Reserv | Svarade JA nar tiden redan fylld |
| NEJ | Tackade nej |
| Bokad | Bekraftad bokning |

### Sortering

Kolumner sorterbara: Prioritet, Namn, Alder, Lakare, Dagar till planerad op.
Reservlista auto-prioriteras baserat pa samma kriterier.

---

## 7. Smart intervall-logik

Tid mellan SMS anpassas automatiskt:

| Dagar till operation | Basintervall |
|---------------------|--------------|
| Samma dag | 5 minuter |
| 1 dag | 5-10 minuter |
| 2 dagar | 10 minuter |
| 3+ dagar | 20 minuter |

### Tidsjusteringar

- **Narmre 16:00:** Kortare intervall (tryckokning)
- **Tidig morgon/sen kvall:** Langre intervall
- **Manuell override:** Personal kan justera intervallet

### Varningar

Automatiska varningar om utskicket riskerar att inte hinna klart innan arbetsdagens slut.

---

## 8. Patientens svarssida

**URL:** `/s/[kod]` (unik 16+ tecken-kod per patient)

### Steg

1. Patient klickar lank i SMS
2. Sidan visar operationsinformation och preop-fragor
3. Patient valjer JA eller NEJ

### Dynamisk blodfornningsvarning

| Dagar till op | Visning |
|---------------|---------|
| 1 dag | Varning (rott) |
| 2 dagar | Info (gult) |
| 3+ dagar | Ingen varning |

### Tillstand

- **JA (forsta):** Bekraftelse + instruktioner
- **JA (reserv):** Info om reservplats
- **NEJ:** Tack-meddelande
- **Stangd:** Tiden ar redan fylld

---

## 9. Personaldashboard

**URL:** `/personal/kort-varsel`

### Funktioner

- Skapa nytt SMS-utskick
- Realtidsvy over svar (JA/NEJ/vantar)
- Avsluta kampanj (fylld via SMS, fylld manuellt, misslyckad, avbruten)
- Utoka kampanj (lagg till fler patienter)
- Bekrafta efter telefonsamtal
- Aggregerad statistik

### Aktiv kampanj-indikator

Rod/gul prick i headern. Pollar `/api/kampanj/aktiv` var 30:e sekund.

### Profil

Personal registrerar mobilnummer i `/personal/profil` for SMS-notifieringar.

---

## 10. Statistik och analys

### Datakallor

- `sms_kampanjer` -- Kampanjdata
- `sms_kampanj_mottagare` -- Individuella svar och svarstider
- `kort_varsel_patienter` -- Patientegenskaper

### Statistikvyer

1. Oversikt (kampanjer, svarsfrekvens, snitt svarstid)
2. Svarstid per prioritet
3. Svarsfrekvens per kategori
4. Per operationsstorlek
5. Per lakare
6. Per sida (HO/VA)
7. Per vantetid till planerad operation
8. Per tid pa dygnet
9. Per veckodag
10. Trendanalys

### API-endpoints

| Endpoint | Beskrivning |
|----------|-------------|
| `GET /api/statistik/oversikt?dagar=30` | Oversiktsdata |
| `GET /api/statistik/svarstid` | Svarstider per dimension |
| `GET /api/statistik/trend?granularitet=manad&dagar=365` | Trender |

### Tekniskt

- Chart.js v4.5.1 med dynamisk import
- 5 minuters cache
- SQL-vyer med `PERCENTILE_CONT(0.5)` for medianberakning
- Trigger `trg_berakna_svarstid` auto-beraknar svarstid pa uppdatering

### Migration

`007-statistik.sql` -- Lagger till statistikkolumner, trigger och vyer.

---

## 11. Prediktion

### Vision

Innan utskick startar ska systemet kunna saga: "Med 5 patienter har du 90% chans att fylla tiden."

### Matematik

```
P(minst ett JA bland N patienter) = 1 - Π(1 - p_i)
N = ln(1 - mal) / ln(1 - effektiv_JA-rate)
```

Effektiv JA-rate = JA-rate x svarsfrekvens.

### Viktade faktorer

| Faktor | Paverkan |
|--------|----------|
| Tid pa dygnet | ±15% |
| Veckodag | ±10% |
| Dagar till planerad op | ±20% |
| Matchande sida | +10% |
| Matchande lakare | +5% |

### Datakrav

| Fas | Minsta datapunkter | Metod |
|-----|-------------------|-------|
| Regelbaserad | 100+ (rek. 500+) | Viktat genomsnitt |
| Enkel ML | 500+ | Logistisk regression |
| Avancerad ML | 2000+ | XGBoost / Random Forest |
| LLM-assisterad | Valfritt | Naturligt sprak + prediktion |

### Status

Konceptstadium -- datasamling pagar (se avsnitt 12).

---

## 12. AI-forberedelse och ML-pipeline

### Datasamling (aktiv)

Foljer kolumner samlas automatiskt:
- Utskickstimme och veckodag
- Patientens tidigare forfragan, JA, NEJ (historik)
- Svarstid i sekunder
- Prediktionsresultat vs utfall

### Nya tabeller

**`patient_svarshistorik`** -- Aggregerad per telefon_hash

| Kolumn | Beskrivning |
|--------|-------------|
| telefon_hash | SHA-256 (icke reversibel) |
| antal_forfragan | Totalt antal SMS |
| antal_ja | Antal JA-svar |
| antal_nej | Antal NEJ-svar |
| ja_rate | Beraknad JA-andel |
| snitt_svarstid_sek | Genomsnittlig svarstid |

**`sms_prediktioner`** -- Prediktionsloggen

| Kolumn | Beskrivning |
|--------|-------------|
| kampanj_id | FK till kampanj |
| prediktion_chans | Forutsagd chans (0-1) |
| prediktion_antal_sms | Forväntat antal SMS |
| faktiskt_resultat | `fylld` / `misslyckad` |
| prediktion_korrekt | Utfall inom ±15% |

### ML-ready vy

`v_ml_training_data` exponerar alla features for traningsdata:
- `target_ja` (malvariabel)
- `feat_akut`, `feat_sjukskriven`, `feat_har_ont`, `feat_pensionar`
- `feat_alder`, `feat_sida_hoger`, `feat_op_liten`, `feat_op_stor`
- `feat_timme`, `feat_veckodag`, `feat_morgon`, `feat_helg`
- `feat_historisk_ja_rate`

### Triggers

- `trg_fyll_utskick_metadata` -- Auto-fyller timme/veckodag vid utskick
- `trg_uppdatera_svarshistorik` -- Auto-uppdaterar patienthistorik vid svar

### Export

- SQL: `\COPY (SELECT * FROM v_ml_training_data) TO 'data.csv' WITH CSV HEADER`
- API: `GET /api/ml/training-data`

### Migration

`008-ai-forberedelse.sql` -- Tabeller, vyer, triggers for ML-data.

---

## 13. GDPR och juridik

### Rattslig grund

- **Artikel 6.1(f)** -- Berattigat intresse (fylla avbokade tider)
- **Artikel 9.2(a)** -- Samtycke for halsodata (vid detaljerade SMS)

### Vad lagras

| Data | Skydd | Bes/kvarhallning |
|------|-------|-------------------|
| Telefonnummer | AES-256-krypterat | 30 dagar |
| Telefon-hash | SHA-256 (icke reversibel) | For deduplicering |
| Namn | Klartext | 30 dagar |
| Prioritet | Nummer (1-5) | 30 dagar |
| SMS-text | Ej lagrad | -- |

### Vad som INTE lagras

- Personnummer
- Diagnoskoder
- Medicinska detaljer (prioritet ar en siffra, inte en diagnos)

### Tredjeparter

| Tjanst | Data som delas | DPA |
|--------|---------------|-----|
| 46elks | Telefonnummer + SMS-text | Ja (LEK 2022:482) |
| Supabase | Krypterad data | Ja |
| Netlify | Serverlosa funktioner | Ja |

46elks: Egna servrar i Stockholm/Uppsala/Goteborg. Bekraftat av 46elks 2026-01-24.

### IMY-kontakt

Brev skickat till `dso@imy.se` 2026-01-24 med tre fragor:
1. PDL vs GDPR for detta system (friliggande fran journalsystem)
2. EU-molntjanster (Supabase ar SOC 2-certifierad)
3. Ytterligare rekommendationer

### Patientrattigheter

- **Opt-out:** SMS-nyckelord (STOPP m.fl.) eller webbknapp
- **Radering:** Kontakta kliniken
- **Registerutdrag:** Pa begaran

---

## 14. Sakerhet

### Kryptering

- **At rest:** AES-256 for telefonnummer
- **In transit:** HTTPS/TLS for all kommunikation
- **Hashing:** SHA-256 for deduplicering

### Atkomstkontroll

- Supabase RLS (Row Level Security) -- personal ser bara sin kliniks data
- Unika koder >= 16 tecken (UUID v4) for svarssidor
- Inga klartextnummer i UI

### Atomicitet

`registrera_ja_svar()` anvander `FOR UPDATE` radlasning -- forhindrar att tva patienter bokar samma tid samtidigt.

### Loggning

- `audit_logg` -- Alla atgarder tidsstamplade
- Samtycke tidsstamplat vid preop-bekraftelse

---

## 15. Ekonomi och ROI

### Kostnad per kampanj

~10-20 kr (20-40 SMS a 0,50 kr)

### Kostnad per manad

- Supabase: ~100 kr (Free/Pro)
- 46elks: ~50-200 kr beroende pa volym
- Netlify: Gratis (Free tier)

### Intaktsforlust vid avbokning

- Liten operation: ~10 000-15 000 kr
- Stor operation: ~25 000-50 000 kr
- Per timme OR-tid: ~15 000-50 000 kr

### Samuelsonsk marginalanalys

Nar fasta kostnader ar tackta (personal, hyra, utrustning redan pa plats) ger en fylld lucka 50-70% bidragsmarginal:
- Intakt: ~25 000 kr
- Rorlig kostnad: ~5 000 kr
- **Bidrag: ~20 000 kr**

### ROI

En fylld lucka per vecka = ~80 000 kr/manad i bidrag.
Systemkostnad: ~200-400 kr/manad.
**Aterbetalning: < 1 arbetsdag.**

---

## 16. Open source-plan

### Mal

Gora systemet tillgangligt som oppen kallkod for andra kliniker med liknande problem.

### MVP for open source

- Patientpool med prioritering
- SMS-utskick med gradvis eskalering
- Svarshantering
- Kampanjhantering
- Grundlaggande statistik

### Generalisering

- `${CLINIC_NAME}` istallet for hardkodat kliniknamn
- Konfigurerbar lakarelista
- i18n-ready (svenska som standard)
- Abstrakt SMS-granssnitt (`SMS_PROVIDER=46elks | twilio | mock`)

### Demo-lage

`SMS_PROVIDER=mock` -- inga riktiga SMS skickas, perfekt for test och demo.

### Deploy

One-click Netlify Deploy-knapp planerad.

### Licens

MIT eller Apache 2.0 (rekommenderad).

### Roadmap

1. Stabilisera och testa i produktion
2. Extrahera till eget repo, skapa demo-lage
3. Publicera pa GitHub, deploy-knapp, blogg/LinkedIn

---

## 17. Kommersiell vision

### Kort sikt (2024-2025)

Losa ett problem valdig bra: fylla avbokade operationstider.

### Medellang sikt (2025-2027)

Patientpoolsplattform med vantelistor, kommunikation, grundlaggande patientregister.

### Lang sikt (2027+)

AI-nativt journalsystem.

### Affarsmodell

| Modell | Pris |
|--------|------|
| Intern anvandning | ~500 kr/manad |
| SaaS Starter | 990 kr/manad |
| SaaS Professional | 2 490 kr/manad |
| SaaS Enterprise | 4 990 kr/manad |
| White-label/licensiering | Forhandling |

### Malgrupper

- 50+ privata ortopedkliniker i Sverige
- Dagkirurgiska enheter
- Ogonkliniker, tandvardskedjor
- Veterinarkliniker
- Nordiska motsvarigheter

### Risker

- GDPR-incident
- SMS-leverantor andrar villkor
- Supabase driftstopp
- Konkurrent
- AI-utvecklingen avstannar

---

## 18. Filstruktur

```
src/
  pages/
    personal/
      kort-varsel.astro       # Personaldashboard
      profil.astro             # Personalprofil (mobilnummer)
    s/
      [kod].astro              # Patientens svarssida
    api/
      kampanj/                 # Kampanj-CRUD
      pool/                    # Patientpool-CRUD
      statistik/               # Statistik-endpoints
      sms/
        inkommande.ts          # 46elks webhook
    om-oss/
      kort-varsel-demo.astro   # Offentlig demosida
  lib/
    kryptering.ts              # AES-256 + SHA-256

netlify/
  functions/
    scheduled-sms.mts          # Schemalagd SMS-funktion (varje minut)

supabase/
  migrations/
    001-initial-setup.sql      # Grundtabeller
    002-kort-varsel.sql        # Kort varsel-tabeller
    003-lakare.sql             # Lakare
    004-profilbilder.sql       # Avatarer
    005-prioritet.sql          # Prioritetssystem
    006-operationsstorlek.sql  # Operationsstorlek och sida
    007-statistik.sql          # Statistik (trigger, vyer)
    008-ai-forberedelse.sql    # ML-data (triggers, vyer, historik)
```

---

## 19. Miljovariabler

| Variabel | Beskrivning |
|----------|-------------|
| `PUBLIC_SUPABASE_URL` | Supabase-projektets URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Publik Supabase-nyckel |
| `SUPABASE_SERVICE_ROLE_KEY` | Servernyckeln (hemlig) |
| `ELKS_API_USER` | 46elks API-anvandarnamn |
| `ELKS_API_PASSWORD` | 46elks API-losenord |
| `POOL_ENCRYPTION_KEY` | AES-256-nyckel for telefonnummer |
| `SITE` | Webbplatsens URL (for SMS-lankar) |

---

## 20. Migrering och databas-setup

Kor migreringar i ordning:

```bash
psql -f supabase/migrations/001-initial-setup.sql
psql -f supabase/migrations/002-kort-varsel.sql
psql -f supabase/migrations/003-lakare.sql
psql -f supabase/migrations/004-profilbilder.sql
psql -f supabase/migrations/005-prioritet.sql
psql -f supabase/migrations/006-operationsstorlek.sql
psql -f supabase/migrations/007-statistik.sql
psql -f supabase/migrations/008-ai-forberedelse.sql
```

Eller kopiera SQL:en till Supabase Dashboard > SQL Editor.

---

## 21. Status och roadmap

### Klart

- Patientpool med prioritering
- SMS-utskick med gradvis eskalering
- Svarshantering (JA / NEJ / STOPP)
- Smart intervall-logik
- Operationsstorlek och sida
- Statistik och dashboard
- Trendanalys
- AI-forberedelse (datasamling aktiv)
- IMY-brev skickat

### Planerat

- Regelbaserad prediktion (kraver 500+ datapunkter)
- ML-modell (kraver 2000+ datapunkter)
- Open source-release
- Multi-klinik-stod
- SaaS-lansering

---

## Detaljdokumentation

For fordjupning, se respektive fil:

| Dokument | Fil |
|----------|-----|
| Teknisk spec | [01-TEKNISK.md](./01-TEKNISK.md) |
| Statistik | [02-STATISTIK.md](./02-STATISTIK.md) |
| Prediktion | [03-PREDIKTION.md](./03-PREDIKTION.md) |
| GDPR | [04-GDPR.md](./04-GDPR.md) |
| Open Source | [05-OPEN-SOURCE.md](./05-OPEN-SOURCE.md) |
| Vision | [06-VISION.md](./06-VISION.md) |
| AI-forberedelse | [07-AI-FORBEREDELSE.md](./07-AI-FORBEREDELSE.md) |
