/**
 * API: Kunskapsbas - Strukturera sammanfattning
 * POST /api/kunskapsbas/structure-summary
 *
 * Tar en kortare sammanfattning och gör den tydlig, korrigerad
 * och begränsad till 3-5 meningar.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';

const GOOGLE_AI_API_KEY = import.meta.env.GOOGLE_AI_API_KEY;

const SUMMARY_SYSTEM_PROMPT = `Du får en sammanfattning av ett projekt.
Din uppgift är att göra den tydlig och kort (3-5 meningar).

REGLER:
- Skriv på samma språk som originalet (svenska)
- Rätta stavning och grammatik
- Behåll fakta och innebörd
- Inga rubriker eller punktlistor
- Svara ENDAST med den förbättrade sammanfattningen`;

interface SummaryResponse {
  structuredSummary: string;
  duration: number;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!arInloggad(cookies)) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!GOOGLE_AI_API_KEY) {
    return new Response(JSON.stringify({ error: 'Google AI API-nyckel saknas' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { summary } = await request.json();

    if (!summary || typeof summary !== 'string') {
      return new Response(JSON.stringify({ error: 'Sammanfattning krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const start = Date.now();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: SUMMARY_SYSTEM_PROMPT }, { text: `\n\n${summary}` }] }
          ],
          generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return new Response(JSON.stringify({ error: `API-fel: ${response.status}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const duration = Date.now() - start;
    const structuredSummary = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!structuredSummary) {
      return new Response(JSON.stringify({ error: 'Kunde inte strukturera sammanfattningen' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result: SummaryResponse = { structuredSummary, duration };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Structure summary error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Ett fel uppstod' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
