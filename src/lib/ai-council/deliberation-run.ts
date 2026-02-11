import type { ModelResponse } from './types';
import { mapProviderToKey, getProviderDisplayName, mapSelectionKeyToProvider } from '../ai-core/model-mapping';
import { getAccordionDom } from './response-dom';

type DeliberationRunOptions = {
  deliberateNowBtn: HTMLButtonElement | null;
  synthesizeNowBtn: HTMLButtonElement | null;
  synthesizeCount: HTMLElement | null;
  round2Section: HTMLElement | null;
  round1Label: HTMLElement | null;
  promptEl: HTMLTextAreaElement | HTMLInputElement | null;
  singleDeliberationSection: HTMLElement | null;
  svgIcons: { star: string };
  getCollectedResponses: () => Record<string, ModelResponse>;
  getCollectedR2Responses: () => Record<string, ModelResponse>;
  setHasRunDeliberation: (value: boolean) => void;
  getCurrentPrompt: () => string;
  setCurrentPrompt: (value: string) => void;
  displayResponse: (providerId: string, response: ModelResponse) => void;
  updateWorkflowProgress: () => void;
  saveResponsesToStorage: () => void;
  setStatus: (text: string, show: boolean) => void;
  showError: (text: string) => void;
  hideError: () => void;
  setLoading: (value: boolean) => void;
  playNotificationSound: (type: 'success' | 'error' | 'complete') => void;
};

