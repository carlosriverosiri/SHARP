import type { CurrentResponses, ModelResponse } from './types';
import { mapProviderToKey } from '../ai-core/model-mapping';

type WorkflowProgressOptions = {
  retryFailedBtn: HTMLElement | null;
  expandModelsBtn: HTMLElement | null;
  addModelsCardBtn: HTMLElement | null;
  deliberateNowBtn: HTMLButtonElement | null;
  synthesizeNowBtn: HTMLButtonElement | null;
  addModelsCount: HTMLElement | null;
  unusedModelDots: HTMLElement | null;
  nextStepCards: HTMLElement | null;
  deliberateCount: HTMLElement | null;
  synthesizeCount: HTMLElement | null;
  skipSynthesisEl: HTMLInputElement | null;
  skipSynthesisToggle: HTMLElement | null;
  runBtn: HTMLElement | null;
  svgIcons: { lightbulb: string; star: string; refresh: string };
  getCollectedResponses: () => Record<string, ModelResponse>;
  saveResponsesToStorage: () => void;
  updateWorkflowProgress: () => void;
  getHasRunDeliberation: () => boolean;
  getModelsInCurrentSynthesis: () => number;
  setModelsInCurrentSynthesis: (value: number) => void;
  setHasSynthesized: (value: boolean) => void;
  getCurrentResponses: () => CurrentResponses | Record<string, any>;
  setStatus: (text: string, show: boolean) => void;
  showSavePromptModal: () => void;
  saveCurrentSession: (name?: string) => Promise<void>;
  runQuery: () => Promise<void>;
};

