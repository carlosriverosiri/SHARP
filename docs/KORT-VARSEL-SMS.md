# 📱 Kort varsel SMS - Specifikation

> **Status:** ✅ Implementerad (fas 1-2 klar)  
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
| **Database** | PostgreSQL-databas | Lagrar kampanjer, patienter, svar |
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
│   │       ├── kampanj/          ← Kampanjhantering
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
| `sms_kampanjer` | En kampanj = en ledig tid | datum, status, antal_platser |
| `sms_kampanj_mottagare` | Patienter i en kampanj | namn, svar, telefon_krypterad |
| `kort_varsel_patienter` | Patientpoolen (återanvänds) | namn, status, akut, har_ont |
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
1. PERSONAL SKAPAR KAMPANJ
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
       
6. KAMPANJ AVSLUTAS
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
- Titta på `src/pages/api/kampanj/skapa.ts` (hur kampanjer skapas)
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
| 2026-01-24 | **Prioritetsbaserade intervall:** AKUT (60 min), sjukskriven (30 min), ont (20 min) |
| 2026-01-24 | **Opt-out:** Patienter kan avregistrera sig via webben eller SMS (STOPP) |
| 2026-01-24 | **Ålder & sortering:** Ålder beräknas från personnummer, sorterbara kolumner |
| 2026-01-24 | **Utöka kampanj:** Lägg till fler patienter till aktiv kampanj |
| 2026-01-24 | **SQL-filer flyttade:** Ny struktur i `supabase/migrations/` |
| 2026-01-23 | **Läkare:** Läkare-dropdown, "flexibel läkare"-alternativ |
| 2026-01-22 | **Patientpool:** Ny modell med persistent patientlista, reservhantering, NEJ-spårning |
| 2026-01-22 | **Ny modell:** Stöd för 1-3 platser per kampanj + tidsblock istället för exakt klockslag |
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
Inställd operation → Personal skapar kampanj (1-3 platser) → SMS skickas →
Patient klickar länk → Bekräftar pre-op fråga → Svarar JA →
Får bekräftelse + personal notifieras → Personal ringer patient → Bokar in
```

**Princip:** Först till kvarn. De första N som svarar JA får platserna. Övriga blir reserv.

### Flera platser per kampanj

Systemet stödjer 1-3 lediga platser per kampanj:

| Antal platser | Användningsfall |
|---------------|-----------------|
| **1 plats** | Standard - en patient ställde in |
| **2-3 platser** | Flera avbokningar samma dag, eller planerat "lucka-i-programmet" |

**Tidsblock istället för exakt tid:** Eftersom operationsordningen bestäms sent och patienter ofta reserverar hela dagen, anger vi valfritt tidsblock (förmiddag/eftermiddag) istället för exakt klockslag.

---

## 1b. Patientpool (ny modell)

Istället för att mata in patienter manuellt för varje kampanj finns en **persistent patientpool** där alla kort varsel-patienter samlas.

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
| **Tillgänglig** | Redo att kontaktas | Kan väljas till kampanj |
| **Kontaktad** | Fått SMS, ej svarat | Väntar på svar |
| **⭐ Reserv** | Svarade JA men fick ej plats | Prioriteras i nästa kampanj! |
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
│  [☑️ Välj alla]  [📤 Skapa kampanj med valda]                │
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
│    Läggs automatiskt först i kön vid nästa kampanj.           │
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
3. Personal väljer patienter från poolen + skapar kampanj
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

## 1c. Prioritetsbaserade SMS-intervall (nytt!)

Systemet har nu **automatiska intervall baserat på patientens prioritet**. Detta gör att akuta patienter alltid kontaktas först och får mer tid att svara.

### Prioritetsnivåer

| Prioritet | Ikon | Intervall | Beskrivning |
|-----------|------|-----------|-------------|
| 🚨 **AKUT** | 🚨 | 60 min | Måste opereras snarast, sitter standby |
| 📋 **Sjukskriven** | 📋 | 30 min | Stark prioritet, ofta kopplat till smärta |
| 🔥 **Mycket ont** | 🔥 | 20 min | Hög prioritet pga smärta |
| (normal) | - | 10 min | Standardintervall |

### Automatisk sortering

Vid kampanjskapande sorteras patienter **automatiskt efter prioritet**:

```
1. 🚨 AKUT-patienter (alltid först!)
2. 📋 Sjukskrivna
3. 🔥 Patienter med mycket ont
4. Övriga (sorterade på namn/dagar kvar)
```

### Flöde med prioriterade patienter

```
┌──────────────────────────────────────────────────────────────────┐
│  10:00  🚨 AKUT-patient får SMS                                  │
│         ↓ vänta 60 minuter                                       │
│  11:00  📋 Sjukskriven patient får SMS                           │
│         ↓ vänta 30 minuter                                       │
│  11:30  🔥 Patient med ont får SMS                               │
│         ↓ vänta 20 minuter                                       │
│  11:50  Normal patient får SMS                                   │
│         ↓ vänta 10 minuter                                       │
│  12:00  Nästa normal patient...                                  │
├──────────────────────────────────────────────────────────────────┤
│  Om någon svarar JA → Stoppa automatiskt                        │
└──────────────────────────────────────────────────────────────────┘
```

### Manuellt intervall (backup)

Personal kan fortfarande välja manuellt intervall:

```
┌─────────────────────────────────────────────────────────────────┐
│  Intervall mellan SMS:                                          │
│                                                                 │
│  (•) Automatiskt (baserat på prioritet)                        │
│      💡 AKUT: 60 min, Sjukskriven: 30 min, Ont: 20 min         │
│                                                                 │
│  ( ) Manuellt:                                                  │
│      [ 5 ] [10 ] [15 ] [20 ] [30 ] [45 ] [60 ] minuter         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Intervall | Användningsfall |
|-----------|-----------------|
| **5 min** | Mycket bråttom, få timmar kvar |
| **10 min** | Standard, 1-2 dagar |
| **15-20 min** | Gott om tid, 2-3 dagar |
| **30-60 min** | Låg stress, 3+ dagar |

---

## 1d. Patient-avregistrering (opt-out)

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

### Visuell indikation i kampanjvy

Avregistrerade patienter markeras tydligt:

```
┌─ Kampanj: Ledig tid 28/1 ────────────────────────────────────────┐
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

### Inställningar vid kampanjskapande

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
17:00  Deadline - kampanjen stängs
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
│  │           🚀 Skicka kampanj                           │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Notering om sortering:** Detta är inte medicinsk prioritering utan praktiska faktorer. Patienter med stark smärta eller sjukskrivning har ofta mest att vinna på en snabbare operation.

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
│  📱 Kampanj: Ledig tid 28/1 kl 08:00                           │
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
│  📱 Kampanj: Ledig tid 28/1 kl 08:00                           │
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
    └── 005-prioritet.sql       ← Prioritetsfält
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
