# AI Council - Master Mind Tool

> Multi-modell AI-rådgivning med automatisk syntes

**Senast uppdaterad:** 2026-01-26 (v2.4 - Profilväljare)

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
┌───────────────────────────────────────────────────────────────────────┐
│                         Frontend (Astro)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐            │
│  │   Kontext   │  │   Prompt    │  │   Sessionslogg      │            │
│  │  (textarea) │  │  (textarea) │  │   (Supabase)        │            │
│  └─────────────┘  └─────────────┘  └─────────────────────┘            │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ POST /api/ai-council/query
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                       Backend API (Astro)                              │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                       Promise.all()                             │   │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐ │   │
│  │  │ OpenAI   │  │  Anthropic   │  │    Google    │  │   xAI   │ │   │
│  │  │   o1     │  │ Claude Sonnet│  │ Gemini 2.0   │  │Grok 4   │ │   │
│  │  │          │  │              │  │    Flash     │  │  Fast   │ │   │
│  │  └────┬─────┘  └──────┬───────┘  └──────┬───────┘  └────┬────┘ │   │
│  │       │               │                 │               │      │   │
│  └───────┴───────────────┴─────────────────┴───────────────┴──────┘   │
│                                │                                       │
│                                ▼                                       │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │              Syntes (valbar: 6 modeller)                        │   │
│  │  👑 Opus 4.5 | 🔧 Sonnet | 🧪 o1 | ⚡ GPT-4o | 📚 Gemini | 🌐 Grok │   │
│  │   "Analysera svaren, identifiera konsensus,                     │   │
│  │    ge slutgiltig rekommendation"                                 │   │
│  └────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

---

## AI-modeller

| Modell | Leverantör | Styrka | Användning |
|--------|------------|--------|------------|
| **o1** | OpenAI | Djup resonering, steg-för-steg-analys | Komplexa logiska problem |
| **Claude Sonnet** | Anthropic | Struktur, kod, tydliga förklaringar | Kodgenerering, dokumentation |
| **Gemini 2.0 Flash** | Google | Snabb, prisvärd, multimodal | Snabba svar, kostnadseffektivt |
| **Grok 4 Fast** | xAI | 2M kontext, djup analys, vetenskapligt | Litteratursyntes, evidensgranskning |

### Profilväljare ⚡ (NY!)

Välj en förinställd profil för snabb konfiguration:

| Profil | Modeller | Syntes | Deliberation | Tid | Användning |
|--------|----------|--------|--------------|-----|------------|
| **⚡ Snabb** (standard) | Gemini + Claude | GPT-4o | ❌ | ~3-5 sek | Allmänna frågor |
| **🏥 Patientfrågor** | Gemini + Claude | GPT-4o | ❌ | ~3-5 sek | Telefonsamtal, turbo |
| **💻 Kodning** | Claude + o1 | Claude | ❌ | ~10 sek | Arkitektur, debugging |
| **🔬 Vetenskap** | Grok + o1 + Gemini | Grok | ✅ | ~30 sek | Litteratur, evidens |
| **🎯 Djup analys** | Alla 4 | Opus 4.5 | ✅ | ~45 sek | Kritiska beslut |

> **Standard = snabbast och billigast**, inte dyrast. Personalen får blixtsnabba svar vid telefonsamtal.

### Välj modeller manuellt

Du kan också välja modeller manuellt genom checkboxar. Blanda fritt!

**Exempelkombinationer:**
- **Kodgranskning:** Claude + OpenAI o1
- **Vetenskaplig research:** Grok + Gemini + o1
- **Snabb logisk analys:** Endast Gemini

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
| Gemini 2.0 Flash | $0.10 | $0.40 |
| Grok 4 Fast | $0.20 | $0.50 |

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
- `gemini` - Gemini 2.0 Flash (stor kontext)
- `grok` - Grok 4 Fast (2M kontext, vetenskap)

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
    { "provider": "Google", "model": "gemini-2.0-flash", "response": "...", "duration": 4000 }
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
- [ ] Dela sessioner med kollegor
- [ ] Custom syntes-prompts
- [ ] Integration med Cursor via MCP
- [ ] Bildanalys via multimodala API:er

---

## Versionshistorik

### v2.4 (2026-01-26) - Profilväljare

**Nyhet:** Förinställda profiler för olika användningsfall

**Funktioner:**
- ⚡ **Snabb** (standard) - Gemini + Claude med GPT-4o syntes (~3-5 sek)
- 🏥 **Patientfrågor** - Turbo-läge för telefonsamtal
- 💻 **Kodning** - Claude + o1 för arkitektur och debugging
- 🔬 **Vetenskap** - Grok + deliberation för litteratursyntes
- 🎯 **Djup analys** - Alla modeller + Opus 4.5 för kritiska beslut

