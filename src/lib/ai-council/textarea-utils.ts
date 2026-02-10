type TextareaUtilsOptions = {
  contextEl: HTMLTextAreaElement | HTMLInputElement | null;
};

export function initTextareaUtils({ contextEl }: TextareaUtilsOptions) {
  function autoResizeTextarea(textarea: HTMLTextAreaElement | HTMLInputElement, minHeight = 80, maxHeight = 300) {
    const el = textarea as HTMLTextAreaElement;
    el.style.height = 'auto';
    const newHeight = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = newHeight + 'px';
  }

  if (contextEl) {
    contextEl.addEventListener('input', () => {
      autoResizeTextarea(contextEl, 120, 400);
    });
  }

  return { autoResizeTextarea };
}
