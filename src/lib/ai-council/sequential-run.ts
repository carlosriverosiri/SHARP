import type { ModelResponse } from './types';
import { getProviderDisplayName, mapSelectionKeyToProvider } from '../ai-core/model-mapping';
import { getAccordionDom, getSingleDeliberationSection } from './response-dom';

type SequentialRunOptions = {
  runAllSequentialBtn: HTMLButtonElement | null;
  promptEl: HTMLTextAreaElement | HTMLInputElement | null;
  contextEl: HTMLTextAreaElement | HTMLInputElement | null;
  resultsEl: HTMLElement | null;
  nextStepCards: HTMLElement | null;
  synthesizeNowBtn: HTMLButtonElement | null;
  synthesizeCount: HTMLElement | null;
  deliberateNowBtn: HTMLButtonElement | null;
  deliberateCount: HTMLElement | null;
  getCollectedResponses: () => Record<string, ModelResponse>;
  setCurrentPrompt: (value: string) => void;
  getHasRunDeliberation: () => boolean;
  displayResponse: (providerId: string, response: ModelResponse) => void;
  formatDuration: (duration: number) => string;
  saveResponsesToStorage: () => void;
  updateWorkflowProgress: () => void;
  setStatus: (text: string, show: boolean) => void;
  showError: (text: string) => void;
  playNotificationSound: (type: 'success' | 'error' | 'complete') => void;
};

export function initSequentialRun({
  runAllSequentialBtn,
  promptEl,
  contextEl,
  resultsEl,
  nextStepCards,
  synthesizeNowBtn,
  synthesizeCount,
  deliberateNowBtn,
  deliberateCount,
  getCollectedResponses,
  setCurrentPrompt,
  getHasRunDeliberation,
  displayResponse,
  formatDuration,
  saveResponsesToStorage,
  updateWorkflowProgress,
  setStatus,
  showError,
  playNotificationSound
}: SequentialRunOptions) {
  if (!runAllSequentialBtn || !promptEl || !contextEl) return;

  let isRunningSequential = false;

  runAllSequentialBtn.addEventListener('click', async () => {
    const prompt = promptEl.value.trim();
    const context = contextEl.value.trim();

    if (!prompt) {
      showError('Ange en prompt först.');
      return;
    }

    const selectedModels: string[] = [];
    document.querySelectorAll('#modelSelection .model-checkbox input:checked').forEach(cb => {
      const modelEl = cb.closest('.model-checkbox') as HTMLElement | null;
      const model = modelEl?.dataset.model;
      const collectedResponses = getCollectedResponses();
      if (model && !collectedResponses[mapSelectionKeyToProvider(model)]) {
        selectedModels.push(model);
      }
    });

    if (selectedModels.length === 0) {
      showError('Välj minst en modell att köra, eller alla valda modeller har redan svar.');
      return;
    }

    setCurrentPrompt(prompt);

    isRunningSequential = true;
    runAllSequentialBtn.disabled = true;
    runAllSequentialBtn.classList.add('running');
    runAllSequentialBtn.textContent = `⏳ Kör ${selectedModels.length} modeller...`;

    document.querySelectorAll('.single-model-btn').forEach(b => (b as HTMLButtonElement).disabled = true);

    if (resultsEl) resultsEl.classList.add('visible');

    let completedCount = 0;
    let errorCount = 0;

    for (const modelId of selectedModels) {
      const providerId = mapSelectionKeyToProvider(modelId);
      const displayName = getProviderDisplayName(providerId);

      setStatus(`🔄 Kör ${displayName} (${completedCount + 1}/${selectedModels.length})...`, true);
      runAllSequentialBtn.textContent = `⏳ ${displayName} (${completedCount + 1}/${selectedModels.length})`;

      const { accordionEl, statusEl, durationEl } = getAccordionDom(providerId);
      if (accordionEl) {
        accordionEl.style.display = 'block';
        if (statusEl) {
          statusEl.textContent = 'Kör...';
          statusEl.className = 'accordion-status waiting';
        }
        if (durationEl) durationEl.textContent = '0.0s';
      }

      const btn = document.querySelector(`.single-model-btn[data-model="${modelId}"]`);
      if (btn) btn.classList.add('running');

      try {
        console.log(`🚀 Sequential: Running ${modelId}`);

        const response = await fetch('/api/ai-council/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context,
            prompt,
            selectedModels: [modelId],
            synthesisModel: 'gemini',
            enableDeliberation: false,
            skipSynthesis: true
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.responses && data.responses.length > 0) {
          const r = data.responses[0];
          const collectedResponses = getCollectedResponses();
          collectedResponses[providerId] = r;
          displayResponse(providerId, r);

          if (accordionEl) {
            if (statusEl) {
              statusEl.textContent = '✓';
              statusEl.className = 'accordion-status success';
            }
            if (durationEl) durationEl.textContent = formatDuration(r.duration);
            accordionEl.classList.add('open');
          }

          if (btn) {
            btn.classList.remove('running');
            btn.classList.add('done');
          }

          completedCount++;
          playNotificationSound('success');
          saveResponsesToStorage();
        }
      } catch (error) {
        console.error(`Sequential error for ${modelId}:`, error);
        errorCount++;
        playNotificationSound('error');

        if (accordionEl) {
          if (statusEl) {
            statusEl.textContent = 'Fel';
            statusEl.className = 'accordion-status error';
          }
        }
        if (btn) btn.classList.remove('running');
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    isRunningSequential = false;
    runAllSequentialBtn.disabled = false;
    runAllSequentialBtn.classList.remove('running');
    runAllSequentialBtn.textContent = '▶️ Kör alla i sekvens';

    document.querySelectorAll('.single-model-btn').forEach(b => {
      const button = b as HTMLButtonElement;
      button.disabled = false;
      button.classList.remove('running');
    });

    updateWorkflowProgress();

    const responseCount = Object.keys(getCollectedResponses()).length;
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
        const singleDelibSection = getSingleDeliberationSection();
        if (singleDelibSection) singleDelibSection.style.display = 'block';
      }
    }

    if (completedCount > 0) {
      playNotificationSound('complete');
      setStatus(`✅ Klart! ${completedCount}/${selectedModels.length} modeller lyckades${errorCount > 0 ? `, ${errorCount} fel` : ''}.`, true);
    } else {
      setStatus(`❌ Alla ${selectedModels.length} modeller misslyckades.`, true);
    }

    setTimeout(() => setStatus('', false), 5000);
  });

  return { isRunningSequential: () => isRunningSequential };
}
