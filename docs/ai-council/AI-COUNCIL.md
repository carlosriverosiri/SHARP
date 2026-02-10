# AI Council - Master Mind Tool

> Multi-modell AI-rådgivning med automatisk syntes

**Senast uppdaterad:** 2026-02-07 (v3.10 - Kunskapsbas & bibliotek)

---

## Core‑modul (för fristående app/Next.js)

Se `docs/ai-council/CORE-MODULE.md` för förslag på struktur, API och auto‑dokumentation.

## Pausad effektivisering – nästa steg

Refaktoreringen av `ai-council.astro` är pausad medan du jobbar i AI Council. Nuvarande radantal är ~832 (senast uppmätt).

**När du vill fortsätta effektiviseringen:**
- Fortsätt med att flytta kvarvarande inline‑logik från `ai-council.astro` till små moduler.
- Prioritera workflow‑state/stubs och andra state‑relaterade block som fortfarande ligger i sidan.
- Kör `npx astro check` efter varje större block.
- Uppdatera `docs/ai-council/KONTEXT.md` med nytt radantal och nya moduler.

## Översikt

AI Council är ett internt verktyg för att ställa komplexa frågor till flera AI-modeller samtidigt och få en syntetiserad rekommendation. Verktyget är designat för att hjälpa med:

- Arkitekturbeslut
- Kodgranskning och optimering
- Prompt-design
- Tekniska utredningar
- Komplexa problemlösningar
- Vetenskaplig forskning med referenshantering

**Nytt i v3.0:** Ljust, modernt gränssnitt inspirerat av Grok/Gemini med projektsidebar för att organisera dina sessioner.

## PCP-modellen (Project, Context, Prompt)

AI Council är byggt kring PCP för att hålla allt logiskt och spårbart:

- **Project** – Samlar relaterade frågor, dokument och historik.
- **Context** – Bakgrund, dokumentation och källor som ska påverka svaret.
- **Prompt** – Den konkreta frågan som skickas till AI-modellerna.

Det här är vår huvudmodell och ska genomsyra alla sidor, demos och arbetsflöden.

## Åtkomst

**URL:** `/admin/ai-council`

**Krav:** Inloggad användare (personal eller admin)

---

## Väg framåt: Roadmap för källkvalitet

Målet är att minska hallucinationer genom bättre källflöde, inte genom att byta modell. Den här planen är avsedd att vara en gemensam riktning när vi diskuterar nästa steg i Cursor.

### Nivå 1 – Stabilt research‑läge (kort sikt)

**Möjligt nu**
- Auto‑sök per profil (vetenskap = PubMed + Scholar/Google).
- Strikt källformat i kontext (titel + URL + kort excerpt).
- Tydlig policy: påståenden utan källa markeras som osäkra.

**Behövs för nästa nivå**
- Käll‑cache per prompt (så vi inte söker om samma sak).
- Enkla heuristiker för ranking (review/meta > RCT > case).

### Nivå 2 – Agentic Search Light (medel)

**Möjligt nu**
- Server‑styrd “extra sök” efter runda 1 när konflikt/utan källa hittas.

**Behövs för nästa nivå**
- En kontrollerad loop: round1 → analys → sök → round2 (verifiering).
- Tydliga gränser för antal sökningar per fråga.

### Nivå 3 – Agentic Search Pro (lång sikt)

**Möjligt om API-stöd finns**
- Modell‑styrd tool‑calling (web_search/pubmed/zotero).

**Behövs**
- Tool‑policys, kostnadstak och fallback om sök misslyckas.
- Förfinad ranking så att modellen inte drunknar i källor.

### Nivå 4 – Intern kunskapsmotor

**Mål**
- Återanvänd verifierade källor och tidigare sessioner automatiskt.

**Behövs**
- Embeddings + vector‑sök (t.ex. pgvector i Supabase).
- “Verifierade källor” som förstahandsmaterial för nya frågor.

---

## 🚀 Utvecklingsplan

> **Obs:** Denna sektion visar planerade och pågående förbättringar. Implementerade funktioner flyttas till Versionshistorik.

### 🟡 Planerade funktioner

#### 📁 Projektmappar & Fältdokumentation (Vision Q2 2026)

> **Use case:** Vinprovare åker till Frankrike, fotograferar maskiner och vingårdar, pratar med AI om varje bild, får dokumentation samlad per projekt.

- [ ] **Projektmappar med bilder** - Alla bilder + sessioner samlade per projekt
- [ ] **Bild + svar ihop** - Spara analyser tillsammans med originalbilder
- [ ] **Bildgalleri per projekt** - Visuell översikt av alla foton
- [ ] **Omvänd bildsök** - Identifiera maskiner/objekt via Google Vision / Perplexity
- [ ] **PDF-export med bilder** - Generera rapport med foton + AI-analys
- [ ] **Kontinuerlig dialog per bild** - Följdfrågor om samma foto

#### 🔧 Övriga planerade funktioner

- [ ] **Streaming-svar** - Visa svar i realtid istället för att vänta
- [ ] **Dela sessioner** - Länk för att dela med kollegor
- [ ] **Custom syntes-prompts** - Anpassa hur syntesen görs
- [ ] **Cursor MCP-integration** - Använd AI Council direkt från Cursor
- [ ] **Drag-and-drop** - Dra sessioner mellan projekt
- [ ] **Chattbubblor i resultat** - Konversationsvy istället för accordion
- [ ] **Keyboard shortcuts** - Ctrl+N för ny chat, etc.
- [ ] **RAG för arkivet** - Sök i tidigare sessioner automatiskt

### ✅ Nyligen implementerat

- [x] **Kunskapsbas-koppling (RAG Fas 1)** (v3.10) - Koppla KB-projekt till AI Council för automatisk kontextinkludering
- [x] **Hybrid-sökning med källverifiering** (v3.9) - Unified sökmodal med PubMed, Google Scholar, Google, Nyheter
- [x] **Auto-sök för vetenskap** (v3.9) - Automatisk källsökning före AI-anrop i Vetenskap-profilen
- [x] **Deliberation med källverifiering** (v3.9) - Faktagranskning kontrollerar mot hämtade källor
- [x] **SerpAPI-integration** (v3.9) - Google, Scholar och News-sökning via SerpAPI
- [x] **Trovärdighetspoäng** (v3.9) - Varje källa rankas 0-100 baserat på domäntyp
- [x] **PubMed-sökning** (v3.8) - Sök PubMed och lägg till verifierade artiklar i kontexten (inga hallucinerade referenser)
- [x] **Konsensusanalys** (v3.7) - Visar överensstämmelse och konflikter i varje syntes
- [x] **Riktad deliberation** (v3.7) - Strukturerad konfliktanalys med kategorier (MOTSÄGELSE, UNIK_INSIKT, etc.)
- [x] **Förkastade påståenden** (v3.7) - Hallucinationer markeras explicit i supersyntes
- [x] **Lägg till modeller** (v3.6) - Kör fler AI:er efter syntes utan att köra om befintliga
- [x] **Syntes-metadata** (v3.6) - Visa vilka modeller och profil som användes i syntesrubriken
- [x] **Cross-device draft sync** (v3.6) - Pågående arbete sparas automatiskt och synkas mellan datorer (7 dagars retention)
- [x] **Session-utgångsvarning** (v3.6) - Tydlig banner när sessionen gått ut
- [x] **Kamerafunktion** (v3.4) - Fotografera direkt från mobil/iPad för bildanalys
- [x] **Diktering/Speech-to-text** (v3.3) - Mikrofon-knapp för att tala in prompts (Web Speech API)
- [x] **Mobilanpassning** (v3.3) - Touch-vänligt UI, FAB för sessioner, scroll-profiler
- [x] **Auto-resize textareas** (v3.3) - Textfält anpassar sig efter innehåll
- [x] **Zotero-integration** (v3.2) - Sök och importera PDF:er från ditt Zotero-bibliotek
- [x] **Bildanalys/Multimodal** (v3.1) - Klistra in bilder (Ctrl+V) för analys med GPT-4o, Claude, Gemini
- [x] **Ljust tema** (v3.0) - Modernt UI inspirerat av Grok/Gemini
- [x] **Projektsidebar** (v3.0) - Organisera sessioner i mappar
- [x] **Projektkontext** (v3.0) - Auto-inkludera kontext per projekt
- [x] **Färg/Ikon-väljare** (v3.0) - Anpassa projektens utseende
- [x] **Kontextmeny** (v3.0) - Högerklicka för snabbåtgärder
- [x] **Sökfunktion** (v3.0) - Sök bland sessioner
- [x] **Spara-modal med eget namn** (v2.7) - Popup efter varje körning för att spara med anpassat namn
- [x] **Export som Markdown** (v2.7) - Ladda ned komplett session som .md-fil
- [x] **Hallucinationsdetektion** (v2.7) - Trovärdighetsrapport med konfidensgrader

