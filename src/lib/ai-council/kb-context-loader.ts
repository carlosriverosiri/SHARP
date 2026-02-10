type KbContextLoaderOptions = {
  contextEl: HTMLTextAreaElement | HTMLInputElement | null;
  setStatus: (text: string, show: boolean) => void;
};

type KbContextResponse = {
  context?: string;
  project?: { name: string };
  estimatedTokens?: number;
  itemCount?: number;
  isLarge?: boolean;
  error?: string;
};

export function initKbContextLoader({ contextEl, setStatus }: KbContextLoaderOptions) {
  async function loadFromUrlParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const kbProjectId = urlParams.get('kb_project');

    if (!kbProjectId) return;

    console.log('📚 Loading Kunskapsbas project context:', kbProjectId);
    try {
      const response = await fetch(`/api/kunskapsbas/context?project_id=${kbProjectId}`);
      const data = await response.json() as KbContextResponse;

      if (data.context && data.project) {
        if (contextEl) contextEl.value = data.context;

        const estimatedTokens = data.estimatedTokens || 0;
        const tokenStr = estimatedTokens > 1000
          ? `${Math.round(estimatedTokens / 1000)}k tokens`
          : `${estimatedTokens} tokens`;
        let statusMsg = `📚 "${data.project.name}" (${data.itemCount || 0} dok, ~${tokenStr})`;
        if (data.isLarge) {
          statusMsg += ' ⚠️ Stor kontext - kan ta tid';
        }
        setStatus(statusMsg, true);
        setTimeout(() => setStatus('', false), 8000);

        console.log('✅ Kunskapsbas context loaded:', data.itemCount || 0, 'items,', estimatedTokens, 'tokens');
      } else if (data.error) {
        console.warn('Could not load Kunskapsbas context:', data.error);
      }
    } catch (error) {
      console.error('Error loading Kunskapsbas context:', error);
    }
  }

  return { loadFromUrlParam };
}
