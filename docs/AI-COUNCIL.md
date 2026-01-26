# AI Council - Master Mind Tool

> Multi-modell AI-rådgivning med automatisk syntes

**Senast uppdaterad:** 2026-01-23 (v2.2 - Användarprofiler)

---

## ⚠️ TODO: Aktivera AI Council på Netlify

### 1. Lägg till API-nycklar i Netlify Dashboard

Gå till [app.netlify.com](https://app.netlify.com) → ditt projekt → **Site configuration** → **Environment variables** → **Add a variable**:

| Key | Var hittar jag nyckeln? |
|-----|-------------------------|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `ANTHROPIC_API_KEY` | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| `GOOGLE_AI_API_KEY` | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| `XAI_API_KEY` | [console.x.ai](https://console.x.ai/) |

### 2. Kör migration i Supabase (för användarprofiler)

Gå till [Supabase Dashboard](https://supabase.com/dashboard) → ditt projekt → **SQL Editor** → kör:

```sql
-- Kopiera innehållet från: supabase/migrations/010-ai-council-profiles.sql
-- Eller kör filen direkt om du har psql
```

### 3. Trigga deploy på Netlify

**Deploys** → **Trigger deploy** → **Deploy site** → vänta 1-2 min

### 4. Testa

Gå till `/admin/ai-council` och kör en testfråga!

---

## Översikt

AI Council är ett internt verktyg för att ställa komplexa frågor till flera AI-modeller samtidigt och få en syntetiserad rekommendation. Verktyget är designat för att hjälpa med:

- Arkitekturbeslut
- Kodgranskning och optimering
- Prompt-design
- Tekniska utredningar
- Komplexa problemlösningar

## Åtkomst

**URL:** `/admin/ai-council`

**Krav:** Inloggad användare (personal eller admin)

---

## Arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Astro)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Kontext   │  │   Prompt    │  │   Sessionslogg      │  │
│  │  (textarea) │  │  (textarea) │  │   (localStorage)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ POST /api/ai-council/query
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Astro)                       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Promise.all()                        │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────────┐  │   │
│  │  │ OpenAI   │  │  Anthropic   │  │    Google      │  │   │
│  │  │   o1     │  │ Claude Sonnet│  │ Gemini 1.5 Pro │  │   │
│  │  └────┬─────┘  └──────┬───────┘  └───────┬────────┘  │   │
│  │       │               │                  │           │   │
│  └───────┴───────────────┴──────────────────┴───────────┘   │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Syntes (valbar: 6 modeller)                  │   │
│  │  👑 Opus 4.5 | 🔧 Sonnet | 🧪 o1 | ⚡ GPT-4o | 📚 Gemini | 🌐 Grok  │
│  │   "Analysera svaren, identifiera konsensus,          │   │
│  │    ge slutgiltig rekommendation"                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## AI-modeller

| Modell | Leverantör | Styrka | Användning |
|--------|------------|--------|------------|
| **o1** | OpenAI | Djup resonering, steg-för-steg-analys | Komplexa logiska problem |
| **Claude Sonnet** | Anthropic | Struktur, kod, tydliga förklaringar | Kodgenerering, dokumentation |
| **Gemini 1.5 Pro** | Google | Stor kontextfönster (1M tokens) | Stora kodbaser, långa dokument |
| **Grok 2** | xAI | Realtidsinfo, vetenskapliga källor | Referenshantering, aktuella frågor |

### Välj modeller

Du kan välja vilka modeller som ska svara genom checkboxar i gränssnittet. Blanda fritt!

**Exempelkombinationer:**
- **Kodgranskning:** OpenAI + Claude + Gemini
- **Vetenskaplig research:** Gemini + Grok  
- **Snabb logisk analys:** Endast OpenAI o1

### Deliberation (Runda 2)

**Valfri funktion** där modellerna granskar varandras svar innan slutsyntes:

```
┌─────────────────────────────────────────────────────────────┐
│  RUNDA 1: Initiala svar                                     │
│  OpenAI ──► Claude ──► Gemini ──► Grok                      │
│     │          │          │         │                       │
│     └──────────┴──────────┴─────────┘                       │
│                    ▼                                        │
│  RUNDA 2: Granskning (var modell ser de andras svar)        │
│  "Finns fel? Vad missades? Ge förbättrat svar."             │
│     │          │          │         │                       │
│     └──────────┴──────────┴─────────┘                       │
│                    ▼                                        │
│  SUPERSYNTES: Baserad på båda rundorna                      │
│  "Vad korrigerades? Vad är konsensus nu?"                   │
└─────────────────────────────────────────────────────────────┘
```

**Fördelar:**
- Modeller kan felsöka varandra (särskilt bra för vetenskaplig litteratur)
- Fel och hallucinationer upptäcks oftare
- Mer genomarbetade svar

**Nackdelar:**
- Tar 2-3x längre tid
- Kostar 2x så mycket (dubbla API-anrop)
- Kräver minst 2 valda modeller

**Aktivera:** Slå på "Deliberation" i gränssnittet.

### Syntes ("The Judge")

Efter att valda modeller svarat skickas en ny prompt till syntes-modellen:

```
Du är en senior teknisk expert. Analysera dessa tre förslag:
1. Identifiera konsensus
2. Väg för- och nackdelar
3. Skriv en slutgiltig rekommendation som är bäst i klassen
```

---

## Funktioner

### Val av syntes-modell

Välj vilken AI som ska syntetisera svaren:

| Modell | Bäst för | Emoji | Kostnad |
|--------|----------|-------|---------|
| **Claude Sonnet** | Kod, arkitektur, struktur | 🔧 | Låg |
| **Claude Opus 4.5** | Komplex analys, Anthropics bästa modell | 👑 | Hög |
| **OpenAI o1** | Logik, vetenskap, resonemang | 🧪 | Medium |
| **GPT-4o** | Snabb syntes, balanserad | ⚡ | Låg |
| **Gemini** | Stor kontext, research | 📚 | Gratis* |
| **Grok** | Vetenskapliga frågor, referenser | 🌐 | Låg |

> **Tips:** Använd **Claude Opus 4.5** 👑 för kritiska beslut där du vill ha djupaste möjliga analys.
> Använd **GPT-4o** ⚡ för snabba synteser när du itererar.

### Filuppladdning

Ladda upp filer som kontext:

| Filtyp | Stöd |
|--------|------|
| **Text** | `.txt`, `.md`, `.json`, `.js`, `.ts`, `.py`, `.html`, `.css` |
| **PDF** | Extraherar text automatiskt |
| **Bilder** | `.png`, `.jpg`, `.gif`, `.webp` (metadata) |

Dra och släpp eller klicka för att välja filer.

### Kopieringsknappar

Varje svar har en **"Kopiera"**-knapp som kopierar råtexten (Markdown) till urklipp.

### Kostnadsvisning 💰

AI Council visar nu **kostnad per körning** i realtid:

| Visning | Beskrivning |
|---------|-------------|
| **Per modell** | Varje accordion visar `tid · $kostnad` |
| **Syntes** | Syntes-kortet visar syntes-kostnad |
| **Total** | Längst ner visas total kostnad i USD och SEK |
| **Tokens** | Antal input/output tokens för hela körningen |

**Priser baseras på officiell prisdata (jan 2026):**

| Modell | Input/1M | Output/1M |
|--------|----------|-----------|
| OpenAI o1 | $15.00 | $60.00 |
| GPT-4o | $2.50 | $10.00 |
| Claude Sonnet | $3.00 | $15.00 |
| Claude Opus 4.5 | $15.00 | $75.00 |
| Gemini 1.5 Pro | $1.25 | $5.00 |
| Grok 2 | $2.00 | $10.00 |

> **Tips:** Använd GPT-4o ⚡ eller Gemini 📚 för billigare iterationer under utveckling.

### Sessionslogg (Supabase + localStorage)

Sessioner sparas i **Supabase** (synkas mellan enheter) med **localStorage som fallback**.

| Funktion | Beskrivning |
|----------|-------------|
| **Spara** | Sparar prompt + syntes + modellval |
| **Klicka på anteckning** | Laddar tillbaka prompten |
| **Exportera** | Laddar ner som `.md`-fil |
| **Rensa** | Tar bort alla sessioner |

Statusindikator visar om du är synkad med Supabase (☁️) eller använder lokal lagring (💾).

---

## Konfiguration

### Miljövariabler (.env)

```env
# AI Council API Keys
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_AI_API_KEY=AIza...
XAI_API_KEY=xai-...  # Valfritt - för Grok
```

### Skaffa API-nycklar

| Leverantör | URL | Kostnad |
|------------|-----|---------|
| OpenAI | https://platform.openai.com/api-keys | ~$0.01-0.15/fråga |
| Anthropic | https://console.anthropic.com/settings/keys | ~$0.01-0.05/fråga |
| Google AI | https://aistudio.google.com/app/apikey | Gratis (med gränser) |
| xAI (Grok) | https://console.x.ai/ | ~$0.02/fråga |

> **Tips:** Du behöver inte alla nycklar. Modeller utan API-nyckel visas som "ej tillgänglig" i gränssnittet.

### Lokal utveckling vs Netlify (Produktion)

⚠️ **Viktigt:** `.env.local`-filen pushas **aldrig** till GitHub (av säkerhetsskäl). Du måste konfigurera miljövariabler separat för:

| Miljö | Var konfigureras |
|-------|------------------|
| **Lokalt** | `.env.local` i projektroten |
| **Netlify (produktion)** | Netlify Dashboard → Environment variables |

#### Lägga till API-nycklar i Netlify:

1. Gå till [Netlify Dashboard](https://app.netlify.com) → ditt projekt
2. Klicka på **Site configuration** (vänstermenyn)
3. Klicka på **Environment variables**
4. Klicka på **Add a variable** och lägg till:

| Key | Value |
|-----|-------|
| `OPENAI_API_KEY` | `sk-proj-...` (din OpenAI-nyckel) |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` (din Anthropic-nyckel) |
| `GOOGLE_AI_API_KEY` | `AIza...` (din Google AI-nyckel) |
| `XAI_API_KEY` | `xai-...` (din xAI/Grok-nyckel) |

5. Klicka på **Deploys** → **Trigger deploy** → **Deploy site**
6. Vänta 1-2 minuter tills deployen är klar
7. Testa AI Council på `/admin/ai-council`

> **Felsökning:** Om du ser "Inga API-nycklar konfigurerade" på Netlify betyder det att steg 1-5 ovan inte är gjorda.

---

## Användning

### 1. Grundläggande fråga

1. Gå till `/admin/ai-council`
2. **Välj modeller** med checkboxarna (minst en)
3. Skriv din fråga i **Prompt**-fältet
4. Välj **syntes-modell** (den som sammanfattar)
5. Klicka **⚡ Kör AI Council** (eller Ctrl+Enter)
6. Läs syntesen för slutgiltig rekommendation

### 2. Med kontext

1. Klistra in kod/dokumentation i **Kontext**-fältet
2. Skriv din fråga i **Prompt**-fältet
3. Kör

**Exempel:**
```
Kontext: [klistra in din React-komponent]
Prompt: "Hur kan jag optimera denna komponent för bättre prestanda?"
```

### 3. Spara och exportera

1. Efter en körning, klicka **"Spara"** på syntesen
2. Anteckningen visas i sessionsloggen (höger)
3. När du är klar, klicka **"Exportera"** för att ladda ner som Markdown

---

## Bästa praxis

### Prompt-design

✅ **Bra prompts:**
- "Jämför Redux vs Zustand för state management i en medelstor React-app"
- "Granska denna kod och föreslå förbättringar för läsbarhet och prestanda"
- "Designa en databasstruktur för ett bokningssystem"

❌ **Undvik:**
- Vaga frågor: "Hur gör man en app?"
- Ja/nej-frågor: "Är React bra?"
- Frågor utan kontext när kontext behövs

### Använd kontext effektivt

- Inkludera **relevant kod** (inte hela kodbaser)
- Lägg till **felmeddelanden** vid debugging
- Specificera **teknisk stack** och **versioner**

### Tolka syntesen

Syntesen är en **rekommendation**, inte ett facit. Använd den som:

1. Startpunkt för vidare utforskning
2. Checklista för att validera dina egna idéer
3. Underlag för diskussion med teamet

---

## Felsökning

### "API-nycklar saknas"

Kontrollera att alla tre nycklar finns i `.env`:
```env
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_AI_API_KEY=...
```

Starta om dev-servern efter ändringar: `npm run dev`

### "Ej inloggad"

Du måste vara inloggad på personalportalen. Gå till `/personal/` och logga in.

### En modell misslyckas

Om en modell returnerar fel visas det i accordion-headern. Syntesen fungerar fortfarande med de modeller som lyckades.

### Timeout

Komplexa frågor kan ta 30-60 sekunder. Om det tar längre:
- Förenkla frågan
- Minska kontextens storlek
- Prova igen

---

## Säkerhet

| Aspekt | Hantering |
|--------|-----------|
| API-nycklar | Lagras i `.env` (aldrig i git) |
| Autentisering | Kräver inloggad användare |
| Data | Skickas direkt till AI-leverantörer |
| Sessionslogg | Sparas lokalt i webbläsaren |

**OBS:** Skicka aldrig känslig patientdata eller personuppgifter till AI Council.

---

## Teknisk implementation

### Filer

| Fil | Beskrivning |
|-----|-------------|
| `src/pages/admin/ai-council.astro` | Frontend-sida |
| `src/pages/api/ai-council/query.ts` | Backend API - frågor |
| `src/pages/api/ai-council/sessions.ts` | Backend API - sessioner (CRUD) |
| `supabase/migrations/009-ai-council.sql` | Databasschema för sessioner |

### API: Query

**POST** `/api/ai-council/query`

**Request:**
```json
{
  "context": "Valfri bakgrundsinformation",
  "prompt": "Din fråga",
  "synthesisModel": "claude | claude-opus | openai | gpt4o | gemini | grok",
  "fileContent": "Extraherat innehåll från uppladdade filer",
  "selectedModels": ["openai", "anthropic", "gemini", "grok"],
  "enableDeliberation": false
}
```

**Syntesmodeller:**
- `claude` - Claude Sonnet (standard, balanserad)
- `claude-opus` - Claude Opus 4.5 (Anthropics bästa modell)
- `openai` - OpenAI o1 (resoneringsmodell)
- `gpt4o` - GPT-4o (snabb, hög kvalitet)
- `gemini` - Gemini 1.5 Pro (stor kontext)
- `grok` - Grok 2 (vetenskap, referenser)

**Response:**
```json
{
  "success": true,
  "responses": [
    { 
      "provider": "OpenAI", 
      "model": "o1", 
      "response": "...", 
      "duration": 5000,
      "tokens": { "inputTokens": 1500, "outputTokens": 2000 },
      "cost": { "inputCost": 0.0225, "outputCost": 0.12, "totalCost": 0.1425, "currency": "USD" }
    },
    { "provider": "Anthropic", "model": "claude-sonnet-4-20250514", "response": "...", "duration": 3000 },
    { "provider": "Google", "model": "gemini-1.5-pro", "response": "...", "duration": 4000 }
  ],
  "round2Responses": [...],
  "deliberationEnabled": true,
  "queriedModels": ["openai", "anthropic", "gemini"],
  "synthesis": {
    "provider": "Claude (Supersyntes)",
    "model": "claude-sonnet-4-20250514",
    "response": "...",
    "duration": 4000,
    "tokens": { "inputTokens": 5000, "outputTokens": 1500 },
    "cost": { "inputCost": 0.015, "outputCost": 0.0225, "totalCost": 0.0375, "currency": "USD" }
  },
  "synthesisModel": "claude",
  "availableModels": [...],
  "totalDuration": 31000,
  "totalCost": {
    "inputTokens": 15000,
    "outputTokens": 8000,
    "totalCostUSD": 0.2345
  }
}
```

### API: Sessions

**GET** `/api/ai-council/sessions` - Hämta användarens sessioner

**POST** `/api/ai-council/sessions` - Spara ny session

**DELETE** `/api/ai-council/sessions?id=xxx` - Ta bort session

---

## Användarprofiler (Ny!)

Användarprofiler ger AI:n kontext om vem som frågar, vilket förbättrar svaren markant.

### Profiltyper

| Typ | Ikon | Beskrivning |
|-----|------|-------------|
| Läkare | 🩺 | Fokus på diagnostik, kirurgi, behandlingsprotokoll |
| Sjuksköterska | 💉 | Fokus på omvårdnad, eftervård, patientkommunikation |
| Fysioterapeut | 🏃 | Fokus på rehabilitering, träning |
| Sekreterare | 📋 | Fokus på administration, bokningar |
| Forskare | 🔬 | Fokus på litteratur, statistik, evidens |

### Vad ingår i profilen?

```
┌─────────────────────────────────────────┐
│  👤 Min AI-profil                        │
│                                         │
│  Typ: 🩺 Läkare                         │
│                                         │
│  Bakgrund:                              │
│  "Ortopedkirurg med 15 års erfarenhet,  │
│   specialiserad på axel- och knäkirurgi.│
│   Arbetar på privat dagkirurgisk klinik.│
│   Utbildad vid Karolinska Institutet."  │
│                                         │
│  Expertis: #ortopedi #axel #knä #artros │
│                                         │
│  [✓] Inkludera profil automatiskt       │
└─────────────────────────────────────────┘
```

### Hur påverkar det svaren?

**Utan profil:**
> "Vid rotatorcuffskada finns flera behandlingsalternativ..."

**Med läkarprofil:**
> "Som ortopedkirurg med axelspecialisering känner du säkert till de olika suturtekniker som finns. Baserat på senaste litteraturen (Codman 2024, Burkhart 2025) visar dubbelradssutur..."

### Databasschema

Kör migrationen: `supabase/migrations/010-ai-council-profiles.sql`

| Fält | Beskrivning |
|------|-------------|
| `ai_profil_typ` | lakare, sjukskoterska, fysioterapeut, etc. |
| `ai_profil_bakgrund` | Fritext beskrivning |
| `ai_profil_expertis` | Array: `{"ortopedi", "axel", "knä"}` |
| `ai_default_models` | Förinställda modeller |
| `ai_auto_inkludera_profil` | Auto-inkludera i prompts |

---

## Framtida utveckling

- [ ] Streaming-svar för snabbare feedback
- [x] Val av syntes-modell per fråga
- [x] Utökade syntesmodeller: Claude Opus 4.5 👑 och GPT-4o ⚡
- [x] Val av vilka modeller som ska svara (checkboxar)
- [x] Historik i Supabase (med localStorage fallback)
- [x] Filuppladdning (bilder, PDF, dokument)
- [x] Grok (xAI) integration för vetenskapliga frågor
- [x] Deliberation: Runda 2 där modeller granskar varandra
- [x] Kostnadsvisning per körning (tokens + USD/SEK) 💰
- [ ] **Användarprofiler** (databas klar, UI pågår)
- [ ] **Persistent projekttråd** + auto-summering
- [ ] **Sök/taggning** i arkivet
- [ ] Dela sessioner med kollegor
- [ ] Custom syntes-prompts
- [ ] Integration med Cursor via MCP
- [ ] Bildanalys via multimodala API:er
- [ ] RAG för tidigare sessioner (embeddings)
- [ ] Grok-4 integration (när tillgänglig)

---

## Relaterade dokument

- [AI-INTEGRATION-RESURSER.md](./AI-INTEGRATION-RESURSER.md) - Övriga AI-resurser i projektet
- [SETUP-ARBETSDATOR.md](./SETUP-ARBETSDATOR.md) - Installationsguide
