# Multi-AI Arbetsflöde för Komplexa Problem

> **Syfte:** Systematiskt tillvägagångssätt för att använda flera AI-modeller när ett problem är svårt att lösa.

---

## Snabbguide: När ska du använda vad?

| Situation | Metod | Tid |
|-----------|-------|-----|
| Snabb fråga, tydligt svar | Normal Cursor-chat | 1 min |
| Behöver flera perspektiv | `COUNCIL:`-prefix i Cursor | 2-3 min |
| Kritiskt beslut, vill ha flera modeller | AI Council webverktyg | 5-10 min |
| Vetenskaplig fråga, behöver faktakontroll | AI Council med Deliberation | 10-15 min |

---

## Metod 1: COUNCIL-prefix i Cursor (Snabbast)

### Användning

Skriv `COUNCIL:` eller `RÅDET:` före din fråga i Cursor-chatten:

```
COUNCIL: Ska jag använda REST eller GraphQL för detta API?
```

### Vad händer

AI:n svarar automatiskt från tre perspektiv:
1. **🔧 Implementatören** - Praktisk, snabb lösning
2. **🏛️ Arkitekten** - Långsiktig design
3. **🔍 Kritikern** - Risker och problem

Följt av en **syntes** som väger samman perspektiven.

### Bäst för

- Arkitekturbeslut
- Val mellan tekniker
- Kodstruktur
- Snabba second opinions

---

## Metod 2: Parallella Cursor-chattar

### Steg

1. **Öppna flera chattar** (Cmd/Ctrl + Shift + L flera gånger)
2. **Byt modell** i varje chatt (klicka på modellnamnet längst ner):
   - Chatt 1: Claude Sonnet
   - Chatt 2: GPT-4o
   - Chatt 3: Gemini Pro
3. **Klistra in samma fråga** i alla chattar
4. **Jämför svaren** och identifiera:
   - Konsensus (alla säger samma sak)
   - Divergens (olika förslag)
   - Unika insikter

### Bäst för

- När du vill se hur olika modeller resonerar
- Faktakontroll (om alla säger samma sak är det troligen korrekt)
- Kreativa förslag (olika modeller har olika styrkor)

---

## Metod 3: AI Council Webverktyg

**URL:** `/admin/ai-council`

### Funktioner

- **Parallella frågor** till OpenAI, Claude, Gemini, Grok
- **Valbar syntes-modell** (Claude Opus 4.5 för bästa kvalitet)
- **Deliberation Mode** - AI:erna granskar varandras svar
- **Sessionshistorik** sparas i Supabase
- **Kostnadsvisning** per körning

### Användning

1. Gå till `/admin/ai-council`
2. Skriv kontext (bakgrund, kod, etc.)
3. Skriv din fråga
4. Välj vilka modeller som ska svara
5. Välj syntes-modell
6. (Valfritt) Aktivera Deliberation för extra granskning
7. Klicka "Kör"

### Bäst för

- Komplexa beslut som kräver flera perspektiv
- Vetenskapliga frågor (Deliberation minskar hallucinationer)
- När du vill dokumentera beslutsprocessen
- Prompt-utveckling och systemdesign

---

## Metod 4: Manuell Multi-AI Workflow

För maximalt genomtänkta beslut utan AI Council.

### Steg 1: Förbered frågan

Skriv en tydlig prompt med:
- **Kontext:** Bakgrund och begränsningar
- **Fråga:** Vad du vill ha svar på
- **Format:** Hur svaret ska struktureras

### Steg 2: Fråga primära AI:er

Kör samma prompt i:

| AI | URL | Styrka |
|----|-----|--------|
| Claude | claude.ai | Kod, struktur, resonemang |
| ChatGPT | chat.openai.com | Bredd, kreativitet |
| Gemini | gemini.google.com | Stor kontext, Google-data |
| Grok | grok.com | Realtidsinfo, referenser |
| Perplexity | perplexity.ai | Källhänvisningar |

### Steg 3: Samla svar

Kopiera alla svar till ett dokument.

### Steg 4: Be om syntes

Ge alla svar till din favorit-AI med prompten:

```
Här är svar från flera AI-modeller på samma fråga:

[CLAUDE]
{svar}

[CHATGPT]
{svar}

[GEMINI]
{svar}

Agera som senior expert. Analysera dessa förslag:
1. Identifiera konsensus
2. Notera viktiga skillnader
3. Väg för- och nackdelar
4. Ge en slutgiltig rekommendation
```

### Steg 5: Dokumentera

Spara syntesen för framtida referens.

---

## Deliberation: Runda 2 (Avancerat)

För extra noggrannhet, särskilt vid vetenskapliga frågor.

### Koncept

Efter första rundan får varje AI se de andras svar och:
- Bekräfta eller ifrågasätta
- Lägga till det de missat
- Korrigera faktafel

### Prompt för Runda 2

```
Du fick tidigare denna fråga: [ORIGINAL FRÅGA]

Ditt svar var: [DITT FÖRSTA SVAR]

Här är vad andra AI-modeller svarade:
[ANDRA SVAR]

Granska nu alla svar:
1. Håller du med om de andras poänger?
2. Ser du några faktafel i de andra svaren?
3. Vill du revidera ditt eget svar?
4. Finns det något viktigt som alla missat?

Ge ett uppdaterat, förfinat svar.
```

### Supersyntes

Efter Runda 2, gör en slutlig syntes som inkluderar båda rundorna.

---

## Checklista: Välj rätt metod

```
□ Är frågan enkel och tydlig?
  → Normal Cursor-chat

□ Behöver jag flera perspektiv snabbt?
  → COUNCIL:-prefix

□ Vill jag jämföra olika AI-modeller?
  → Parallella chattar ELLER AI Council

□ Är det ett kritiskt beslut?
  → AI Council med dokumentation

□ Vetenskaplig fråga där fakta är viktigt?
  → AI Council med Deliberation

□ Vill jag ha full kontroll över processen?
  → Manuell Multi-AI Workflow
```

---

## Tips för bättre resultat

### 1. Ge kontext
Ju mer bakgrund AI:n har, desto bättre svar.

### 2. Var specifik
"Hur bygger jag auth?" → Dåligt
"Hur implementerar jag JWT-auth i Astro med Supabase?" → Bra

### 3. Be om avvägningar
"Vilka nackdelar har detta?" tvingar AI:n att tänka kritiskt.

### 4. Verifiera fakta
Om flera AI:er säger samma sak är det troligare korrekt.
Om de säger olika saker, dubbelkolla med primärkällor.

### 5. Iterera
Första svaret är sällan perfekt. Följ upp med:
- "Kan du utveckla punkt 3?"
- "Vilka edge cases missar detta?"
- "Hur skulle du förenkla detta?"

---

## Relaterade resurser

- [AI Council Dokumentation](./AI-COUNCIL.md)
- [AI Integration Resurser](./AI-INTEGRATION-RESURSER.md)
- [Zotero + NotebookLM Workflow](./ZOTERO-NOTEBOOKLM-WORKFLOW.md)

---

*Senast uppdaterad: 2026-01-26*
