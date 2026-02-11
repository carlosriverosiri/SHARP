/**
 * Model pricing and cost calculation.
 * Shared between all API endpoints — single source of truth.
 * Prices are per 1M tokens (USD), updated January 2026.
 */

import type { TokenUsage, ServerCostInfo } from './types';

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-5.2': { input: 1.75, output: 14.00 },
  'gpt-5.2-pro': { input: 21.00, output: 168.00 },
  'o1': { input: 15.00, output: 60.00 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  // Anthropic
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-opus-4-5-20250514': { input: 15.00, output: 75.00 },
  'claude-opus-4-20250514': { input: 15.00, output: 75.00 },
  // Google
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  // xAI
  'grok-4': { input: 3.00, output: 15.00 },
  'grok-2-latest': { input: 2.00, output: 10.00 },
};

export function calculateCost(model: string, tokens: TokenUsage): ServerCostInfo {
  const pricing = MODEL_PRICING[model] || { input: 0, output: 0 };
  const inputCost = (tokens.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (tokens.outputTokens / 1_000_000) * pricing.output;
  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency: 'USD',
  };
}
