import { initDeliberationRun } from './deliberation-run';
import { initSynthesizeRun } from './synthesize-run';
import { initSingleModelRun } from './single-model-run';
import { initSequentialRun } from './sequential-run';
import { initRunControls } from './run-controls';
import type { ModelResponse } from './types';

type RunModulesOptions = {
  runBtn: HTMLButtonElement | null;
  runQuery: () => void | Promise<void>;
  hallucinationToggleBtn: HTMLElement | null;
  hallucinationList: HTMLElement | null;
  promptEl: HTMLTextAreaElement | HTMLInputElement | null;
  contextEl: HTMLTextAreaElement | HTMLInputElement | null;
  resultsEl: HTMLElement | null;
  nextStepCards: HTMLElement | null;
  synthesizeNowBtn: HTMLButtonElement | null;
  synthesizeCount: HTMLElement | null;
  deliberateNowBtn: HTMLButtonElement | null;
  deliberateCount: HTMLElement | null;
  round2Section: HTMLElement | null;
  round1Label: HTMLElement | null;
  svgIcons: { star: string };
  synthesisModelEl: HTMLSelectElement | HTMLInputElement | null;
  runAllSequentialBtn: HTMLButtonElement | null;
  addModelsCardBtn: HTMLElement | null;
  addModelsCount: HTMLElement | null;
  unusedModelDots: HTMLElement | null;
  getCollectedResponses: () => Record<string, ModelResponse>;
  getCollectedR2Responses: () => Record<string, ModelResponse>;
  getHasRunDeliberation: () => boolean;
  getCurrentPrompt: () => string;
  setCurrentPrompt: (value: string) => void;
  setHasRunDeliberation: (value: boolean) => void;
  setHasSynthesized: (value: boolean) => void;
  setModelsInCurrentSynthesis: (value: number) => void;
  updateWorkflowProgress: () => void;
  showSavePromptModal: () => void;
  setStatus: (text: string, show: boolean) => void;
  showError: (text: string) => void;
  hideError: () => void;
  setLoading: (value: boolean) => void;
  displayResponse: (providerId: string, response: ModelResponse) => void;
  formatDuration: (duration: number) => string;
  saveResponsesToStorage: () => void;
  playNotificationSound: (type: 'success' | 'error' | 'complete') => void;
  renderSynthesis: (synthesis: ModelResponse, modelsUsed: string[]) => void;
  getCurrentResponses: () => Record<string, any>;
  setCurrentResponses: (value: Record<string, any>) => void;
};

export function initRunModules(options: RunModulesOptions) {
  const {
    runBtn,
    runQuery,
    hallucinationToggleBtn,
    hallucinationList,
    promptEl,
    contextEl,
    resultsEl,
    nextStepCards,
    synthesizeNowBtn,
    synthesizeCount,
    deliberateNowBtn,
    deliberateCount,
    round2Section,
    round1Label,
    svgIcons,
    synthesisModelEl,
    runAllSequentialBtn,
    addModelsCardBtn,
    addModelsCount,
    unusedModelDots,
    getCollectedResponses,
    getCollectedR2Responses,
    getHasRunDeliberation,
    getCurrentPrompt,
    setCurrentPrompt,
    setHasRunDeliberation,
    setHasSynthesized,
    setModelsInCurrentSynthesis,
    updateWorkflowProgress,
    showSavePromptModal,
    setStatus,
    showError,
    hideError,
    setLoading,
    displayResponse,
    formatDuration,
    saveResponsesToStorage,
    playNotificationSound,
    renderSynthesis,
    getCurrentResponses,
    setCurrentResponses
  } = options;

  initDeliberationRun({
    deliberateNowBtn,
    synthesizeNowBtn,
    synthesizeCount,
    round2Section,
    round1Label,
    promptEl,
    singleDeliberationSection: document.getElementById('singleDeliberationSection'),
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
  });

  initSynthesizeRun({
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
    getCurrentResponses,
    setCurrentResponses
  });

  initSingleModelRun({
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
  });

  initSequentialRun({
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
  });

  initRunControls({
    runBtn,
    runQuery,
    hallucinationToggleBtn,
    hallucinationList
  });
}
