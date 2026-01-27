/**
 * API: AI Council - Multi-model query with synthesis
 * POST /api/ai-council/query
 * 
 * Queries OpenAI o1, Anthropic Claude, and Google Gemini in parallel,
 * then synthesizes results using the selected model.
 */

export const prerender = false;

import type { APIRoute } from 'astro';
import { arInloggad, hamtaAnvandare } from '../../../lib/auth';
import { createClient } from '@supabase/supabase-js';
import { generateSystemPrompt } from './profile';

// Supabase for user profiles
const SUPABASE_URL = import.meta.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.SUPABASE_ANON_KEY;

// API Keys from environment
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
  currency: 'USD';
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

// Pricing per 1M tokens (USD) - Updated January 2026
const PRICING = {
  // OpenAI
  'o1': { input: 15.00, output: 60.00 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  // Anthropic
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-opus-4-5-20250514': { input: 15.00, output: 75.00 },
  // Google
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  // xAI - Grok models
  'grok-4': { input: 3.00, output: 15.00 },
  'grok-2-latest': { input: 2.00, output: 10.00 },
} as const;

function calculateCost(model: string, tokens: TokenUsage): CostInfo {
  const pricing = PRICING[model as keyof typeof PRICING] || { input: 0, output: 0 };
  const inputCost = (tokens.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (tokens.outputTokens / 1_000_000) * pricing.output;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency: 'USD',
  };
}

// Safe JSON parse that handles HTML error responses
async function safeParseResponse(response: Response, provider: string): Promise<{ ok: boolean; data?: any; error?: string }> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  
  // Check if response is HTML (error page)
  if (text.startsWith('<') || contentType.includes('text/html')) {
    return { 
      ok: false, 
      error: `${provider} returnerade HTML istället för JSON (HTTP ${response.status}). Kontrollera API-nyckel och modellnamn.` 
    };
  }
  
  try {
    const data = JSON.parse(text);
    if (!response.ok) {
      return { ok: false, error: data.error?.message || `HTTP ${response.status}` };
    }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: `Kunde inte parsea svar från ${provider}: ${text.substring(0, 100)}...` };
  }
}

type ModelProvider = 'openai' | 'anthropic' | 'gemini' | 'grok';

// Synthesis model options - separate from query models
type SynthesisModel = 'claude' | 'claude-opus' | 'openai' | 'gpt4o' | 'gemini' | 'grok';

interface ImageData {
  name: string;
  base64: string; // data:image/png;base64,...
  mimeType: string;
}

interface QueryRequest {
  context: string;
  prompt: string;
  synthesisModel?: SynthesisModel;
  fileContent?: string; // Extracted text from uploaded files
  selectedModels?: ModelProvider[]; // Which models to query
  enableDeliberation?: boolean; // Enable round 2 where models review each other
  profileType?: 'fast' | 'coding' | 'science' | 'patient' | 'strategy'; // Which preset profile to use
  images?: ImageData[]; // Base64 encoded images for multimodal queries
}

// Hallucination detection
interface Hallucination {
  id: string;
  claim: string;           // The suspected claim
  source: string;          // Which model wrote it
  flaggedBy: string;       // Which model flagged it
  reason: string;          // Why it's suspected
  confidence: 'high' | 'medium' | 'low';
}

interface HallucinationReport {
  total: number;
  high: number;    // 3+ models flagged
  medium: number;  // 2 models flagged
  low: number;     // 1 model flagged
  items: Hallucination[];
}

