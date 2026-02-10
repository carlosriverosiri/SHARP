import type { ModelResponse } from './types';

type SingleModelRunOptions = {
  promptEl: HTMLTextAreaElement | HTMLInputElement | null;
  contextEl: HTMLTextAreaElement | HTMLInputElement | null;
  resultsEl: HTMLElement | null;
  nextStepCards: HTMLElement | null;
  synthesizeNowBtn: HTMLButtonElement | null;
  synthesizeCount: HTMLElement | null;
  deliberateNowBtn: HTMLButtonElement | null;
  deliberateCount: HTMLElement | null;
  setCurrentPrompt: (value: string) => void;
  setStatus: (text: string, show: boolean) => void;
  showError: (text: string) => void;
  hideError: () => void;
  displayResponse: (providerId: string, response: ModelResponse) => void;
  formatDuration: (duration: number) => string;
  saveResponsesToStorage: () => void;
  updateWorkflowProgress: () => void;
  playNotificationSound: (type: 'success' | 'error' | 'complete') => void;
  getCollectedResponses: () => Record<string, ModelResponse>;
  getHasRunDeliberation: () => boolean;
};

export function initSingleModelRun({
  promptEl,
  contextEl,
  resultsEl,
  nextStepCards,
  synthesizeNowBtn,
  synthesizeCount,
  deliberateNowBtn,
  deliberateCount,
  setCurrentPrompt,
  setStatus,
  showError,
  hideError,
  displayResponse,
  formatDuration,
  saveResponsesToStorage,
  updateWorkflowProgress,
  playNotificationSound,
  getCollectedResponses,
  getHasRunDeliberation
}: SingleModelRunOptions) {
  if (!promptEl || !contextEl) return;

  document.querySelectorAll('.single-model-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const modelId = (btn as HTMLElement).dataset.model;
      if (!modelId) return;

      const prompt = promptEl.value.trim();
      const context = contextEl.value.trim();

      if (!prompt) {
        showError('Ange en prompt först.');
        return;
      }

      setCurrentPrompt(prompt);

      document.querySelectorAll('.single-model-btn').forEach(b => ((b as HTMLButtonElement).disabled = true));
      btn.classList.add('running');
      (btn as HTMLButtonElement).textContent = '⏳ Kör...';

      const modelNames = { gemini: 'Gemini', anthropic: 'Claude', grok: 'Grok', openai: 'OpenAI' };
      setStatus(`🔄 Kör ${modelNames[modelId as keyof typeof modelNames]}...`, true);
      hideError();

      if (resultsEl) resultsEl.classList.add('visible');

      const providerMap = { gemini: 'google', anthropic: 'anthropic', grok: 'grok', openai: 'openai' };
      const providerId = providerMap[modelId as keyof typeof providerMap];
      const accordion = document.getElementById('accordion-' + providerId);
      if (accordion) {
        accordion.style.display = 'block';
        const statusEl = document.getElementById('status-' + providerId);
        const durationEl = document.getElementById('duration-' + providerId);
        if (statusEl) {
          statusEl.textContent = 'Kör...';
          statusEl.className = 'accordion-status waiting';
        }
        if (durationEl) durationEl.textContent = '';
      }

      try {
        console.log(`🚀 Running single model: ${modelId}`);
        const startTime = Date.now();

        const response = await fetch('/api/ai-council/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context,
            prompt,
            selectedModels: [modelId],
            synthesisModel: 'gemini',
            enableDeliberation: false,
            skipSynthesis: true,
            profileType: 'fast'
          })
        });

        const duration = Date.now() - startTime;
        console.log(`📦 Response received in ${duration}ms, status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText.substring(0, 500));
          throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }

        const contentType = response.headers.get('content-type') || '';
        let data = null;

        if (contentType.includes('text/plain') || contentType.includes('ndjson')) {
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });

              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (!line.trim()) continue;
                try {
                  const event = JSON.parse(line);
                  console.log('Event:', event.type, event.data);
                  if (event.type === 'model_complete') {
                    setStatus(`✓ ${modelNames[modelId as keyof typeof modelNames]} svarade (${(event.data.duration / 1000).toFixed(1)}s)`, true);
                  }
                  if (event.type === 'complete') data = event.data;
                  if (event.type === 'error') throw new Error(event.data.error);
                } catch (e: any) {
                  if (e?.message !== 'Unexpected end of JSON input') {
                    console.warn('Parse error:', e);
                  }
                }
              }
            }
          }
        } else {
          const text = await response.text();
          if (text.startsWith('<')) {
            throw new Error('Server returnerade HTML (troligen timeout eller serverproblem)');
          }
          data = JSON.parse(text);
        }

        if (!data) throw new Error('Inget svar från API');

        if (data.responses && data.responses.length > 0) {
          const r = data.responses[0];
          if (r.error) {
            showError(`${modelNames[modelId as keyof typeof modelNames]} fel: ${r.error}`);
            const statusEl = document.getElementById('status-' + providerId);
            if (statusEl) {
              statusEl.textContent = 'Fel';
              statusEl.className = 'accordion-status error';
            }
          } else {
            displayResponse(providerId, r);
            const collectedResponses = getCollectedResponses();
            collectedResponses[modelId] = r;
            saveResponsesToStorage();

            const statusEl = document.getElementById('status-' + providerId);
            const durationEl = document.getElementById('duration-' + providerId);
            if (statusEl) {
              statusEl.textContent = '✓';
              statusEl.className = 'accordion-status success';
            }
            if (durationEl) durationEl.textContent = formatDuration(r.duration);

            accordion?.classList.add('open');

            setStatus(`✓ ${modelNames[modelId as keyof typeof modelNames]} klar! (${Object.keys(collectedResponses).length} svar totalt)`, true);
            btn.classList.add('done');
            playNotificationSound('success');
          }
        }

        updateWorkflowProgress();

        const respCount = Object.keys(getCollectedResponses()).length;
        if (respCount > 0) {
          if (nextStepCards) nextStepCards.style.display = 'block';
          if (synthesizeNowBtn) synthesizeNowBtn.disabled = false;
          if (synthesizeCount) {
            synthesizeCount.textContent = getHasRunDeliberation()
              ? `${respCount}+R2 svar`
              : `${respCount} svar`;
          }

          if (respCount >= 2 && !getHasRunDeliberation()) {
            if (deliberateNowBtn) deliberateNowBtn.disabled = false;
            if (deliberateCount) deliberateCount.textContent = `${respCount} svar`;
            const singleDelibSection = document.getElementById('singleDeliberationSection');
            if (singleDelibSection) singleDelibSection.style.display = 'block';
          }
        }
      } catch (error: any) {
        console.error('Single model error:', error);
        showError(`${modelNames[modelId as keyof typeof modelNames]} fel: ${error.message}`);
        playNotificationSound('error');
        if (accordion) {
          const statusEl = document.getElementById('status-' + providerId);
          if (statusEl) {
            statusEl.textContent = 'Fel';
            statusEl.className = 'accordion-status error';
          }
        }
      } finally {
        document.querySelectorAll('.single-model-btn').forEach(b => {
          const button = b as HTMLButtonElement;
          button.disabled = false;
          button.classList.remove('running');
        });
        const btnTexts = { gemini: 'Gemini', anthropic: 'Claude', grok: 'Grok', openai: 'OpenAI' };
        document.querySelectorAll('.single-model-btn').forEach(b => {
          const dot = b.querySelector('span');
          b.innerHTML = '';
          if (dot) b.appendChild(dot);
          b.appendChild(document.createTextNode(' ' + btnTexts[(b as HTMLElement).dataset.model as keyof typeof btnTexts]));
        });
        setTimeout(() => setStatus('', false), 3000);
      }
    });
  });
}
