type UiHelpersOptions = {
  statusEl: HTMLElement | null;
  statusTextEl: HTMLElement | null;
  errorEl: HTMLElement | null;
  runBtn: HTMLButtonElement | null;
};

type FieldActionsOptions = {
  contextEl: HTMLTextAreaElement | null;
  promptEl: HTMLTextAreaElement | null;
  clearContextBtn: HTMLButtonElement | null;
  copyContextBtn: HTMLButtonElement | null;
  previewContextBtn: HTMLButtonElement | null;
  clearPromptBtn: HTMLButtonElement | null;
  copyPromptBtn: HTMLButtonElement | null;
  previewPromptBtn: HTMLButtonElement | null;
  structurePromptContainer: HTMLElement | null;
  structuredPreview: HTMLElement | null;
  previewModal: HTMLElement | null;
  previewModalTitle: HTMLElement | null;
  previewModalBody: HTMLElement | null;
  closePreviewModal: HTMLElement | null;
  previewModalClose: HTMLElement | null;
  previewModalCopy: HTMLButtonElement | null;
  autoResizeTextarea: (textarea: HTMLTextAreaElement, minHeight?: number, maxHeight?: number) => void;
  saveDraftDebounced?: () => void;
};

export function initUiHelpers({ statusEl, statusTextEl, errorEl, runBtn }: UiHelpersOptions) {
  function formatDuration(ms?: number) {
    if (typeof ms !== 'number') return '';
    return ms < 1000 ? ms + 'ms' : (ms / 1000).toFixed(1) + 's';
  }

  function renderMarkdown(content: string) {
    const markedLib = (globalThis as any).marked;
    let html = markedLib && markedLib.parse
      ? markedLib.parse(content || '')
      : '<p>' + (content || '').replace(/\n/g, '<br>') + '</p>';
    html = html.replace(/<a\s+href=/g, '<a target="_blank" rel="noopener noreferrer" href=');
    return html;
  }

  function setStatus(text: string, show: boolean) {
    if (!statusEl || !statusTextEl) return;
    statusEl.classList.toggle('visible', show);
    statusTextEl.textContent = text;
  }

  function showError(text: string) {
    if (!errorEl) return;
    errorEl.classList.add('visible');
    errorEl.textContent = text;
  }

  function hideError() {
    errorEl?.classList.remove('visible');
  }

  function setLoading(loading: boolean) {
    if (!runBtn) return;
    runBtn.disabled = loading;
    runBtn.classList.toggle('loading', loading);
  }

  function copyToClipboard(text: string, btn?: HTMLElement) {
    navigator.clipboard.writeText(text).then(() => {
      if (!btn) return;
      const span = btn.querySelector('span');
      const orig = span ? span.textContent : '';
      btn.classList.add('copied');
      if (span) span.textContent = '✓';
      setTimeout(() => {
        btn.classList.remove('copied');
        if (span) span.textContent = orig;
      }, 2000);
    });
  }

  return {
    formatDuration,
    renderMarkdown,
    setStatus,
    showError,
    hideError,
    setLoading,
    copyToClipboard
  };
}

export function initFieldActions({
  contextEl,
  promptEl,
  clearContextBtn,
  copyContextBtn,
  previewContextBtn,
  clearPromptBtn,
  copyPromptBtn,
  previewPromptBtn,
  structurePromptContainer,
  structuredPreview,
  previewModal,
  previewModalTitle,
  previewModalBody,
  closePreviewModal,
  previewModalClose,
  previewModalCopy,
  autoResizeTextarea,
  saveDraftDebounced
}: FieldActionsOptions) {
  if (!contextEl || !promptEl) {
    return { showPreviewModal: () => {} };
  }
  const safeContext = contextEl;
  const safePrompt = promptEl;

  function updateFieldActionVisibility() {
    const contextHasContent = safeContext.value.trim().length > 0;
    const promptHasContent = safePrompt.value.trim().length > 0;

    if (clearContextBtn) clearContextBtn.classList.toggle('visible', contextHasContent);
    if (copyContextBtn) copyContextBtn.classList.toggle('visible', contextHasContent);
    if (previewContextBtn) previewContextBtn.classList.toggle('visible', contextHasContent);

    if (clearPromptBtn) clearPromptBtn.classList.toggle('visible', promptHasContent);
    if (copyPromptBtn) copyPromptBtn.classList.toggle('visible', promptHasContent);
    if (previewPromptBtn) previewPromptBtn.classList.toggle('visible', promptHasContent);
  }

  safeContext.addEventListener('input', updateFieldActionVisibility);
  safePrompt.addEventListener('input', updateFieldActionVisibility);

  clearContextBtn?.addEventListener('click', () => {
    if (!confirm('Rensa kontexten?')) return;
    safeContext.value = '';
    autoResizeTextarea(safeContext, 120, 400);
    updateFieldActionVisibility();
    if (typeof saveDraftDebounced === 'function') {
      saveDraftDebounced();
    }
  });

  clearPromptBtn?.addEventListener('click', () => {
    if (!confirm('Rensa prompten?')) return;
    safePrompt.value = '';
    autoResizeTextarea(safePrompt, 80, 300);
    updateFieldActionVisibility();
    if (typeof saveDraftDebounced === 'function') {
      saveDraftDebounced();
    }
    if (structurePromptContainer) structurePromptContainer.style.display = 'none';
    if (structuredPreview) structuredPreview.style.display = 'none';
  });

  copyContextBtn?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(safeContext.value);
    if (copyContextBtn) {
      copyContextBtn.style.color = '#10b981';
      setTimeout(() => copyContextBtn.style.color = '', 1000);
    }
  });

  copyPromptBtn?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(safePrompt.value);
    if (copyPromptBtn) {
      copyPromptBtn.style.color = '#10b981';
      setTimeout(() => copyPromptBtn.style.color = '', 1000);
    }
  });

  let currentPreviewText = '';

  function showPreviewModal(title: string, text: string) {
    if (!previewModal || !previewModalTitle || !previewModalBody) return;
    currentPreviewText = text || '';
    previewModalTitle.textContent = title;
    previewModalBody.textContent = text || '(tom)';
    previewModal.classList.add('open');
  }

  function hidePreviewModal() {
    previewModal?.classList.remove('open');
  }

  closePreviewModal?.addEventListener('click', hidePreviewModal);
  previewModalClose?.addEventListener('click', hidePreviewModal);
  previewModal?.addEventListener('click', (e) => {
    if (e.target === previewModal) hidePreviewModal();
  });

  previewModalCopy?.addEventListener('click', async () => {
    await navigator.clipboard.writeText(currentPreviewText);
    if (!previewModalCopy) return;
    previewModalCopy.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Kopierad!';
    previewModalCopy.style.color = '#10b981';
    setTimeout(() => {
      previewModalCopy.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Kopiera';
      previewModalCopy.style.color = '';
    }, 1500);
  });

  previewContextBtn?.addEventListener('click', () => {
    showPreviewModal('Kontext', safeContext.value);
  });

  previewPromptBtn?.addEventListener('click', () => {
    showPreviewModal('Prompt', safePrompt.value);
  });

  setTimeout(updateFieldActionVisibility, 100);

  return { showPreviewModal };
}
