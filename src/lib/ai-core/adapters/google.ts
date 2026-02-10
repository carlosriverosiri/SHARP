import type { ProviderAdapter } from '../types';

export function createGoogleAdapter(): ProviderAdapter {
  return {
    id: 'google',
    async run() {
      throw new Error('Google adapter not implemented yet.');
    }
  };
}
