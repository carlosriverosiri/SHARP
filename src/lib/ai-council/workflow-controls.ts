import type { ModelResponse } from './types';

type WorkflowControlsOptions = {
  resetWorkflowBtn: HTMLButtonElement | null;
  skipSynthesisToggle: HTMLElement | null;
  skipSynthesisEl: HTMLInputElement | null;
  getCollectedResponses: () => Record<string, ModelResponse>;
  resetWorkflow: () => void;
};

export function initWorkflowControls({
  resetWorkflowBtn,
  skipSynthesisToggle,
  skipSynthesisEl,
  getCollectedResponses,
  resetWorkflow
}: WorkflowControlsOptions) {
  if (resetWorkflowBtn) {
    resetWorkflowBtn.addEventListener('click', () => {
      if (Object.keys(getCollectedResponses()).length > 0) {
        if (!confirm('Vill du verkligen starta om? Alla insamlade svar kommer att försvinna.')) {
          return;
        }
      }
      resetWorkflow();
    });
  }

  if (skipSynthesisToggle && skipSynthesisEl) {
    skipSynthesisToggle.addEventListener('click', () => {
      skipSynthesisEl.checked = !skipSynthesisEl.checked;
      skipSynthesisToggle.classList.toggle('active', skipSynthesisEl.checked);
    });
  }
}
