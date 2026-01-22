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
Patient klickar länk → Svarar JA/NEJ på webbsida → Personal ser svar i realtid →
Ringer patient som svarat JA
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

Med detta samtycke får kliniken en tydlig juridisk grund (GDPR Art. 9(2)(a)) för att:
- Skicka SMS om bokningar
- Kontakta patienter vid lediga tider
- Inkludera information om vilken typ av operation det gäller

---

## 3. Två SMS-modeller

### Modell A: Vag formulering (utan samtycke)

För patienter som **inte** har godkänt SMS-kommunikation om operationer:

```
Hej! En tid har blivit ledig hos Södermalms Ortopedi imorgon.
Kan du komma med kort varsel?

Svara här: specialist.se/s/x7k9m2

OBS: Först till kvarn!
/Södermalms Ortopedi
```

**Egenskaper:**
- Ingen hälsoinformation
- Nämner inte operation eller diagnos
- ~140 tecken = 1 SMS (~0,35 kr)

---

### Modell B: Tydlig formulering (med samtycke)

För patienter som **har** godkänt SMS-kommunikation:

```
Hej Anna! En operationstid för din axeloperation har blivit 
ledig imorgon tis 28/1 kl 08:00.

Kan du komma med kort varsel?
Svara här: specialist.se/s/x7k9m2

OBS: Först till kvarn - flera har fått denna förfrågan!
/Södermalms Ortopedi
```

**Egenskaper:**
- Personligt (namn)
- Specifik information (datum, tid, operationstyp)
- Bättre för patienten att förstå vad det gäller
- ~220 tecken = 2 SMS (~0,70 kr)

---

## 4. Svarssida för patient

**URL:** `specialist.se/s/[unik-kod]`

### Steg 1: Patienten ser förfrågan

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

### Steg 2: Efter JA-svar

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                       ✅ Tack!                                  │
│                                                                 │
│  Du har svarat JA till tiden tisdag 28/1 kl 08:00.             │
│                                                                 │
│  📞 Vi ringer dig inom kort för att bekräfta.                  │
│                                                                 │
│  ⚠️ Detta är inte en slutgiltig bokning ännu.                  │
│                                                                 │
│  Vid frågor: 08-123 45 67                                      │
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

## 5. Dashboard för personal

**URL:** `/personal/akut-sms`

### Skapa kampanj

Personal fyller i:
- Datum och tid för den lediga tiden
- Operationstyp (valfritt, endast om patienten har samtycke)
- Lista med mottagare (namn + telefon)
- Notifikationsinställningar

### Realtidsvy av svar

```
┌─────────────────────────────────────────────────────────────────┐
│  🚨 Kampanj: Ledig tid 28/1 kl 08:00                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📊 Skickade: 10    ✅ JA: 2    ❌ NEJ: 3    ⏳ Väntar: 5      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ Anna Andersson      JA     14:35  ← RING HENNE!      │   │
│  │ ✅ Karl Karlsson       JA     14:42  ← Reserv           │   │
│  │ ❌ Erik Eriksson       NEJ    14:38                      │   │
│  │ ❌ Lisa Larsson        NEJ    14:45                      │   │
│  │ ❌ Olle Olsson         NEJ    14:51                      │   │
│  │ ⏳ Maria Månsson       -      (ej svarat)               │   │
│  │ ⏳ Per Persson         -      (ej svarat)               │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Notifikationer

| Typ | Beskrivning |
|-----|-------------|
| **På sidan** | Ljud + visuell notis när någon svarar JA |
| **SMS till personal** | Valfritt - välj vilken mobil som ska notifieras |

---

## 6. GDPR och juridik

### Sammanfattning

| Aspekt | Med samtycke | Utan samtycke |
|--------|--------------|---------------|
| **SMS-innehåll** | Tydlig info (namn, op-typ, tid) | Vag info (bara "en tid") |
| **Juridisk grund** | GDPR Art. 9(2)(a) - Uttryckligt samtycke | Berättigat intresse (osäkrare) |
| **Risk** | Låg | Medel |

### Krav oavsett samtycke

| Krav | Åtgärd |
|------|--------|
| **Dataminimering** | Lagra inte mer än nödvändigt |
| **Kort lagringstid** | Auto-radera kampanjer efter 7 dagar |
| **Säkerhet** | Endast inloggad, behörig personal |
| **Spårbarhet** | Logga vem som skapat kampanjer |
| **Tredjepartsavtal** | 46elks har standard-DPA |

### Vad som lagras i databasen

| Data | Lagras | Kommentar |
|------|--------|-----------|
| Patientnamn | Ja | För identifiering |
| Telefonnummer (hashat) | Ja | Förhindra dubbletter |
| Telefonnummer (klartext) | Nej | Raderas efter sändning |
| Operationstyp | Endast med samtycke | Annars utelämnas |
| Svar (ja/nej) | Ja | |
| Svars-tidpunkt | Ja | |

---

## 7. Teknisk implementation

### Nya filer

```
src/pages/
├── personal/
│   └── akut-sms.astro          ← Dashboard för personal
├── s/
│   └── [kod].astro             ← Svarssida för patient
└── api/
    └── kampanj/
        ├── skapa.ts            ← Skapa kampanj + skicka SMS
        ├── status.ts           ← Hämta status (för polling)
        └── svar.ts             ← Registrera patientsvar
