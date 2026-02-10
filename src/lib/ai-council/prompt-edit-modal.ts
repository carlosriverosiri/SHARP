import type { PromptLibraryItem } from './types';
import type { ToastType } from './toast';

type PromptEditModalOptions = {
  modalEl: HTMLElement | null;
  nameInput: HTMLInputElement | null;
  promptInput: HTMLTextAreaElement | null;
  closeBtn: HTMLButtonElement | null;
  cancelBtn: HTMLButtonElement | null;
  saveBtn: HTMLButtonElement | null;
  getReloadPromptLibrary: () => (() => Promise<void>) | undefined;
  showToast?: (message: string, type?: ToastType, durationMs?: number) => void;
};

export function initPromptEditModal(options: PromptEditModalOptions) {
  const {
    modalEl,
    nameInput,
    promptInput,
    closeBtn,
    cancelBtn,
    saveBtn,
    getReloadPromptLibrary,
    showToast
  } = options;

  let editingPrompt: PromptLibraryItem | null = null;

  const closePromptEditModal = () => {
    modalEl?.classList.remove('open');
    editingPrompt = null;
  };

  const openPromptEditModal = async (prompt: PromptLibraryItem) => {
    if (!modalEl || !nameInput || !promptInput) return;
    editingPrompt = prompt;
    nameInput.value = prompt?.name || '';
    promptInput.value = prompt?.prompt || '';
    modalEl.classList.add('open');
    nameInput.focus();
  };

  closeBtn?.addEventListener('click', closePromptEditModal);
  cancelBtn?.addEventListener('click', closePromptEditModal);

  saveBtn?.addEventListener('click', async () => {
    if (!editingPrompt || !nameInput || !promptInput) return;
    const newName = nameInput.value.trim();
    const newPrompt = promptInput.value.trim();
    if (!newName || !newPrompt) {
      showToast?.('Namn och prompt måste fyllas i.', 'error');
      alert('Namn och prompt måste fyllas i.');
      return;
    }
    try {
      const res = await fetch('/api/ai-council/prompts?id=' + editingPrompt.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName, prompt: newPrompt })
      });
      if (!res.ok) throw new Error('Kunde inte spara');
      const reloadPromptLibrary = getReloadPromptLibrary();
      await reloadPromptLibrary?.();
      closePromptEditModal();
      showToast?.('Prompt uppdaterad.', 'success');
    } catch (err) {
      showToast?.('Kunde inte spara ändringarna.', 'error');
      alert('Kunde inte spara ändringarna');
    }
  });

  return { openPromptEditModal, closePromptEditModal };
}