export function initDeliberationRun({
  deliberateNowBtn,
  synthesizeNowBtn,
  synthesizeCount,
  round2Section,
  round1Label,
  promptEl,
  singleDeliberationSection,
  svgIcons,
  getCollectedResponses,
  getCollectedR2Responses,
  setHasRunDeliberation,
  getCurrentPrompt,
  setCurrentPrompt,
  displayResponse,
  updateWorkflowProgress,
  saveResponsesToStorage,
  setStatus,
  showError,
  hideError,
  setLoading,
  playNotificationSound
}: DeliberationRunOptions) {
  function ensurePrompt(): string | null {
    let prompt = getCurrentPrompt();
    if (!prompt) {
      prompt = promptEl?.value?.trim() || '';
      if (prompt) setCurrentPrompt(prompt);
    }
    return prompt || null;
  }

  function applySupersynthesisUi(r1Count: number, labelText?: string) {
    if (!synthesizeNowBtn) return;
    synthesizeNowBtn.disabled = false;
    synthesizeNowBtn.classList.add('supersynthesis');
    const titleEl = synthesizeNowBtn.querySelector('.next-step-card-title');
    if (titleEl) titleEl.textContent = 'Supersyntes';
    const descEl = synthesizeNowBtn.querySelector('.next-step-card-desc');
    if (descEl) descEl.textContent = 'Sammanfatta efter faktagranskning – högre kvalitet';
    const iconEl = synthesizeNowBtn.querySelector('.next-step-card-icon');
    if (iconEl) iconEl.innerHTML = svgIcons.star;
    if (synthesizeCount) {
      synthesizeCount.textContent = labelText || `${r1Count}+R2 svar`;
    }
  }

  deliberateNowBtn?.addEventListener('click', async () => {
    const responses = Object.values(getCollectedResponses());
    if (responses.length < 2) {
      alert('Deliberation kräver minst 2 svar.');
      return;
    }

    const prompt = ensurePrompt();
    if (!prompt) {
      alert('Prompt saknas. Skriv in din fråga igen.');
      return;
    }

    setLoading(true);
    setStatus('🔄 Kör deliberation - modellerna granskar varandras svar...', true);

    if (round2Section) round2Section.style.display = 'block';
    if (round1Label) round1Label.style.display = 'block';

    const modelsWithResponses = Object.keys(getCollectedResponses());
    modelsWithResponses.forEach(modelKey => {
      const normalizedKey = modelKey === 'gemini' ? 'google' : modelKey;
      const { r2AccordionEl, r2StatusEl, r2DurationEl } = getAccordionDom(normalizedKey);
      if (r2AccordionEl) r2AccordionEl.style.display = 'block';
      if (r2StatusEl) {
        r2StatusEl.textContent = 'Väntar...';
        r2StatusEl.className = 'accordion-status waiting';
      }
      if (r2DurationEl) r2DurationEl.textContent = '0.0s';
    });

    try {
      const response = await fetch('/api/ai-council/deliberate-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          responses
        })
      });

      if (!response.ok) {
        throw new Error('Deliberationsfel: ' + response.statusText);
      }

      const data: any = await response.json();

      if (data.round2Responses) {
        const collectedR2Responses = getCollectedR2Responses();
        data.round2Responses.forEach((r: any) => {
          const providerName = typeof r.provider === 'string' ? r.provider : String(r.provider ?? '');
          const key = String(mapProviderToKey(providerName)).toLowerCase();
          collectedR2Responses[key] = r;
          displayResponse('r2-' + key, r);
        });

        setHasRunDeliberation(true);

        if (deliberateNowBtn) {
          deliberateNowBtn.classList.add('done');
          deliberateNowBtn.disabled = true;
        }
        if (singleDeliberationSection) singleDeliberationSection.style.display = 'none';

        applySupersynthesisUi(Object.keys(getCollectedResponses()).length);
        updateWorkflowProgress();

        setStatus('✓ Faktagranskning klar! Kör supersyntes.', true);
        setTimeout(() => setStatus('', false), 3000);
      }
    } catch (error: any) {
      showError('Fel vid faktagranskning: ' + error.message + '. Försök igen.');
      setStatus('', false);
      if (deliberateNowBtn) deliberateNowBtn.disabled = false;
    } finally {
      setLoading(false);
    }
  });

  document.querySelectorAll('.single-deliberation-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const modelId = (btn as HTMLElement).dataset.model;
      const responses = Object.values(getCollectedResponses());

      if (responses.length < 2) {
        alert('Deliberation kräver minst 2 R1-svar.');
        return;
      }

      const prompt = ensurePrompt();
      if (!prompt) {
        alert('Prompt saknas. Skriv in din fråga igen.');
        return;
      }

      document.querySelectorAll('.single-deliberation-btn').forEach(b => {
        (b as HTMLButtonElement).disabled = true;
      });
      if (deliberateNowBtn) deliberateNowBtn.disabled = true;
      btn.classList.add('running');
      btn.textContent = '⏳ Kör...';

      const providerId = mapSelectionKeyToProvider(modelId || '');
      const displayName = getProviderDisplayName(providerId);
      setStatus(`🔄 ${displayName} granskar andras svar...`, true);
      hideError();

      if (round2Section) round2Section.style.display = 'block';
      if (round1Label) round1Label.style.display = 'block';

      const { r2AccordionEl, r2StatusEl, r2DurationEl } = getAccordionDom(providerId);
      if (r2AccordionEl) {
        r2AccordionEl.style.display = 'block';
        if (r2StatusEl) {
          r2StatusEl.textContent = 'Kör...';
          r2StatusEl.className = 'accordion-status waiting';
        }
        if (r2DurationEl) r2DurationEl.textContent = '0.0s';
      }

      try {
        console.log(`🔄 Running single deliberation: ${modelId}`);
        const response = await fetch('/api/ai-council/deliberate-only', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            responses,
            selectedModel: modelId
          })
        });

        if (!response.ok) {
          throw new Error('Deliberationsfel: ' + response.statusText);
        }

        const data: any = await response.json();

        if (data.round2Responses && data.round2Responses.length > 0 && providerId) {
          const r2Response = data.round2Responses[0];
          getCollectedR2Responses()[providerId] = r2Response;
          displayResponse('r2-' + providerId, r2Response);

          btn.classList.remove('running');
          btn.classList.add('done');
          const dotClass = providerId === 'google' ? 'google' : providerId;
          btn.innerHTML = `<span class="dot-${dotClass}"></span> ✓ ${displayName} R2`;

          const r2Count = Object.keys(getCollectedR2Responses()).length;
          const r1Count = Object.keys(getCollectedResponses()).length;

          setStatus(`✓ ${displayName} R2 klar! (${r2Count}/${r1Count} deliberationer)`, true);
          playNotificationSound('success');

          if (r2Count >= r1Count) {
            playNotificationSound('complete');
            setHasRunDeliberation(true);
            if (deliberateNowBtn) {
              deliberateNowBtn.classList.add('done');
              deliberateNowBtn.disabled = true;
            }
            if (singleDeliberationSection) singleDeliberationSection.style.display = 'none';
            applySupersynthesisUi(r1Count);
            setStatus('✓ All faktagranskning klar! Kör supersyntes.', true);
          } else {
            if (synthesizeNowBtn) synthesizeNowBtn.disabled = false;
            if (synthesizeCount) synthesizeCount.textContent = `${r2Count}/${r1Count} R2`;
          }

          updateWorkflowProgress();
          saveResponsesToStorage();
        }
      } catch (error: any) {
        console.error('Single deliberation error:', error);
        showError(`${displayName} R2 fel: ${error.message}`);
        playNotificationSound('error');
        if (r2AccordionEl && providerId) {
          if (r2StatusEl) {
            r2StatusEl.textContent = 'Fel';
            r2StatusEl.className = 'accordion-status error';
          }
        }
        btn.classList.remove('running');
      } finally {
        document.querySelectorAll('.single-deliberation-btn').forEach(b => {
          (b as HTMLButtonElement).disabled = false;
        });
        if (deliberateNowBtn) deliberateNowBtn.disabled = false;
        setTimeout(() => setStatus('', false), 3000);
      }
    });
  });
}
