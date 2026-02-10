type StructurePromptOptions = {
  promptEl: HTMLTextAreaElement | null;
  structurePromptContainer: HTMLElement | null;
  structurePromptBtn: HTMLButtonElement | null;
  structuredPreview: HTMLElement | null;
  structuredPreviewContent: HTMLElement | null;
  structuredPreviewMeta: HTMLElement | null;
  applyStructuredPrompt: HTMLButtonElement | null;
  cancelStructuredPrompt: HTMLButtonElement | null;
  copyStructuredPrompt: HTMLButtonElement | null;
  autoResizeTextarea: (textarea: HTMLTextAreaElement, minHeight?: number, maxHeight?: number) => void;
  renderMarkdown: (text: string) => string;
  saveDraftDebounced?: () => void;
};

export function initStructurePrompt({
  promptEl,
  structurePromptContainer,
  structurePromptBtn,
  structuredPreview,
  structuredPreviewContent,
  structuredPreviewMeta,
  applyStructuredPrompt,
  cancelStructuredPrompt,
  copyStructuredPrompt,
  autoResizeTextarea,
  renderMarkdown,
  saveDraftDebounced
}: StructurePromptOptions) {
  if (!promptEl || !structurePromptContainer || !structurePromptBtn || !structuredPreview || !structuredPreviewContent || !structuredPreviewMeta || !applyStructuredPrompt || !cancelStructuredPrompt || !copyStructuredPrompt) {
    return;
  }

  let lastStructuredPrompt = '';

  // Auto-resize prompt textarea on input
  promptEl.addEventListener('input', () => {
    autoResizeTextarea(promptEl, 80, 300);

    const textLength = promptEl.value.trim().length;
    structurePromptContainer.style.display = textLength > 150 ? 'flex' : 'none';

    if (structuredPreview.style.display !== 'none' && textLength < 100) {
      structuredPreview.style.display = 'none';
    }
  });

  // Structure prompt
  structurePromptBtn.addEventListener('click', async () => {
    const promptText = promptEl.value.trim();
    if (!promptText || promptText.length < 50) {
      alert('Prompten är för kort att strukturera. Skriv minst 50 tecken.');
      return;
    }

    structurePromptBtn.disabled = true;
    const originalBtnText = structurePromptBtn.querySelector('span')?.textContent || '';
    if (structurePromptBtn.querySelector('span')) {
      structurePromptBtn.querySelector('span')!.textContent = '⏳ Strukturerar...';
    }

    try {
      const response = await fetch('/api/ai-council/structure-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Kunde inte strukturera prompten');
      }

      const data = await response.json() as {
        structuredPrompt: string;
        duration: number;
        cost?: { sek?: number };
      };
      lastStructuredPrompt = data.structuredPrompt || '';

      structuredPreviewContent.innerHTML = renderMarkdown(data.structuredPrompt || '');

      const duration = ((data.duration || 0) / 1000).toFixed(1);
      const costSek = data.cost?.sek?.toFixed(3) || '0';
      structuredPreviewMeta.textContent = `${duration}s · ~${costSek} kr`;

      structuredPreview.style.display = 'block';
      structuredPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      console.error('Structure prompt error:', error);
      alert('Kunde inte strukturera prompten: ' + (error as Error).message);
    } finally {
      structurePromptBtn.disabled = false;
      if (structurePromptBtn.querySelector('span')) {
        structurePromptBtn.querySelector('span')!.textContent = originalBtnText;
      }
    }
  });

  // Apply structured prompt
  applyStructuredPrompt.addEventListener('click', () => {
    if (lastStructuredPrompt) {
      promptEl.value = lastStructuredPrompt;
      autoResizeTextarea(promptEl, 80, 300);
      structuredPreview.style.display = 'none';
      structurePromptContainer.style.display = 'none';
      promptEl.focus();

      if (typeof saveDraftDebounced === 'function') {
        saveDraftDebounced();
      }
    }
  });

  // Cancel and hide preview
  cancelStructuredPrompt.addEventListener('click', () => {
    structuredPreview.style.display = 'none';
    lastStructuredPrompt = '';
  });

  // Copy structured prompt
  copyStructuredPrompt.addEventListener('click', () => {
    if (lastStructuredPrompt) {
      navigator.clipboard.writeText(lastStructuredPrompt).then(() => {
        const originalText = copyStructuredPrompt.innerHTML;
        copyStructuredPrompt.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Kopierat!';
        setTimeout(() => { copyStructuredPrompt.innerHTML = originalText; }, 2000);
      });
    }
  });
}
