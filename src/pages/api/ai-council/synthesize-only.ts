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
  const modelCount = validResponses.length;
  
  return `Du är en expertsyntetiserare. Analysera följande AI-modellers svar på samma fråga och skapa EN sammanhängande, förbättrad syntes.

## Originalfråga:
${originalPrompt}

## AI-modellernas svar (${modelCount} modeller):

${validResponses.map(r => `### ${r.provider}:
${r.response}
`).join('\n---\n\n')}

## Din uppgift:

**BÖRJA ALLTID med en Konsensusanalys:**

\`\`\`
📊 KONSENSUSANALYS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Överensstämmelse: [HÖG/MEDEL/LÅG] - [kort förklaring]

✅ Alla modeller överens om:
• [punkt 1]
• [punkt 2]

⚠️ Konflikter/skillnader:
• [vad de är oeniga om och vilka modeller]

💡 Unika insikter (endast en modell):
• [modell]: [insikt] ← Verifiera denna!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

**Sedan skapa en SYNTES som:**
1. Kombinerar de bästa insikterna från alla svar
2. Tydligt markerar om något ENDAST kommer från en modell (potentiell hallucination)
3. Eliminerar redundans och motsägelser
4. Är välstrukturerad och lätt att läsa
5. Använder markdown för formatering
6. Är på svenska

## Avsluta ALLTID med en "Cursor Implementation Guide":

\`\`\`markdown
## Cursor Implementation Guide

### Filer att skapa/ändra
- [ ] fil1.ts - Beskrivning av ändring
- [ ] fil2.ts - Beskrivning av ändring

### Steg-för-steg
1. Första steget...
2. Andra steget...

### Kodexempel (om relevant)
[Inkludera konkreta kodexempel som kan kopieras direkt]
\`\`\`

VIKTIGT: Skriv ENDAST konsensusanalysen, syntesen och Implementation Guide, ingen meta-kommentar om processen.`;
}

// Build super-synthesis prompt (after deliberation)
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

**STEG 1: Extrahera konfliktdata från Runda 2**

Runda 2-svaren innehåller strukturerade block med:
- \`\`\`konflikt\`\`\` - identifierade konflikter (MOTSÄGELSE, UNIK_INSIKT, UTAN_KÄLLA, MÖJLIG_HALLUCINATION)
- \`\`\`lösning\`\`\` - föreslagna lösningar med säkerhetsgrad

**Samla alla unika konflikter och lösningar från alla modellers Runda 2-svar.**

**STEG 2: Skapa Konsensusanalys**

\`\`\`
📊 KONSENSUSANALYS (efter riktad faktagranskning)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Överensstämmelse: [HÖG/MEDEL/LÅG] - [kort förklaring]

🔍 Identifierade konflikter i Runda 2:
• MOTSÄGELSER: [antal] st
• UNIKA INSIKTER (hallucinationsrisk): [antal] st  
• PÅSTÅENDEN UTAN KÄLLA: [antal] st

🔄 Lösta konflikter:
• [konflikt] → [lösning] (säkerhet: HÖG/MEDEL/LÅG)

⚠️ OLÖSTA konflikter (kräver manuell verifiering):
• [konflikt som modellerna inte kunde lösa]

✅ Slutgiltig konsensus (alla modeller överens efter granskning):
• [punkt 1]
• [punkt 2]

❌ Förkastade påståenden (hallucinationer/fel som korrigerats):
• [modell]: "[påstående]" - FELAKTIGT pga [anledning]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`\`\`

**STEG 3: Skapa supersyntesen**
1. **Basera på konsensus**: Inkludera ENDAST påståenden som fått stöd efter granskning
2. **Markera osäkerheter**: Använd ⚠️ för saker som inte kunde verifieras
3. **Exkludera hallucinationer**: Utelämna förkastade påståenden helt
4. **Slutgiltig rekommendation**: Ge en definitiv, välgrundad rekommendation

## Avsluta ALLTID med en "Cursor Implementation Guide":

\`\`\`markdown
## Cursor Implementation Guide

### Filer att skapa/ändra
- [ ] fil1.ts - Beskrivning av ändring
- [ ] fil2.ts - Beskrivning av ändring

### Steg-för-steg
1. Första steget...
2. Andra steget...

### Kodexempel (om relevant)
[Inkludera konkreta kodexempel som kan kopieras direkt]
\`\`\`

Skriv din supersyntes på svenska. Var extra noggrann med att lyfta fram vad som korrigerades mellan rundorna. Implementation Guide ska vara praktisk och direkt användbar i Cursor.`;
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

