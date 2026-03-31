# Fristående Enkätapp — Implementationsplan för Cursor

> **Så här använder du detta dokument:** Varje steg innehåller en Cursor-prompt du kan köra direkt.
> Kör ett steg i taget. Testa att det fungerar innan du går vidare.
> Bifoga alltid detta dokument som kontext till Cursor.

---

## Stack

| Lager | Teknologi | Motivering |
|-------|-----------|------------|
| Språk | TypeScript (strict) | AI genererar bäst kod här |
| Backend | Fastify | Explicit, ingen magi, enkelt att felsöka |
| Frontend (admin) | React + Vite + Tailwind | Ren SPA, inga server-side-överraskningar |
| Frontend (publik enkät) | Samma React-app, separat route | Mobilanpassat formulär |
| Databas | PostgreSQL + Prisma | Prisma-schemat = hela datamodellen på ett ställe |
| Köhantering | BullMQ + Redis | Beprövat för SMS-batcher och påminnelser |
| SMS | 46elks bakom SmsProvider-interface | Abstraktion → testbart + utbytbart |
| Drift | Docker Compose | `docker compose up` = allt startar |

---

## Mappstruktur

```
survey-app/
├── docker-compose.yml
├── .env.example
├── README.md
├── packages/
│   └── shared/                  # Delade typer och Zod-scheman
│       ├── src/
│       │   ├── schemas/         # Zod-scheman (validering frontend+backend)
│       │   └── types/           # TypeScript-typer
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   ├── api/                     # Fastify backend
│   │   ├── src/
│   │   │   ├── server.ts        # Fastify-instans + startup
│   │   │   ├── modules/
│   │   │   │   ├── imports/     # CSV-upload, preview, validering
│   │   │   │   ├── campaigns/   # Skapa kampanj, lista kampanjer
│   │   │   │   ├── sms/         # SmsProvider-interface + 46elks + console-mock
│   │   │   │   ├── survey/      # Publik submit + kodvalidering
│   │   │   │   ├── reminders/   # Påminnelselogik + scheduler
│   │   │   │   ├── reports/     # Dashboard + rapport
│   │   │   │   └── settings/    # Exkluderingslista för bokningstyper
│   │   │   ├── jobs/
│   │   │   │   ├── sms-queue.ts       # BullMQ-worker: skicka SMS
│   │   │   │   └── reminder-job.ts    # BullMQ-cron: påminnelse 16:00
│   │   │   ├── lib/
│   │   │   │   ├── prisma.ts          # Prisma-klient singleton
│   │   │   │   ├── auth.ts            # Enkel auth-middleware
│   │   │   │   └── encryption.ts      # Kryptering/dekryptering telefonnummer
│   │   │   └── utils/
│   │   │       ├── csv-parser.ts      # CSV-tolkning (encoding, separator)
│   │   │       └── free-text-sanitizer.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   └── web/                     # React + Vite frontend
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── pages/
│       │   │   ├── admin/       # Inloggning, CSV-upload, dashboard, kampanjer
│       │   │   └── public/      # /e/[kod] — patientens formulär
│       │   ├── components/
│       │   └── lib/
│       │       └── api.ts       # API-klient (fetch-wrapper)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       └── Dockerfile
└── prisma/
    ├── schema.prisma
    ├── migrations/
    └── seed.ts                  # Demo-data för test
```

---

## Prisma-schema (baserat på SHARP:s datamodell)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Kampanjer ──────────────────────────────────

model Campaign {
  id               String     @id @default(uuid())
  name             String?
  createdAt        DateTime   @default(now())
  createdBy        String?    // admin-användarens ID
  previewTokenHash String?    @unique // idempotens: stoppar dubbletter från samma preview
  status           CampaignStatus @default(ACTIVE)
  dispatches       Dispatch[]

  @@map("campaigns")
}

enum CampaignStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

// ─── Utskick ────────────────────────────────────

