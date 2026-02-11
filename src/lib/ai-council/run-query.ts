import type { AiCouncilProject, UploadedFile, CostInfo, ModelResponse, CurrentResponses } from './types';
import { buildInitialResponses } from '../ai-core/response-state';
import { getSynthesisLabel } from '../ai-core/synthesis-label';
import { getProviderDisplayName, getSelectedModelLabels, mapAccordionProviderToSelectionKey, mapProviderToKey } from '../ai-core/model-mapping';
import { getStatusText } from '../ai-core/status-text';
import { prepareRunQuery } from '../ai-core/prepare-run';
import { parseNdjsonStream } from '../ai-core/stream-parser';
import type { StreamEvent } from '../ai-core/stream-parser';
import { getAccordionDom, getTotalsDom } from './response-dom';

type RunQueryOptions = {
  contextEl: HTMLTextAreaElement | HTMLInputElement | null;
  promptEl: HTMLTextAreaElement | HTMLInputElement | null;
  synthesisModelEl: HTMLSelectElement | HTMLInputElement | null;
  enableDeliberationEl: HTMLInputElement | null;
  skipSynthesisEl: HTMLInputElement | null;
  resultsEl: HTMLElement | null;
  synthesisCard: HTMLElement | null;
  round2Section: HTMLElement | null;
  round1Label: HTMLElement | null;
  hallucinationReportEl: HTMLElement | null;
  hallucinationListEl: HTMLElement | null;
  costBannerEl: HTMLElement | null;
  getSelectedModels: () => string[];
  getCurrentProfile: () => string;
  getCurrentProject: () => AiCouncilProject | null;
  getUploadedFiles: () => UploadedFile[];
  updateModelCheckboxes: () => void;
  formatDuration: (duration: number) => string;
  setStatus: (text: string, show: boolean) => void;
  showError: (text: string) => void;
  hideError: () => void;
  setLoading: (value: boolean) => void;
  showLogoutBanner: () => void;
  startModelWaiting: (models: string[]) => void;
  stopAllModelTimers: () => void;
  markModelComplete: (modelKey: string, duration: number, hasError: boolean) => void;
  getWaitingCount: () => number;
  displayResponse: (providerId: string, response: ModelResponse) => void;
  renderSynthesis: (synthesis: ModelResponse, modelsUsed: string[]) => void;
  renderCostBanner: (totalCost: CostInfo | null, totalDuration: number) => void;
  renderHallucinationReport: (report: any, deliberationEnabled: boolean) => void;
  handlePostQuery: (data: any) => Promise<void>;
  clearStoredResponses: () => void;
  setCurrentPrompt: (value: string) => void;
  setCollectedResponses: (value: Record<string, ModelResponse>) => void;
  setCollectedR2Responses: (value: Record<string, ModelResponse>) => void;
  setHasRunDeliberation: (value: boolean) => void;
  setHasSynthesized: (value: boolean) => void;
  getLastQueryHash: () => string;
  setLastQueryHash: (value: string) => void;
  getCurrentResponses: () => CurrentResponses;
  setCurrentResponses: (value: CurrentResponses) => void;
  getAvailableModels: () => Record<string, boolean>;
  setAvailableModels: (value: Record<string, boolean>) => void;
};

