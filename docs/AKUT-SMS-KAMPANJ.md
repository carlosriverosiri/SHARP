# 🚨 Akut SMS-kampanj - Specifikation

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
Inställd operation → Personal skapar kampanj → SMS till ~10 patienter →
Patient klickar länk → Svarar JA → Får bekräftelse-SMS + personal notifieras →
Personal ringer patient → Bokar in
```

**Viktigt:** Först till kvarn-princip. Den första som svarar JA får tiden.

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

## 4. Automatiska SMS-svar

### 4.1 När patient svarar JA (första patienten)

Patienten får omedelbart ett bekräftelse-SMS:

```
Tack för att du kan komma med kort varsel!
Vi bokar nu in dig och ringer upp dig inom kort.
/Södermalms Ortopedi
```

### 4.2 När tiden är fylld

Alla patienter som **inte svarat ännu** får automatiskt:

```
Hej! Tiden vi frågade om har nu blivit bokad.
Din ordinarie tid kvarstår.
/Södermalms Ortopedi
```

Detta förhindrar att patienter svarar JA i onödan och förväntar sig att få tiden.

### 4.3 Sammanfattning SMS-flöde

```
┌──────────────────────────────────────────────────────────────────┐
│  STEG 1: Kampanj skapas                                          │
│  → 10 patienter får första SMS                                   │
├──────────────────────────────────────────────────────────────────┤
│  STEG 2: Patient 1 svarar JA                                     │
│  → Patient 1 får bekräftelse-SMS                                 │
│  → Vald personal får notifikations-SMS                           │
│  → Kampanj markeras som "fylld"                                  │
├──────────────────────────────────────────────────────────────────┤
│  STEG 3: Kampanj "fylld"                                         │
│  → Patient 2-10 (som ej svarat) får "tiden tagen"-SMS            │
│  → Patient som redan svarat NEJ får inget mer                    │
├──────────────────────────────────────────────────────────────────┤
│  STEG 4: Personal ringer                                         │
│  → Bekräftar bokning med patient 1                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Svarssida för patient

**URL:** `specialist.se/s/[unik-kod]`

### Steg 1: Aktiv kampanj

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
│  │  📅  Tisdag 28 januari 2026, kl 08:00                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Kan du komma med kort varsel?                                 │
│                                                                 │
│  ┌───────────────────────┐    ┌───────────────────────┐        │
│  │    ✅ JA, jag kan     │    │    ❌ NEJ, jag kan    │        │
│  │       komma!          │    │       inte            │        │
│  └───────────────────────┘    └───────────────────────┘        │
│                                                                 │
│  ⚠️ Flera patienter har fått denna förfrågan.                  │
│  Först till kvarn!                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

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

### Steg 2b: Om tiden redan är tagen

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│              ⏰ Tiden är redan bokad                            │
│                                                                 │
│  Tyvärr hann en annan patient före.                            │
│  Din ordinarie tid kvarstår.                                    │
│                                                                 │
│  Tack för att du ville komma med kort varsel!                  │
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
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Dashboard för personal

**URL:** `/personal/akut-sms`

### 6.1 Skapa kampanj

```
┌─────────────────────────────────────────────────────────────────┐
│  🚨 Skapa akut SMS-kampanj                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Ledig tid                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Datum: [28 jan 2026 ▼]    Tid: [08:00 ▼]               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Operationstyp (valfritt, visas endast för patienter med       │
│  samtycke):                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [ Axeloperation                                    ▼ ] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Mottagare (klistra in från väntelista):                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Anna Andersson, 0701234567, ✓samtycke                   │   │
│  │ Karl Karlsson, 0709876543, ✗samtycke                    │   │
│  │ ...                                                      │   │
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
│  │           🚀 Skicka kampanj (~10 SMS)                 │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Realtidsvy av svar

```
┌─────────────────────────────────────────────────────────────────┐
│  🚨 Kampanj: Ledig tid 28/1 kl 08:00                           │
│  Status: ⏳ Väntar på svar                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 Skickade: 10    ✅ JA: 0    ❌ NEJ: 3    ⏳ Väntar: 7      │
│                                                                 │
│  Mottagare:                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ❌ Erik Eriksson       NEJ    14:38                      │   │
│  │ ❌ Lisa Larsson        NEJ    14:45                      │   │
│  │ ❌ Olle Olsson         NEJ    14:51                      │   │
│  │ ⏳ Anna Andersson      -      (ej svarat)               │   │
│  │ ⏳ Karl Karlsson       -      (ej svarat)               │   │
│  │ ⏳ Maria Månsson       -      (ej svarat)               │   │
│  │ ⏳ Per Persson         -      (ej svarat)               │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📱 Notifierar: Maria Sköterska, Dr. Carlito                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 När någon svarar JA