model Dispatch {
  id             String          @id @default(uuid())
  campaignId     String
  campaign       Campaign        @relation(fields: [campaignId], references: [id])
  phoneEncrypted String          // AES-krypterat telefonnummer
  phoneHash      String          // SHA-256 hash för deduplicering
  uniqueCode     String          @unique // koden i URL:en /e/[kod]
  caregiver      String          // vårdgivarens namn
  bookingType    String          // t.ex. "Axel", "Armbåge", "Knä"
  bookingDate    DateTime?       // besöksdatum från CSV
  diagnosisFlag  String?         // diagnosflagga (inte full diagnos)
  status         DispatchStatus  @default(QUEUED)
  sentAt         DateTime?
  reminderSentAt DateTime?
  createdAt      DateTime        @default(now())
  response       Response?
  deliveryLogs   DeliveryLog[]

  @@index([campaignId])
  @@index([phoneHash])
  @@map("dispatches")
}

enum DispatchStatus {
  QUEUED
  SENT
  FAILED
  ANSWERED
  EXPIRED
}

// ─── Svar ───────────────────────────────────────

model Response {
  id          String   @id @default(uuid())
  dispatchId  String   @unique // max ETT svar per utskick
  dispatch    Dispatch @relation(fields: [dispatchId], references: [id])
  ratings     Json     // { overall: 5, information: 4, ... }
  freeText    Json?    // { positive: "...", improvement: "..." }
  submittedAt DateTime @default(now())

  @@map("responses")
}

// ─── Leveranslogg ───────────────────────────────

model DeliveryLog {
  id          String   @id @default(uuid())
  dispatchId  String
  dispatch    Dispatch @relation(fields: [dispatchId], references: [id])
  eventType   String   // SENT, DELIVERED, FAILED, REMINDER_SENT, REMINDER_FAILED
  providerRef String?  // 46elks message-id
  errorDetail String?
  occurredAt  DateTime @default(now())

  @@index([dispatchId])
  @@map("delivery_logs")
}

// ─── Inställningar ──────────────────────────────

model Setting {
  id        String   @id @default(uuid())
  key       String   @unique // t.ex. "excluded_booking_types"
  value     Json     // t.ex. ["Telefon", "Admin", ...]
  updatedAt DateTime @updatedAt
  updatedBy String?

  @@map("settings")
}

// ─── Användare (enkel admin-auth) ───────────────

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         UserRole @default(PROVIDER)
  caregiver    String?  // koppling till vårdgivarnamn i rapporter
  createdAt    DateTime @default(now())

  @@map("users")
}

enum UserRole {
  ADMIN
  PROVIDER
}
```

---

## docker-compose.yml

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: survey
      POSTGRES_USER: survey
      POSTGRES_PASSWORD: survey_dev_password
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://survey:survey_dev_password@postgres:5432/survey
      REDIS_URL: redis://redis:6379
      ENCRYPTION_KEY: dev-encryption-key-change-in-production
      ELKS_API_USER: ""
      ELKS_API_PASSWORD: ""
      SMS_PROVIDER: console  # "console" för dev, "46elks" för produktion
      PUBLIC_SURVEY_URL: http://localhost:5173/e
      JWT_SECRET: dev-jwt-secret-change-in-production
      PORT: 3001
    depends_on:
      - postgres
      - redis

  web:
    build: ./apps/web
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3001

volumes:
  pgdata:
```

---

## .env.example

```env
# Databas
DATABASE_URL=postgresql://survey:survey_dev_password@localhost:5432/survey

# Redis
REDIS_URL=redis://localhost:6379

# SMS — sätt SMS_PROVIDER=console under utveckling
SMS_PROVIDER=console
ELKS_API_USER=
ELKS_API_PASSWORD=

# Kryptering av telefonnummer
ENCRYPTION_KEY=byt-denna-i-produktion-minst-32-tecken

# Auth
JWT_SECRET=byt-denna-i-produktion

# Publik URL som hamnar i SMS:et
PUBLIC_SURVEY_URL=http://localhost:5173/e
```

