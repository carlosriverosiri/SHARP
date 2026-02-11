import type { CoreOptions, CoreResult, ProviderAdapter } from './types';

export type CoreDeps = {
  adapters: ProviderAdapter[];
};

export async function runQuery(options: CoreOptions, deps: CoreDeps): Promise<CoreResult> {
  const { prompt, context, models, files } = options;
  const adapterMap = new Map(deps.adapters.map(adapter => [adapter.id, adapter]));
  const startedAt = Date.now();

  const responses = await Promise.allSettled(
    models.map(async (modelId) => {
      const adapter = adapterMap.get(modelId);
      if (!adapter) {
        return { provider: modelId, error: `Missing adapter for ${modelId}` };
      }
      return adapter.run({ prompt, context, files });
    })
  );

  const round1: Record<string, any> = {};
  responses.forEach((result, index) => {
    const modelId = models[index];
    if (result.status === 'fulfilled') {
      round1[modelId] = result.value;
    } else {
      round1[modelId] = { provider: modelId, error: String(result.reason) };
    }
  });

  const totals = {
    durationMs: Date.now() - startedAt,
    costUsd: 0,
    tokensIn: 0,
    tokensOut: 0
  };

  return { round1, totals };
}

export * from './types';
export * from './file-utils';
export * from './model-mapping';
export * from './query-hash';
export * from './request-payload';
export * from './response-state';
export * from './status-text';
export * from './synthesis-label';
export * from './utils';
export * from './validation';
export * from './prepare-run';
export * from './currency';
export * from './stream-parser';