// Super-synthesis function (uses the same model but with super-synthesis prompt)
async function superSynthesize(
  prompt: string,
  round1Responses: AIResponse[],
  round2Responses: AIResponse[],
  synthesisModel: SynthesisModel = 'claude'
): Promise<AIResponse> {
  // Use the appropriate model for super synthesis
  // Note: We're passing the super prompt directly since it already includes all context
  switch (synthesisModel) {
    case 'gpt4o':
      return synthesizeWithGPT4oSuper(prompt, round1Responses, round2Responses);
    case 'gemini':
      return synthesizeWithGeminiSuper(prompt, round1Responses, round2Responses);
    case 'grok':
      return synthesizeWithGrokSuper(prompt, round1Responses, round2Responses);
    case 'claude-opus':
      return synthesizeWithClaudeOpusSuper(prompt, round1Responses, round2Responses);
    case 'openai':
      return synthesizeWithGPT4oSuper(prompt, round1Responses, round2Responses);
    case 'claude':
    default:
      return synthesizeWithClaudeSuper(prompt, round1Responses, round2Responses);
  }
}

// Super synthesis variants that use the super-synthesis prompt
async function synthesizeWithClaudeSuper(prompt: string, r1: AIResponse[], r2: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const superPrompt = buildSuperSynthesisPrompt(prompt, r1, r2);
    
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
        messages: [{ role: 'user', content: superPrompt }],
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
      provider: 'Claude Sonnet (Supersyntes)',
      response: data.content?.[0]?.text || 'Supersyntes misslyckades',
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('claude-sonnet-4-20250514', tokens),
    };
  } catch (error: any) {
    return {
      model: 'claude-sonnet-4-20250514',
      provider: 'Claude Sonnet (Supersyntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

async function synthesizeWithClaudeOpusSuper(prompt: string, r1: AIResponse[], r2: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const superPrompt = buildSuperSynthesisPrompt(prompt, r1, r2);
    
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
        messages: [{ role: 'user', content: superPrompt }],
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
      provider: 'Claude Opus 4.5 (Supersyntes)',
      response: data.content?.[0]?.text || 'Supersyntes misslyckades',
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('claude-opus-4-20250514', tokens),
    };
  } catch (error: any) {
    return {
      model: 'claude-opus-4-20250514',
      provider: 'Claude Opus 4.5 (Supersyntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

async function synthesizeWithGPT4oSuper(prompt: string, r1: AIResponse[], r2: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const superPrompt = buildSuperSynthesisPrompt(prompt, r1, r2);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: superPrompt }],
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
      provider: 'GPT-4o (Supersyntes)',
      response: data.choices[0]?.message?.content || 'Supersyntes misslyckades',
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('gpt-4o', tokens),
    };
  } catch (error: any) {
    return {
      model: 'gpt-4o',
      provider: 'GPT-4o (Supersyntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

async function synthesizeWithGeminiSuper(prompt: string, r1: AIResponse[], r2: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const superPrompt = buildSuperSynthesisPrompt(prompt, r1, r2);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: superPrompt }] }],
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
      provider: 'Gemini (Supersyntes)',
      response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Supersyntes misslyckades',
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('gemini-2.0-flash', tokens),
    };
  } catch (error: any) {
    return {
      model: 'gemini-2.0-flash',
      provider: 'Gemini (Supersyntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

async function synthesizeWithGrokSuper(prompt: string, r1: AIResponse[], r2: AIResponse[]): Promise<AIResponse> {
  const start = Date.now();
  try {
    const superPrompt = buildSuperSynthesisPrompt(prompt, r1, r2);
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-4',
        messages: [{ role: 'user', content: superPrompt }],
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
      provider: 'Grok (Supersyntes)',
      response: data.choices[0]?.message?.content || 'Supersyntes misslyckades',
      duration: Date.now() - start,
      tokens,
      cost: calculateCost('grok-4', tokens),
    };
  } catch (error: any) {
    return {
      model: 'grok-4',
      provider: 'Grok (Supersyntes)',
      response: '',
      error: error.message,
      duration: Date.now() - start,
    };
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { prompt, responses, round2Responses, synthesisModel = 'claude', isSuperSynthesis = false } = body;

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

    let synthesis: AIResponse;
    
    // Use super-synthesis if R2 responses are provided
    if (isSuperSynthesis && round2Responses && round2Responses.length > 0) {
      synthesis = await superSynthesize(prompt, responses, round2Responses, synthesisModel);
    } else {
      synthesis = await synthesize(prompt, responses, synthesisModel);
    }

    return new Response(JSON.stringify({
      success: true,
      synthesis,
      responsesCount: responses.length,
      isSuperSynthesis: isSuperSynthesis && round2Responses && round2Responses.length > 0,
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