---

## SmsProvider-interface

```typescript
// apps/api/src/modules/sms/sms-provider.ts

export interface SmsMessage {
  to: string;           // telefonnummer i E.164 (+46...)
  text: string;         // SMS-text
  dispatchId: string;   // för loggning
}

export interface SmsResult {
  success: boolean;
  providerRef?: string; // 46elks message-id
  error?: string;
}

export interface SmsProvider {
  send(message: SmsMessage): Promise<SmsResult>;
}
```

```typescript
// apps/api/src/modules/sms/console-provider.ts
// Används under utveckling — loggar SMS till terminalen

import { SmsProvider, SmsMessage, SmsResult } from "./sms-provider";

export class ConsoleSmsProvider implements SmsProvider {
  async send(message: SmsMessage): Promise<SmsResult> {
    console.log(`[SMS → ${message.to}] ${message.text}`);
    return { success: true, providerRef: `console-${Date.now()}` };
  }
}
```

```typescript
// apps/api/src/modules/sms/elks-provider.ts
// 46elks-implementation för produktion

import { SmsProvider, SmsMessage, SmsResult } from "./sms-provider";

export class ElksSmsProvider implements SmsProvider {
  constructor(
    private apiUser: string,
    private apiPassword: string,
  ) {}

  async send(message: SmsMessage): Promise<SmsResult> {
    const auth = Buffer.from(`${this.apiUser}:${this.apiPassword}`).toString("base64");

    const response = await fetch("https://api.46elks.com/a1/sms", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        from: "Enkat",          // avsändarnamn i SMS
        to: message.to,
        message: message.text,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: err };
    }

    const data = await response.json();
    return { success: true, providerRef: data.id };
  }
}
```

---

## Affärsregler att bevara (från SHARP)

Dessa regler MÅSTE implementeras exakt:

1. **Ett svar per utskick.** `Response.dispatchId` är `@unique`. Submit-endpointen
   måste använda en transaktion som kontrollerar + sparar atomärt.

2. **Max en påminnelse per utskick.** Kontrollera att `reminderSentAt` är null
   innan påminnelse skickas.

3. **Påminnelsetid: nästa kalenderdag 16:00 Europe/Stockholm** efter första SMS.

4. **Idempotent kampanjskapande.** `previewTokenHash` på Campaign är `@unique` —
   samma preview kan inte skapa två kampanjer.

5. **Anonymitetströskel i dashboard.** Visa inte statistik per vårdgivare
   om antalet svar < 5 (eller konfigurerbar tröskel).

6. **Fritext-sanering.** Innan fritextsvar sparas, rensa bort potentiella
   identifierare (namn, personnummer etc.) server-side.

7. **CSV-import:**
   - Tåla varierande separator (`;`, `,`, `\t`) och teckenkodning (UTF-8, Latin-1)
   - Sortera bort rader utan `Diagnoser`-värde
   - Sortera bort bokningstyper i den globala exkluderingslistan
   - Deduplicera: prioritera nybesök/remiss över återbesök

8. **Telefonnummer krypteras** i databasen (AES). Dekrypteras bara vid sändning.

---

## Steg-för-steg: Cursor-promptar

### STEG 1 — Projekt-scaffold + Databas

**Vad du gör:** Skapa hela projektets grundstruktur och databas.

**Cursor-prompt:**