---

## Arkitektur

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend (Astro) v3.0                               │
│  ┌─────────────────┬──────────────────────────────────────────────────────┐  │
│  │  PROJEKTSIDEBAR │               HUVUDOMRÅDE                             │  │
│  │  (280px)        │                                                       │  │
│  │                 │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│  │  📁 Mina       │  │   Kontext   │  │   Prompt    │  │  Profilval  │   │  │
│  │     Projekt    │  │  (textarea) │  │  (textarea) │  │ ⚡🏥💻🔬📊  │   │  │
│  │  [+ Nytt]      │  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│  │                 │                                                       │  │
│  │  📂 Historik   │  ┌───────────────────────────────────────────────┐   │  │
│  │     (accordion) │  │         Sessionslogg (Supabase)              │   │  │
│  └─────────────────┴──────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ POST /api/ai-council/query
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Backend API (Astro)                                   │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────┐      │
│  │                       Promise.all()                                 │      │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────┐    │      │
│  │  │ OpenAI   │  │  Anthropic   │  │    Google    │  │   xAI   │    │      │
│  │  │   o1     │  │ Claude Sonnet│  │ Gemini 2.0   │  │Grok 4   │    │      │
│  │  │          │  │              │  │    Flash     │  │  Fast   │    │      │
│  │  └────┬─────┘  └──────┬───────┘  └──────┬───────┘  └────┬────┘    │      │
│  │       └───────────────┴─────────────────┴───────────────┘         │      │
│  └──────────────────────────────────┬────────────────────────────────┘      │
│                                     ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────┐      │
│  │               Syntes (valbar: 6 modeller)                           │      │
│  │  👑 Opus 4.5 | 🔧 Sonnet | 🧪 o1 | ⚡ GPT-4o | 📚 Gemini | 🌐 Grok   │      │
│  └────────────────────────────────────────────────────────────────────┘      │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Supabase (Datalagring)                               │
│                                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐    │
│  │ ai_council_projects  │  │  ai_council_sessions │  │  ai_profiles    │    │
│  │ (projektmappar)      │◄─│  (frågor/svar)       │  │  (användare)    │    │
│  └──────────────────────┘  └──────────────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## AI-modeller

| Modell | Leverantör | Styrka | Användning |
|--------|------------|--------|------------|
| **GPT-5.2** | OpenAI | Djup resonering, steg-för-steg-analys | Komplexa logiska problem |
| **Claude Sonnet** | Anthropic | Struktur, kod, tydliga förklaringar | Kodgenerering, dokumentation |
| **Gemini 2.0 Flash** | Google | Snabb, prisvärd, multimodal | Snabba svar, kostnadseffektivt |
| **Grok 4** | xAI | 256K kontext, djup analys, vetenskapligt | Litteratursyntes, evidensgranskning |

### Profilväljare ⚡

Välj en förinställd profil för snabb konfiguration:

| Profil | Modeller | Syntes | Deliberation | Tid | Användning |
|--------|----------|--------|--------------|-----|------------|
| **⚡ Snabb** (standard) | Gemini | Gemini | ❌ | ~3-5 sek | Allmänna frågor |
| **🏥 Patientfrågor** | Gemini + Claude | GPT-4o | ❌ | ~5-10 sek | Telefonsamtal, turbo |
| **💻 Kodning** | Alla 4 modeller | Opus 4.5 | ✅ | ~30-60 sek | Maximal kodgranskning |
| **🔬 Vetenskap** | Gemini + Claude + Grok | o1 | ❌ | ~20-40 sek | Litteratur, evidens |
| **📊 Strategi** | o1 + Claude + Grok | Opus 4.5 | ❌ | ~20-40 sek | Verksamhetsbeslut |

> **Standard = snabbast och billigast**, inte dyrast. Personalen får blixtsnabba svar vid telefonsamtal.

**Profilernas styrkor:**
- **Kodning:** Alla 4 modeller + deliberation för maximal kodgranskning från olika perspektiv
- **Vetenskap:** GPT-5.2 som syntes för djup logisk granskning av vetenskapliga påståenden
- **Strategi:** GPT-5.2 resonerar, Claude strukturerar, Grok ger bred kontext - perfekt för affärsbeslut

### Välj modeller manuellt

Du kan också välja modeller manuellt genom checkboxar. Blanda fritt!

**Exempelkombinationer:**
- **Kodgranskning:** Claude + OpenAI GPT-5.2
- **Vetenskaplig research:** Grok + Gemini + GPT-5.2
- **Snabb logisk analys:** Endast Gemini

### Deliberation / Faktagranskning (Runda 2)

**Valfri funktion** där modellerna granskar varandras svar med **strukturerad konfliktanalys** innan slutsyntes.

> **UI-namn:** I gränssnittet kallas denna funktion "🔬 Faktagranskning" för att vara tydligare på svenska.

```
┌─────────────────────────────────────────────────────────────┐
│  RUNDA 1: Initiala svar                                     │
│  OpenAI ──► Claude ──► Gemini ──► Grok                      │
│     │          │          │         │                       │
│     └──────────┴──────────┴─────────┘                       │
│                    ▼                                        │
│  RUNDA 2: Riktad konfliktanalys (NY i v3.7!)                │
│  Varje modell identifierar och kategoriserar konflikter:    │
│  • MOTSÄGELSE - modellerna säger olika saker                │
│  • UNIK_INSIKT - bara en modell nämner (hallucinationsrisk) │
│  • UTAN_KÄLLA - påstående utan referens                     │
│  • MÖJLIG_HALLUCINATION - verkar påhittat                   │
│     │          │          │         │                       │
│     └──────────┴──────────┴─────────┘                       │
│                    ▼                                        │
│  SUPERSYNTES med KONSENSUSANALYS:                           │
│  • Lösta konflikter (med säkerhetsgrad)                     │
│  • Olösta konflikter (kräver manuell verifiering)           │
│  • Förkastade påståenden (hallucinationer)                  │
└─────────────────────────────────────────────────────────────┘
```