export function initRunQuery(options: RunQueryOptions) {
  const {
    contextEl,
    promptEl,
    synthesisModelEl,
    enableDeliberationEl,
    skipSynthesisEl,
    resultsEl,
    synthesisCard,
    round2Section,
    round1Label,
    hallucinationReportEl,
    hallucinationListEl,
    costBannerEl,
    getSelectedModels,
    getCurrentProfile,
    getCurrentProject,
    getUploadedFiles,
    updateModelCheckboxes,
    formatDuration,
    setStatus,
    showError,
    hideError,
    setLoading,
    showLogoutBanner,
    startModelWaiting,
    stopAllModelTimers,
    markModelComplete,
    getWaitingCount,
    displayResponse,
    renderSynthesis,
    renderCostBanner,
    renderHallucinationReport,
    handlePostQuery,
    clearStoredResponses,
    setCurrentPrompt,
    setCollectedResponses,
    setCollectedR2Responses,
    setHasRunDeliberation,
    setHasSynthesized,
    getLastQueryHash,
    setLastQueryHash,
    getCurrentResponses,
    setCurrentResponses,
    getAvailableModels,
    setAvailableModels
  } = options;

  async function runQuery() {
    let kbContext = '';
    const currentProject = getCurrentProject();
    if (currentProject?.kb_project_id && currentProject?.auto_include_kb) {
      try {
        const kbRes = await fetch('/api/ai-council/kb-context?projectId=' + currentProject.id);
        const kbData = await kbRes.json();
        if (kbData.context) {
          kbContext = kbData.context + '\n\n';
          console.log('KB context loaded:', kbData.itemCount, 'items,', kbData.tokens, 'tokens');
        }
      } catch (e) {
        console.warn('Could not load KB context:', e);
      }
    }

    const context = kbContext + (contextEl?.value?.trim() || '');
    const prompt = promptEl?.value?.trim() || '';
    const synthesisModel = synthesisModelEl?.value || '';
    const selectedModels = getSelectedModels();
    const enableDeliberation = !!enableDeliberationEl?.checked;
    const skipSynthesis = !!skipSynthesisEl?.checked || selectedModels.length < 2;

    if (!skipSynthesis && !synthesisModel) {
      showError('Välj en syntesmodell.');
      return;
    }

    const prepared = prepareRunQuery({
      prompt,
      context,
      selectedModels,
      deliberationEnabled: enableDeliberation,
      synthesisModel,
      skipSynthesis,
      profile: getCurrentProfile(),
      files: getUploadedFiles()
    });

    if (prepared.validationError !== null) {
      showError(prepared.validationError);
      return;
    }

    setCurrentPrompt(prompt);
    hideError();
    setLoading(true);

    const queryHash = prepared.queryHash;
    if (queryHash !== getLastQueryHash()) {
      console.log('New query detected - clearing previous responses');
      setCollectedResponses({});
      setCollectedR2Responses({});
      setHasRunDeliberation(false);
      setHasSynthesized(false);
      clearStoredResponses();
    }
    setLastQueryHash(queryHash);

    const selectedModelLabels = getSelectedModelLabels(selectedModels);
    setStatus(getStatusText('round1-start', { selectedModels: selectedModelLabels }), true);

    resultsEl?.classList.remove('visible');
    if (synthesisCard) synthesisCard.style.display = 'none';
    if (round2Section) round2Section.style.display = 'none';
    if (round1Label) round1Label.style.display = enableDeliberation ? 'block' : 'none';
    costBannerEl?.classList.remove('visible');

    if (hallucinationReportEl) hallucinationReportEl.style.display = 'none';
    if (hallucinationListEl) {
      hallucinationListEl.innerHTML = '';
      hallucinationListEl.style.display = 'none';
    }

    setCurrentResponses(buildInitialResponses());

    ['openai', 'anthropic', 'google', 'grok'].forEach(p => {
      const {
        accordionEl,
        statusEl,
        durationEl,
        markdownEl,
        r2AccordionEl,
        r2StatusEl,
        r2DurationEl,
        r2MarkdownEl
      } = getAccordionDom(p);

      if (!accordionEl) return;
      const selectionKey = mapAccordionProviderToSelectionKey(p);
      const isSelected = selectedModels.includes(selectionKey);
      accordionEl.style.display = isSelected ? 'block' : 'none';
      if (r2AccordionEl) r2AccordionEl.style.display = isSelected ? 'block' : 'none';
      if (!isSelected) return;

      if (statusEl) statusEl.textContent = '';
      if (statusEl) statusEl.className = 'accordion-status';
      if (durationEl) durationEl.textContent = '';
      if (markdownEl) markdownEl.innerHTML = '';
      accordionEl.classList.remove('open');

      if (r2AccordionEl) {
        if (r2StatusEl) { r2StatusEl.textContent = ''; r2StatusEl.className = 'accordion-status'; }
        if (r2DurationEl) r2DurationEl.textContent = '';
        if (r2MarkdownEl) r2MarkdownEl.innerHTML = '';
        r2AccordionEl.classList.remove('open');
      }
    });

    try {
      const response = await fetch('/api/ai-council/query?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(prepared.payload)
      });

      if (response.status === 401) {
        showLogoutBanner();
        throw new Error('Din session har gått ut. Logga in igen för att fortsätta.');
      }

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/html') || response.status === 504) {
        const responseText = await response.text();
        console.error('API returned HTML instead of JSON:', responseText.substring(0, 500));

        let errorDetail = 'Okänt fel';
        if (responseText.includes('Inactivity Timeout') || response.status === 504) {
          errorDetail = '⏱️ Timeout: Serveranropet tog för lång tid. Testa att:\n• Kör lokalt (npm run dev)\n• Använd färre AI-modeller';
        } else if (responseText.includes('Not Found') || response.status === 404) {
          errorDetail = 'API-endpoint hittades inte (404).';
        } else if (responseText.includes('Unauthorized') || response.status === 401) {
          showLogoutBanner();
          errorDetail = 'Din session har gått ut. Logga in igen för att fortsätta.';
        }

        throw new Error(errorDetail);
      }

      let data: any = null;

      if (contentType.includes('application/x-ndjson')) {
        if (!response.body) throw new Error('Kunde inte läsa streaming-svar.');

        let snapshotData: any = null;

        data = await parseNdjsonStream(response.body, (event: StreamEvent) => {
          switch (event.type) {
            case 'started':
              setStatus('🚀 Ansluten, frågar AI-modeller...', true);
              startModelWaiting(selectedModels);
              break;
            case 'heartbeat': {
              const waitingCount = getWaitingCount();
              if (waitingCount > 0) {
                setStatus(getStatusText('waiting-models', { waitingCount, elapsedSeconds: event.elapsed }), true);
              } else {
                setStatus(getStatusText('working', { elapsedSeconds: event.elapsed }), true);
              }
              break;
            }
            case 'snapshot':
              if (!snapshotData) snapshotData = { responses: [], _isSnapshot: true };
              if (event.data.responses) snapshotData.responses = event.data.responses;
              if (event.data.queriedModels) snapshotData.queriedModels = event.data.queriedModels;
              if (event.data.round2Responses) snapshotData.round2Responses = event.data.round2Responses;
              console.log('Snapshot received:', event.data.stage);
              break;
            case 'progress':
              setStatus('⏳ ' + event.message, true);
              break;
            case 'model_complete': {
              const modelKey = mapProviderToKey(event.provider);
              markModelComplete(modelKey, event.duration, event.hasError);
              const modelDisplayName = getProviderDisplayName(event.provider);
              setStatus(getStatusText('model-complete', { modelName: modelDisplayName, durationText: formatDuration(event.duration) }), true);
              break;
            }
            case 'partial_complete':
              stopAllModelTimers();
              console.warn('Partial result received:', event.data.successfulModels);
              break;
            case 'complete':
              stopAllModelTimers();
              break;
          }
        });

        if (!data && snapshotData) {
          data = snapshotData;
        }
        if (data && data._isPartial === undefined && snapshotData) {
          // Merge snapshot flag if stream ended without complete
        }
      } else {
        const responseText = await response.text();
        if (responseText.startsWith('<')) {
          throw new Error('Server returnerade HTML istället för JSON');
        }
        data = JSON.parse(responseText);
      }

      if (!data) throw new Error('Inget svar mottaget från API');

      if (data._isSnapshot && !data.success) {
        showError('⚠️ Anslutningen avbröts men vi har delresultat från modellerna. Se individuella svar nedan.');
        data.partialResult = true;
      }

      if (!response.ok && data.error && !data._isPartial && !data._isSnapshot) {
        if (data.error.includes('Ej inloggad') || data.error.includes('inloggad') || data.error.includes('session')) {
          showLogoutBanner();
        }
        throw new Error(data.error);
      }

      if (data._isPartial || data.partialResult) {
        const successModels = data.successfulModels?.join(', ') || (data.responses?.filter((r: any) => !r.error).map((r: any) => r.provider).join(', ')) || 'Vissa modeller';
        showError(`⚠️ Delresultat: ${successModels} svarade, men processen avbröts. Individuella svar visas nedan.`);
      }

      if (data.availableModels) {
        const availableModels = { ...getAvailableModels() };
        data.availableModels.forEach((m: any) => { availableModels[m.model] = m.available; });
        setAvailableModels(availableModels);
        updateModelCheckboxes();
      }

      resultsEl?.classList.add('visible');
      const currentResponses = getCurrentResponses();
      currentResponses.rawResponses = data.responses;
      currentResponses.totalDuration = data.totalDuration;
      setCurrentResponses(currentResponses);

      data.responses.forEach((r: any) => {
        const key = mapProviderToKey(r.provider);
        if (key) displayResponse(String(key), r);
      });

      if (data.deliberationEnabled && data.round2Responses) {
        setStatus(getStatusText('round2-start'), true);
        if (round2Section) round2Section.style.display = 'block';

        data.round2Responses.forEach((r: any) => {
          const key = mapProviderToKey(r.provider);
          if (key) displayResponse('r2-' + String(key), r);
        });
      }

      const synthLabel = getSynthesisLabel(String(data.synthesisModel || synthesisModel));
      const synthType = data.deliberationEnabled ? 'supersynthesis-start' : 'synthesis-start';
      setStatus(getStatusText(synthType, { label: synthLabel }), true);

      if (data.synthesis) {
        const next = getCurrentResponses();
        next.synthesis = data.synthesis.response || '';
        next.isSuperSynthesis = !!data.deliberationEnabled;
        setCurrentResponses(next);
        const modelsUsed = data.responses ? data.responses.filter((r: any) => !r.error).map((r: any) => r.provider) : selectedModels;
        renderSynthesis(data.synthesis, modelsUsed);
      }

      const { totalDurationEl } = getTotalsDom();
      if (totalDurationEl) totalDurationEl.textContent = formatDuration(data.totalDuration);

      renderCostBanner(data.totalCost, data.totalDuration);
      renderHallucinationReport(data.hallucinationReport, data.deliberationEnabled);

      setStatus('', false);

      await handlePostQuery(data);
    } catch (error: any) {
      showError(error.message);
      setStatus('', false);
    } finally {
      stopAllModelTimers();
      setLoading(false);
    }
  }

  return { runQuery };
}