```
Skapa ett nytt TypeScript-projekt med följande struktur:

Monorepo med tre delar:
- apps/api (Fastify backend)
- apps/web (React + Vite + Tailwind frontend)
- packages/shared (delade Zod-scheman och TypeScript-typer)

Root:
- docker-compose.yml med PostgreSQL 16 och Redis 7
- prisma/ med schema.prisma

Använd pnpm workspaces.

Prisma-schemat ska se ut exakt som det som finns i implementationsplanen
(se bifogat dokument under "Prisma-schema").

Fastify-appen (apps/api) ska:
- starta på port 3001
- läsa DATABASE_URL, REDIS_URL och övriga env-variabler från .env
- ha en GET /health endpoint som returnerar { status: "ok" }
- koppla Prisma-klienten som singleton

React-appen (apps/web) ska:
- använda Vite + React + TypeScript + Tailwind
- ha en enkel startsida med texten "Survey App"
- läsa VITE_API_URL från env

Skapa .env.example enligt implementationsplanen.

Testa att jag kan köra:
1. docker compose up -d (startar postgres + redis)
2. npx prisma migrate dev (skapar tabeller)
3. pnpm --filter api dev (startar backend)
4. pnpm --filter web dev (startar frontend)
```

**Test innan du går vidare:**
- `curl http://localhost:3001/health` → `{"status":"ok"}`
- Frontend visar "Survey App" på `http://localhost:5173`
- `npx prisma studio` visar tomma tabeller

---

### STEG 2 — SMS-abstraktion

**Cursor-prompt:**

```
Skapa SMS-provider-abstraktionen i apps/api/src/modules/sms/:

1. sms-provider.ts — interface SmsProvider med send()-metod
   (se implementationsplanen för exakt interface)

2. console-provider.ts — loggar SMS till terminalen (utveckling)

3. elks-provider.ts — 46elks API-implementation
   (se implementationsplanen för exakt implementation)

4. index.ts — factory-funktion som returnerar rätt provider baserat på
   env SMS_PROVIDER ("console" eller "46elks")

Skriv enkla tester som verifierar att ConsoleSmsProvider returnerar
success: true.
```

**Test:** Kör testerna.

---

### STEG 3 — CSV-import + Preview

**Cursor-prompt:**

```
Bygg CSV-import-modulen i apps/api/src/modules/imports/:

Endpoint: POST /api/imports/preview
- Tar emot en CSV-fil (multipart/form-data)
- Parser med auto-detect av separator (;  ,  \t) och encoding (UTF-8, Latin-1)
- Returnerar JSON med:
  - validRows: rader med alla obligatoriska fält (telefon, vårdgivare,
    bokningstyp, diagnoser, starttid)
  - invalidRows: rader som saknar fält, med anledning
  - bookingTypes: unika bokningstyper som finns i filen (för checkbox-urval)
  - duplicates: rader som deduplicerades (samma telefonnummer —
    behåll nybesök/remiss framför återbesök)

Valideringsregler:
- Rader utan värde i Diagnoser-kolumnen ska sorteras bort
- Bokningstyper i den globala exkluderingslistan (från settings-tabellen,
  key = "excluded_booking_types") ska sorteras bort
- Telefonnummer ska normaliseras till E.164 (+46...)

Skapa en hjälpfil csv-parser.ts i apps/api/src/utils/ som hanterar
encoding-detection (testa med BOM och utan) och separator-detection.

Returnera även en signerad previewToken (HMAC med JWT_SECRET) som
innehåller hash av raderna — detta behövs för idempotent kampanjskapande.
```

**Test:** Ladda upp en riktig CSV-fil från ditt journalsystem och verifiera att preview-svaret ser rätt ut.

---

### STEG 4 — Inställningar (exkluderingslista)

**Cursor-prompt:**

```
Bygg settings-modulen i apps/api/src/modules/settings/:

GET /api/settings/excluded-booking-types
- Returnerar aktuell lista från settings-tabellen (key = "excluded_booking_types")
- Om inget finns, returnera tom array

PUT /api/settings/excluded-booking-types
- Body: { bookingTypes: ["Telefon", "Admin", ...] }
- Validera med Zod
- Spara till settings-tabellen
- Kräver admin-auth (vi lägger till auth i steg 8, men förbered middleware-hook)
```

---

### STEG 5 — Kampanjskapande + Köläggning

**Cursor-prompt:**