**Nytt i v3.7 - Strukturerad konfliktrapport:**
```
📊 KONSENSUSANALYS (efter riktad faktagranskning)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Överensstämmelse: [HÖG/MEDEL/LÅG]

🔍 Identifierade konflikter i Runda 2:
• MOTSÄGELSER: X st
• UNIKA INSIKTER (hallucinationsrisk): Y st  

🔄 Lösta konflikter:
• [konflikt] → [lösning] (säkerhet: HÖG/MEDEL/LÅG)

⚠️ OLÖSTA konflikter (kräver manuell verifiering):
• [konflikt som modellerna inte kunde lösa]

✅ Slutgiltig konsensus:
• [punkt 1]
• [punkt 2]

❌ Förkastade påståenden (hallucinationer):
• [modell]: "[påstående]" - FELAKTIGT pga [anledning]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Fördelar:**
- **Kategoriserade konflikter** - vet exakt vilken typ av problem
- **Löst/olöst** - tydlig uppföljning av vad som behöver verifieras
- Modeller kan felsöka varandra (särskilt bra för vetenskaplig litteratur)
- Hallucinationer markeras explicit som förkastade
- Mer genomarbetade svar

**Nackdelar:**
- Tar 2-3x längre tid
- Kostar 2x så mycket (dubbla API-anrop)
- Kräver minst 2 valda modeller

**Aktivera:** Slå på "Deliberation" i gränssnittet, eller klicka på "🔬 Faktagranskning"-kortet efter att modellerna svarat.

### "Nästa steg"-kort (NY i v3.5!)

Efter att modellerna har svarat visas två tydliga kort för nästa steg:

```
┌─────────────────────────────────────────────────────────────────────┐
│  VÄLJ NÄSTA STEG                                                    │
├─────────────────────────────┬───────────────────────────────────────┤
│  🔬 Faktagranskning         │  🧪 Sammanfattning                    │
│  ───────────────────────    │  ───────────────────────              │
│  Alla AI:er granskar        │  En AI sammanfattar alla              │
│  varandras svar och         │  svar till en slutsats                │
│  korrigerar fel             │                                       │
│                             │                                       │
│  [4 svar]  ⏱️ ~60 sek       │  [4 svar]  ⏱️ ~15 sek                 │
└─────────────────────────────┴───────────────────────────────────────┘
```

| Kort | Tekniskt namn | Beskrivning |
|------|---------------|-------------|
| **🔬 Faktagranskning** | Deliberation | Alla AI:er granskar varandras svar och korrigerar fel |
| **🧪 Sammanfattning** | Syntes | En AI sammanfattar alla svar till en slutsats |
| **🧪 Supersyntes** | Super-syntes | Sammanfattning efter faktagranskning (högre kvalitet) |

**Arbetsflöde:**
1. Kör fråga → Modellerna svarar
2. Välj **Faktagranskning** (Runda 2) ELLER **Sammanfattning** direkt
3. Om du valde Faktagranskning → Kortet ändras till "🧪 Supersyntes"

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

### Användarprofiler 👤 (NY!)

AI Council anpassar nu svaren efter din bakgrund. Gå till **"Min profil"** i AI Council för att ställa in:

| Inställning | Beskrivning |
|-------------|-------------|
| **Roll** | Läkare, sjuksköterska, admin, IT, annan |
| **Teknisk nivå** | 1-5 (Nybörjare → Expert) |
| **IT-kunskaper** | Mejl, Excel, Git, programmering, API:er, etc. |
| **Svarsstil** | Detaljerat, balanserat, koncist, steg-för-steg |
| **Bakgrund** | Fritext - beskriv dig själv |

**Hur det fungerar:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  Din profil (sparas i Supabase):                                     │
│  • Ortopedkirurg med 20 års erfarenhet                              │
│  • Teknisk nivå: 5/5 (Expert)                                       │
│  • Kunskaper: Git, API:er, TypeScript, Astro                        │
│  • Svarsstil: Detaljerat med kodexempel                             │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  AI-modellerna får automatiskt denna kontext:                        │
│                                                                      │
│  "Du svarar en ortopedkirurg med 20 års erfarenhet.                 │
│   Teknisk nivå: 5/5 (Expert). Kan programmera i TypeScript.         │
│   Föredrar detaljerade svar med kodexempel.                         │
│   Anpassa ditt svar efter denna bakgrund."                          │
└─────────────────────────────────────────────────────────────────────┘
```

**Exempel:**
- **Läkare (nivå 5):** Får detaljerade tekniska förklaringar med kodexempel
- **Sjuksköterska (nivå 2):** Får steg-för-steg-instruktioner utan facktermer

**URL:** `/admin/ai-council/profil`

### Vetenskaplig kontext 🔬 (NY!)

När du väljer **🔬 Vetenskap**-profilen får du automatiskt stöd för vetenskaplig referenshantering:

**Inbyggd standardmall för alla:**
- Inline-referenser [1], [2], etc.
- Numrerad referenslista med DOI/PubMed-länkar
- **Zotero Bulk Import-lista** - kopiera rakt in i Zotero
- Prioritering av RCT, systematiska reviews, guidelines

**Personlig överskrivning:**

Om du vill ha en mer anpassad vetenskaplig prompt (t.ex. med din medicinska bakgrund):

1. Gå till `/admin/ai-council/profil`
2. Fyll i fältet **"Vetenskaplig kontext"**
3. Din personliga prompt **överskrider** standardmallen

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔬 Vetenskap-profil vald:                                          │
│                                                                      │
│  Har du "Vetenskaplig kontext" ifylld?                              │
│    JA → Din personliga prompt används                               │
│    NEJ → Standardmallen med Zotero-stöd används                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Zotero Bulk Import:**

Varje vetenskapligt svar inkluderar ett kodblock med identifierare:

```
Zotero Bulk Import Lista
Kopiera och klistra in i Zotero → Add Item by Identifier

10.1016/j.jhsa.2021.07.012
12345678
https://pubmed.ncbi.nlm.nih.gov/87654321/
```

### Filuppladdning

Ladda upp filer som kontext:

| Filtyp | Stöd |
|--------|------|
| **Text** | `.txt`, `.md`, `.json`, `.js`, `.ts`, `.py`, `.html`, `.css` |
| **PDF** | Extraherar text automatiskt |
| **Bilder** | `.png`, `.jpg`, `.gif`, `.webp` (**multimodal bildanalys**) |

Dra och släpp, klicka för att välja filer, eller **Ctrl+V för att klistra in bilder**.

### 🖼️ Multimodal bildanalys (v3.1)

Bifoga skärmdumpar, diagram eller bilder direkt i frågan:

1. **Kopiera bild** (Ctrl+C från skärm, webbsida, bildprogram)
2. **Klistra in** (Ctrl+V) i kontext- eller prompt-fältet
3. **Kör fråga** - bilden analyseras av multimodala AI-modeller

**Modellstöd:**

| Modell | Bildstöd | Modell vid bilder |
|--------|----------|-------------------|
| **OpenAI** | ✅ | Byter till GPT-4o (o1 stöder ej bilder) |
| **Claude** | ✅ | Claude Sonnet med vision |
| **Gemini** | ✅ | Gemini 2.0 Flash |
| **Grok** | ❌ | Får notis om att bilder bifogats |

**Användningsfall:**
- 📸 Screenshots av kod/UI för granskning
- 📊 Diagram för analys eller förklaring
- 🖼️ Designmockups för feedback
- 📄 Bilder av dokument för textextraktion

### 📚 Zotero-integration (v3.2)

Importera vetenskapliga artiklar direkt från ditt Zotero-bibliotek till AI Council via en **stor modal** med fullständig collection-navigering.

#### Konfigurera Zotero

