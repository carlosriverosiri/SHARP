import type { ModelResponse } from './types';

type WorkflowStateOptions = {
  workflowProgress: HTMLElement | null;
  workflowStatus: HTMLElement | null;
  round2Section: HTMLElement | null;
  round1Label: HTMLElement | null;
  retryFailedBtn: HTMLElement | null;
  expandModelsBtn: HTMLElement | null;
  nextStepCards: HTMLElement | null;
  addModelsCardBtn: HTMLElement | null;
  deliberateNowBtn: HTMLButtonElement | null;
  synthesizeNowBtn: HTMLButtonElement | null;
  svgIcons: { lightbulb: string };
  getCollectedResponses: () => Record<string, ModelResponse>;
  setCollectedResponses: (value: Record<string, ModelResponse>) => void;
  setCollectedR2Responses: (value: Record<string, ModelResponse>) => void;
  setFailedModels: (value: string[]) => void;
  getHasRunDeliberation: () => boolean;
  setHasRunDeliberation: (value: boolean) => void;
  getHasSynthesized: () => boolean;
  setHasSynthesized: (value: boolean) => void;
  setModelsInCurrentSynthesis: (value: number) => void;
  clearStoredResponses: () => void;
  setStatus: (text: string, show: boolean) => void;
  hideError: () => void;
};

