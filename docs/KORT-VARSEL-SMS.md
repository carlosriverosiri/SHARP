# 📱 Kort varsel SMS - Specifikation

> **Status:** 📋 Planerad  
> **Prioritet:** Hög  
> **Senast uppdaterad:** 2026-01-22

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
Inställd operation → Personal skapar kampanj → SMS skickas (gradvis eller direkt) →
Patient klickar länk → Bekräftar pre-op fråga → Svarar JA →
Får bekräftelse-SMS + personal notifieras → Personal ringer patient → Bokar in
```

**Princip:** Först till kvarn. Den första som svarar JA får tiden. Nummer två blir reserv.

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
Hej! En tid har blivit ledig hos Södermalms Ortopedi imorgon.
Kan du komma med kort varsel?

Svara här: specialist.se/s/x7k9m2

OBS: Först till kvarn!
/Södermalms Ortopedi
```

### Modell B: Tydlig formulering (med samtycke)

```
Hej Anna! En operationstid för din axeloperation har blivit 
ledig imorgon tis 28/1 kl 08:00.

Kan du komma med kort varsel?
Svara här: specialist.se/s/x7k9m2

OBS: Först till kvarn - flera har fått denna förfrågan!
/Södermalms Ortopedi
```

---

## 4. Gradvis SMS-utskick (Batchning)

De flesta som är intresserade svarar inom 10-15 minuter. Istället för att skicka alla SMS samtidigt kan man välja att skicka gradvis.

### Inställningar vid kampanjskapande

```
Utskicksmetod:
○ Skicka alla direkt (standard)
● Skicka gradvis

   Intervall: [10 ▼] minuter mellan varje batch
   Antal per batch: [3 ▼] patienter
   
   → 10 patienter = ~30 min totalt
```

### Fördelar

- **Mindre "slöseri"** - Om patient 1 svarar JA på 5 min, behöver kanske patient 4-10 aldrig få SMS
- **Minskad FOMO** - Färre får "tiden tagen"-SMS
- **Lägre kostnad** - Färre SMS skickas totalt

### Flöde med gradvis utskick

```
┌──────────────────────────────────────────────────────────────────┐
│  00:00  Batch 1: Patient 1-3 får SMS                             │
│  00:10  Batch 2: Patient 4-6 får SMS (om ingen svarat JA)        │
│  00:20  Batch 3: Patient 7-9 får SMS (om ingen svarat JA)        │
│  00:30  Batch 4: Patient 10 får SMS (om ingen svarat JA)         │
├──────────────────────────────────────────────────────────────────┤
│  Om någon svarar JA → Stoppa automatiskt nästa batch             │
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
│  Kom ihåg att sätta ut den idag (minst 48 timmar innan).       │
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
| **2 dagar** | 💊 Påminnelse | "Kom ihåg att sätta ut den idag (minst 48 timmar)." |
| **3+ dagar** | Ingen | - |

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

### Steg 2c: Om kampanjen är avslutad

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

---

## 7. Dashboard för personal

**URL:** `/personal/kort-varsel`

### 7.1 Skapa kampanj

```
┌─────────────────────────────────────────────────────────────────┐
│  📱 Skapa kort varsel-kampanj                                   │
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
│  Utskicksmetod:                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ○ Skicka alla direkt                                    │   │
│  │ ● Skicka gradvis                                        │   │
│  │   Intervall: [10 ▼] min   Antal per batch: [3 ▼]       │   │
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
│  │           🚀 Skicka kampanj                           │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Realtidsvy av svar

```
┌─────────────────────────────────────────────────────────────────┐
│  📱 Kampanj: Ledig tid 28/1 kl 08:00                           │
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
│  📱 Kampanj: Ledig tid 28/1 kl 08:00                           │
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

---

## 8. Personalregister för notifikationer

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

## 9. GDPR och juridik

### Krav

| Krav | Åtgärd |
|------|--------|
| **Dataminimering** | Lagra endast nödvändig information |
| **Kort lagringstid** | Auto-radera kampanjer efter 7 dagar |
| **Säkerhet** | Endast inloggad, behörig personal |
| **Spårbarhet** | Logga vem som skapat kampanjer |
| **Tredjepartsavtal** | 46elks har standard-DPA |

### Vad som lagras

| Data | Lagras | Radering |
|------|--------|----------|
| Patientnamn | Ja | Efter 7 dagar |
| Telefonnummer (hashat) | Ja | Efter 7 dagar |
| Telefonnummer (klartext) | Nej | Raderas direkt efter sändning |
| Svar (ja/nej/reserv) | Ja | Efter 7 dagar |
| Svars-tidpunkt | Ja | Efter 7 dagar |

---

## 10. Teknisk implementation

### Nya filer

```
src/pages/
├── personal/
│   ├── kort-varsel.astro       ← Dashboard för personal
│   └── profil.astro            ← Personalens profilsida
├── s/
│   └── [kod].astro             ← Svarssida för patient
└── api/
    └── kampanj/
        ├── skapa.ts            ← Skapa kampanj + skicka SMS
        ├── status.ts           ← Hämta status (för polling)
        ├── svar.ts             ← Registrera patientsvar (atomär)
        └── nasta-batch.ts      ← Skicka nästa batch (cron/manuellt)
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
  fylld_av_patient UUID,              -- Första JA
  reserv_patient UUID,                -- Andra JA (reserv)
  fylld_vid TIMESTAMPTZ,
  -- Batchning
  batch_storlek INTEGER DEFAULT 10,   -- Alla om 10
  batch_intervall INTEGER DEFAULT 0,  -- 0 = skicka alla direkt
  nasta_batch_vid TIMESTAMPTZ
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

## 11. Kostnad

**Uppskattad kostnad per kampanj:** ~10-20 kr

Med gradvis utskick kan kostnaden bli lägre om någon svarar snabbt.

**Jämförelse:** Kampanjkostnad ~15 kr vs inställd operation ~10 000 kr

---

## 12. Nästa steg

1. ✅ Specifikation klar (detta dokument)
2. ⬜ Lägg till samtyckesfråga i hälsodeklarationen
3. ⬜ Lägg till mobilnummer-fält i personalprofil
4. ⬜ Skapa databastabeller i Supabase
5. ⬜ Bygga `/personal/kort-varsel` (dashboard)
6. ⬜ Bygga `/s/[kod]` (svarssida med pre-op bekräftelse)
7. ⬜ Bygga API-endpoints (inkl. atomär svar-funktion)
8. ⬜ Testa i produktion
9. ⬜ Utbilda personal

**Uppskattad tid för implementation:** 8-10 timmar

---

*Specifikation skapad 2026-01-22*