```
Bygg campaigns-modulen i apps/api/src/modules/campaigns/:

POST /api/campaigns
Body:
{
  previewToken: "...",           // signerad token från preview-steget
  selectedBookingTypes: ["Axel", "Knä"],  // vilka bokningstyper att inkludera
  rows: [...]                    // raderna från preview (eller token refererar till dem)
}

Logik:
1. Verifiera previewToken (HMAC-signatur)
2. Hasha previewToken → spara som previewTokenHash på Campaign (unik — stoppar dubbletter)
3. Skapa Campaign-rad
4. För varje vald rad:
   a. Kryptera telefonnumret (AES med ENCRYPTION_KEY)
   b. Hasha telefonnumret (SHA-256, för deduplicering)
   c. Generera unik kod (nanoid, 10 tecken, URL-safe)
   d. Skapa Dispatch-rad med status QUEUED
5. Lägg BullMQ-jobb i kön "sms-send" för varje dispatch (max 50 direkt, resten fördröjda)
6. Returnera { campaignId, dispatchCount }

GET /api/campaigns
- Lista kampanjer med antal utskick, antal svar, svarsfrekvens
- Filtrera per vårdgivare om användaren har roll PROVIDER

GET /api/campaigns/:id
- Detaljer om en kampanj
```

---

### STEG 6 — SMS-worker (BullMQ)

**Cursor-prompt:**

```
Bygg SMS-kö-workern i apps/api/src/jobs/sms-queue.ts:

Skapa en BullMQ-worker som lyssnar på kön "sms-send".

Varje jobb innehåller: { dispatchId: string }

Worker-logik:
1. Hämta Dispatch från databasen
2. Kontrollera att status är QUEUED (idempotens)
3. Dekryptera telefonnumret
4. Bygg SMS-text från mall med placeholders (i SHARP: `enkat-sms.ts`, t.ex. [VÅRDGIVARE], [DATUM_KORT], [LÄNK]; ofta formuleringen ”Svara anonymt: [LÄNK]”)
   (SMS:et bör rymmas i ett segment om möjligt)
5. Skicka via SmsProvider
6. Uppdatera Dispatch: status → SENT, sentAt → now()
7. Skapa DeliveryLog (eventType: SENT eller FAILED)
8. Vid fel: retry med exponentiell backoff (BullMQ hanterar detta)

Skapa också en setup-fil som initierar BullMQ-köer och startar workern
när API-servern startar.
```

---

### STEG 7 — Publik enkät + Submit

**Cursor-prompt:**

```
Bygg survey-modulen:

Backend (apps/api/src/modules/survey/):

GET /api/survey/:code
- Slå upp Dispatch via uniqueCode
- Om ej funnen → 404
- Om redan besvarad (status ANSWERED) → 410 Gone, med meddelande
- Om giltig → 200, returnera { dispatchId, caregiver, bookingType }
  (INTE telefonnummer eller andra känsliga fält)

POST /api/survey/:code/submit
- Body: { ratings: { overall: 5, ... }, freeText: { positive: "...", ... } }
- Validera med Zod (ratings 1-5, fritext max 1000 tecken)
- Sanera fritext (ta bort potentiella personnummer, e-postadresser etc.)
- TRANSAKTIONELLT (Prisma $transaction):
  a. Kontrollera att Dispatch finns, har status SENT, och att ingen Response finns
  b. Skapa Response
  c. Uppdatera Dispatch status → ANSWERED
  Om race condition (svar redan finns) → returnera 409 Conflict
- Returnera { success: true }

Frontend (apps/web/src/pages/public/):

Skapa sida för route /e/:code
- Hämta dispatch-info via GET /api/survey/:code
- Visa mobilanpassat formulär med:
  - Betyg 1-5 (stjärnor eller knappar) för:
    - Helhetsintryck
    - Information före besöket
    - Bemötande
    - Delaktighet
  - Fritextfält: "Vad var bra?" och "Vad kan förbättras?"
  - Skicka-knapp
- Vid submit → POST /api/survey/:code/submit
- Visa "Tack för ditt svar!" efteråt
- Om redan besvarad → visa "Du har redan svarat"
- Formuläret ska vara enkelt, tydligt, och fungera på mobil
```

