# AI-Integration i Personalportalen

> **Status:** Planerad  
> **Prioritet:** Medium  
> **Uppskattad tid:** 2-3 timmar implementation

---

## Översikt

Integration av AI-funktionalitet i personalportalen för att:
- Hjälpa personalen skapa och formatera dokument
- Förbättra texter enligt klinikens stilguide
- Generera patientinformation baserat på mallar
- Söka och sammanfatta interna dokument

---

## Användningsfall

### 1. **Textförbättring**
Personal klistrar in en text → AI förbättrar språk, struktur och läsbarhet

```
┌─────────────────────────────────────────────┐
│  ✏️ Förbättra text                          │
├─────────────────────────────────────────────┤
│  [Klistra in eller skriv din text här...]   │
│                                             │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Välj stil:                          │    │
│  │ ○ Patientinformation (enkel)        │    │
│  │ ○ Internt dokument (formellt)       │    │
│  │ ○ E-post till patient               │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [🪄 Förbättra med AI]                      │
└─────────────────────────────────────────────┘
```

### 2. **Dokumentgenerering från mall**
Välj dokumenttyp → Fyll i nyckelinformation → AI genererar komplett dokument

**Exempel:**
- "Kallelse till återbesök" - Fyll i: patientnamn, datum, anledning → Färdig kallelse
- "Rehabinstruktioner" - Välj: axel/knä/höft, operationstyp → Anpassade instruktioner

### 3. **Fråga dokumenten**
Personal ställer fråga → AI söker i uppladdade dokument → Svar med källa

```
"Vad är vår policy för sjukskrivning vid rotatorcuffoperation?"
→ "Enligt sjukskrivningspolicyn (2024-01-15) rekommenderas 2-4 veckor..."
```

---

## Teknisk Implementation

### API-val

| Leverantör | Modell | Kostnad | Fördelar |
|------------|--------|---------|----------|
| **OpenAI** | gpt-4o-mini | ~$0.15/1M tokens | Snabb, billig, bra på svenska |
| **OpenAI** | gpt-4o | ~$2.50/1M tokens | Bäst kvalitet |
| **Anthropic** | claude-3-haiku | ~$0.25/1M tokens | Bra på längre texter |
| **Anthropic** | claude-3.5-sonnet | ~$3/1M tokens | Utmärkt kvalitet |

**Rekommendation:** Börja med `gpt-4o-mini` (~50-100 kr/månad för 15 användare)

### Arkitektur

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Frontend   │────▶│  API Route   │────▶│  OpenAI     │
│  (Astro)    │◀────│  (Server)    │◀────│  API        │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Supabase    │
                    │  (loggning)  │
                    └──────────────┘
```

### Filstruktur

```
src/
├── pages/
│   ├── api/
│   │   └── ai/
│   │       ├── forbattra.ts      # Textförbättring
│   │       └── generera.ts       # Dokumentgenerering
│   └── personal/
│       └── ai-verktyg.astro      # UI för AI-funktioner
├── lib/
│   ├── ai-client.ts              # OpenAI-klient
│   └── ai-prompts.ts             # Gemensamma prompts
└── data/
    └── ai-mallar.json            # Dokumentmallar
```

### Gemensam Systemprompt

```typescript
// src/lib/ai-prompts.ts

export const KLINIK_SYSTEMPROMPT = `
Du är en medicinsk kommunikationsassistent för Södermalms Ortopedi.

STILGUIDE:
- Använd tydligt, patientvänligt språk
- Undvik medicinsk jargong när det riktar sig till patienter
- Använd aktiv röst: "Du ska..." istället för "Patienten ska..."
- Korta meningar och stycken
- Punktlistor för instruktioner
- Professionell men varm ton

FORMATERING:
- Tydliga rubriker (##)
- Numrerade listor för steg-för-steg
- Punktlistor för information
- Fetmarkera viktiga ord

BEGRÄNSNINGAR:
- Ge ALDRIG medicinsk rådgivning
- Hänvisa alltid till läkare för medicinska frågor
- Skriv "Kontakta kliniken om..." vid osäkerhet
`;

export const DOKUMENT_PROMPTS = {
  patientinfo: KLINIK_SYSTEMPROMPT + `
    Formatera texten som patientinformation.
    Använd enkel svenska (SKRIV på läsbarhetsnivå).
    Inkludera alltid kontaktuppgifter.
  `,
  
  internt: KLINIK_SYSTEMPROMPT + `
    Formatera som internt styrdokument.
    Använd formell ton.
    Inkludera datum och versionsnummer.
  `,
  
  epost: KLINIK_SYSTEMPROMPT + `
    Formatera som e-post till patient.
    Börja med "Hej [Namn]"
    Avsluta med "Med vänliga hälsningar, Södermalms Ortopedi"
  `,
};
```

### API-endpoint Exempel

```typescript
// src/pages/api/ai/forbattra.ts

