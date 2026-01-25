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
