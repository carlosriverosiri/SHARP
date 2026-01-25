/**
 * API: AI Council - Multi-model query with synthesis
 * POST /api/ai-council/query
 * 
 * Queries OpenAI o1, Anthropic Claude, and Google Gemini in parallel,
 * then synthesizes results using the selected model.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad } from '../../../lib/auth';

// API Keys from environment
const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = import.meta.env.ANTHROPIC_API_KEY;
const GOOGLE_AI_API_KEY = import.meta.env.GOOGLE_AI_API_KEY;
const XAI_API_KEY = import.meta.env.XAI_API_KEY;

interface AIResponse {
  model: string;
  provider: string;
  response: string;
  error?: string;
  duration: number;
}

type ModelProvider = 'openai' | 'anthropic' | 'gemini' | 'grok';

interface QueryRequest {
  context: string;
  prompt: string;
  synthesisModel?: 'claude' | 'openai' | 'gemini' | 'grok';
  fileContent?: string; // Extracted text from uploaded files
  selectedModels?: ModelProvider[]; // Which models to query
  enableDeliberation?: boolean; // Enable round 2 where models review each other
}

// OpenAI o1 query
async function queryOpenAI(context: string, prompt: string): Promise<AIResponse> {
  const start = Date.now();
  try {
    const fullPrompt = context 
      ? `Kontext:\n${context}\n\n---\n\nFråga/Uppgift:\n${prompt}`
      : prompt;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'o1',
        messages: [
          { role: 'user', content: fullPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      model: 'o1',
      provider: 'OpenAI',
      response: data.choices[0]?.message?.content || 'Inget svar',
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      model: 'o1',
      provider: 'OpenAI',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

// Anthropic Claude query
async function queryAnthropic(context: string, prompt: string): Promise<AIResponse> {
  const start = Date.now();
  try {
    const fullPrompt = context 
      ? `<context>\n${context}\n</context>\n\n${prompt}`
      : prompt;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          { role: 'user', content: fullPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || 'Inget svar';
    return {
      model: 'claude-sonnet-4-20250514',
      provider: 'Anthropic',
      response: content,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      model: 'claude-sonnet-4-20250514',
      provider: 'Anthropic',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

// Google Gemini query
async function queryGemini(context: string, prompt: string): Promise<AIResponse> {
  const start = Date.now();
  try {
    const fullPrompt = context 
      ? `Kontext:\n${context}\n\n---\n\nFråga/Uppgift:\n${prompt}`
      : prompt;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: fullPrompt }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Inget svar';
    return {
      model: 'gemini-1.5-pro',
      provider: 'Google',
      response: content,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      model: 'gemini-1.5-pro',
      provider: 'Google',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

// xAI Grok query
async function queryGrok(context: string, prompt: string): Promise<AIResponse> {
  const start = Date.now();
  try {
    const fullPrompt = context 
      ? `Kontext:\n${context}\n\n---\n\nFråga/Uppgift:\n${prompt}`
      : prompt;

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          { role: 'user', content: fullPrompt }
        ],
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      model: 'grok-2-latest',
      provider: 'xAI',
      response: data.choices[0]?.message?.content || 'Inget svar',
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      model: 'grok-2-latest',
      provider: 'xAI',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

// Build deliberation prompt (Round 2) - for models to review each other
function buildDeliberationPrompt(originalPrompt: string, responses: AIResponse[], currentProvider: string): string {
  const otherResponses = responses.filter(r => r.provider !== currentProvider && !r.error && r.response);
  
  return `Du har tidigare svarat på en fråga. Nu har du möjlighet att granska andra AI-modellers svar och förbättra eller komplettera ditt eget svar.

## Originalfråga:
${originalPrompt}

## Andra modellers svar:

${otherResponses.map(r => `### ${r.provider} (${r.model}):
${r.response}
`).join('\n---\n\n')}

## Din uppgift (Runda 2):

1. **Granska kritiskt**: Finns det fel, hallucinationer eller missförstånd i andra modellers svar?
2. **Komplettera**: Vad missade de som du kan tillföra?
3. **Förbättra**: Baserat på vad du lärt dig av de andra svaren, ge ett förbättrat och mer komplett svar.
4. **Källkritik**: Om det gäller vetenskaplig information, påpeka eventuella felaktiga påståenden.

Skriv ditt förbättrade svar på svenska. Var konkret och påpeka specifikt vad du korrigerar eller tillför.`;
}

// Build synthesis prompt
function buildSynthesisPrompt(originalPrompt: string, responses: AIResponse[]): string {
  const validResponses = responses.filter(r => !r.error && r.response);
  
  return `Du är en senior teknisk expert och arkitekt. Din uppgift är att agera som "The Judge" och syntetisera följande AI-svar till en slutgiltig, bäst-i-klassen rekommendation.

## Originalfråga:
${originalPrompt}

## Svar från olika AI-modeller:

${validResponses.map(r => `### ${r.provider} (${r.model}):
${r.response}
`).join('\n---\n\n')}

## Din uppgift:

1. **Identifiera konsensus**: Vad är alla modeller överens om?
2. **Analysera skillnader**: Var skiljer sig åsikterna? Varför?
3. **Väg för- och nackdelar**: Vilka förslag är starkast och varför?
4. **Slutgiltig rekommendation**: Ge en konkret, actionbar rekommendation eller kodlösning som tar det bästa från varje förslag.

Skriv din syntes på svenska. Var konkret och praktisk.`;
}

// Build super synthesis prompt (after deliberation)
function buildSuperSynthesisPrompt(
  originalPrompt: string, 
  round1Responses: AIResponse[], 
  round2Responses: AIResponse[]
): string {
  const validRound1 = round1Responses.filter(r => !r.error && r.response);
  const validRound2 = round2Responses.filter(r => !r.error && r.response);
  
  return `Du är en senior teknisk expert och arkitekt. Din uppgift är att skapa en SUPERSYNTES baserad på en tvåstegsprocess där AI-modeller först svarat individuellt, sedan granskat varandras svar.

## Originalfråga:
${originalPrompt}

## RUNDA 1 - Initiala svar:

${validRound1.map(r => `### ${r.provider} (${r.model}):
${r.response}
`).join('\n---\n\n')}

## RUNDA 2 - Granskning och förbättring:

${validRound2.map(r => `### ${r.provider} (${r.model}) - Förbättrat svar:
${r.response}
`).join('\n---\n\n')}

## Din uppgift (Supersyntes):

1. **Identifiera korrigeringar**: Vilka fel upptäcktes i Runda 2? Vad korrigerades?
2. **Analysera konsensus**: Vad är modellerna nu överens om efter granskning?
3. **Väg bevis**: Vilka påståenden fick starkast stöd efter peer review?
4. **Slutgiltig rekommendation**: Ge en definitiv, välgrundad rekommendation baserad på hela deliberationsprocessen.

Skriv din supersyntes på svenska. Var extra noggrann med att lyfta fram vad som korrigerades mellan rundorna.`;
}

// Deliberation round queries (Round 2)
async function deliberateOpenAI(originalPrompt: string, allResponses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const deliberationPrompt = buildDeliberationPrompt(originalPrompt, allResponses, 'OpenAI');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'o1',
        messages: [{ role: 'user', content: deliberationPrompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      model: 'o1',
      provider: 'OpenAI',
      response: data.choices[0]?.message?.content || 'Inget svar',
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return { model: 'o1', provider: 'OpenAI', response: '', error: error.message, duration: Date.now() - start };
  }
}

async function deliberateAnthropic(originalPrompt: string, allResponses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const deliberationPrompt = buildDeliberationPrompt(originalPrompt, allResponses, 'Anthropic');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{ role: 'user', content: deliberationPrompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      model: 'claude-sonnet-4-20250514',
      provider: 'Anthropic',
      response: data.content?.[0]?.text || 'Inget svar',
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return { model: 'claude-sonnet-4-20250514', provider: 'Anthropic', response: '', error: error.message, duration: Date.now() - start };
  }
}

async function deliberateGemini(originalPrompt: string, allResponses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const deliberationPrompt = buildDeliberationPrompt(originalPrompt, allResponses, 'Google');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: deliberationPrompt }] }],
          generationConfig: { maxOutputTokens: 8192 },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      model: 'gemini-1.5-pro',
      provider: 'Google',
      response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Inget svar',
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return { model: 'gemini-1.5-pro', provider: 'Google', response: '', error: error.message, duration: Date.now() - start };
  }
}

async function deliberateGrok(originalPrompt: string, allResponses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const deliberationPrompt = buildDeliberationPrompt(originalPrompt, allResponses, 'xAI');

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [{ role: 'user', content: deliberationPrompt }],
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      model: 'grok-2-latest',
      provider: 'xAI',
      response: data.choices[0]?.message?.content || 'Inget svar',
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return { model: 'grok-2-latest', provider: 'xAI', response: '', error: error.message, duration: Date.now() - start };
  }
}

// Synthesis using Claude
async function synthesizeWithClaude(
  originalPrompt: string,
  responses: AIResponse[]
): Promise<AIResponse> {
  const start = Date.now();
  
  const validResponses = responses.filter(r => !r.error && r.response);
  
  if (validResponses.length === 0) {
    return {
      model: 'claude-sonnet-4-20250514',
      provider: 'Claude (Syntes)',
      response: 'Kunde inte syntetisera - inga giltiga svar att analysera.',
      duration: Date.now() - start,
    };
  }

  const synthesisPrompt = buildSynthesisPrompt(originalPrompt, responses);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          { role: 'user', content: synthesisPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || 'Syntes misslyckades';
    
    return {
      model: 'claude-sonnet-4-20250514',
      provider: 'Claude (Syntes)',
      response: content,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      model: 'claude-sonnet-4-20250514',
      provider: 'Claude (Syntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

// Synthesis using OpenAI o1
async function synthesizeWithOpenAI(
  originalPrompt: string,
  responses: AIResponse[]
): Promise<AIResponse> {
  const start = Date.now();
  
  const validResponses = responses.filter(r => !r.error && r.response);
  
  if (validResponses.length === 0) {
    return {
      model: 'o1',
      provider: 'OpenAI (Syntes)',
      response: 'Kunde inte syntetisera - inga giltiga svar att analysera.',
      duration: Date.now() - start,
    };
  }

  const synthesisPrompt = buildSynthesisPrompt(originalPrompt, responses);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'o1',
        messages: [
          { role: 'user', content: synthesisPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || 'Syntes misslyckades';
    
    return {
      model: 'o1',
      provider: 'OpenAI (Syntes)',
      response: content,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      model: 'o1',
      provider: 'OpenAI (Syntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

// Synthesis using Gemini
async function synthesizeWithGemini(
  originalPrompt: string,
  responses: AIResponse[]
): Promise<AIResponse> {
  const start = Date.now();
  
  const validResponses = responses.filter(r => !r.error && r.response);
  
  if (validResponses.length === 0) {
    return {
      model: 'gemini-1.5-pro',
      provider: 'Gemini (Syntes)',
      response: 'Kunde inte syntetisera - inga giltiga svar att analysera.',
      duration: Date.now() - start,
    };
  }

  const synthesisPrompt = buildSynthesisPrompt(originalPrompt, responses);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: synthesisPrompt }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Syntes misslyckades';
    
    return {
      model: 'gemini-1.5-pro',
      provider: 'Gemini (Syntes)',
      response: content,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      model: 'gemini-1.5-pro',
      provider: 'Gemini (Syntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

// Synthesis using Grok
async function synthesizeWithGrok(
  originalPrompt: string,
  responses: AIResponse[]
): Promise<AIResponse> {
  const start = Date.now();
  
  const validResponses = responses.filter(r => !r.error && r.response);
  
  if (validResponses.length === 0) {
    return {
      model: 'grok-2-latest',
      provider: 'Grok (Syntes)',
      response: 'Kunde inte syntetisera - inga giltiga svar att analysera.',
      duration: Date.now() - start,
    };
  }

  const synthesisPrompt = buildSynthesisPrompt(originalPrompt, responses);

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        messages: [
          { role: 'user', content: synthesisPrompt }
        ],
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || 'Syntes misslyckades';
    
    return {
      model: 'grok-2-latest',
      provider: 'Grok (Syntes)',
      response: content,
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return {
      model: 'grok-2-latest',
      provider: 'Grok (Syntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

// Main synthesis function that delegates to the selected model
async function synthesize(
  originalPrompt: string,
  responses: AIResponse[],
  synthesisModel: 'claude' | 'openai' | 'gemini' | 'grok' = 'claude'
): Promise<AIResponse> {
  switch (synthesisModel) {
    case 'openai':
      return synthesizeWithOpenAI(originalPrompt, responses);
    case 'gemini':
      return synthesizeWithGemini(originalPrompt, responses);
    case 'grok':
      return synthesizeWithGrok(originalPrompt, responses);
    case 'claude':
    default:
      return synthesizeWithClaude(originalPrompt, responses);
  }
}

// Super synthesis after deliberation
async function superSynthesize(
  originalPrompt: string,
  round1Responses: AIResponse[],
  round2Responses: AIResponse[],
  synthesisModel: 'claude' | 'openai' | 'gemini' | 'grok' = 'claude'
): Promise<AIResponse> {
  const start = Date.now();
  const superPrompt = buildSuperSynthesisPrompt(originalPrompt, round1Responses, round2Responses);
  
  const validResponses = [...round1Responses, ...round2Responses].filter(r => !r.error && r.response);
  if (validResponses.length === 0) {
    return {
      model: 'unknown',
      provider: 'Supersyntes',
      response: 'Kunde inte syntetisera - inga giltiga svar att analysera.',
      duration: Date.now() - start,
    };
  }

  // Use the appropriate model for super synthesis
  switch (synthesisModel) {
    case 'openai':
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({ model: 'o1', messages: [{ role: 'user', content: superPrompt }] }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { model: 'o1', provider: 'OpenAI (Supersyntes)', response: data.choices[0]?.message?.content || '', duration: Date.now() - start };
      } catch (e: any) {
        return { model: 'o1', provider: 'OpenAI (Supersyntes)', response: '', error: e.message, duration: Date.now() - start };
      }
    
    case 'gemini':
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: superPrompt }] }], generationConfig: { maxOutputTokens: 8192 } }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { model: 'gemini-1.5-pro', provider: 'Gemini (Supersyntes)', response: data.candidates?.[0]?.content?.parts?.[0]?.text || '', duration: Date.now() - start };
      } catch (e: any) {
        return { model: 'gemini-1.5-pro', provider: 'Gemini (Supersyntes)', response: '', error: e.message, duration: Date.now() - start };
      }
    
    case 'grok':
      try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${XAI_API_KEY}` },
          body: JSON.stringify({ model: 'grok-2-latest', messages: [{ role: 'user', content: superPrompt }], max_tokens: 8192 }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { model: 'grok-2-latest', provider: 'Grok (Supersyntes)', response: data.choices[0]?.message?.content || '', duration: Date.now() - start };
      } catch (e: any) {
        return { model: 'grok-2-latest', provider: 'Grok (Supersyntes)', response: '', error: e.message, duration: Date.now() - start };
      }
    
    case 'claude':
    default:
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 8192, messages: [{ role: 'user', content: superPrompt }] }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { model: 'claude-sonnet-4-20250514', provider: 'Claude (Supersyntes)', response: data.content?.[0]?.text || '', duration: Date.now() - start };
      } catch (e: any) {
        return { model: 'claude-sonnet-4-20250514', provider: 'Claude (Supersyntes)', response: '', error: e.message, duration: Date.now() - start };
      }
  }
}

// Check which API keys are available
function getAvailableModels(): { model: ModelProvider; available: boolean }[] {
  return [
    { model: 'openai', available: !!OPENAI_API_KEY },
    { model: 'anthropic', available: !!ANTHROPIC_API_KEY },
    { model: 'gemini', available: !!GOOGLE_AI_API_KEY },
    { model: 'grok', available: !!XAI_API_KEY },
  ];
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Check authentication
  const inloggad = await arInloggad(cookies);
  if (!inloggad) {
    return new Response(JSON.stringify({ error: 'Ej inloggad' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const availableModels = getAvailableModels();
  const availableProviders = availableModels.filter(m => m.available).map(m => m.model);

  // Check that at least one model is available
  if (availableProviders.length === 0) {
    return new Response(JSON.stringify({ 
      error: 'Inga API-nycklar konfigurerade. Kontrollera .env-filen.',
      availableModels,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: QueryRequest = await request.json();
    const { 
      context, 
      prompt, 
      synthesisModel = 'claude', 
      fileContent,
      selectedModels = availableProviders, // Default to all available models
      enableDeliberation = false // Optional second round
    } = body;

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: 'Prompt krävs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Filter selected models to only those that are available
    const modelsToQuery = selectedModels.filter(m => availableProviders.includes(m));

    if (modelsToQuery.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Inga valda modeller har API-nycklar konfigurerade.',
        availableModels,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Deliberation requires at least 2 models
    if (enableDeliberation && modelsToQuery.length < 2) {
      return new Response(JSON.stringify({ 
        error: 'Deliberation kräver minst 2 valda modeller.',
        availableModels,
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Combine context with file content if provided
    const fullContext = [context, fileContent].filter(Boolean).join('\n\n---\n\n');

    // Build query promises for selected models only
    const queryPromises: Promise<AIResponse>[] = [];
    const queryOrder: ModelProvider[] = [];

    if (modelsToQuery.includes('openai')) {
      queryPromises.push(queryOpenAI(fullContext, prompt));
      queryOrder.push('openai');
    }
    if (modelsToQuery.includes('anthropic')) {
      queryPromises.push(queryAnthropic(fullContext, prompt));
      queryOrder.push('anthropic');
    }
    if (modelsToQuery.includes('gemini')) {
      queryPromises.push(queryGemini(fullContext, prompt));
      queryOrder.push('gemini');
    }
    if (modelsToQuery.includes('grok')) {
      queryPromises.push(queryGrok(fullContext, prompt));
      queryOrder.push('grok');
    }

    // ROUND 1: Query selected models in parallel
    const round1Responses = await Promise.all(queryPromises);

    // Check if synthesis model is available, fallback to first available
    let actualSynthesisModel = synthesisModel;
    const synthesisToProvider: Record<string, ModelProvider> = {
      'claude': 'anthropic',
      'openai': 'openai',
      'gemini': 'gemini',
      'grok': 'grok',
    };
    
    if (!availableProviders.includes(synthesisToProvider[synthesisModel])) {
      if (availableProviders.includes('anthropic')) actualSynthesisModel = 'claude';
      else if (availableProviders.includes('openai')) actualSynthesisModel = 'openai';
      else if (availableProviders.includes('gemini')) actualSynthesisModel = 'gemini';
      else if (availableProviders.includes('grok')) actualSynthesisModel = 'grok';
    }

    // ROUND 2: Deliberation (optional)
    let round2Responses: AIResponse[] = [];
    
    if (enableDeliberation) {
      const deliberationPromises: Promise<AIResponse>[] = [];
      
      if (modelsToQuery.includes('openai')) {
        deliberationPromises.push(deliberateOpenAI(prompt, round1Responses));
      }
      if (modelsToQuery.includes('anthropic')) {
        deliberationPromises.push(deliberateAnthropic(prompt, round1Responses));
      }
      if (modelsToQuery.includes('gemini')) {
        deliberationPromises.push(deliberateGemini(prompt, round1Responses));
      }
      if (modelsToQuery.includes('grok')) {
        deliberationPromises.push(deliberateGrok(prompt, round1Responses));
      }
      
      round2Responses = await Promise.all(deliberationPromises);
    }

    // SYNTHESIS: Regular or Super
    const synthesis = enableDeliberation
      ? await superSynthesize(prompt, round1Responses, round2Responses, actualSynthesisModel)
      : await synthesize(prompt, round1Responses, actualSynthesisModel);

    // Calculate total duration
    const round1Duration = round1Responses.reduce((sum, r) => sum + r.duration, 0);
    const round2Duration = round2Responses.reduce((sum, r) => sum + r.duration, 0);
    const totalDuration = round1Duration + round2Duration + synthesis.duration;

    return new Response(JSON.stringify({
      success: true,
      responses: round1Responses,
      round2Responses: enableDeliberation ? round2Responses : undefined,
      deliberationEnabled: enableDeliberation,
      queriedModels: queryOrder,
      synthesis,
      synthesisModel: actualSynthesisModel,
      availableModels,
      totalDuration,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('AI Council error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
