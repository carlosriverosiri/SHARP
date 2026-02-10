import { initDictation } from './dictation';
import { initStructurePrompt } from './structure-prompt';
import { initSourceSearch } from './source-search';

type PromptToolsOptions = {
  dictationBtn: HTMLButtonElement | null;
  dictationStatus: HTMLElement | null;
  promptEl: HTMLTextAreaElement | null;
  contextEl: HTMLTextAreaElement | null;
  structurePromptContainer: HTMLElement | null;
  structurePromptBtn: HTMLButtonElement | null;
  structuredPreview: HTMLElement | null;
  structuredPreviewContent: HTMLElement | null;
  structuredPreviewMeta: HTMLElement | null;
  applyStructuredPrompt: HTMLButtonElement | null;
  cancelStructuredPrompt: HTMLButtonElement | null;
  copyStructuredPrompt: HTMLButtonElement | null;
  autoResizeTextarea: (textarea: HTMLTextAreaElement | HTMLInputElement, minHeight?: number, maxHeight?: number) => void;
  renderMarkdown: (text: string) => string;
  escapeHtml: (text: string) => string;
};

export function initPromptTools({
  dictationBtn,
  dictationStatus,
  promptEl,
  contextEl,
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
  escapeHtml
}: PromptToolsOptions) {
  initDictation({ dictationBtn, dictationStatus, promptEl });

  initStructurePrompt({
    promptEl,
    structurePromptContainer,
    structurePromptBtn,
    structuredPreview,
    structuredPreviewContent,
    structuredPreviewMeta,
    applyStructuredPrompt,
    cancelStructuredPrompt,
    copyStructuredPrompt,
    autoResizeTextarea: autoResizeTextarea as (textarea: HTMLTextAreaElement, minHeight?: number, maxHeight?: number) => void,
    renderMarkdown
  });

  initSourceSearch({
    contextEl,
    autoResizeTextarea: autoResizeTextarea as (textarea: HTMLTextAreaElement, minHeight?: number, maxHeight?: number) => void,
    escapeHtml
  });
}
