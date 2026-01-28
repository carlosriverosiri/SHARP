/**
 * Deliberate-only endpoint for AI Council
 * Runs Round 2 (deliberation) on pre-collected Round 1 responses
 * Models review each other's answers and provide improved responses
 */

import type { APIRoute } from 'astro';

export const prerender = false;

// Environment variables
const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = import.meta.env.ANTHROPIC_API_KEY;
const GOOGLE_AI_API_KEY = import.meta.env.GOOGLE_AI_API_KEY;
const XAI_API_KEY = import.meta.env.XAI_API_KEY;

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

interface CostInfo {
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

interface AIResponse {
  model: string;
  provider: string;
  response: string;
  error?: string;
  duration: number;
  tokens?: TokenUsage;
  cost?: CostInfo;
}

// Cost calculation
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'o1': { input: 15, output: 60 },
  'gpt-4o': { input: 2.5, output: 10 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'grok-4': { input: 3, output: 15 },
  'grok-2-latest': { input: 2, output: 10 },
};

function calculateCost(model: string, tokens: TokenUsage): CostInfo {
  const pricing = MODEL_PRICING[model] || { input: 0, output: 0 };
  const inputCost = (tokens.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (tokens.outputTokens / 1_000_000) * pricing.output;
  return { inputCost, outputCost, totalCost: inputCost + outputCost };
}

// Build deliberation prompt - models review each other
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

### STEG 1: Hallucinationskontroll
Granska de andra modellernas svar och leta efter potentiella fel, hallucinationer eller obekräftade påståenden.

**Om du hittar misstänkta fel, lista dem i detta exakta format:**
\`\`\`hallucination
KÄLLA: [Vilken modell som skrev det]
PÅSTÅENDE: [Det exakta påståendet som kan vara fel]
ANLEDNING: [Varför du misstänker att det är fel]
\`\`\`

Upprepa blocket för varje misstänkt fel du hittar. Om inga fel hittas, skriv:
\`\`\`hallucination
INGA_FEL_FUNNA
\`\`\`

### STEG 2: Förbättrat svar
Efter hallucinationskontrollen, ge ditt förbättrade svar:

1. **Korrigeringar**: Om du flaggade fel ovan, förklara rätt information
2. **Kompletteringar**: Vad missade de andra som du kan tillföra?
3. **Förbättrat svar**: Baserat på all input, ge ett komplett och korrekt svar

Skriv ditt förbättrade svar på svenska. Var konkret och specifik.`;
}

// Deliberation functions for each provider
async function deliberateOpenAI(originalPrompt: string, allResponses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  if (!OPENAI_API_KEY) {
    return { model: 'o1', provider: 'OpenAI', response: '', error: 'API-nyckel saknas', duration: 0 };
  }
  
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
    const tokens: TokenUsage = {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    };
    
    return {
      model: 'o1',
      provider: 'OpenAI',
      response: data.choices[0]?.message?.content || 'Inget svar',
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('o1', tokens),
    };
  } catch (error: any) {
    return { model: 'o1', provider: 'OpenAI', response: '', error: error.message, duration: Date.now() - start };
  }
}

async function deliberateAnthropic(originalPrompt: string, allResponses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  if (!ANTHROPIC_API_KEY) {
    return { model: 'claude-sonnet-4-20250514', provider: 'Anthropic', response: '', error: 'API-nyckel saknas', duration: 0 };
  }
  
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
    const tokens: TokenUsage = {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    };
    
    return {
      model: 'claude-sonnet-4-20250514',
      provider: 'Anthropic',
      response: data.content?.[0]?.text || 'Inget svar',
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('claude-sonnet-4-20250514', tokens),
    };
  } catch (error: any) {
    return { model: 'claude-sonnet-4-20250514', provider: 'Anthropic', response: '', error: error.message, duration: Date.now() - start };
  }
}

async function deliberateGemini(originalPrompt: string, allResponses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  if (!GOOGLE_AI_API_KEY) {
    return { model: 'gemini-2.0-flash', provider: 'Google', response: '', error: 'API-nyckel saknas', duration: 0 };
  }
  
  try {
    const deliberationPrompt = buildDeliberationPrompt(originalPrompt, allResponses, 'Google');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
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
    const tokens: TokenUsage = {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    };
    
    return {
      model: 'gemini-2.0-flash',
      provider: 'Google',
      response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Inget svar',
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('gemini-2.0-flash', tokens),
    };
  } catch (error: any) {
    return { model: 'gemini-2.0-flash', provider: 'Google', response: '', error: error.message, duration: Date.now() - start };
  }
}

