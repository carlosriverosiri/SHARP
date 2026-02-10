export type ProviderId = 'openai' | 'anthropic' | 'google' | 'grok';

export type CostInfo = {
  totalCostUSD?: number;
  inputTokens?: number;
  outputTokens?: number;
};

export type ModelResponse = {
  provider: ProviderId | string;
  model?: string;
  response?: string;
  duration?: number;
  cost?: CostInfo;
  error?: string;
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