```
┌─────────────────────────────────────────────────────────────────┐
│  🚨 Kampanj: Ledig tid 28/1 kl 08:00                           │
│  Status: ✅ FYLLD                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🎉 Anna Andersson svarade JA kl 14:52!                 │   │
│  │                                                          │   │
│  │  📞 Ring henne: 070-123 45 67                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📊 Skickade: 10    ✅ JA: 1    ❌ NEJ: 3    ⏳ Avslutat: 6    │
│                                                                 │
│  Övriga patienter har fått SMS om att tiden är bokad.          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Personalregister för notifikationer

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
│  ☑️ Jag vill kunna ta emot akut-notifikationer                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Varför detta är viktigt

- **Sjuksköterskan** som skickar kampanjen behöver veta när någon svarar JA
- **Läkaren** som har mottagning behöver veta så hen inte sätter in någon annan patient på den "tomma" tiden
- **Flera kan väljas** - alla relevanta får notifikation

---

## 8. GDPR och juridik

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
| Svar (ja/nej) | Ja | Efter 7 dagar |
| Svars-tidpunkt | Ja | Efter 7 dagar |

---

## 9. Teknisk implementation

### Nya filer

```
src/pages/
├── personal/
│   ├── akut-sms.astro          ← Dashboard för personal
│   └── profil.astro            ← Personalens profilsida
├── s/
│   └── [kod].astro             ← Svarssida för patient
└── api/
    └── kampanj/
        ├── skapa.ts            ← Skapa kampanj + skicka SMS
        ├── status.ts           ← Hämta status (för polling)
        ├── svar.ts             ← Registrera patientsvar
        └── avsluta.ts          ← Markera fylld + skicka "tiden tagen"-SMS
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
  fylld_av_patient UUID,              -- Vem som fick tiden
  fylld_vid TIMESTAMPTZ
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
  unik_kod TEXT UNIQUE NOT NULL,
  har_samtycke BOOLEAN DEFAULT false,
  skickad_vid TIMESTAMPTZ,
  svar TEXT,                          -- 'ja', 'nej', NULL
  svar_vid TIMESTAMPTZ,
  notifierad_om_fylld BOOLEAN DEFAULT false
);

-- Index för snabb lookup
CREATE INDEX idx_mottagare_unik_kod ON sms_kampanj_mottagare(unik_kod);

-- Auto-radera efter 7 dagar via Supabase scheduled function
```

---

## 10. Kostnad

**Uppskattad kostnad per kampanj (10 patienter):** ~15-20 kr

Inkluderar:
- Första SMS till alla patienter
- Bekräftelse-SMS till den som svarar JA
- "Tiden tagen"-SMS till de som ej svarat
- Notifikations-SMS till personal

**Jämförelse:**
- Kampanjkostnad: ~20 kr
- Inställd operation: ~10 000 kr
- **ROI: ~500x**

---

## 11. Nästa steg

1. ✅ Specifikation klar (detta dokument)
2. ⬜ Lägg till samtyckesfråga i hälsodeklarationen
3. ⬜ Lägg till mobilnummer-fält i personalprofil
4. ⬜ Skapa databastabeller i Supabase
5. ⬜ Bygga `/personal/akut-sms` (dashboard)
6. ⬜ Bygga `/s/[kod]` (svarssida)
7. ⬜ Bygga API-endpoints
8. ⬜ Testa i produktion
9. ⬜ Utbilda personal

**Uppskattad tid för implementation:** 6-8 timmar

---

*Specifikation skapad 2026-01-22*
