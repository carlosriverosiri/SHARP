import type { ModelResponse } from './types';

type SynthesizeRunOptions = {
  synthesizeNowBtn: HTMLButtonElement | null;
  addModelsCardBtn: HTMLElement | null;
  addModelsCount: HTMLElement | null;
  unusedModelDots: HTMLElement | null;
  nextStepCards: HTMLElement | null;
  deliberateNowBtn: HTMLButtonElement | null;
  promptEl: HTMLTextAreaElement | HTMLInputElement | null;
  synthesisModelEl: HTMLSelectElement | HTMLInputElement | null;
  getCollectedResponses: () => Record<string, ModelResponse>;
  getCollectedR2Responses: () => Record<string, ModelResponse>;
  getHasRunDeliberation: () => boolean;
  getCurrentPrompt: () => string;
  setCurrentPrompt: (value: string) => void;
  setHasSynthesized: (value: boolean) => void;
  setModelsInCurrentSynthesis: (value: number) => void;
  updateWorkflowProgress: () => void;
  showSavePromptModal: () => void;
  setStatus: (text: string, show: boolean) => void;
  showError: (text: string) => void;
  setLoading: (value: boolean) => void;
  renderSynthesis: (synthesis: ModelResponse, modelsUsed: string[]) => void;
  setCurrentResponses: (value: Record<string, any>) => void;
  getCurrentResponses: () => Record<string, any>;
};

export function initSynthesizeRun({
  synthesizeNowBtn,
  addModelsCardBtn,
  addModelsCount,
  unusedModelDots,
  nextStepCards,
  deliberateNowBtn,
  promptEl,
  synthesisModelEl,
  getCollectedResponses,
  getCollectedR2Responses,
  getHasRunDeliberation,
  getCurrentPrompt,
  setCurrentPrompt,
  setHasSynthesized,
  setModelsInCurrentSynthesis,
  updateWorkflowProgress,
  showSavePromptModal,
  setStatus,
  showError,
  setLoading,
  renderSynthesis,
  setCurrentResponses,
  getCurrentResponses
}: SynthesizeRunOptions) {
  function ensurePrompt(): string | null {
    let prompt = getCurrentPrompt();
    if (!prompt) {
      prompt = promptEl?.value?.trim() || '';
      if (prompt) setCurrentPrompt(prompt);
    }
    return prompt || null;
  }

  synthesizeNowBtn?.addEventListener('click', async () => {
    const collectedResponses = getCollectedResponses();
    const responses = Object.values(collectedResponses);
    if (responses.length === 0) {
      alert('Inga svar att syntetisera.');
      return;
    }

    const prompt = ensurePrompt();
    if (!prompt) {
      alert('Prompt saknas. Skriv in din fråga igen.');
      return;
    }

    const r2Responses = Object.values(getCollectedR2Responses());
    const isSuperSynthesis = getHasRunDeliberation() && r2Responses.length > 0;
    const synthesisModel = synthesisModelEl?.value || '';

    if (responses.length < 2) {
      showError('Syntes kräver minst 2 svar.');
      return;
    }

    if (!synthesisModel) {
      showError('Välj en syntesmodell.');
      return;
    }

    setLoading(true);
    setStatus(isSuperSynthesis ? '🧪 Kör supersyntes...' : '🧪 Kör syntes på insamlade svar...', true);

    try {
      const response = await fetch('/api/ai-council/synthesize-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          responses,
          round2Responses: isSuperSynthesis ? r2Responses : undefined,
          synthesisModel,
          isSuperSynthesis
        })
      });

      if (!response.ok) {
        throw new Error('Syntesfel: ' + response.statusText);
      }

      const data: any = await response.json();
      if (data.synthesis) {
        const currentResponses = getCurrentResponses();
        currentResponses.synthesis = data.synthesis.response || '';
        currentResponses.isSuperSynthesis = getHasRunDeliberation();
        setCurrentResponses(currentResponses);
        const modelsUsed = Object.keys(collectedResponses);
        renderSynthesis(data.synthesis, modelsUsed);

        setHasSynthesized(true);
        setModelsInCurrentSynthesis(modelsUsed.length);

        const unusedModels = ['gemini', 'anthropic', 'grok', 'openai'].filter(m => {
          const providerKey = m === 'gemini' ? 'google' : m;
          return !collectedResponses[providerKey];
        });

        if (unusedModels.length > 0) {
          synthesizeNowBtn.classList.add('done');
          synthesizeNowBtn.disabled = true;
          if (addModelsCardBtn) addModelsCardBtn.style.display = 'flex';
          if (addModelsCount) addModelsCount.textContent = `${unusedModels.length} kvar`;
          if (unusedModelDots) {
            const dotColors: Record<string, string> = {
              gemini: '#10b981',
              anthropic: '#f59e0b',
              grok: '#3b82f6',
              openai: '#6b7280'
            };
            unusedModelDots.innerHTML = unusedModels.map(m =>
              `<span class="model-dot-unused" style="background: ${dotColors[m]}" title="${m}"></span>`
            ).join('');
          }
          if (deliberateNowBtn) {
            deliberateNowBtn.style.display = getHasRunDeliberation() ? 'none' : 'flex';
          }
        } else {
          if (nextStepCards) nextStepCards.style.display = 'none';
        }

        updateWorkflowProgress();
        setTimeout(() => showSavePromptModal(), 500);
      }

      setStatus('', false);
    } catch (error: any) {
      showError('Syntesfel: ' + error.message + '. Försök igen.');
      setStatus('', false);
      if (synthesizeNowBtn) synthesizeNowBtn.disabled = false;
    } finally {
      setLoading(false);
    }
  });
}
