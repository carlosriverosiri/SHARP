import type { CurrentResponses } from './types';

type SaveSessionModalOptions = {
  getCurrentPrompt: () => string;
  getCurrentResponses: () => CurrentResponses;
  contextEl: HTMLTextAreaElement | null;
  synthesisModelEl: HTMLSelectElement | null;
  kbProjectSelect: HTMLSelectElement | null;
  getSaveSession: () => (payload: any) => Promise<any>;
  pickProject?: (options?: { title?: string }) => Promise<{ id: string; name: string; icon?: string } | null>;
  getKbProjectMap?: () => Record<string, string>;
};

export function initSaveSessionModal({
  getCurrentPrompt,
  getCurrentResponses,
  contextEl,
  synthesisModelEl,
  kbProjectSelect,
  getSaveSession,
  pickProject,
  getKbProjectMap
}: SaveSessionModalOptions) {
  const savePromptModal = document.getElementById('savePromptModal');
  const saveSessionNameInput = document.getElementById('saveSessionName') as HTMLInputElement | null;
  const savePromptPreview = document.getElementById('savePromptPreview');
  const enableAutoSaveCheckbox = document.getElementById('enableAutoSave') as HTMLInputElement | null;
  const saveModalProjectBtn = document.getElementById('saveModalProjectBtn');
  const saveModalProjectBtnText = document.getElementById('saveModalProjectBtnText');

  if (enableAutoSaveCheckbox) {
    const autoSaveEnabled = localStorage.getItem('ai-council-autosave') === 'true';
    enableAutoSaveCheckbox.checked = autoSaveEnabled;
    enableAutoSaveCheckbox.addEventListener('change', () => {
      localStorage.setItem('ai-council-autosave', String(enableAutoSaveCheckbox.checked));
    });
  }

  function updateSaveModalProjectDisplay() {
    if (!saveModalProjectBtnText) return;
    const currentId = kbProjectSelect ? (kbProjectSelect as HTMLInputElement).value : '';
    const projectName = currentId && getKbProjectMap ? getKbProjectMap()[currentId] : null;
    if (projectName) {
      saveModalProjectBtnText.textContent = projectName;
      saveModalProjectBtn?.classList.remove('kb-project-btn--empty');
    } else {
      saveModalProjectBtnText.textContent = 'Inget projekt';
      saveModalProjectBtn?.classList.add('kb-project-btn--empty');
    }
  }

  function showSavePromptModal() {
    if (!savePromptModal || !saveSessionNameInput || !savePromptPreview) return;
    const currentPrompt = getCurrentPrompt();
    saveSessionNameInput.value = '';
    savePromptPreview.textContent = currentPrompt
      ? currentPrompt.substring(0, 150) + (currentPrompt.length > 150 ? '...' : '')
      : '';
    updateSaveModalProjectDisplay();
    savePromptModal.classList.add('open');
    saveSessionNameInput.focus();
  }

  saveModalProjectBtn?.addEventListener('click', async () => {
    if (!pickProject || !kbProjectSelect) return;
    const selected = await pickProject({ title: '📁 Välj projekt för session' });
    if (!selected) return;
    if (selected.id === '__none__') {
      (kbProjectSelect as HTMLInputElement).value = '';
      updateSaveModalProjectDisplay();
      return;
    }
    (kbProjectSelect as HTMLInputElement).value = selected.id;
    updateSaveModalProjectDisplay();
  });

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

    const selectedProject = kbProjectSelect ? kbProjectSelect.value : '';
    const projectId = selectedProject && selectedProject !== 'unsorted' ? selectedProject : null;

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
      projectId
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