```

### Databas (Supabase)

```sql
-- Kampanjer
CREATE TABLE sms_kampanjer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titel TEXT NOT NULL,
  datum DATE NOT NULL,
  tid TIME NOT NULL,
  operation_typ TEXT,              -- NULL om inget samtycke
  skapad_av UUID REFERENCES auth.users(id),
  skapad_vid TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'aktiv',     -- 'aktiv', 'fylld', 'avslutad'
  notifiera_telefon TEXT           -- För SMS-notis till personal
);

-- Mottagare
CREATE TABLE sms_kampanj_mottagare (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kampanj_id UUID REFERENCES sms_kampanjer(id) ON DELETE CASCADE,
  namn TEXT NOT NULL,
  telefon_masked TEXT NOT NULL,    -- "070-123****"
  unik_kod TEXT UNIQUE NOT NULL,
  har_samtycke BOOLEAN DEFAULT false,
  skickad_vid TIMESTAMPTZ,
  svar TEXT,                       -- 'ja', 'nej', NULL
  svar_vid TIMESTAMPTZ
);

-- Auto-radera efter 7 dagar (cron job eller Supabase scheduled function)
```

---

## 8. Kostnad

| Scenario | SMS-kostnad |
|----------|-------------|
| 10 patienter (vag SMS, 1 SMS var) | ~3,50 kr |
| 10 patienter (tydlig SMS, 2 SMS var) | ~7,00 kr |
| + SMS-notis till personal | +0,35 kr |

**Jämförelse:**
- Kampanjkostnad: ~7 kr
- Inställd operation: ~10 000 kr
- **ROI: ~1400x**

---

## 9. Framtida förbättringar

Möjliga tillägg efter första versionen:

- [ ] Spara "patientlistor" för återanvändning
- [ ] Integration med väntelista (om tillgänglig i journalsystem)
- [ ] Statistik: Hur ofta fylls tider? Svarsfrekvens?
- [ ] E-postnotifikation som alternativ till SMS-notis

---

## 10. Nästa steg

1. ✅ Specifikation klar (detta dokument)
2. ⬜ Lägg till samtyckesfråga i hälsodeklarationen
3. ⬜ Skapa databastabeller i Supabase
4. ⬜ Bygga `/personal/akut-sms` (dashboard)
5. ⬜ Bygga `/s/[kod]` (svarssida)
6. ⬜ Bygga API-endpoints
7. ⬜ Testa i produktion
8. ⬜ Utbilda personal

**Uppskattad tid för implementation:** 4-6 timmar

---

*Specifikation skapad 2026-01-22*
