import type { ModelResponse } from './types';

type ResponseStorageOptions = {
  storageKey?: string;
  promptEl: HTMLTextAreaElement | HTMLInputElement | null;
  contextEl: HTMLTextAreaElement | HTMLInputElement | null;
  getCurrentPrompt: () => string;
  setCurrentPrompt: (value: string) => void;
  getCollectedResponses: () => Record<string, ModelResponse>;
  setCollectedResponses: (value: Record<string, ModelResponse>) => void;
  getCollectedR2Responses: () => Record<string, ModelResponse>;
  setCollectedR2Responses: (value: Record<string, ModelResponse>) => void;
  getHasRunDeliberation: () => boolean;
  setHasRunDeliberation: (value: boolean) => void;
  getHasSynthesized: () => boolean;
  setHasSynthesized: (value: boolean) => void;
};

export function initResponseStorage({
  storageKey = 'ai-council-collected-responses',
  promptEl,
  contextEl,
  getCurrentPrompt,
  setCurrentPrompt,
  getCollectedResponses,
  setCollectedResponses,
  getCollectedR2Responses,
  setCollectedR2Responses,
  getHasRunDeliberation,
  setHasRunDeliberation,
  getHasSynthesized,
  setHasSynthesized
}: ResponseStorageOptions) {
  let saveDraftTimeout: number | null = null;

  async function saveResponsesToStorage() {
    try {
      const data = {
        responses: getCollectedResponses(),
        r2Responses: getCollectedR2Responses(),
        hasRunDeliberation: getHasRunDeliberation(),
        hasSynthesized: getHasSynthesized(),
        timestamp: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }

    if (saveDraftTimeout) window.clearTimeout(saveDraftTimeout);
    saveDraftTimeout = window.setTimeout(async () => {
      try {
        console.log('💾 Saving draft to Supabase...');
        const response = await fetch('/api/ai-council/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            prompt: getCurrentPrompt(),
            context: contextEl?.value || '',
            responses: getCollectedResponses(),
            r2Responses: getCollectedR2Responses(),
            hasRunDeliberation: getHasRunDeliberation()
          })
        });

        if (response.ok) {
          console.log('✅ Draft saved to Supabase');
        } else {
          const err = await response.json();
          console.warn('Supabase save failed:', err.error);
        }
      } catch (e) {
        console.warn('Could not save to Supabase:', e);
      }
    }, 2000);

    console.log('💾 Saved', Object.keys(getCollectedResponses()).length, 'responses to localStorage');
  }

  async function loadResponsesFromStorage() {
    try {
      console.log('📂 Loading draft from Supabase...');
      const response = await fetch('/api/ai-council/draft', { credentials: 'include' });

      if (response.ok) {
        const data = await response.json();

        if (data.draft && data.draft.responses && Object.keys(data.draft.responses).length > 0) {
          setCollectedResponses(data.draft.responses || {});
          setCollectedR2Responses(data.draft.r2_responses || {});
          setHasRunDeliberation(data.draft.has_run_deliberation || false);

          if (data.draft.prompt) {
            setCurrentPrompt(data.draft.prompt);
            if (promptEl) promptEl.value = data.draft.prompt;
          }
          if (data.draft.context && contextEl) contextEl.value = data.draft.context;

          console.log('✅ Restored', Object.keys(data.draft.responses || {}).length, 'responses from Supabase');
          return true;
        }
      }
    } catch (e) {
      console.warn('Could not load from Supabase:', e);
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return false;

      const data = JSON.parse(stored);
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
        console.log('🗑️ Stored responses expired (>24h), clearing');
        localStorage.removeItem(storageKey);
        return false;
      }

      setCollectedResponses(data.responses || {});
      setCollectedR2Responses(data.r2Responses || {});
      setHasRunDeliberation(data.hasRunDeliberation || false);
      setHasSynthesized(data.hasSynthesized || false);

      console.log('📂 Restored', Object.keys(data.responses || {}).length, 'responses from localStorage');
      return Object.keys(data.responses || {}).length > 0;
    } catch (e) {
      console.warn('Could not load from localStorage:', e);
      return false;
    }
  }

  async function clearStoredResponses() {
    localStorage.removeItem(storageKey);

    try {
      await fetch('/api/ai-council/draft', {
        method: 'DELETE',
        credentials: 'include'
      });
      console.log('🗑️ Cleared draft from Supabase');
    } catch (e) {
      console.warn('Could not clear Supabase draft:', e);
    }

    console.log('🗑️ Cleared stored responses');
  }

  return { saveResponsesToStorage, loadResponsesFromStorage, clearStoredResponses };
}