// Parse hallucinations from deliberation responses
function parseHallucinations(round2Responses: AIResponse[]): HallucinationReport {
  const allFlags: Hallucination[] = [];
  let idCounter = 1;
  
  for (const response of round2Responses) {
    if (response.error || !response.response) continue;
    
    // Extract hallucination blocks using regex
    const hallucinationRegex = /```hallucination\n([\s\S]*?)```/g;
    let match;
    
    while ((match = hallucinationRegex.exec(response.response)) !== null) {
      const block = match[1].trim();
      
      // Skip if no errors found
      if (block.includes('INGA_FEL_FUNNA')) continue;
      
      // Parse individual fields
      const sourceMatch = block.match(/KÄLLA:\s*(.+)/i);
      const claimMatch = block.match(/PÅSTÅENDE:\s*(.+)/i);
      const reasonMatch = block.match(/ANLEDNING:\s*(.+)/i);
      
      if (claimMatch) {
        allFlags.push({
          id: `h-${idCounter++}`,
          claim: claimMatch[1].trim(),
          source: sourceMatch ? sourceMatch[1].trim() : 'Okänd',
          flaggedBy: response.provider,
          reason: reasonMatch ? reasonMatch[1].trim() : 'Ingen anledning angiven',
          confidence: 'low', // Will be updated based on consensus
        });
      }
    }
  }
  
  // Group by claim similarity and calculate confidence
  const claimGroups = new Map<string, Hallucination[]>();
  
  for (const flag of allFlags) {
    // Normalize claim for grouping (simple approach)
    const normalizedClaim = flag.claim.toLowerCase().substring(0, 50);
    const existing = claimGroups.get(normalizedClaim);
    if (existing) {
      existing.push(flag);
    } else {
      claimGroups.set(normalizedClaim, [flag]);
    }
  }
  
  // Build final list with confidence levels
  const finalItems: Hallucination[] = [];
  let high = 0, medium = 0, low = 0;
  
  for (const [, flags] of claimGroups) {
    const uniqueFlaggers = new Set(flags.map(f => f.flaggedBy)).size;
    const confidence: 'high' | 'medium' | 'low' = 
      uniqueFlaggers >= 3 ? 'high' : 
      uniqueFlaggers === 2 ? 'medium' : 'low';
    
    // Take the first flag as representative, update confidence
    const representative = { ...flags[0], confidence };
    finalItems.push(representative);
    
    if (confidence === 'high') high++;
    else if (confidence === 'medium') medium++;
    else low++;
  }
  
  return {
    total: finalItems.length,
    high,
    medium,
    low,
    items: finalItems,
  };
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

    const parsed = await safeParseResponse(response, 'OpenAI');
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    const data = parsed.data;
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

    const parsed = await safeParseResponse(response, 'Anthropic/Claude');
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    const data = parsed.data;
    const content = data.content?.[0]?.text || 'Inget svar';
    const tokens: TokenUsage = {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    };
    return {
      model: 'claude-sonnet-4-20250514',
      provider: 'Anthropic',
      response: content,
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('claude-sonnet-4-20250514', tokens),
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
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

    const parsed = await safeParseResponse(response, 'Google/Gemini');
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    const data = parsed.data;
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Inget svar';
    const tokens: TokenUsage = {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    };
    return {
      model: 'gemini-2.0-flash',
      provider: 'Google',
      response: content,
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('gemini-2.0-flash', tokens),
    };
  } catch (error: any) {
    return {
      model: 'gemini-2.0-flash',
      provider: 'Google',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

// xAI Grok query - tries grok-4 first, falls back to grok-2-latest
async function queryGrok(context: string, prompt: string): Promise<AIResponse> {
  const start = Date.now();
  const fullPrompt = context 
    ? `Kontext:\n${context}\n\n---\n\nFråga/Uppgift:\n${prompt}`
    : prompt;
  
  // Try models in order: grok-4, then grok-2-latest as fallback
  const modelsToTry = ['grok-4', 'grok-2-latest'];
  
  for (const modelName of modelsToTry) {
    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'user', content: fullPrompt }
          ],
          max_tokens: 16384,
        }),
      });

      const parsed = await safeParseResponse(response, `xAI/${modelName}`);
      if (!parsed.ok) {
        // If model not found, try next model
        if (parsed.error?.includes('not found') || parsed.error?.includes('HTML')) {
          console.log(`Grok model ${modelName} not available, trying next...`);
          continue;
        }
        throw new Error(parsed.error);
      }

      const data = parsed.data;
      const tokens: TokenUsage = {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      };
      
      // Use correct pricing based on model
      const costModel = modelName === 'grok-4' ? 'grok-4' : 'grok-2-latest';
      
      return {
        model: modelName,
        provider: 'xAI',
        response: data.choices[0]?.message?.content || 'Inget svar',
        duration: Date.now() - start,
        tokens,
        cost: calculateCost(costModel, tokens),
      };
    } catch (error: any) {
      // If this is the last model, return the error
      if (modelName === modelsToTry[modelsToTry.length - 1]) {
        return {
          model: modelName,
          provider: 'xAI',
          response: '',
          error: error.message,
          duration: Date.now() - start,
        };
      }
      // Otherwise try next model
      console.log(`Grok model ${modelName} failed: ${error.message}, trying next...`);
    }
  }
  
  // Should never reach here, but just in case
  return {
    model: 'grok',
    provider: 'xAI',
    response: '',
    error: 'Inga Grok-modeller tillgängliga',
    duration: Date.now() - start,
  };
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
    return {
      model: 'gemini-2.0-flash',
      provider: 'Google',
      response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Inget svar',
      duration: Date.now() - start,
    };
  } catch (error: any) {
    return { model: 'gemini-2.0-flash', provider: 'Google', response: '', error: error.message, duration: Date.now() - start };
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

    const parsed = await safeParseResponse(response, 'xAI/Grok');
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    const data = parsed.data;
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
    const tokens: TokenUsage = {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    };
    
    return {
      model: 'claude-sonnet-4-20250514',
      provider: 'Claude (Syntes)',
      response: content,
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('claude-sonnet-4-20250514', tokens),
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
    const tokens: TokenUsage = {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    };
    
    return {
      model: 'o1',
      provider: 'OpenAI (Syntes)',
      response: content,
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('o1', tokens),
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
      model: 'gemini-2.0-flash',
      provider: 'Gemini (Syntes)',
      response: 'Kunde inte syntetisera - inga giltiga svar att analysera.',
      duration: Date.now() - start,
    };
  }

  const synthesisPrompt = buildSynthesisPrompt(originalPrompt, responses);

  try {
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
    const tokens: TokenUsage = {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    };
    
    return {
      model: 'gemini-2.0-flash',
      provider: 'Gemini (Syntes)',
      response: content,
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('gemini-2.0-flash', tokens),
    };
  } catch (error: any) {
    return {
      model: 'gemini-2.0-flash',
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

    const parsed = await safeParseResponse(response, 'xAI/Grok');
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    const data = parsed.data;
    const content = data.choices[0]?.message?.content || 'Syntes misslyckades';
    const tokens: TokenUsage = {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    };
    
    return {
      model: 'grok-2-latest',
      provider: 'Grok (Syntes)',
      response: content,
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('grok-2-latest', tokens),
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

// Synthesis using Claude Opus 4 (premium model for complex analysis)
async function synthesizeWithClaudeOpus(
  originalPrompt: string,
  responses: AIResponse[]
): Promise<AIResponse> {
  const start = Date.now();
  
  const validResponses = responses.filter(r => !r.error && r.response);
  
  if (validResponses.length === 0) {
    return {
      model: 'claude-opus-4-5-20250514',
      provider: 'Claude Opus (Syntes)',
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
        model: 'claude-opus-4-5-20250514',
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
    const tokens: TokenUsage = {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0,
    };
    
    return {
      model: 'claude-opus-4-5-20250514',
      provider: 'Claude Opus (Syntes)',
      response: content,
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('claude-opus-4-5-20250514', tokens),
    };
  } catch (error: any) {
    return {
      model: 'claude-opus-4-5-20250514',
      provider: 'Claude Opus (Syntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

// Synthesis using GPT-4o (fast, high-quality synthesis)
async function synthesizeWithGPT4o(
  originalPrompt: string,
  responses: AIResponse[]
): Promise<AIResponse> {
  const start = Date.now();
  
  const validResponses = responses.filter(r => !r.error && r.response);
  
  if (validResponses.length === 0) {
    return {
      model: 'gpt-4o',
      provider: 'GPT-4o (Syntes)',
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
        model: 'gpt-4o',
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
    const tokens: TokenUsage = {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    };
    
    return {
      model: 'gpt-4o',
      provider: 'GPT-4o (Syntes)',
      response: content,
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('gpt-4o', tokens),
    };
  } catch (error: any) {
    return {
      model: 'gpt-4o',
      provider: 'GPT-4o (Syntes)',
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
  synthesisModel: SynthesisModel = 'claude'
): Promise<AIResponse> {
  switch (synthesisModel) {
    case 'openai':
      return synthesizeWithOpenAI(originalPrompt, responses);
    case 'gpt4o':
      return synthesizeWithGPT4o(originalPrompt, responses);
    case 'gemini':
      return synthesizeWithGemini(originalPrompt, responses);
    case 'grok':
      return synthesizeWithGrok(originalPrompt, responses);
    case 'claude-opus':
      return synthesizeWithClaudeOpus(originalPrompt, responses);
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
  synthesisModel: SynthesisModel = 'claude'
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
        return { model: 'o1', provider: 'OpenAI o1 (Supersyntes)', response: data.choices[0]?.message?.content || '', duration: Date.now() - start };
      } catch (e: any) {
        return { model: 'o1', provider: 'OpenAI o1 (Supersyntes)', response: '', error: e.message, duration: Date.now() - start };
      }
    
    case 'gpt4o':
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: superPrompt }], max_tokens: 8192 }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { model: 'gpt-4o', provider: 'GPT-4o (Supersyntes)', response: data.choices[0]?.message?.content || '', duration: Date.now() - start };
      } catch (e: any) {
        return { model: 'gpt-4o', provider: 'GPT-4o (Supersyntes)', response: '', error: e.message, duration: Date.now() - start };
      }
    
    case 'gemini':
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: superPrompt }] }], generationConfig: { maxOutputTokens: 8192 } }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { model: 'gemini-2.0-flash', provider: 'Gemini (Supersyntes)', response: data.candidates?.[0]?.content?.parts?.[0]?.text || '', duration: Date.now() - start };
      } catch (e: any) {
        return { model: 'gemini-2.0-flash', provider: 'Gemini (Supersyntes)', response: '', error: e.message, duration: Date.now() - start };
      }
    
    case 'grok':
      try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${XAI_API_KEY}` },
          body: JSON.stringify({ model: 'grok-2-latest', messages: [{ role: 'user', content: superPrompt }], max_tokens: 8192 }),
        });
        const parsed = await safeParseResponse(response, 'xAI/Grok');
        if (!parsed.ok) throw new Error(parsed.error);
        const data = parsed.data;
        return { model: 'grok-2-latest', provider: 'Grok (Supersyntes)', response: data.choices[0]?.message?.content || '', duration: Date.now() - start };
      } catch (e: any) {
        return { model: 'grok-2-latest', provider: 'Grok (Supersyntes)', response: '', error: e.message, duration: Date.now() - start };
      }
    
    case 'claude-opus':
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-opus-4-5-20250514', max_tokens: 8192, messages: [{ role: 'user', content: superPrompt }] }),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { model: 'claude-opus-4-5-20250514', provider: 'Claude Opus (Supersyntes)', response: data.content?.[0]?.text || '', duration: Date.now() - start };
      } catch (e: any) {
        return { model: 'claude-opus-4-5-20250514', provider: 'Claude Opus (Supersyntes)', response: '', error: e.message, duration: Date.now() - start };
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
        return { model: 'claude-sonnet-4-20250514', provider: 'Claude Sonnet (Supersyntes)', response: data.content?.[0]?.text || '', duration: Date.now() - start };
      } catch (e: any) {
        return { model: 'claude-sonnet-4-20250514', provider: 'Claude Sonnet (Supersyntes)', response: '', error: e.message, duration: Date.now() - start };
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

  // Parse request body first to get profileType
  let body: QueryRequest;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Ogiltig JSON i request' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { 
    context, 
    prompt, 
    synthesisModel = 'claude', 
    fileContent,
    selectedModels = availableProviders, // Default to all available models
    enableDeliberation = false, // Optional second round
    profileType = 'fast', // Which profile preset is being used
    images = [] // Base64 images for multimodal
  } = body;

  // Default scientific prompt for all users using the Science profile
  const DEFAULT_SCIENTIFIC_PROMPT = `När du svarar på vetenskapliga eller medicinska frågor:

REFERENSHANTERING:
- Ge evidensbaserade svar med inline-referenser [1], [2], etc. direkt efter relevanta påståenden
- Prioritera högkvalitativa källor: RCT:er, systematiska reviews, meta-analyser
- Använd etablerade guidelines från AAOS, ESSKA, Cochrane, eller liknande organisationer
- Max 5-10 referenser per svar om inte fler behövs

REFERENSLISTA:
I slutet av svaret, lägg till en sektion kallad "Referenser" med numrerad lista där varje referens inkluderar:
- Författare, år, titel (kortfattad)
- Klickbar länk (DOI, PubMed-länk eller direkt URL)
- Prioritera källor som är enkla att importera till Zotero

ZOTERO BULK IMPORT:
Efter referenslistan, lägg ALLTID till en sektion kallad "Zotero Bulk Import Lista" med:
- Ett kodblock (markdown \`\`\`) som innehåller DOI, PMID eller URL:er (en per rad)
- Prioritera PMID för PubMed (extrahera siffran)
- För DOI: använd full DOI (t.ex. 10.1016/j.jhsa.2021.07.012)
- Instruktion ovanför: "Kopiera listan nedan och klistra in i Zotero → Add Item by Identifier (magic wand-ikonen)."

SVARSSTIL:
- Tydliga, strukturerade och evidensbaserade svar
- Använd punktlistor eller tabeller vid behov
- Gå direkt på nyanser och evidens för medicinska frågor`;

  // Fetch user profile for personalized AI responses
  let userProfileContext = '';
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const accessToken = cookies.get('sb-access-token')?.value;
      if (accessToken) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${accessToken}` } }
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('ai_council_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (profile) {
            // Use scientific_context for science profile, otherwise use general profile
            if (profileType === 'science') {
              // Personal scientific context overrides default, otherwise use default
              userProfileContext = profile.scientific_context || DEFAULT_SCIENTIFIC_PROMPT;
            } else if (profileType !== 'fast') {
              // For fast profile, skip personalization for speed
              userProfileContext = generateSystemPrompt(profile);
            }
          } else if (profileType === 'science') {
            // No profile exists but science mode selected - use default
            userProfileContext = DEFAULT_SCIENTIFIC_PROMPT;
          }
        } else if (profileType === 'science') {
          // Not logged in but science mode - use default
          userProfileContext = DEFAULT_SCIENTIFIC_PROMPT;
        }
      } else if (profileType === 'science') {
        // No access token but science mode - use default
        userProfileContext = DEFAULT_SCIENTIFIC_PROMPT;
      }
    } catch (e) {
      // Profile fetch failed, continue without personalization (but use default for science)
      console.log('Failed to fetch user profile:', e);
      if (profileType === 'science') {
        userProfileContext = DEFAULT_SCIENTIFIC_PROMPT;
      }
    }
  } else if (profileType === 'science') {
    // Supabase not configured but science mode - use default
    userProfileContext = DEFAULT_SCIENTIFIC_PROMPT;
  }

  try {

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

    // Build image context description
    const imageContext = images.length > 0 
      ? `BIFOGADE BILDER (${images.length} st):\n${images.map((img, i) => `[Bild ${i + 1}: ${img.name}]`).join('\n')}\n\nOBS: Dessa bilder har bifogats till frågan. Multimodala AI-modeller (GPT-4o, Gemini, Claude) kan analysera bildinnehållet.`
      : '';

    // Combine user profile context, provided context, file content, and images
    const contextParts = [userProfileContext, context, fileContent, imageContext].filter(Boolean);
    const fullContext = contextParts.join('\n\n---\n\n');

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

    // Calculate total cost
    const allResponses = [...round1Responses, ...round2Responses, synthesis];
    const totalCost = {
      inputTokens: allResponses.reduce((sum, r) => sum + (r.tokens?.inputTokens || 0), 0),
      outputTokens: allResponses.reduce((sum, r) => sum + (r.tokens?.outputTokens || 0), 0),
      totalCostUSD: allResponses.reduce((sum, r) => sum + (r.cost?.totalCost || 0), 0),
    };

    // Parse hallucinations from deliberation responses
    const hallucinationReport = enableDeliberation 
      ? parseHallucinations(round2Responses) 
      : undefined;

    return new Response(JSON.stringify({
      success: true,
      responses: round1Responses,
      round2Responses: enableDeliberation ? round2Responses : undefined,
      deliberationEnabled: enableDeliberation,
      hallucinationReport, // NEW: Hallucination detection results
      queriedModels: queryOrder,
      synthesis,
      synthesisModel: actualSynthesisModel,
      availableModels,
      totalDuration,
      totalCost,
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
