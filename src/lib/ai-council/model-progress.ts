type ProviderKey = 'openai' | 'anthropic' | 'google' | 'grok';

type ModelProgressOptions = {
  formatDuration: (duration?: number) => string;
};

export function initModelProgress({ formatDuration }: ModelProgressOptions) {
  let modelTimers: Record<ProviderKey, number> = {} as Record<ProviderKey, number>;
  let modelStartTimes: Record<ProviderKey, number> = {} as Record<ProviderKey, number>;

  function startModelWaiting(models: string[]) {
    stopAllModelTimers();

    const modelToProvider: Record<string, ProviderKey> = {
      openai: 'openai',
      anthropic: 'anthropic',
      gemini: 'google',
      grok: 'grok'
    };

    models.forEach(model => {
      const provider = modelToProvider[model] || (model as ProviderKey);
      const statusEl = document.getElementById('status-' + provider);
      const durationEl = document.getElementById('duration-' + provider);
      if (!statusEl) return;

      const startTime = Date.now();
      modelStartTimes[provider] = startTime;

      statusEl.textContent = 'Väntar...';
      statusEl.className = 'accordion-status waiting';
      if (durationEl) durationEl.textContent = '0.0s';

      modelTimers[provider] = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (durationEl) durationEl.textContent = elapsed.toFixed(1) + 's';
      }, 100);
    });
  }

  function stopModelTimer(provider: string) {
    const key = provider as ProviderKey;
    if (modelTimers[key]) {
      clearInterval(modelTimers[key]);
      delete modelTimers[key];
    }
  }

  function stopAllModelTimers() {
    (Object.keys(modelTimers) as ProviderKey[]).forEach(provider => {
      clearInterval(modelTimers[provider]);
    });
    modelTimers = {} as Record<ProviderKey, number>;
    modelStartTimes = {} as Record<ProviderKey, number>;
  }

  function markModelComplete(provider: string, duration?: number, hasError?: boolean) {
    stopModelTimer(provider);
    const statusEl = document.getElementById('status-' + provider);
    if (statusEl) {
      statusEl.textContent = hasError ? '❌' : '✓';
      statusEl.className = 'accordion-status ' + (hasError ? 'error' : 'success');
    }
    const durationEl = document.getElementById('duration-' + provider);
    if (durationEl && duration) {
      durationEl.textContent = formatDuration(duration);
    }
  }

  function getWaitingCount() {
    return Object.keys(modelTimers).length;
  }

  return {
    startModelWaiting,
    stopModelTimer,
    stopAllModelTimers,
    markModelComplete,
    getWaitingCount
  };
}