1. **Öppna AI Council** → Klicka på "📚 Zotero" i sidebaren
2. **Hämta API-nyckel** från [zotero.org/settings/keys](https://www.zotero.org/settings/keys)
   - Kryssa i "Allow library access"
   - Valfritt: "Allow notes access" och "Allow write access" (för framtida export)
3. **Klistra in nyckeln** i config-dialogen → Spara

#### Stor modal med collections

När du klickar på "📚 Zotero" öppnas en **stor central modal** (~90% av skärmen):

```
┌──────────────────────────────────────────────────────────────────────┐
│  Zotero                                              riverosiri   ✕  │
├────────────────────┬─────────────────────────────────────────────────┤
│  📁 Collections 🔄 │  [Sök i biblioteket...]                    🔍   │
├────────────────────┼─────────────────────────────────────────────────┤
│  📚 Mitt bibliotek │  25 resultat                    ☐ Välj alla    │
│  📁 AC-Anatomy     ├─────────────────────────────────────────────────┤
│  📁 AC-artros      │  ☐ Artikel 1                                   │
│    📂 AC-LUX       │     Författare, A. et al. (2024)               │
│    📂 AC-radiologi │     Journal of Shoulder Surgery                │
│  📁 ANATOMI        │     📄 PDF  #tag1 #tag2                        │
│  📁 Biceps         │  ☐ Artikel 2                                   │
│  📁 HEMSIDA        │     ...                                        │
│    📂 Rotatorcuff  │                                                │
│  ...               │                                                │
├────────────────────┴─────────────────────────────────────────────────┤
│  3 valda                   🔌 Koppla från    📥 Importera valda PDF  │
└──────────────────────────────────────────────────────────────────────┘
```

**Navigering:**
- **Vänster sidebar:** Hela din collection-hierarki med antal items per mapp
- **Klicka på collection:** Visar alla artiklar i den mappen
- **Sök:** Fritext-sökning i hela biblioteket eller vald collection

#### Sök och importera

1. **Bläddra** i dina collections eller **sök** efter titel/författare/nyckelord
2. **Välj** artiklar genom att klicka på dem (multi-select)
3. **Importera PDF:er** → Texten extraheras och läggs till i kontexten

**Funktioner:**

| Funktion | Beskrivning |
|----------|-------------|
| **Collection-träd** | Hela hierarkin med alla nivåer av nesting |
| **Sökning** | Sök i hela biblioteket eller inom collection |
| **Multi-select** | Välj flera artiklar samtidigt |
| **PDF-import** | Hämtar och extraherar text automatiskt |
| **Säkerhet** | AES-256-GCM kryptering av API-nycklar |
| **Rate limiting** | 120 req/60s med exponential backoff |

**Begränsningar:**
- Max 50 MB per PDF
- Max 100k tecken extraheras per PDF (resten trunkeras)
- Endast synkade PDF:er stöds: "imported_file" och "imported_url" (inte "linked_file")
- Grok stöder ej bildanalys av PDF-innehåll

**Tekniska filer:**
```
src/lib/zotero-crypto.ts              # Kryptering
src/lib/zotero-rate-limiter.ts        # Rate limiting
src/pages/api/ai-council/zotero/      # API endpoints (4 st)
  - validate.ts                       # Validera/spara API-nyckel
  - search.ts                         # Sök i bibliotek
  - fetch-pdf.ts                      # Hämta PDF-text
  - collections.ts                    # Hämta alla collections
supabase/migrations/013-*.sql         # Databasschema
```

### 🔬 PubMed-sökning (v3.8)

Sök i PubMed och få **verifierade vetenskapliga referenser** med riktiga PMID, DOI och länkar - helt utan hallucinationer.

#### Varför PubMed-sökning?

**Problemet:** När AI-modeller (särskilt via API) ombeds ge vetenskapliga referenser tenderar de att *hallucinera* - de hittar på artikeltitlar, författare och länkar som inte existerar. Grok.com fungerar bra eftersom den har inbyggd realtidssökning, men Grok API (och de flesta andra API:er) saknar detta.

**Lösningen:** PubMed-sökning hämtar riktiga artiklar direkt från NCBI:s databas och lägger till dem i AI:ernas kontext. Detta ger:
- ✅ **Verifierade referenser** - Artiklar som faktiskt existerar
- ✅ **Riktiga PMID och DOI** - Klickbara länkar som fungerar
- ✅ **Färsk information** - Realtidssökning, inte gammal träningsdata

#### Hur det fungerar tekniskt

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DATAFLÖDE: PubMed → AI Council                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. SÖKNING                                                             │
│  ┌──────────────┐    ┌───────────────┐    ┌──────────────────────────┐ │
│  │ Användare    │───▶│ pubmed-search │───▶│ NCBI E-utilities API     │ │
│  │ skriver      │    │ .ts (backend) │    │ (PubMed)                 │ │
│  │ sökterm      │    └───────────────┘    │ • esearch.fcgi (sök)     │ │
│  └──────────────┘           │             │ • efetch.fcgi (detaljer) │ │
│                             │             └──────────────────────────┘ │
│                             ▼                                          │
│  2. RESULTAT                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Verifierade artiklar returneras:                                  │  │
│  │ • PMID (unikt ID)                                                 │  │
│  │ • Titel, författare, journal, år                                  │  │
│  │ • DOI (om tillgänglig)                                            │  │
│  │ • Abstract (trunkerat)                                            │  │
│  │ • Riktiga PubMed-länkar                                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                             │                                          │
│                             ▼                                          │
│  3. KONTEXT-INJEKTION                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Valda artiklar läggs till i kontext-fältet som strukturerad text │  │
│  │                                                                   │  │
│  │ ## PubMed-referenser                                              │  │
│  │ [1] Författare et al. (2024). Titel. Journal.                    │  │
│  │     PubMed: https://pubmed.ncbi.nlm.nih.gov/12345678/             │  │
│  │     DOI: https://doi.org/10.1234/example                          │  │
│  │     Abstract: ...                                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                             │                                          │
│                             ▼                                          │
│  4. AI-KÖRNING                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     SAMMA KONTEXT TILL ALLA                       │  │
│  │                                                                   │  │
│  │    ┌─────────────────────────────────────────────────────┐       │  │
│  │    │  Prompt + Kontext (inkl. PubMed-referenser)         │       │  │
│  │    └─────────────────────────────────────────────────────┘       │  │
│  │              │             │             │             │          │  │
│  │              ▼             ▼             ▼             ▼          │  │
│  │         ┌───────┐    ┌─────────┐   ┌────────┐   ┌─────────┐      │  │
│  │         │ GPT-4 │    │ Claude  │   │ Gemini │   │  Grok   │      │  │
│  │         └───────┘    └─────────┘   └────────┘   └─────────┘      │  │
│  │                                                                   │  │
│  │  ✓ Alla modeller ser EXAKT samma referenser                      │  │
│  │  ✓ Jämförbart underlag för konsensusanalys                       │  │
│  │  ✓ Referenser är verifierade - inte hallucinerade                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Vad AI:erna ser och använder

| Datakälla | Beskrivning |
|-----------|-------------|
| **Träningsdata** | AI:ernas "förkunskaper" från träning (GPT-4: sept 2023, Claude: apr 2024, etc.) |
| **Kontext-fältet** | Allt du klistrar in + PubMed-referenser som hämtats |
| **Prompten** | Din fråga |

**Viktigt att förstå:**
- AI:erna använder **BÅDE** sin träningsdata **OCH** den kontext du ger dem
- PubMed-referenserna "augmenterar" deras kunskap med färska, verifierade källor
- Alla modeller får **samma input** → rättvis jämförelse i konsensusanalysen

#### Användning

1. **Klicka** på **"Sök verifierade källor"** under kontext-fältet (hybrid-sökmodal)
2. **Välj fliken** 🏥 **PubMed** för vetenskapliga artiklar
3. **Skriv söktermer** (t.ex. "rotator cuff repair return to sport")
4. **Klicka på artiklar** för att expandera abstract och välja dem
5. **Klicka "Lägg till valda i kontext"** för att injicera referenserna
6. **Skriv din prompt** och kör AI Council som vanligt

#### Söktips

| Sökstrategi | Exempel |
|-------------|---------|
| **Specifika termer** | "biceps tenodesis vs tenotomy outcomes" |
| **MeSH-termer** | "rotator cuff[MeSH] AND arthroscopy" |
| **Författare** | "Burkhart SS shoulder" |
| **År-filter** | "superior capsular reconstruction 2020:2024" |
| **Studietyp** | "anterior shoulder instability meta-analysis" |

#### Fördelar gentemot AI-genererade referenser

| Aspekt | PubMed-sökning | AI-genererade |
|--------|---------------|---------------|
| **Korrekthet** | 100% riktiga artiklar | Ofta hallucinerade |
| **PMID/DOI** | Verifierade, klickbara | Ofta felaktiga/påhittade |
| **Aktualitet** | Realtid (dagens artiklar) | Begränsat till träningsdata |
| **Abstract** | Faktiskt abstract | AI:s tolkning |
| **Källkritik** | Du väljer själv | AI bestämmer |

#### Tekniska filer

```
src/pages/api/ai-council/pubmed-search.ts   # API-endpoint för PubMed-sökning
```

**NCBI E-utilities (gratis):**
- `esearch.fcgi` - Söker efter artiklar, returnerar PMID-lista
- `efetch.fcgi` - Hämtar fullständig metadata för PMID:s
- Rate limit: 3 req/s utan API-nyckel (tillräckligt för normal användning)

#### Begränsningar

- Max 50 artiklar per sökning
- Abstract trunkeras till ~500 tecken (fulltext måste hämtas separat)
- Endast engelska söktermer fungerar optimalt
- Kräver internetanslutning (ingen lokal cache)

---

### Kopieringsknappar

Varje svar har en **"Kopiera"**-knapp som kopierar råtexten (Markdown) till urklipp.

### Kostnadsvisning 💰

AI Council visar **kostnad per körning** i realtid, nu med prominent banner högst upp:

| Visning | Beskrivning |
|---------|-------------|
| **💰 Kostnadsbanner** | Visas högst upp i resultatet - total kostnad, tid och tokens |
| **Per modell** | Varje accordion visar `tid · $kostnad` |
| **Syntes** | Syntes-kortet visar syntes-kostnad |
| **Total** | Längst ner visas total kostnad i USD och SEK |
| **Tokens** | Antal input/output tokens för hela körningen |

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 $0.0342  (~0.36 kr)   ⏱️ 8.2s   📥 2,340 in   📤 1,890 out  │
└─────────────────────────────────────────────────────────────────┘
```

**Priser baseras på officiell prisdata (jan 2026):**

| Modell | Input/1M | Output/1M |
|--------|----------|-----------|
| GPT-5.2 | $1.75 | $14.00 |
| GPT-5.2 Pro | $21.00 | $168.00 |
| GPT-4o | $2.50 | $10.00 |
| Claude Sonnet | $3.00 | $15.00 |
| Claude Opus 4.5 | $15.00 | $75.00 |
| Gemini 2.0 Flash | $0.10 | $0.40 |
| Grok 4 | $3.00 | $15.00 |

> **Tips:** Använd GPT-4o ⚡ eller Gemini 📚 för billigare iterationer under utveckling.

### Historik (Supabase + localStorage)

Sessioner sparas i **Supabase** (synkas mellan enheter) med **localStorage som fallback**. Historiken visas i höger sidebar.

| Funktion | Beskrivning |
|----------|-------------|
| **Spara** | Sparar prompt + syntes + modellval |
| **Klicka på anteckning** | Laddar tillbaka prompten |
| **Exportera** | Laddar ner som `.md`-fil |
| **Rensa** | Tar bort alla sessioner |

Statusindikator visar om du är synkad med Supabase (☁️) eller använder lokal lagring (💾).

### 🔄 Auto-sparad draft (synkas mellan enheter)

> **VIKTIG FUNKTION:** Ditt pågående arbete sparas automatiskt och synkas mellan olika datorer.

När du jobbar i AI Council sparas ditt pågående arbete automatiskt till molnet (Supabase). Detta innebär att du kan:

- **Fortsätta där du var** - Stäng webbläsaren, kom tillbaka nästa dag
- **Byta dator** - Börja hemma, fortsätt på jobbet (eller vice versa)
- **Återställa efter krasch** - Ingenting förloras om webbläsaren kraschar

**Exempelflöde:**
```
🏢 PÅ JOBBET                          🏠 HEMMA
─────────────                         ────────
1. Skriver längre prompt              1. Öppnar AI Council
2. Lägger till kontext                2. Allt är redan där!
3. Kör alla modeller (R1)                - Prompten ✓
4. Kör faktagranskning (R2)              - Kontexten ✓
5. Genererar syntes                      - Alla AI-svar ✓
6. Stänger webbläsaren                   - Deliberation ✓
   (sparas automatiskt)                  - Syntesen ✓
                                      3. Kan fortsätta arbeta
```

| Vad sparas | Beskrivning |
|------------|-------------|
| **Prompt** | Din aktuella fråga |
| **Kontext** | All kontextinformation du lagt till |
| **Alla AI-svar** | Svar från alla modeller (R1) |
| **Deliberation-svar** | Om du kört R2 (modellerna granskar varandra) |
| **Status** | Om deliberation körts, syntessvar, etc. |

**Tekniska detaljer:**

| Inställning | Värde |
|-------------|-------|
| **Sparintervall** | 2 sekunder efter senaste ändring |
| **Utgångstid** | 7 dagar (sedan senaste ändring) |
| **Fallback** | localStorage (24 timmar) om Supabase inte fungerar |
| **Per användare** | Varje användare har sitt eget draft |

**Obs:** Draftsen rensas automatiskt när du kör en **ny fråga** eller klickar på **"Rensa allt"**.

### Projektorganisation 📁 (NY i v3.0!)

Organisera dina sessioner i **projektmappar** med automatisk kontext.

```
┌─────────────────────────────────────────────────────────────────┐
│  PROJEKTSIDEBAR                                                 │
│                                                                 │
│  ✨ Ny chat                                                     │
│  📁 + Nytt projekt                                              │
│                                                                 │
│  🔍 Sök sessioner...                                           │
│                                                                 │
│  📌 SENASTE PROJEKT                                             │
│  ├── 🩺 IP-telefoni projekt     (blå)                          │
│  ├── 🚀 Astro-migrering         (grön)                         │
│  └── 🎤 Mikrofon-integration    (lila)                         │
│                                                                 │
│  📂 HISTORIK ▼                                                  │
│      (expanderar till alla osorterade sessioner)               │
└─────────────────────────────────────────────────────────────────┘
```

**Funktioner:**

| Funktion | Beskrivning |
|----------|-------------|
| **Skapa projekt** | Klicka "📁 +" för att skapa en ny mapp |
| **Projektkontext** | Kontext som automatiskt inkluderas i alla frågor inom projektet |
| **Färgkodning** | 12 färger att välja bland (högerklicka → Färg) |
| **Ikoner** | 18 emojis för visuell identifiering (högerklicka → Ikon) |
| **Fäst projekt** | Högerklicka → Fäst för att hålla projektet överst |
| **Kontextmeny** | Högerklicka på projekt för: Redigera, Färg, Ikon, Kontext, Fäst, Ta bort |

**Exempel på projektkontext:**

```
Projekt: IP-telefoni
Kontext: "Vi bygger ett IP-telefonisystem med Asterisk och WebRTC.
          Stack: Node.js, React, PostgreSQL. 
          Krav: HIPAA-kompatibelt, max 50 samtidiga samtal."
```

När du ställer en fråga i detta projekt får AI:erna automatiskt denna kontext – du slipper repetera bakgrundsinformation.

---

## Konfiguration

### Miljövariabler (.env)

```env
# AI Council API Keys
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-api03-...
GOOGLE_AI_API_KEY=AIza...
XAI_API_KEY=xai-...  # Valfritt - för Grok
SERPAPI_KEY=...      # Valfritt - hybrid-sökning (Google/Scholar/News)
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

## AI Council vs Cursor

> När ska jag använda AI Council och när ska jag använda Cursor?

### Cursor är bättre för:

| Uppgift | Varför |
|---------|--------|
| **Kodimplementation** | Direkt tillgång till filsystemet, kan läsa/skriva kod |
| **Kontextmedvetenhet** | Ser hela din kodbas, imports, typer, beroenden |
| **Iteration** | Kan direkt fixa fel, köra linting, testa |
| **Agentläge** | Kan utföra komplexa multi-steg uppgifter |
| **Debugging** | Integrerad terminal, kan köra och verifiera koden |

### AI Council är bättre för:

| Uppgift | Varför |
|---------|--------|
| **Arkitekturbeslut FÖRE kodning** | "Ska jag använda Redux eller Zustand?" - få konsensus först |
| **Deliberation** | Modellerna granskar varandras svar - fångar fler edge cases |
| **Explicit syntes** | En "domare" väger alla argument och ger slutsats |
| **Dokumenterad beslutslogg** | Sessioner sparas - du kan visa varför du valde en approach |
| **Vetenskapliga frågor** | Referenshantering, Zotero-integration |
| **Kostnadsvisning** | Du ser exakt vad varje körning kostar |
| **Patientfrågor** | Snabba svar med korsvalidering från flera modeller |

### Rekommenderad arbetsprocess

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. PLANERING (AI Council)                                          │
│     "Hur bör jag strukturera autentiseringen?"                      │
│     → Deliberation → Syntes → Spara beslut                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. IMPLEMENTATION (Cursor)                                          │
│     "Implementera autentisering enligt denna plan"                  │
│     → Agent mode → Kodgenerering → Testing                          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. SECOND OPINION (AI Council - valfritt)                          │
│     Om Cursor ger ett svar du är osäker på:                         │
│     → Kör samma fråga med Deliberation                              │
│     → Får alla modeller samma slutsats?                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Sammanfattning

| Verktyg | Användning |
|---------|------------|
| **Cursor** | All faktisk kodskrivning, debugging, refaktorering, "gör X" |
| **AI Council** | Strategiska beslut, arkitektur, forskning, beslutsdokumentation |

> **Analogi 1 - Arkitekt & Byggare:**  
> AI Council är **arkitekten** som designar huset. Cursor är **byggaren** som bygger det.

> **Analogi 2 - Skelett & Mjukdelar:**  
> AI Council är **skelettet** i en beslutsprocess – det ger struktur, ramverk och definierar *vad* som ska göras och *varför*. Cursor och andra verktyg är **mjukdelarna** som kan formas på olika sätt för att utföra det faktiska arbetet – *hur* det ska göras. Skelettet (ramverket för beslut) förblir stabilt, medan mjukdelarna (implementationen) kan anpassas efter behov.

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

## 🖥️ Använda syntesen i Cursor

AI Council genererar automatiskt en **Cursor Implementation Guide** i slutet av varje syntes. Denna sektion är optimerad för att ge AI-kodverktyg (som Cursor, Copilot, Windsurf) all information de behöver för att implementera lösningen.

### Vad ingår i Cursor-sektionen?

| Sektion | Beskrivning | Exempel |
|---------|-------------|---------|
| **Nya filer att skapa** | Fullständiga sökvägar för nya filer | `src/pages/api/zotero/search.ts` |
| **Befintliga filer att modifiera** | Filer som behöver ändras + vad | `ai-council.astro (lägg till modal)` |
| **Dependencies** | npm-paket att installera | `npm install bottleneck pdf-parse` |
| **Implementeringsordning** | Steg-för-steg guide | 1. Backend → 2. Frontend → 3. Test |
| **Referens till mönster** | Befintliga filer med liknande struktur | `Se src/lib/kryptering.ts` |

### Arbetsflöde: AI Council → Cursor

```
┌─────────────────────────────────────────────────────────────────┐
│  1. PLANERA I AI COUNCIL                                        │
│     Beskriv problemet/funktionen du vill bygga                  │
│     Välj profil: 💻 Kodning (deliberation + 4 modeller)         │
│     Kör → Få syntes med Cursor-sektion                          │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. KOPIERA SYNTESEN                                            │
│     Klicka "Kopiera" på syntes-kortet                           │
│     Hela syntesen inkl. Cursor-sektionen kopieras               │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. KLISTRA IN I CURSOR                                         │
│     Öppna Cursor och skapa ny chat (Ctrl+L)                     │
│     Klistra in syntesen                                         │
│     Lägg till: "Implementera enligt Cursor-sektionen"           │
└─────────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. CURSOR IMPLEMENTERAR                                        │
│     Cursor läser filsökvägarna och skapar/modifierar filer      │
│     Följer implementeringsordningen                              │
│     Använder referensmönster från projektet                      │
└─────────────────────────────────────────────────────────────────┘
```

### Praktiskt exempel

**1. Fråga i AI Council:**
> "Jag vill integrera Zotero Web API för att kunna söka och importera PDF:er direkt i AI Council. Användaren ska kunna spara sin API-nyckel säkert."

**2. Syntesen genererar Cursor-sektion:**
```markdown
## 🖥️ Cursor Implementation Guide

### Nya filer att skapa:
- src/pages/api/ai-council/zotero/auth.ts
- src/pages/api/ai-council/zotero/search.ts
- src/pages/api/ai-council/zotero/import-pdf.ts
- src/components/admin/ZoteroModal.astro
- supabase/migrations/013-zotero-credentials.sql

### Befintliga filer att modifiera:
- src/pages/admin/ai-council.astro (lägg till Zotero-knapp och modal)
- src/lib/kryptering.ts (använd befintlig krypteringsfunktion)

### Dependencies att installera:
```bash
npm install bottleneck
```

### Implementeringsordning:
1. Skapa databasschema (migration)
2. Implementera auth-endpoint med kryptering
3. Implementera search-endpoint med rate limiting
4. Skapa ZoteroModal UI-komponent
5. Integrera i ai-council.astro
6. Testa med din Zotero API-nyckel

### Referens till befintliga mönster:
- Se src/lib/kryptering.ts för krypteringsmönster
- Se src/pages/api/ai-council/query.ts för API-struktur
- Se SaveModal i ai-council.astro för modal-mönster
```

**3. Klistra in i Cursor och säg:**
> "Implementera Zotero-integrationen enligt Cursor-sektionen ovan. Börja med databasmigrationen."

### Tips för bästa resultat

| Tips | Varför |
|------|--------|
| **Använd 💻 Kodning-profilen** | Ger deliberation + alla 4 modeller för maximal kodgranskning |
| **Var specifik i frågan** | "Integrera X med Y" ger bättre filsökvägar än "gör X" |
| **Inkludera befintliga filer** | Om du har kod som referens, ladda upp den som kontext |
| **Kör deliberation** | Runda 2 korrigerar säkerhetsfel och tekniska missar |

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
- `grok` - Grok 4 (256K kontext, vetenskap)

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

## Versionshistorik

### v3.9 (2026-02-03) - Hybrid-sökning & Källverifiering

**Nyhet:** Unified källsökning med automatisk verifiering för dramatiskt minskade hallucinationer.

**Hybrid-sökmodal (ersätter PubMed-knappen):**
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Sök verifierade källor                              ✕  │
├─────────────────────────────────────────────────────────────┤
│  [🏥 PubMed] [🎓 Scholar] [🌐 Google] [📰 Nyheter]         │
├─────────────────────────────────────────────────────────────┤
│  [Sökfält...                                    ] [Sök]    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🏥 PubMed · 95/100 trovärdighet                     │   │
│  │ Rotator Cuff Repair: A Systematic Review            │   │
│  │ ✍️ Smith et al. · 📅 J Shoulder Elbow (2024)       │   │
│  │ > Background: Rotator cuff tears are common...      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  3 källa(or) valda                     [Lägg till i kontext]│
└─────────────────────────────────────────────────────────────┘
```

**Auto-sök i Vetenskap-profilen:**
- 🔬 **Automatisk PubMed-sökning** - Hämtar 5 relevanta artiklar före AI-anrop
- 🎓 **Google Scholar** (om SerpAPI konfigurerat) - Kompletterar med akademiska papers
- 📊 **Trovärdighetspoäng** - Varje källa rankas 0-100 baserat på domän

**Deliberation med källverifiering:**
- Runda 2 (faktagranskning) får nu tillgång till de hämtade källorna
- Modellerna instrueras verifiera påståenden mot källorna
- Ny klassificering: `VERIFIERING: BEKRÄFTAD/MOTSÄGS/EJ_FUNNET`

**Trovärdighetsklasser:**
| Kategori | Poäng | Exempel |
|----------|-------|---------|
| 🏥 PubMed | 95 | ncbi.nlm.nih.gov |
| 🎓 Journal | 95 | nature.com, sciencedirect.com |
| 🏛️ Government | 90 | .gov, who.int |
| 📖 Documentation | 85 | docs.*, developer.* |
| 🔧 GitHub | 80 | github.com |
| 💬 Forum | 70 | stackoverflow.com |
| 📖 Wikipedia | 70 | wikipedia.org |
| ✍️ Blog | 50 | medium.com, *.blog |

**Tekniskt:**
```
src/pages/api/ai-council/web-search.ts   # SerpAPI (Google, Scholar, News)
src/pages/api/ai-council/pubmed-search.ts # NCBI E-utilities
SERPAPI_KEY                              # Miljövariabel (~$50/mån för 5000 sök)
```

---

### v3.8 (2026-02-03) - PubMed-sökning

**Nyhet:** Sök vetenskapliga artiklar direkt i PubMed och lägg till verifierade referenser i kontexten.

**Problemet som löses:**
- AI-modeller via API tenderar att *hallucinera* vetenskapliga referenser
- Grok.com fungerar (har inbyggd sökning) men Grok API gör inte det
- Felaktiga PMID, DOI och länkar är vanligt förekommande

**Lösningen:**
- 🔬 **PubMed-sökmodal** - Sök i NCBI:s databas med 35+ miljoner artiklar
- ✅ **Verifierade PMID och DOI** - Riktiga, klickbara länkar
- 📄 **Abstract-preview** - Se sammanfattning innan du väljer
- 📥 **Kontext-injektion** - Valda artiklar läggs automatiskt i kontexten
- 🎯 **Samma underlag** - Alla AI-modeller ser exakt samma referenser

**Tekniskt:**
```
src/pages/api/ai-council/pubmed-search.ts   # NCBI E-utilities API
```

---

### v3.7 (2026-02-02) - Konsensusanalys & Riktad Deliberation

**Nyhet:** Anti-hallucination-system med strukturerad konfliktanalys.

**Konsensusanalys i Syntes:**
- 📊 **Konsensusanalys-box** - Visar överensstämmelse (HÖG/MEDEL/LÅG) i början av varje syntes
- ✅ **Alla modeller överens** - Listar punkter där alla håller med
- ⚠️ **Konflikter/skillnader** - Visar var modellerna är oeniga
- 💡 **Unika insikter** - Flaggar påståenden från endast en modell med "Verifiera denna!"

**Riktad Deliberation (Runda 2):**
- 🔍 **Strukturerad konfliktanalys** - Modellerna kategoriserar problem:
  - `MOTSÄGELSE` - Modeller säger olika saker
  - `UNIK_INSIKT` - Bara en modell nämner (hög hallucinationsrisk)
  - `UTAN_KÄLLA` - Påstående utan referens
  - `MÖJLIG_HALLUCINATION` - Verkar påhittat
- 🔄 **Konfliktlösning** - Varje modell föreslår lösning med säkerhetsgrad
- ❌ **Förkastade påståenden** - Hallucinationer markeras explicit

**Supersyntes:**
- Extraherar alla konfliktblock från Runda 2
- Visar lösta vs olösta konflikter
- Listar förkastade påståenden separat

**Tekniskt:**
- Uppdaterad `buildDeliberationPrompt()` med konflikttyper
- Uppdaterad `buildSynthesisPrompt()` med konsensusanalys
- Uppdaterad `buildSuperSynthesisPrompt()` med konfliktextraktion

---

### v3.6 (2026-02-01) - Cross-device sync & UI-förbättringar

**Nyhet:** Pågående arbete synkas mellan datorer.

- 🔄 **Cross-device draft sync** - Fortsätt där du var på annan dator
- ⚠️ **Session-utgångsvarning** - Banner när sessionen gått ut (7 dagar)
- ➕ **Lägg till modeller** - Kör fler AI:er utan att köra om befintliga
- 📊 **Syntes-metadata** - Visa vilka modeller och profil som användes

---

### v3.5 (2026-01-30) - Nästa steg-kort & Historik

**UI-förbättringar:** Tydligare val mellan faktagranskning och sammanfattning.

- 🔬 **Faktagranskning-kort** - Nytt kort istället för "Deliberation"-knapp
- 🧪 **Sammanfattning-kort** - Nytt kort istället för "Syntes"-knapp  
- 📐 **Samma storlek och layout** - Två likadana kort med tydliga beskrivningar
- ⏱️ **Tidsuppskattning** - Visar ~60 sek / ~15 sek för varje alternativ
- 📋 **Antal svar** - Visar hur många modellsvar som är redo
- 📜 **Historik** - "Sessionslogg" → "Historik" med bättre visning av prompt + svar

**Tekniskt:**
- Ny CSS för `.next-step-cards`, `.deliberate-card`, `.synthesize-card`
- Uppdaterad JavaScript för att visa/dölja kort baserat på state
- Kort markeras som "done" efter användning

---

### v3.2 (2026-01-27) - Zotero-integration

**Ny funktion:** Sök och importera PDF:er från Zotero-bibliotek via stor modal.

- 📚 **Stor Zotero-modal** (~90% av skärmen) för bättre översikt
- 🗂️ **Collection-navigering** - Hela hierarkin med alla nivåer av nesting
- 🔍 **Sök och bläddra** - Fritext eller inom specifik collection
- ✅ **Multi-select** - Välj flera artiklar för batch-import
- 🔐 **AES-256-GCM kryptering** av API-nycklar med PBKDF2
- ⏱️ **Smart rate limiting** - 120 req/60s med exponential backoff
- 📄 **PDF-extraktion** med pdf-parse och intelligent chunking
- 🗄️ **Supabase-integration** med RLS för säker lagring

**Tekniskt:**
- 4 nya API-endpoints: validate, search, fetch-pdf, collections
- Collections API med pagination för att hämta ALLA collections
- Migration 013 för zotero_configs/cache tabeller
- npm: pdf-parse dependency

---

### v3.1 (2026-01-27) - Multimodal bildanalys

**Ny funktion:** Klistra in bilder direkt för AI-analys.

- 🖼️ **Ctrl+V bildinklistring** - Klistra in screenshots direkt i kontext/prompt
- 🔍 **Fullständig bildanalys** - GPT-4o, Claude och Gemini analyserar bildinnehållet
- 📷 **Thumbnail-förhandsvisning** - Se inklistrade bilder innan körning
- ⚠️ **Grok-notis** - Informerar när bilder inte kan analyseras av Grok

**Tekniskt:**
- OpenAI byter automatiskt från o1 till GPT-4o när bilder finns
- Base64-kodning för direktöverföring till multimodala API:er
- Stöd för PNG, JPG, GIF, WebP

---

### v3.0 (2026-01-27) - UI Redesign & Projektorganisation

**Stor uppdatering:** Helt nytt gränssnitt inspirerat av Grok/Gemini med fokus på projekthantering.

**Visuella ändringar:**
- 🌞 **Ljust tema** - Modernt, professionellt utseende (mörkgrått → vit/ljusgrå)
- 📐 **Ny layout** - Projektsidebar till vänster, huvudområde till höger
- 📱 **Responsiv design** - Hamburger-meny på mobil

**Nya funktioner:**
- 📁 **Projektmappar** - Organisera sessioner i projekt
- 🎨 **Färg/Ikon-väljare** - Anpassa projektens utseende (12 färger, 18 ikoner)
- 📌 **Fäst projekt** - Håll viktiga projekt överst
- 🔍 **Sökfunktion** - Sök bland alla sessioner
- 📝 **Projektkontext** - Auto-inkludera kontext per projekt
- 🖱️ **Kontextmeny** - Högerklicka för snabbåtgärder
- ✨ **"Ny chat"** - Snabbknapp för att börja om

**Tekniskt:**
- Ny Supabase-tabell `ai_council_projects`
- Nytt API: `/api/ai-council/projects` (CRUD)
- CSS-variabler för enkel teming
- WCAG AA-kompatibel kontrast

### v2.7 (2026-01-27) - Hallucinationsdetektion, Export & Spara-modal

**Nyhet:** Trovärdighetsrapport, export och förbättrad sparfunktion.

**Funktioner:**
- 🔍 **Hallucinationsdetektion** - Rapporterar när AI:er motsäger varandra (🔴 hög, 🟡 medium, ⚪ låg)
- 💾 **Spara-modal** - Popup för att namnge session efter körning
- 📥 **Export som Markdown** - Ladda ned komplett session som .md-fil
- ⚙️ **Auto-spara** - Aktiverbar funktion

### v2.6 (2026-01-26) - Vetenskaplig kontext med Zotero

**Nyhet:** Automatisk referenshantering för alla som använder Vetenskap-profilen

**Funktioner:**
- 🔬 **Standardmall för vetenskap** - Alla får Zotero-stöd automatiskt
- 📚 **Zotero Bulk Import** - Kodblock med DOI/PMID för snabb import
- 👤 **Personlig överskrivning** - Fyll i egen vetenskaplig kontext på profilsidan
- 📖 **Inline-referenser** - [1], [2] format med klickbara DOI/PubMed-länkar

**Hur det fungerar:**
1. Välj 🔬 Vetenskap-profilen
2. Standardmallen med referensformatering används automatiskt
3. Vill du ha egen bakgrund? Fyll i "Vetenskaplig kontext" på profilsidan
4. Din personliga prompt överskrider standardmallen

### v2.5 (2026-01-26) - Användarprofiler

**Nyhet:** Personanpassade AI-svar baserat på användarens bakgrund

**Funktioner:**
- 👤 **Användarprofiler** - Ställ in roll, teknisk nivå och svarsstil
- 💰 **Kostnadsbanner högst upp** - Tydlig kostnadsvisning direkt i resultatet
- 🔗 **Profilsida** - `/admin/ai-council/profil` för att redigera din profil

**Hur det fungerar:**
1. Användaren fyller i sin profil (roll, teknisk nivå, IT-kunskaper, etc.)
2. Profilen sparas i Supabase och laddas automatiskt vid varje fråga
3. AI-modellerna får en systemkontext som beskriver användarens bakgrund
4. Svaren anpassas efter användarens förväntade kunskapsnivå

**Exempel:**
- Läkare med teknisk nivå 5 får detaljerade kodexempel
- Sjuksköterska med nivå 2 får steg-för-steg utan facktermer

### v2.4 (2026-01-26) - Profilväljare

**Nyhet:** Förinställda profiler för olika användningsfall

**Funktioner:**
- ⚡ **Snabb** (standard) - Endast Gemini (~3-5 sek)
- 🏥 **Patientfrågor** - Gemini + Claude för snabba svar
- 💻 **Kodning** - Alla 4 modeller + deliberation + Opus 4.5 syntes
- 🔬 **Vetenskap** - Gemini + Claude + Grok med o1 som syntes
- 📊 **Strategi** - o1 + Claude + Grok med Opus 4.5 för verksamhetsbeslut

**Principer:**
- Standard = snabbast och billigast (inte dyrast)
- Manuella ändringar avmarkerar profilen
- Syntesmodeller sorterade: snabbast först

### v2.3 (2026-01-26) - Grok 4

**Ändring:** Uppgraderade från `grok-2-latest` till `grok-4`

**Förbättringar:**
- ✅ **256K tokens kontext** - Kan hantera längre dokument
- ✅ **Bättre vetenskaplig analys** - Överlägsen för litteratursyntes och evidensgranskning
- ✅ **Reasoning-funktion** - Djupare analys vid komplexa frågor
- ⚠️ **Pris:** $3.00/$15.00 per 1M tokens (samma nivå som o1)

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
| **Hallucinationsdetektion** | ✅ | ❌ | ❌ | ❌ |
| **Profilväljare** | ✅ | ❌ | ❌ | ❌ |
| **Val av syntesmodell (6 st)** | ✅ | ❌ | ❌ | ❌ |
| **Self-hosted** | ✅ | ❌ | ❌ | ❌ |
| Full kostnadskontroll | ✅ | ❌ | ❌ | ❌ |

### Våra unika fördelar

1. **Hallucinationsdetektion** - När 3/4 modeller flaggar samma fel = säker hallucination
2. **Deliberation Mode** - Modellerna granskar och korrigerar varandra
3. **Self-hosted** - Dina egna API-nycklar, full kontroll över kostnader
4. **Profilväljare** - Förinställda profiler för olika användningsfall
5. **6 syntesmodeller** - Välj själv vilken AI som sammanfattar
6. **Integrerat i personalportalen** - Ingen extra inloggning

---

## Relaterade dokument

### AI Council-specifikt
- [KONTEXT.md](./KONTEXT.md) - **Kompakt teknisk kontext** (för AI-sökningar)
- [README.md](./README.md) - Snabbguide för AI Council
- [AI-COUNCIL-TODO.md](./AI-COUNCIL-TODO.md) - Projektplan för separation

### Övriga
- [AI-INTEGRATION-RESURSER.md](./AI-INTEGRATION-RESURSER.md) - Övriga AI-resurser i projektet
- [MULTI-AI-ARBETSFLODE.md](./MULTI-AI-ARBETSFLODE.md) - Arbetsflöden för multi-AI
- [SETUP-ARBETSDATOR.md](./SETUP-ARBETSDATOR.md) - Installationsguide
