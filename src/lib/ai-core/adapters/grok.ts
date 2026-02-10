import type { ProviderAdapter } from '../types';

export function createGrokAdapter(): ProviderAdapter {
  return {
    id: 'grok',
    async run() {
      throw new Error('Grok adapter not implemented yet.');
    }
  };
}
