# AI Council - Master Mind Tool

> Multi-modell AI-rådgivning med automatisk syntes

**Senast uppdaterad:** 2026-01-25

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
│  │              Syntes (Claude Sonnet)                   │   │
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

| Modell | Bäst för | Emoji |
|--------|----------|-------|
| **Claude** | Kod, arkitektur, struktur | 🔧 |
| **OpenAI o1** | Logik, vetenskap, resonemang | 🧪 |
| **Gemini** | Stor kontext, research | 📚 |
| **Grok** | Vetenskapliga frågor, referenser | 🌐 |

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
  "synthesisModel": "claude | openai | gemini | grok",
  "fileContent": "Extraherat innehåll från uppladdade filer",
  "selectedModels": ["openai", "anthropic", "gemini", "grok"],
  "enableDeliberation": false
}
```

**Response:**
```json
{
  "success": true,
  "responses": [
    { "provider": "OpenAI", "model": "o1", "response": "...", "duration": 5000 },
    { "provider": "Anthropic", "model": "claude-sonnet-4-20250514", "response": "...", "duration": 3000 },
    { "provider": "Google", "model": "gemini-1.5-pro", "response": "...", "duration": 4000 }
  ],
  "round2Responses": [
    { "provider": "OpenAI", "model": "o1", "response": "Förbättrat svar...", "duration": 6000 },
    { "provider": "Anthropic", "model": "claude-sonnet-4-20250514", "response": "Förbättrat svar...", "duration": 4000 },
    { "provider": "Google", "model": "gemini-1.5-pro", "response": "Förbättrat svar...", "duration": 5000 }
  ],
  "deliberationEnabled": true,
  "queriedModels": ["openai", "anthropic", "gemini"],
  "synthesis": {
    "provider": "Claude (Supersyntes)",
    "model": "claude-sonnet-4-20250514",
    "response": "...",
    "duration": 4000
  },
  "synthesisModel": "claude",
  "availableModels": [
    { "model": "openai", "available": true },
    { "model": "anthropic", "available": true },
    { "model": "gemini", "available": true },
    { "model": "grok", "available": false }
  ],
  "totalDuration": 31000
}
```

### API: Sessions

**GET** `/api/ai-council/sessions` - Hämta användarens sessioner

**POST** `/api/ai-council/sessions` - Spara ny session

**DELETE** `/api/ai-council/sessions?id=xxx` - Ta bort session

---

## Framtida utveckling

- [ ] Streaming-svar för snabbare feedback
- [x] Val av syntes-modell per fråga
- [x] Val av vilka modeller som ska svara (checkboxar)
- [x] Historik i Supabase (med localStorage fallback)
- [x] Filuppladdning (bilder, PDF, dokument)
- [x] Grok (xAI) integration för vetenskapliga frågor
- [x] Deliberation: Runda 2 där modeller granskar varandra
- [ ] Dela sessioner med kollegor
- [ ] Custom syntes-prompts
- [ ] Integration med Cursor via MCP
- [ ] Bildanalys via multimodala API:er
- [ ] Bildanalys via multimodala API:er

---

## Relaterade dokument

- [AI-INTEGRATION-RESURSER.md](./AI-INTEGRATION-RESURSER.md) - Övriga AI-resurser i projektet
- [SETUP-ARBETSDATOR.md](./SETUP-ARBETSDATOR.md) - Installationsguide
