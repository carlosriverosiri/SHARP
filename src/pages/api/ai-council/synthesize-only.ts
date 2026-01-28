/**
 * Synthesize-only endpoint for AI Council
 * Allows synthesizing pre-collected responses without running new queries
 */

import type { APIRoute } from 'astro';

export const prerender = false;

// Environment variables
const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = import.meta.env.ANTHROPIC_API_KEY;
const GOOGLE_AI_API_KEY = import.meta.env.GOOGLE_AI_API_KEY;
const XAI_API_KEY = import.meta.env.XAI_API_KEY;

type SynthesisModel = 'claude' | 'claude-opus' | 'openai' | 'gpt4o' | 'gemini' | 'grok';

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
  'gpt-4o': { input: 2.5, output: 10 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'grok-4': { input: 3, output: 15 },
};

function calculateCost(model: string, tokens: TokenUsage): CostInfo {
  const pricing = MODEL_PRICING[model] || { input: 0, output: 0 };
  const inputCost = (tokens.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (tokens.outputTokens / 1_000_000) * pricing.output;
  return { inputCost, outputCost, totalCost: inputCost + outputCost };
}

// Build synthesis prompt
function buildSynthesisPrompt(originalPrompt: string, responses: AIResponse[]): string {
  const validResponses = responses.filter(r => !r.error && r.response);
  
  return `Du är en expertsyntetiserare. Analysera följande AI-modellers svar på samma fråga och skapa EN sammanhängande, förbättrad syntes.

## Originalfråga:
${originalPrompt}

## AI-modellernas svar:

${validResponses.map(r => `### ${r.provider}:
${r.response}
`).join('\n---\n\n')}

## Din uppgift:

Skapa en SYNTES som:
1. Kombinerar de bästa insikterna från alla svar
2. Eliminerar redundans och motsägelser
3. Är välstrukturerad och lätt att läsa
4. Använder markdown för formatering
5. Är på svenska

VIKTIGT: Skriv ENDAST syntesen, ingen meta-kommentar om processen.`;
}

// Synthesis functions for each model
async function synthesizeWithClaude(prompt: string, responses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const synthesisPrompt = buildSynthesisPrompt(prompt, responses);
    
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
        messages: [{ role: 'user', content: synthesisPrompt }],
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
      provider: 'Claude Sonnet (Syntes)',
      response: data.content?.[0]?.text || 'Syntes misslyckades',
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('claude-sonnet-4-20250514', tokens),
    };
  } catch (error: any) {
    return {
      model: 'claude-sonnet-4-20250514',
      provider: 'Claude Sonnet (Syntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

async function synthesizeWithClaudeOpus(prompt: string, responses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const synthesisPrompt = buildSynthesisPrompt(prompt, responses);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 8192,
        messages: [{ role: 'user', content: synthesisPrompt }],
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
      model: 'claude-opus-4-20250514',
      provider: 'Claude Opus 4.5 (Syntes)',
      response: data.content?.[0]?.text || 'Syntes misslyckades',
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('claude-opus-4-20250514', tokens),
    };
  } catch (error: any) {
    return {
      model: 'claude-opus-4-20250514',
      provider: 'Claude Opus 4.5 (Syntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

async function synthesizeWithGPT4o(prompt: string, responses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const synthesisPrompt = buildSynthesisPrompt(prompt, responses);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: synthesisPrompt }],
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
      model: 'gpt-4o',
      provider: 'GPT-4o (Syntes)',
      response: data.choices[0]?.message?.content || 'Syntes misslyckades',
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

async function synthesizeWithGemini(prompt: string, responses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const synthesisPrompt = buildSynthesisPrompt(prompt, responses);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: synthesisPrompt }] }],
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
      provider: 'Gemini (Syntes)',
      response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Syntes misslyckades',
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

async function synthesizeWithGrok(prompt: string, responses: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const synthesisPrompt = buildSynthesisPrompt(prompt, responses);
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4',
        messages: [{ role: 'user', content: synthesisPrompt }],
        max_tokens: 8192,
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
      model: 'grok-4',
      provider: 'Grok (Syntes)',
      response: data.choices[0]?.message?.content || 'Syntes misslyckades',
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('grok-4', tokens),
    };
  } catch (error: any) {
    return {
      model: 'grok-4',
      provider: 'Grok (Syntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

// Main synthesis function
async function synthesize(
  prompt: string,
  responses: AIResponse[],
  synthesisModel: SynthesisModel = 'claude'
): Promise<AIResponse> {
  switch (synthesisModel) {
    case 'gpt4o':
      return synthesizeWithGPT4o(prompt, responses);
    case 'gemini':
      return synthesizeWithGemini(prompt, responses);
    case 'grok':
      return synthesizeWithGrok(prompt, responses);
    case 'claude-opus':
      return synthesizeWithClaudeOpus(prompt, responses);
    case 'openai':
      return synthesizeWithGPT4o(prompt, responses); // Use GPT-4o for "openai" since o1 is slow
    case 'claude':
    default:
      return synthesizeWithClaude(prompt, responses);
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { prompt, responses, synthesisModel = 'claude' } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt saknas' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!responses || responses.length === 0) {
      return new Response(JSON.stringify({ error: 'Inga svar att syntetisera' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const synthesis = await synthesize(prompt, responses, synthesisModel);

    return new Response(JSON.stringify({
      success: true,
      synthesis,
      responsesCount: responses.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Synthesize-only error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Okänt fel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
