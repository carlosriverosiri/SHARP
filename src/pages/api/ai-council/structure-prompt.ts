/**
 * API: AI Council - Prompt Structuring
 * POST /api/ai-council/structure-prompt
 * 
 * Tar en lång, ostrukturerad (ofta dikterad) prompt och omvandlar den
 * till en strukturerad version med Markdown-formatering.
 * 
 * Använder Gemini 2.0 Flash för snabbhet (<3 sekunder).
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';

const GOOGLE_AI_API_KEY = import.meta.env.GOOGLE_AI_API_KEY;

// System prompt för strukturering
const STRUCTURE_SYSTEM_PROMPT = `Du får en dikterad eller ostrukturerad prompt som kan vara lång och rörig.
Din uppgift är att skapa en tydlig, strukturerad version i Markdown.

FORMAT:
## Kärnfråga
[Huvudfrågan eller uppgiften i 1-2 meningar]

## Specifika krav
• [Krav/önskemål 1]
• [Krav/önskemål 2]
• [Krav/önskemål 3]
(fler om det behövs)

## Kontext/Bakgrund
[Relevant bakgrundsinformation, om sådan finns]

## Begränsningar
[Eventuella begränsningar eller saker att undvika, om sådana nämns]

VIKTIGA REGLER:
- Bevara ALL information från originalet - ingenting får försvinna
- Använd Markdown och bullet points för tydlighet
- Fokusera på klarhet och struktur, inte på att korta ner
- Gör INGA egna tolkningar eller tillägg
- Om något är oklart, behåll det som det är
- Ta bort uppenbara talspråksmarkörer (eh, öh, alltså) om de inte tillför mening
- Skriv på samma språk som originalet`;

interface StructureResponse {
  structuredPrompt: string;
  duration: number;
  tokens?: {
    input: number;
    output: number;
  };
  cost?: {
    usd: number;
    sek: number;
  };
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Kontrollera autentisering
  if (!arInloggad(cookies)) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { prompt, cleanFillerWords = false } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'Prompt krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rensa utfyllnadsord om aktiverat
    let processedPrompt = prompt;
    if (cleanFillerWords) {
      processedPrompt = cleanFillers(prompt);
    }

    const start = Date.now();

    // Anropa Gemini 2.0 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: STRUCTURE_SYSTEM_PROMPT },
                { text: `\n\nHär är prompten som ska struktureras:\n\n${processedPrompt}` }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.3, // Låg temperatur för konsekvent output
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return new Response(JSON.stringify({ 
        error: `API-fel: ${response.status}` 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const duration = Date.now() - start;

    const structuredPrompt = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    if (!structuredPrompt) {
      return new Response(JSON.stringify({ 
        error: 'Kunde inte strukturera prompten' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Beräkna tokens och kostnad
    const inputTokens = data.usageMetadata?.promptTokenCount || 0;
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
    
    // Gemini 2.0 Flash pricing: $0.10/1M input, $0.40/1M output
    const costUsd = (inputTokens / 1_000_000) * 0.10 + (outputTokens / 1_000_000) * 0.40;
    const costSek = costUsd * 10.5; // Ungefärlig växelkurs

    const result: StructureResponse = {
      structuredPrompt,
      duration,
      tokens: {
        input: inputTokens,
        output: outputTokens,
      },
      cost: {
        usd: costUsd,
        sek: costSek,
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Structure prompt error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Ett fel uppstod' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * Rensar vanliga utfyllnadsord från dikterad text.
 * Bevarar ord mitt i meningar för att undvika meningsförändringar.
 */
function cleanFillers(text: string): string {
  const fillers = ['eh', 'öh', 'ehm', 'öhm', 'liksom', 'typ', 'alltså', 'ba', 'asså'];
  let cleaned = text;
  
  fillers.forEach(filler => {
    // Ta bort i början av mening
    cleaned = cleaned.replace(new RegExp(`^${filler}[,.]?\\s+`, 'gmi'), '');
    // Ta bort efter punkt/utropstecken
    cleaned = cleaned.replace(new RegExp(`([.!?])\\s+${filler}[,.]?\\s+`, 'gi'), '$1 ');
    // Ta bort upprepade utfyllnadsord
    cleaned = cleaned.replace(new RegExp(`${filler}[,.]?\\s+${filler}`, 'gi'), '');
  });
  
  // Ta bort dubbla mellanslag
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  
  return cleaned.trim();
}