import type { APIRoute } from 'astro';
import OpenAI from 'openai';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { loggaHandelse } from '../../../lib/supabase';

const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY,
});

export const POST: APIRoute = async ({ request, cookies }) => {
  // Kontrollera inloggning
  if (!await arInloggad(cookies)) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), { status: 401 });
  }

  const anvandare = await hamtaAnvandare(cookies);
  const { text, stil } = await request.json();

  // Validering
  if (!text || text.length > 10000) {
    return new Response(JSON.stringify({ error: 'Ogiltig text' }), { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: DOKUMENT_PROMPTS[stil] || KLINIK_SYSTEMPROMPT },
        { role: 'user', content: `Förbättra följande text:\n\n${text}` }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const forbattradText = completion.choices[0]?.message?.content || '';

    // Logga användning (utan innehåll - GDPR)
    await loggaHandelse(
      anvandare?.id || 'unknown',
      anvandare?.email || 'unknown',
      'AI_ANVANDNING',
      { typ: 'forbattra', stil, tecken: text.length }
    );

    return new Response(JSON.stringify({ 
      result: forbattradText,
      tokens: completion.usage?.total_tokens 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('AI-fel:', error);
    return new Response(JSON.stringify({ error: 'AI-tjänsten är inte tillgänglig' }), { 
      status: 500 
    });
  }
};
```

---

## Säkerhet & GDPR

### ✅ Måste implementeras

1. **Ingen lagring av patientdata**
   - AI:n får ALDRIG skickas personnummer, namn eller journalinfo
   - Endast generisk text

2. **Loggning utan innehåll**
   - Logga: användare, tidpunkt, antal tecken, typ
   - Logga INTE: själva texten

3. **Rate limiting**
   - Max 50 AI-anrop per användare per dag
   - Förhindrar missbruk och kostnadskontroll

4. **API-nyckel säkerhet**
   - Endast i miljövariabler
   - Aldrig i frontend-kod

### Dataflöde

```
[Personal skriver text]
        ↓
[Frontend skickar till /api/ai/forbattra]
        ↓
[Server validerar + saniterar]
        ↓
[Anrop till OpenAI (text utan persondata)]
        ↓
[Svar tillbaka till frontend]
        ↓
[Logga användning (utan innehåll)]
```

---

## Kostnadskalkyl

### Estimerad användning (15 användare)

| Funktion | Anrop/dag | Tokens/anrop | Kostnad/mån |
|----------|-----------|--------------|-------------|
| Textförbättring | 20 | ~1000 | ~45 kr |
| Dokumentgenerering | 10 | ~2000 | ~45 kr |
| **Totalt** | | | **~90 kr/mån** |

### Budget-kontroll

```typescript
// Daglig gräns per användare
const MAX_TOKENS_PER_DAY = 50000;

// Månatlig budget-varning
if (manatligKostnad > 150) {
  notifieraAdmin('AI-budget överskreds');
}
```

---

## Implementationsplan

### Fas 1: Grundläggande (1-2 timmar)
- [ ] Skapa OpenAI-konto och API-nyckel
- [ ] Implementera `/api/ai/forbattra` endpoint
- [ ] Lägg till "Förbättra text"-ruta på resurssidan
- [ ] Grundläggande loggning

### Fas 2: Utökad (2-3 timmar)
- [ ] Dokumentmallar och generering
- [ ] Flera stilalternativ
- [ ] Bättre felhantering och rate limiting

### Fas 3: Avancerad (framtid)
- [ ] "Fråga dokumenten" med RAG (Retrieval Augmented Generation)
- [ ] Automatisk kategorisering av uppladdade dokument
- [ ] Sammanfattning av långa dokument

---

## Miljövariabler

```env
# .env (lägg till)
OPENAI_API_KEY=sk-...
AI_MAX_TOKENS_PER_REQUEST=2000
AI_MAX_REQUESTS_PER_DAY=50
```

```env
# Netlify Environment Variables
OPENAI_API_KEY=sk-...
```

---

## Nästa steg

1. **Skapa OpenAI-konto**: https://platform.openai.com
2. **Generera API-nyckel**: API Keys → Create new secret key
3. **Lägg till i Netlify**: Site settings → Environment variables
4. **Implementera**: Kör Fas 1 ovan

---

*Senast uppdaterad: 2026-01-21*