async function deliberateGrok(originalPrompt: string, allResponses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  if (!XAI_API_KEY) {
    return { model: 'grok-4', provider: 'Grok 4', response: '', error: 'API-nyckel saknas', duration: 0 };
  }
  
  // Try grok-4 first, fall back to grok-2-latest
  const modelsToTry = ['grok-4', 'grok-2-latest'];
  
  for (const modelName of modelsToTry) {
    try {
      const deliberationPrompt = buildDeliberationPrompt(originalPrompt, allResponses, 'xAI');

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: 'user', content: deliberationPrompt }],
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (modelName !== modelsToTry[modelsToTry.length - 1]) continue;
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const tokens: TokenUsage = {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      };
      
      const displayName = modelName === 'grok-4' ? 'Grok 4' : 'Grok 2';
      return {
        model: modelName,
        provider: displayName,
        response: data.choices[0]?.message?.content || 'Inget svar',
        duration: Date.now() - start,
        tokens,
        cost: calculateCost(modelName, tokens),
      };
    } catch (error: any) {
      if (modelName === modelsToTry[modelsToTry.length - 1]) {
        return { model: modelName, provider: 'Grok', response: '', error: error.message, duration: Date.now() - start };
      }
    }
  }
  
  return { model: 'grok-4', provider: 'Grok', response: '', error: 'Alla Grok-modeller misslyckades', duration: Date.now() - start };
}

// Map provider names to deliberation functions
function getDeliberationFunction(provider: string) {
  const normalized = provider.toLowerCase();
  if (normalized.includes('openai') || normalized === 'openai') return deliberateOpenAI;
  if (normalized.includes('anthropic') || normalized.includes('claude')) return deliberateAnthropic;
  if (normalized.includes('google') || normalized.includes('gemini')) return deliberateGemini;
  if (normalized.includes('grok') || normalized.includes('xai')) return deliberateGrok;
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { prompt, responses } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt saknas' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!responses || responses.length < 2) {
      return new Response(JSON.stringify({ error: 'Deliberation kräver minst 2 svar' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Determine which providers to run deliberation for
    // Map internal model keys to provider functions
    const keyToFunction: Record<string, (p: string, r: AIResponse[]) => Promise<AIResponse>> = {
      'openai': deliberateOpenAI,
      'anthropic': deliberateAnthropic,
      'google': deliberateGemini,
      'gemini': deliberateGemini,
      'grok': deliberateGrok,
    };

    // Run deliberation for each provider that has a response
    const deliberationPromises: Promise<AIResponse>[] = [];
    const seenProviders = new Set<string>();
    
    for (const r of responses) {
      // Normalize provider to key
      let key = '';
      const provider = (r.provider || '').toLowerCase();
      if (provider.includes('openai')) key = 'openai';
      else if (provider.includes('anthropic') || provider.includes('claude')) key = 'anthropic';
      else if (provider.includes('google') || provider.includes('gemini')) key = 'google';
      else if (provider.includes('grok') || provider.includes('xai')) key = 'grok';
      
      if (key && !seenProviders.has(key) && keyToFunction[key]) {
        seenProviders.add(key);
        deliberationPromises.push(keyToFunction[key](prompt, responses));
      }
    }

    if (deliberationPromises.length === 0) {
      return new Response(JSON.stringify({ error: 'Inga giltiga modeller för deliberation' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Run all deliberations in parallel
    const round2Responses = await Promise.all(deliberationPromises);

    // Calculate total cost
    const totalCost = {
      inputTokens: round2Responses.reduce((sum, r) => sum + (r.tokens?.inputTokens || 0), 0),
      outputTokens: round2Responses.reduce((sum, r) => sum + (r.tokens?.outputTokens || 0), 0),
      totalCostUSD: round2Responses.reduce((sum, r) => sum + (r.cost?.totalCost || 0), 0),
    };

    return new Response(JSON.stringify({
      success: true,
      round2Responses,
      totalCost,
      modelsCount: round2Responses.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Deliberate-only error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Okänt fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
