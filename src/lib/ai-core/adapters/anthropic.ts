import type { ProviderAdapter } from '../types';

export function createAnthropicAdapter(): ProviderAdapter {
  return {
    id: 'anthropic',
    async run() {
      throw new Error('Anthropic adapter not implemented yet.');
    }
  };
}