---

### STEG 8 — Påminnelser

**Cursor-prompt:**

```
Bygg påminnelselogik i apps/api/src/modules/reminders/ och
apps/api/src/jobs/reminder-job.ts:

Skapa ett BullMQ repeatable job som körs var 10:e minut.

Logik:
1. Hämta alla Dispatch där:
   - status = SENT
   - sentAt < (nu minus 24 timmar, justerat till "nästa kalenderdag")
   - reminderSentAt IS NULL
   - Ingen Response finns
2. Beräkna korrekt påminnelsetid:
   Om SMS skickades dag X → påminnelse får skickas dag X+1 klockan 16:00
   Europe/Stockholm. Jobbet körs var 10:e minut, men skickar bara om
   det nu är ≥ 16:00 Europe/Stockholm på dag X+1.
3. För varje berättigad dispatch:
   a. Dekryptera telefonnumret
   b. Skicka påminnelse-SMS via SmsProvider
   c. Uppdatera reminderSentAt
   d. Skapa DeliveryLog (REMINDER_SENT eller REMINDER_FAILED)
4. Max EN påminnelse per utskick (kontrollera reminderSentAt innan sändning)
```

---

### STEG 9 — Dashboard + Rapport

**Cursor-prompt:**

```
Bygg reports-modulen:

Backend (apps/api/src/modules/reports/):

GET /api/reports/dashboard?caregiver=X&bookingType=Y&from=2025-01-01&to=2025-12-31
Returnera:
{
  totalDispatches: number,
  totalResponses: number,
  responseRate: number,           // procent
  averageRatings: {
    overall: number,
    information: number,
    treatment: number,
    participation: number
  },
  ratingDistribution: { 1: n, 2: n, 3: n, 4: n, 5: n },
  recentFreeText: [               // senaste 20, sanerade
    { positive: "...", improvement: "...", submittedAt: "..." }
  ],
  byCaregiver: [                  // BARA om admin eller om underlag ≥ 5
    { caregiver: "...", responses: n, avgOverall: n }
  ],
  byBookingType: [
    { bookingType: "Axel", responses: n, avgOverall: n }
  ]
}

ANONYMITETSREGEL: Om en vårdgivare har färre än 5 svar i vald period,
visa INTE detaljerad data per vårdgivare. Slå ihop till "Övrigt" eller
dölj.

Användare med roll PROVIDER ser bara sin egen data.
Användare med roll ADMIN ser allt.

GET /api/reports/campaigns
- Lista alla kampanjer med nyckeltal (som GET /api/campaigns men med
  mer statistik)

Frontend (apps/web/src/pages/admin/):

Skapa dashboard-sida med:
- Svarsfrekvens (stor siffra)
- Medelbetyg per kategori
- Filter: vårdgivare, bokningstyp, datumperiod
- Fritextkommentarer (senaste)
- Enkel tabell per bokningstyp

Håll det enkelt och funktionellt. Tailwind + en enkel charting-lib
(t.ex. recharts) för stapeldiagram om du vill, annars räcker tabeller.
```

---

### STEG 10 — Admin-UI: CSV-upload

**Cursor-prompt:**

```
Bygg admin-gränssnittet för CSV-import i apps/web/src/pages/admin/:

Sida: /admin/upload

Flöde:
1. Användaren väljer en CSV-fil
2. Filen skickas till POST /api/imports/preview
3. Visa resultat:
   - Antal giltiga rader
   - Antal bortsorterade (med anledning per rad)
   - Antal dubbletter
   - Kryssrutor för varje bokningstyp som finns i filen —
     användaren väljer vilka som ska ingå
4. Knapp "Skapa kampanj och skicka SMS"
5. Vid klick → POST /api/campaigns med previewToken + valda bokningstyper
6. Visa bekräftelse: "Kampanj skapad! X SMS skickas."

Sida: /admin/campaigns
- Lista kampanjer (hämta från GET /api/campaigns)
- Klick → kampanjdetaljer

Sida: /admin/settings
- Visa och redigera exkluderingslistan för bokningstyper
```

