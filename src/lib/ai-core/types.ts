export type ProviderId = 'openai' | 'anthropic' | 'google' | 'grok';

// ---------- Client-side cost (summary from API) ----------

export type CostInfo = {
  totalCostUSD?: number;
  inputTokens?: number;
  outputTokens?: number;
};

// ---------- Server-side cost (detailed per-response) ----------

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type ServerCostInfo = {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency?: 'USD';
};

// ---------- Shared response type ----------

export type ModelResponse = {
  provider: ProviderId | string;
  model?: string;
  response?: string;
  duration?: number;
  cost?: CostInfo;
  error?: string;
};

/** Full AI response as returned by server endpoints. */
export type AIResponse = {
  model: string;
  provider: string;
  response: string;
  error?: string;
  duration: number;
  tokens?: TokenUsage;
  cost?: ServerCostInfo;
};

// ---------- API request types ----------

export type ModelProvider = 'openai' | 'anthropic' | 'gemini' | 'grok';

export type SynthesisModel = 'claude' | 'claude-opus' | 'openai' | 'openai-pro' | 'gpt4o' | 'gemini' | 'grok';

export type ImageData = {
  name: string;
  base64: string;
  mimeType: string;
};

export type QueryRequest = {
  context: string;
  prompt: string;
  synthesisModel?: SynthesisModel;
  fileContent?: string;
  selectedModels?: ModelProvider[];
  enableDeliberation?: boolean;
  profileType?: 'fast' | 'coding' | 'science' | 'patient' | 'strategy';
  images?: ImageData[];
  skipSynthesis?: boolean;
};

// ---------- Hallucination detection ----------

export type Hallucination = {
  id: string;
  claim: string;
  source: string;
  flaggedBy: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
};

export type HallucinationReport = {
  total: number;
  high: number;
  medium: number;
  low: number;
  items: Hallucination[];
};

export type CoreOptions = {
  prompt: string;
  context: string;
  models: ProviderId[];
  synthesisModel?: ProviderId | string;
  deliberation?: boolean;
  files?: Array<{ name: string; content: string }>;
};

export type CoreResult = {
  round1: Record<string, ModelResponse>;
  round2?: Record<string, ModelResponse>;
  synthesis?: ModelResponse;
  totals: {
    durationMs: number;
    costUsd: number;
    tokensIn: number;
    tokensOut: number;
  };
};

export type ProviderAdapter = {
  id: ProviderId;
  run: (options: {
    prompt: string;
    context: string;
    files?: Array<{ name: string; content: string }>;
  }) => Promise<ModelResponse>;
};