**Principer:**
- Standard = snabbast och billigast (inte dyrast)
- Manuella ändringar avmarkerar profilen
- Syntesmodeller sorterade: snabbast först

### v2.3 (2026-01-26) - Grok 4 Fast

**Ändring:** Uppgraderade från `grok-2-latest` till `grok-4-fast`

**Förbättringar:**
- ✅ **2M tokens kontext** - Kan hantera hela vetenskapliga papers
- ✅ **10x billigare** - $0.20/$0.50 per 1M tokens (tidigare $2.00/$10.00)
- ✅ **Bättre vetenskaplig analys** - Överlägsen för litteratursyntes och evidensgranskning
- ✅ **Reasoning-funktion** - Djupare analys vid komplexa frågor

### v2.2 (2026-01-26) - Gemini-uppdatering

**Ändring:** Bytte från `gemini-1.5-pro` till `gemini-2.0-flash`

**Orsak:** Google har fasats ut `gemini-1.5-pro` från v1beta API:t. Vid anrop returnerades felet:
> "models/gemini-1.5-pro is not found for API version v1beta, or is not supported for generateContent"

**Konsekvenser:**
- ✅ **Snabbare svar** - Gemini 2.0 Flash är optimerad för hastighet
- ✅ **Lägre kostnad** - $0.10/$0.40 per 1M tokens (tidigare $1.25/$5.00)
- ✅ **Multimodal** - Stöder bild och video i framtiden
- ⚠️ **Mindre kontextfönster** - 1M → 128K tokens (fortfarande tillräckligt för de flesta användningsfall)

### v2.1 (2026-01-25) - Kostnadsvisning

- Lade till kostnadsvisning per modell och total kostnad
- Nya syntesmodeller: Claude Opus 4.5 och GPT-4o

### v2.0 (2026-01-24) - Deliberation

- Deliberation Mode (Runda 2)
- Valbar modell för syntes
- Grok (xAI) integration

### v1.0 (2026-01-23) - Initial release

- Multi-modell frågor (OpenAI, Claude, Gemini)
- Automatisk syntes
- Sessionshistorik

---

## Alternativ på marknaden

Det finns flera liknande verktyg som kör flera AI-modeller parallellt:

| Verktyg | Funktion | Kostnad |
|---------|----------|---------|
| **[Jenova.ai](https://jenova.ai)** | Unified platform, intelligent model routing, 50+ AI agents | Prenumeration |
| **[Rival.tips](https://rival.tips)** | Side-by-side jämförelse, GPT, Claude, Grok, Gemini | Prenumeration |
| **[Apify AI Compare](https://apify.com/onescales/ai-model-comparison)** | 2-4 modeller parallellt, "Smart Analysis" syntes | Per körning |
| **[LLM Leaderboard](https://llmleaderboard.ai/compare/)** | Benchmark-jämförelser, upp till 7 modeller | Gratis |

### AI Council vs alternativen

| Funktion | AI Council | Jenova | Apify | Rival |
|----------|:----------:|:------:|:-----:|:-----:|
| Parallell körning | ✅ | ✅ | ✅ | ✅ |
| Syntes ("Domaren") | ✅ | ✅ | ✅ | ❌ |
| **Deliberation (Runda 2)** | ✅ | ❌ | ❌ | ❌ |
| **Profilväljare** | ✅ | ❌ | ❌ | ❌ |
| **Val av syntesmodell (6 st)** | ✅ | ❌ | ❌ | ❌ |
| **Self-hosted** | ✅ | ❌ | ❌ | ❌ |
| Full kostnadskontroll | ✅ | ❌ | ❌ | ❌ |

### Våra unika fördelar

1. **Deliberation Mode** - Modellerna granskar och korrigerar varandra (unikt!)
2. **Self-hosted** - Dina egna API-nycklar, full kontroll över kostnader
3. **Profilväljare** - Förinställda profiler för olika användningsfall
4. **6 syntesmodeller** - Välj själv vilken AI som sammanfattar
5. **Integrerat i personalportalen** - Ingen extra inloggning

---

## Relaterade dokument

- [AI-INTEGRATION-RESURSER.md](./AI-INTEGRATION-RESURSER.md) - Övriga AI-resurser i projektet
- [MULTI-AI-ARBETSFLODE.md](./MULTI-AI-ARBETSFLODE.md) - Arbetsflöden för multi-AI
- [SETUP-ARBETSDATOR.md](./SETUP-ARBETSDATOR.md) - Installationsguide
