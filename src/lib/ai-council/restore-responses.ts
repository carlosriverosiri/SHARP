import type { ModelResponse } from './types';

type RestoreResponsesOptions = {
  resultsEl: HTMLElement | null;
  nextStepCards: HTMLElement | null;
  synthesizeNowBtn: HTMLButtonElement | null;
  synthesizeCount: HTMLElement | null;
  deliberateNowBtn: HTMLButtonElement | null;
  deliberateCount: HTMLElement | null;
  setStatus: (text: string, show: boolean) => void;
  displayResponse: (providerId: string, response: ModelResponse) => void;
  formatDuration: (duration: number) => string;
  updateWorkflowProgress: () => void;
  loadResponsesFromStorage: () => Promise<boolean>;
  getCollectedResponses: () => Record<string, ModelResponse>;
  getHasRunDeliberation: () => boolean;
};

export function initRestoreResponses({
  resultsEl,
  nextStepCards,
  synthesizeNowBtn,
  synthesizeCount,
  deliberateNowBtn,
  deliberateCount,
  setStatus,
  displayResponse,
  formatDuration,
  updateWorkflowProgress,
  loadResponsesFromStorage,
  getCollectedResponses,
  getHasRunDeliberation
}: RestoreResponsesOptions) {
  async function restoreSavedResponses() {
    const hasRestoredResponses = await loadResponsesFromStorage();

    if (!hasRestoredResponses) return;

    console.log('📂 Found saved responses, restoring UI...');

    if (resultsEl) resultsEl.classList.add('visible');

    const providerMap: Record<string, string> = {
      gemini: 'google',
      anthropic: 'anthropic',
      grok: 'grok',
      openai: 'openai'
    };

    const collectedResponses = getCollectedResponses();
    Object.entries(collectedResponses).forEach(([modelId, response]) => {
      const providerId = providerMap[modelId] || modelId;
      const accordion = document.getElementById('accordion-' + providerId);
      if (accordion && response) {
        accordion.style.display = 'block';
        displayResponse(providerId, response);
        const statusEl = document.getElementById('status-' + providerId);
        if (statusEl) {
          statusEl.textContent = '✓';
          statusEl.className = 'accordion-status success';
        }
        if (response.duration) {
          const durationEl = document.getElementById('duration-' + providerId);
          if (durationEl) durationEl.textContent = formatDuration(response.duration);
        }
      }
    });

    updateWorkflowProgress();

    const responseCount = Object.keys(collectedResponses).length;
    if (responseCount > 0) {
      if (nextStepCards) nextStepCards.style.display = 'block';
      if (synthesizeNowBtn) synthesizeNowBtn.disabled = false;
      if (synthesizeCount) {
        synthesizeCount.textContent = getHasRunDeliberation()
          ? `${responseCount}+R2 svar`
          : `${responseCount} svar`;
      }

      if (responseCount >= 2 && !getHasRunDeliberation()) {
        if (deliberateNowBtn) deliberateNowBtn.disabled = false;
        if (deliberateCount) deliberateCount.textContent = `${responseCount} svar`;
        const singleDelibSection = document.getElementById('singleDeliberationSection');
        if (singleDelibSection) singleDelibSection.style.display = 'block';
      }
    }

    setStatus(`📂 Återställde ${responseCount} sparade svar från Supabase. Klicka "Börja om" för att rensa.`, true);
    setTimeout(() => setStatus('', false), 5000);
  }

  return { restoreSavedResponses };
}