export function initWorkflowProgress({
  retryFailedBtn,
  expandModelsBtn,
  addModelsCardBtn,
  deliberateNowBtn,
  synthesizeNowBtn,
  addModelsCount,
  unusedModelDots,
  nextStepCards,
  deliberateCount,
  synthesizeCount,
  skipSynthesisEl,
  skipSynthesisToggle,
  runBtn,
  svgIcons,
  getCollectedResponses,
  saveResponsesToStorage,
  updateWorkflowProgress,
  getHasRunDeliberation,
  getModelsInCurrentSynthesis,
  setModelsInCurrentSynthesis,
  setHasSynthesized,
  getCurrentResponses,
  setStatus,
  showSavePromptModal,
  saveCurrentSession,
  runQuery
}: WorkflowProgressOptions) {
  let failedModels: string[] = [];

  function getUnusedModels() {
    const collectedResponses = getCollectedResponses();
    return ['gemini', 'anthropic', 'grok', 'openai'].filter(m => {
      const providerKey = m === 'gemini' ? 'google' : m;
      return !collectedResponses[providerKey];
    });
  }

  function prepareToAddModels() {
    const unusedModels = getUnusedModels();

    if (unusedModels.length === 0) {
      alert('Alla modeller har redan svarat.');
      return;
    }

    document.querySelectorAll('.model-checkbox').forEach(cb => {
      const checkbox = cb.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      const modelId = (cb as HTMLElement).dataset.model;
      const isUnused = !!modelId && unusedModels.includes(modelId);
      if (checkbox) checkbox.checked = isUnused;
      cb.classList.toggle('selected', isUnused);
    });

    if (skipSynthesisEl) skipSynthesisEl.checked = true;
    skipSynthesisToggle?.classList.add('active');

    if (runBtn) {
      runBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      runBtn.classList.add('highlight-pulse');
      setTimeout(() => runBtn.classList.remove('highlight-pulse'), 2000);
    }

    setStatus(`✓ ${unusedModels.length} modeller valda. Klicka "Kör AI Council" för att lägga till.`, true);
  }

  if (retryFailedBtn) {
    retryFailedBtn.addEventListener('click', async () => {
      if (failedModels.length === 0) {
        console.log('No failed models to retry');
        return;
      }

      console.log('Retrying failed models:', failedModels);

      document.querySelectorAll('.model-checkbox').forEach(cb => {
        const checkbox = cb.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        const modelId = (cb as HTMLElement).dataset.model;
        const shouldSelect = !!modelId && failedModels.includes(modelId);
        console.log(`Model ${modelId}: shouldSelect=${shouldSelect}, failed=${failedModels.includes(modelId || '')}`);
        if (checkbox) checkbox.checked = shouldSelect;
        cb.classList.toggle('selected', shouldSelect);
      });

      if (skipSynthesisEl) skipSynthesisEl.checked = true;
      skipSynthesisToggle?.classList.add('active');

      await runQuery();
    });
  }

  expandModelsBtn?.addEventListener('click', prepareToAddModels);
  addModelsCardBtn?.addEventListener('click', prepareToAddModels);

  async function handlePostQuery(data: any) {
    const collectedResponses = getCollectedResponses();

    failedModels = [];

    data.responses.forEach((r: any) => {
      const providerName = typeof r.provider === 'string' ? r.provider : String(r.provider ?? '');
      const modelKey = String(mapProviderToKey(providerName)).toLowerCase();
      const hasFailed = r.error || !r.response || r.response.trim() === '';
      if (hasFailed) {
        if (!failedModels.includes(modelKey)) {
          failedModels.push(modelKey);
        }
      } else {
        collectedResponses[modelKey] = r;
        saveResponsesToStorage();
      }
    });

    console.log('Failed models:', failedModels, 'Collected:', Object.keys(collectedResponses));

    const hasFailures = failedModels.length > 0;
    const successCount = Object.keys(collectedResponses).length;
    const hasSuccesses = successCount > 0;
    const hasSynthesis = !!data.synthesis;
    const hasDeliberation = data.deliberationEnabled || getHasRunDeliberation();

    if (retryFailedBtn) {
      retryFailedBtn.style.display = hasFailures ? 'flex' : 'none';
      if (hasFailures) {
        const textEl = retryFailedBtn.querySelector('span');
        if (textEl) textEl.textContent = `🔄 Försök igen (${failedModels.length} misslyckade)`;
      }
    }

    const unusedModelsForBtn = getUnusedModels();
    if (expandModelsBtn) {
      expandModelsBtn.style.display = (hasSuccesses && unusedModelsForBtn.length > 0) ? 'flex' : 'none';
      if (unusedModelsForBtn.length > 0) {
        const textEl = expandModelsBtn.querySelector('span');
        if (textEl) textEl.textContent = `➕ Lägg till modeller (${unusedModelsForBtn.length} kvar)`;
      }
    }

    const unusedModels = ['gemini', 'anthropic', 'grok', 'openai'].filter(m => {
      const providerKey = m === 'gemini' ? 'google' : m;
      return !collectedResponses[providerKey];
    });
    const hasUnusedModels = unusedModels.length > 0;
    const canAddModels = hasSuccesses && hasUnusedModels;

    const newModelsAddedSinceSynthesis = hasSynthesis && (successCount > getModelsInCurrentSynthesis());
    const canRunDeliberation = successCount >= 2 && !hasDeliberation;
    const canSynthesize = hasSuccesses && successCount >= 2 && (!hasSynthesis || newModelsAddedSinceSynthesis);

    if (nextStepCards) {
      nextStepCards.style.display = (canRunDeliberation || canSynthesize || canAddModels) ? 'block' : 'none';
    }

    if (addModelsCardBtn) {
      addModelsCardBtn.style.display = canAddModels ? 'flex' : 'none';
    }
    if (canAddModels && addModelsCount && unusedModelDots) {
      addModelsCount.textContent = `${unusedModels.length} kvar`;
      const dotColors = { gemini: '#10b981', anthropic: '#f59e0b', grok: '#3b82f6', openai: '#6b7280' };
      unusedModelDots.innerHTML = unusedModels.map(m =>
        `<span class="model-dot-unused" style="background: ${dotColors[m as keyof typeof dotColors]}" title="${m}"></span>`
      ).join('');
    }

    if (deliberateNowBtn) {
      deliberateNowBtn.disabled = !canRunDeliberation;
      deliberateNowBtn.classList.toggle('done', hasDeliberation);
    }
    if (deliberateCount) deliberateCount.textContent = `${successCount} svar`;

    if (synthesizeNowBtn) {
      synthesizeNowBtn.disabled = !canSynthesize;
      synthesizeNowBtn.classList.toggle('done', hasSynthesis && !newModelsAddedSinceSynthesis);
      const countText = successCount < 2
        ? `${successCount} svar (min 2)`
        : (hasDeliberation ? `${successCount}+R2 svar` : `${successCount} svar`);
      if (synthesizeCount) synthesizeCount.textContent = countText;

      const titleEl = synthesizeNowBtn.querySelector('.next-step-card-title');
      const descEl = synthesizeNowBtn.querySelector('.next-step-card-desc');
      const iconEl = synthesizeNowBtn.querySelector('.next-step-card-icon');

      if (newModelsAddedSinceSynthesis) {
        synthesizeNowBtn.classList.remove('supersynthesis');
        if (titleEl) titleEl.textContent = 'Uppdatera syntes';
        if (descEl) descEl.textContent = `Kör ny syntes med alla ${successCount} svar (${successCount - getModelsInCurrentSynthesis()} nya)`;
        if (iconEl) iconEl.innerHTML = svgIcons.refresh;
      } else if (hasDeliberation) {
        synthesizeNowBtn.classList.add('supersynthesis');
        if (titleEl) titleEl.textContent = 'Supersyntes';
        if (descEl) descEl.textContent = 'Sammanfatta efter faktagranskning – högre kvalitet';
        if (iconEl) iconEl.innerHTML = svgIcons.star;
      } else {
        synthesizeNowBtn.classList.remove('supersynthesis');
        if (titleEl) titleEl.textContent = 'Syntes';
        if (descEl) descEl.textContent = 'En AI sammanfattar alla svar till en slutsats';
        if (iconEl) iconEl.innerHTML = svgIcons.lightbulb;
      }
    }

    const singleDelibSection = document.getElementById('singleDeliberationSection');
    if (singleDelibSection) singleDelibSection.style.display = canRunDeliberation ? 'block' : 'none';

    if (hasSynthesis) {
      setHasSynthesized(true);
      setModelsInCurrentSynthesis(successCount);
    }

    updateWorkflowProgress();

    const currentResponses = getCurrentResponses();
    const hasResults = currentResponses.synthesis || (currentResponses.rawResponses && currentResponses.rawResponses.length > 0);
    if (hasResults) {
      if (localStorage.getItem('ai-council-autosave') === 'true') {
        await saveCurrentSession('Auto: ' + new Date().toLocaleString('sv-SE'));
      } else {
        setTimeout(() => showSavePromptModal(), 500);
      }
    }
  }

  return { handlePostQuery, getUnusedModels };
}
