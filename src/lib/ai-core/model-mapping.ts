import type { ProviderId } from './types';

export function mapProviderToKey(provider: string): ProviderId | string {
  const map: Record<string, ProviderId> = {
    OpenAI: 'openai',
    Anthropic: 'anthropic',
    Google: 'google',
    Gemini: 'google',
    'xAI': 'grok',
    'Grok 4': 'grok',
    'Grok 2': 'grok',
    Grok: 'grok'
  };
  return map[provider] || provider;
}

export function getProviderDisplayName(provider: string) {
  const map: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Claude',
    gemini: 'Gemini',
    google: 'Google',
    grok: 'Grok'
  };
  return map[provider] || provider;
}

export function getModelDisplayName(model: string) {
  const map: Record<string, string> = {
    'gpt-5.2': 'OpenAI GPT-5.2',
    'gpt-5.2-pro': 'GPT-5.2 Pro',
    'o1': 'OpenAI o1',
    'gpt-4o': 'GPT-4o',
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'claude-opus-4-5-20250514': 'Claude Opus 4.5',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'grok-4': 'Grok 4',
    'grok-2-latest': 'Grok 2'
  };
  return map[model] || model;
}

export function getSelectedModelLabels(selectedModels: string[]) {
  const map: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Claude',
    gemini: 'Gemini',
    grok: 'Grok'
  };

  return selectedModels.map((model) => map[model] || model);
}

export function mapAccordionProviderToSelectionKey(provider: string) {
  const map: Record<string, string> = {
    openai: 'openai',
    anthropic: 'anthropic',
    google: 'gemini',
    grok: 'grok'
  };
  return map[provider] || provider;
}
