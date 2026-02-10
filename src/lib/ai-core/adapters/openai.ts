import type { ProviderAdapter } from '../types';

export function createOpenAiAdapter(): ProviderAdapter {
  return {
    id: 'openai',
    async run() {
      throw new Error('OpenAI adapter not implemented yet.');
    }
  };
}