---

### STEG 11 — Enkel auth

**Cursor-prompt:**

```
Lägg till enkel JWT-baserad autentisering:

Backend:
- POST /api/auth/login — tar email + password, returnerar JWT-token
- Middleware authRequired som verifierar JWT på alla /api/-routes utom:
  - /api/survey/:code (publik)
  - /api/survey/:code/submit (publik)
  - /api/health (publik)
- Middleware adminRequired för /api/settings och admin-specifika rapporter

Frontend:
- Enkel inloggningssida (/admin/login)
- Spara JWT i minnet (INTE localStorage)
- Skicka med i Authorization-header
- Redirect till /admin/login om 401

Skapa ett seed-script (prisma/seed.ts) som skapar en admin-användare:
- email: admin@example.com
- password: changeme
- role: ADMIN
```

---

### STEG 12 — Demo-data + README

**Cursor-prompt:**

```
1. Uppdatera prisma/seed.ts med demo-data:
   - 1 admin-användare
   - 2 vårdgivare (provider-användare)
   - 3 kampanjer med totalt ~30 dispatches
   - ~15 svar med varierande betyg och fritext
   - Realistiska bokningstyper: "Axel nybesök", "Knä återbesök",
     "Armbåge operation", "Kuralink"
   - Inställning: excluded_booking_types = ["Telefon", "Admin"]

2. Skriv README.md med:
   - Projektets syfte (patientenkäter för vårdkvalitet)
   - Kort om bakgrunden (bevisad i drift med 54% svarsfrekvens)
   - Snabbstart med docker compose up + seed
   - Miljövariabler
   - Kort arkitekturbeskrivning
   - Licens (placeholder)
```

---

## Ordlista SHARP → Ny app

| SHARP (svenska) | Ny app (schema) | Kommentar |
|-----------------|-----------------|-----------|
| enkat_kampanjer | Campaign | Samma koncept |
| enkat_utskick | Dispatch | Samma koncept |
| enkat_svar | Response | Samma koncept |
| enkat_delivery_log | DeliveryLog | Samma koncept |
| enkat_installningar | Setting | Generaliserad nyckel-värde |
| enkat-send-queue.mts | sms-queue.ts (BullMQ) | Netlify → BullMQ |
| enkat-remind-scheduled.mts | reminder-job.ts (BullMQ cron) | Netlify → BullMQ |
| enkat-csv-parser.ts | csv-parser.ts | Portas |
| enkat-free-text-sanitizer.ts | free-text-sanitizer.ts | Portas |
| enkat-booking-classifier.ts | Inline i imports-modulen | Förenklas |
| enkat-provider-scope.ts | Auth-middleware + caregiver-filter | Förenklas |
| POOL_ENCRYPTION_KEY | ENCRYPTION_KEY | Samma syfte |
| PERSONAL_SESSION_SECRET | JWT_SECRET | Samma syfte |

---

## Checklista: är jag klar?

- [ ] `docker compose up` startar postgres + redis + api + web
- [ ] Kan logga in som admin
- [ ] Kan ladda upp CSV och se preview
- [ ] Kan skapa kampanj → ser SMS i terminalen (console-provider)
- [ ] Kan öppna /e/[kod] och skicka svar
- [ ] Svar syns i dashboard
- [ ] Påminnelser skickas till obesvarade (kolla loggar)
- [ ] Samma svarskod kan inte användas två gånger
- [ ] Samma preview kan inte skapa två kampanjer
- [ ] Dashboard döljer data vid < 5 svar per vårdgivare
- [ ] Fritext saneras (personnummer etc.)
- [ ] README beskriver projektet och hur man startar
