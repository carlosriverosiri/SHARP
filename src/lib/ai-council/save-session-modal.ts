import type { CurrentResponses } from './types';

type SaveSessionModalOptions = {
  getCurrentPrompt: () => string;
  getCurrentResponses: () => CurrentResponses;
  contextEl: HTMLTextAreaElement | null;
  synthesisModelEl: HTMLSelectElement | null;
  kbProjectSelect: HTMLSelectElement | null;
  getSaveSession: () => (payload: any) => Promise<any>;
};

export function initSaveSessionModal({
  getCurrentPrompt,
  getCurrentResponses,
  contextEl,
  synthesisModelEl,
  kbProjectSelect,
  getSaveSession
}: SaveSessionModalOptions) {
  const savePromptModal = document.getElementById('savePromptModal');
  const saveSessionNameInput = document.getElementById('saveSessionName') as HTMLInputElement | null;
  const savePromptPreview = document.getElementById('savePromptPreview');
  const enableAutoSaveCheckbox = document.getElementById('enableAutoSave') as HTMLInputElement | null;

  if (enableAutoSaveCheckbox) {
    const autoSaveEnabled = localStorage.getItem('ai-council-autosave') === 'true';
    enableAutoSaveCheckbox.checked = autoSaveEnabled;
    enableAutoSaveCheckbox.addEventListener('change', () => {
      localStorage.setItem('ai-council-autosave', String(enableAutoSaveCheckbox.checked));
    });
  }

  function showSavePromptModal() {
    if (!savePromptModal || !saveSessionNameInput || !savePromptPreview) return;
    const currentPrompt = getCurrentPrompt();
    saveSessionNameInput.value = '';
    savePromptPreview.textContent = currentPrompt
      ? currentPrompt.substring(0, 150) + (currentPrompt.length > 150 ? '...' : '')
      : '';
    savePromptModal.classList.add('open');
    saveSessionNameInput.focus();
  }

  function closeSavePromptModal() {
    if (!savePromptModal) return;
    savePromptModal.classList.remove('open');
  }

  async function saveCurrentSession(customName?: string) {
    if (!saveSessionNameInput) return;
    const name = customName || saveSessionNameInput.value.trim() || null;

    const selectedModels: string[] = [];
    document.querySelectorAll('.model-checkbox:checked').forEach(cb => {
      selectedModels.push((cb as HTMLInputElement).value);
    });

    const activeProfile = document.querySelector('.profile-btn.active') as HTMLElement | null;
    const profileName = activeProfile?.dataset.profile || 'custom';

    const currentResponses = getCurrentResponses() || {};
    const hasDeliberation = currentResponses.round2Responses && currentResponses.round2Responses.length > 0;

    const selectedKbProject = kbProjectSelect ? kbProjectSelect.value : 'unsorted';
    const kbProjectId = selectedKbProject && selectedKbProject !== 'unsorted' ? selectedKbProject : null;

    const saveSession = getSaveSession();
    await saveSession({
      name,
      prompt: getCurrentPrompt(),
      context: contextEl?.value || '',
      responses: currentResponses.rawResponses,
      round2Responses: hasDeliberation ? currentResponses.round2Responses : null,
      synthesis: currentResponses.isSuperSynthesis ? null : currentResponses.synthesis,
      supersynthesis: currentResponses.isSuperSynthesis ? currentResponses.synthesis : null,
      synthesisModel: synthesisModelEl?.value || '',
      totalDuration: currentResponses.totalDuration,
      selectedModels,
      profile: profileName,
      deliberationEnabled: hasDeliberation,
      totalCost: currentResponses.totalCost || null,
      kbProjectId
    });
    closeSavePromptModal();
  }

  document.getElementById('confirmSaveBtn')?.addEventListener('click', () => saveCurrentSession());
  document.getElementById('skipSaveBtn')?.addEventListener('click', closeSavePromptModal);
  savePromptModal?.addEventListener('click', (e) => {
    if (e.target === savePromptModal) closeSavePromptModal();
  });
  document.addEventListener('keydown', (e) => {
    if (savePromptModal?.classList.contains('open')) {
      if (e.key === 'Escape') closeSavePromptModal();
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        saveCurrentSession();
      }
    }
  });

  return { showSavePromptModal, closeSavePromptModal, saveCurrentSession };
}