export function initWorkflowState({
  workflowProgress,
  workflowStatus,
  round2Section,
  round1Label,
  retryFailedBtn,
  expandModelsBtn,
  nextStepCards,
  addModelsCardBtn,
  deliberateNowBtn,
  synthesizeNowBtn,
  svgIcons,
  getCollectedResponses,
  setCollectedResponses,
  setCollectedR2Responses,
  setFailedModels,
  getHasRunDeliberation,
  setHasRunDeliberation,
  getHasSynthesized,
  setHasSynthesized,
  setModelsInCurrentSynthesis,
  clearStoredResponses,
  setStatus,
  hideError
}: WorkflowStateOptions) {
  function updateWorkflowProgress() {
    if (!workflowProgress || !workflowStatus) return;
    const successCount = Object.keys(getCollectedResponses()).length;
    workflowProgress.style.display = successCount > 0 ? 'block' : 'none';

    const steps = workflowProgress.querySelectorAll('.workflow-step');
    steps.forEach(step => {
      step.classList.remove('active', 'completed');
    });

    const round1Step = workflowProgress.querySelector('[data-step="round1"]');
    const synthesis1Step = workflowProgress.querySelector('[data-step="synthesis1"]');
    const round2Step = workflowProgress.querySelector('[data-step="round2"]');
    const supersynthesisStep = workflowProgress.querySelector('[data-step="supersynthesis"]');

    let statusText = '';

    if (successCount > 0) {
      round1Step?.classList.add('completed');
      statusText = `${successCount} modell(er) har svarat`;

      if (getHasSynthesized() && !getHasRunDeliberation()) {
        synthesis1Step?.classList.add('completed');
        statusText = 'Syntes klar - kan fortsätta med deliberation';
      } else if (!getHasSynthesized() && !getHasRunDeliberation()) {
        synthesis1Step?.classList.add('active');
        statusText = `${successCount} svar - redo för syntes eller deliberation`;
      }

      if (getHasRunDeliberation()) {
        round1Step?.classList.add('completed');
        synthesis1Step?.classList.add('completed');
        round2Step?.classList.add('completed');
        supersynthesisStep?.classList.add('active');
        statusText = 'Deliberation klar - redo för supersyntes';
      }

      if (getHasRunDeliberation() && getHasSynthesized()) {
        supersynthesisStep?.classList.add('completed');
        statusText = '✓ Komplett arbetsflöde avslutat';
      }
    }

    workflowStatus.textContent = statusText;
  }

  function resetWorkflow() {
    setCollectedResponses({});
    setCollectedR2Responses({});
    setFailedModels([]);
    setHasRunDeliberation(false);
    clearStoredResponses();
    setHasSynthesized(false);
    setModelsInCurrentSynthesis(0);

    if (workflowProgress) workflowProgress.style.display = 'none';
    if (round2Section) round2Section.style.display = 'none';
    if (round1Label) round1Label.style.display = 'none';
    if (retryFailedBtn) retryFailedBtn.style.display = 'none';
    if (expandModelsBtn) expandModelsBtn.style.display = 'none';
    if (nextStepCards) nextStepCards.style.display = 'none';
    if (addModelsCardBtn) addModelsCardBtn.style.display = 'none';

    if (deliberateNowBtn) {
      deliberateNowBtn.classList.remove('done');
      deliberateNowBtn.disabled = false;
      deliberateNowBtn.style.display = 'flex';
    }
    if (synthesizeNowBtn) {
      synthesizeNowBtn.classList.remove('done', 'supersynthesis');
      synthesizeNowBtn.disabled = false;
      const titleEl = synthesizeNowBtn.querySelector('.next-step-card-title');
      const descEl = synthesizeNowBtn.querySelector('.next-step-card-desc');
      const iconEl = synthesizeNowBtn.querySelector('.next-step-card-icon');
      if (titleEl) titleEl.textContent = 'Syntes';
      if (descEl) descEl.textContent = 'En AI sammanfattar alla svar till en slutsats';
      if (iconEl) iconEl.innerHTML = svgIcons.lightbulb;
    }

    const singleDelibSection = document.getElementById('singleDeliberationSection');
    if (singleDelibSection) singleDelibSection.style.display = 'none';

    document.querySelectorAll('.single-deliberation-btn').forEach(btn => {
      btn.classList.remove('done', 'running');
      const modelId = (btn as HTMLElement).dataset.model || '';
      const dotClass = { gemini: 'google', anthropic: 'anthropic', grok: 'grok', openai: 'openai' }[modelId];
      const modelName = { gemini: 'Gemini', anthropic: 'Claude', grok: 'Grok', openai: 'OpenAI' }[modelId];
      (btn as HTMLElement).innerHTML = `<span class="dot-${dotClass}"></span> ${modelName} R2`;
    });

    document.querySelectorAll('.accordion-content .markdown-content').forEach(el => {
      (el as HTMLElement).innerHTML = '';
    });
    document.querySelectorAll('.accordion-status').forEach(el => {
      el.textContent = '';
      el.className = 'accordion-status';
    });
    document.querySelectorAll('.accordion-duration').forEach(el => {
      el.textContent = '';
    });

    document.querySelectorAll('.single-model-btn').forEach(btn => {
      (btn as HTMLButtonElement).disabled = false;
      btn.classList.remove('running', 'done');
      const modelId = (btn as HTMLElement).dataset.model || '';
      const dotClass = { gemini: 'google', anthropic: 'anthropic', grok: 'grok', openai: 'openai' }[modelId];
      const modelName = { gemini: 'Gemini', anthropic: 'Claude', grok: 'Grok', openai: 'OpenAI' }[modelId];
      (btn as HTMLElement).innerHTML = `<span class="dot-${dotClass}"></span> ${modelName}`;
    });

    document.getElementById('results')?.classList.remove('visible');
    const synthesisCard = document.getElementById('synthesisCard') as HTMLElement | null;
    if (synthesisCard) synthesisCard.style.display = 'none';
    const synthesisContent = document.getElementById('synthesisContent');
    if (synthesisContent) synthesisContent.innerHTML = '';
    document.getElementById('costBanner')?.classList.remove('visible');

    document.querySelectorAll('.model-checkbox').forEach(cb => {
      const checkbox = cb.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      const modelId = (cb as HTMLElement).dataset.model;
      const shouldSelect = modelId === 'gemini' || modelId === 'anthropic';
      if (checkbox) checkbox.checked = shouldSelect;
      (cb as HTMLElement).classList.toggle('selected', shouldSelect);
    });

    setStatus('🔄 Arbetsflöde återställt', true);
    setTimeout(() => setStatus('', false), 2000);
    hideError();
  }

  return { updateWorkflowProgress, resetWorkflow };
}
