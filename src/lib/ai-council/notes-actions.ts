import type { AiCouncilSession, CurrentResponses } from './types';

type NotesActionsOptions = {
  notesSidebar: HTMLElement | null;
  notesToggle: HTMLElement | null;
  getSessions: () => AiCouncilSession[];
  getUserIsLoggedIn: () => boolean;
  getUseSupabase: () => boolean;
  loadSessions: () => Promise<void>;
  getCurrentPrompt: () => string;
  getCurrentResponses: () => CurrentResponses;
  contextEl: HTMLTextAreaElement | HTMLInputElement | null;
  synthesisModelEl: HTMLSelectElement | HTMLInputElement | null;
  saveSession: (data: {
    prompt: string;
    context: string;
    responses: any;
    synthesis: string;
    synthesisModel: string;
    totalDuration: number;
  }) => Promise<boolean> | boolean;
  copyToClipboard: (text: string, btn?: HTMLElement) => void;
};

export function initNotesActions({
  notesSidebar,
  notesToggle,
  getSessions,
  getUserIsLoggedIn,
  getUseSupabase,
  loadSessions,
  getCurrentPrompt,
  getCurrentResponses,
  contextEl,
  synthesisModelEl,
  saveSession,
  copyToClipboard
}: NotesActionsOptions) {
  const savedSidebarState = localStorage.getItem('ai-council-sidebar-collapsed');
  if (savedSidebarState === 'true') {
    notesSidebar?.classList.add('collapsed');
  }
  let handlersAttached = false;

  notesToggle?.addEventListener('click', () => {
    if (!notesSidebar) return;
    notesSidebar.classList.toggle('collapsed');
    localStorage.setItem('ai-council-sidebar-collapsed', String(notesSidebar.classList.contains('collapsed')));
  });

  document.getElementById('exportNotes')?.addEventListener('click', () => {
    const sessions = getSessions();
    if (sessions.length === 0) { alert('Inga sessioner att exportera.'); return; }

    let md = '# AI Council Sessioner\n\nExporterad: ' + new Date().toLocaleString('sv-SE') + '\n\n---\n\n';
    sessions.forEach(s => {
      md += '## ' + new Date(s.created_at || 0).toLocaleString('sv-SE') + '\n\n';
      md += '**Prompt:** ' + (s.prompt || '') + '\n\n';
      md += '**Syntes-modell:** ' + (s.synthesis_model || '') + '\n\n';
      md += (s.synthesis || '') + '\n\n---\n\n';
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ai-council-' + new Date().toISOString().split('T')[0] + '.md';
    a.click();
  });

  document.getElementById('clearNotes')?.addEventListener('click', async () => {
    if (!getUserIsLoggedIn() || !getUseSupabase()) {
      alert('Du måste vara inloggad för att rensa sessioner.');
      return;
    }

    if (!confirm('Vill du radera ALLA sessioner permanent? Detta kan inte ångras.')) return;

    try {
      const sessions = getSessions();
      for (const s of sessions) {
        await fetch('/api/ai-council/sessions?id=' + s.id, { method: 'DELETE', credentials: 'include' });
      }
      localStorage.removeItem('ai-council-sessions');
      await loadSessions();
    } catch (e) {
      console.error('Clear error:', e);
      alert('Kunde inte radera alla sessioner.');
    }
  });

  if (!handlersAttached) {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const accordionHeader = target.closest('.accordion-header') as HTMLElement | null;
      if (accordionHeader) {
        const isNotesAccordion = !!accordionHeader.closest('#notesSidebar');
        if (isNotesAccordion) {
          accordionHeader.closest('.accordion')?.classList.toggle('open');
        }
        return;
      }

      const copyBtn = target.closest('.copy-btn[data-copy]') as HTMLElement | null;
      if (copyBtn) {
        e.stopPropagation();
        const key = copyBtn.dataset.copy || '';
        const currentResponses = getCurrentResponses() as Record<string, any>;
        const text = currentResponses[key];
        if (text) copyToClipboard(text, copyBtn);
      }
    });
    handlersAttached = true;
  }

  document.getElementById('copySynthesis')?.addEventListener('click', function() {
    const synthesis = getCurrentResponses().synthesis;
    if (synthesis) copyToClipboard(synthesis, this as HTMLElement);
  });

  document.getElementById('copySynthesisFloat')?.addEventListener('click', function() {
    const synthesis = getCurrentResponses().synthesis;
    if (synthesis) copyToClipboard(synthesis, this as HTMLElement);
  });

  document.getElementById('exportMarkdown')?.addEventListener('click', () => {
    const currentResponses = getCurrentResponses();
    const currentPrompt = getCurrentPrompt();
    const hasResults = currentResponses.synthesis || (currentResponses.rawResponses && currentResponses.rawResponses.length > 0);
    if (!hasResults || !currentPrompt) {
      alert('Ingen session att exportera.');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleString('sv-SE');
    const fileDate = now.toISOString().split('T')[0];

    const profileSelect = document.getElementById('profileSelect') as HTMLSelectElement | null;
    const profileName = profileSelect?.options?.[profileSelect.selectedIndex]?.text || '';

    const synthLabelEl = document.getElementById('synthesisModelLabel');
    const synthLabel = synthLabelEl?.textContent || '';

    const usedModels: string[] = [];
    ['openai', 'anthropic', 'google', 'xai'].forEach(provider => {
      const checkbox = document.querySelector(`input[value="${provider}"]`) as HTMLInputElement | null;
      if (checkbox && checkbox.checked) {
        const label = { openai: 'OpenAI GPT-5.2', anthropic: 'Claude Sonnet', google: 'Gemini 2.0 Flash', xai: 'Grok 4' }[provider];
        if (label) usedModels.push(label);
      }
    });

    const deliberationEnabled = (document.getElementById('enableDeliberation') as HTMLInputElement | null)?.checked;

    const costBanner = document.getElementById('costBannerAmount');
    const costSek = document.getElementById('costBannerSek');
    const costInfo = costBanner ? `${costBanner.textContent} ${costSek ? costSek.textContent : ''}` : 'N/A';

    const totalDuration = document.getElementById('totalDuration')?.textContent || 'N/A';

    let md = `# AI Council Session\n\n`;
    md += `**Datum:** ${dateStr}\n`;
    md += `**Profil:** ${profileName}\n`;
    md += `**Modeller:** ${usedModels.join(', ')}\n`;
    md += `**Syntesmodell:** ${synthLabel}\n`;
    md += `**Deliberation:** ${deliberationEnabled ? 'Ja (Runda 2)' : 'Nej'}\n`;
    md += `**Kostnad:** ${costInfo}\n`;
    md += `**Total tid:** ${totalDuration}\n\n`;

    md += `---\n\n`;
    md += `## Frågeställning\n\n${currentPrompt}\n\n`;

    const context = contextEl?.value || '';
    if (context && context.trim()) {
      md += `## Kontext\n\n${context.trim()}\n\n`;
    }

    const hallucinationReport = document.getElementById('hallucinationReport');
    if (hallucinationReport && hallucinationReport.style.display !== 'none' && deliberationEnabled) {
      const status = document.getElementById('hallucinationStatus')?.textContent || '';
      const highCount = document.querySelector('#hallucinationHigh .count-num')?.textContent || '0';
      const medCount = document.querySelector('#hallucinationMedium .count-num')?.textContent || '0';
      const lowCount = document.querySelector('#hallucinationLow .count-num')?.textContent || '0';

      md += `## Trovärdighetsrapport\n\n`;
      md += `**Status:** ${status}\n\n`;
      md += `| Säkerhet | Antal |\n`;
      md += `|----------|-------|\n`;
      md += `| 🔴 Hög | ${highCount} |\n`;
      md += `| 🟡 Medium | ${medCount} |\n`;
      md += `| ⚪ Låg | ${lowCount} |\n\n`;
    }

    md += `---\n\n`;

    if (currentResponses.synthesis) {
      const synthType = deliberationEnabled ? 'SUPERSYNTES' : 'Syntes';
      md += `## ${synthType}\n\n${currentResponses.synthesis}\n\n`;
      md += `---\n\n`;
    } else {
      md += `> *Syntes hoppades över (debug-läge)*\n\n`;
      md += `---\n\n`;
    }

    md += `## Individuella svar\n\n`;

    const modelNames: Record<string, string> = {
      openai: 'OpenAI GPT-5.2',
      anthropic: 'Claude Sonnet',
      google: 'Gemini 2.0 Flash',
      grok: 'Grok 4'
    };

    ['openai', 'anthropic', 'google', 'grok'].forEach(provider => {
      if (currentResponses[provider]) {
        md += `### ${modelNames[provider]}\n\n`;
        md += `${currentResponses[provider]}\n\n`;
      }
    });

    if (deliberationEnabled) {
      const r2Keys: Record<string, string> = { openai: 'r2-openai', anthropic: 'r2-anthropic', google: 'r2-google', grok: 'r2-grok' };
      const hasDeliberation = Object.values(r2Keys).some(k => currentResponses[k]);
      if (hasDeliberation) {
        md += `---\n\n`;
        md += `## Deliberation (Runda 2)\n\n`;
        Object.entries(r2Keys).forEach(([provider, r2Key]) => {
          if (currentResponses[r2Key]) {
            md += `### ${modelNames[provider]} - Granskning\n\n`;
            md += `${currentResponses[r2Key]}\n\n`;
          }
        });
      }
    }

    md += `---\n\n*Exporterad från AI Council v2.6*\n`;

    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ai-council-${fileDate}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('saveSynthesis')?.addEventListener('click', async function() {
    const currentResponses = getCurrentResponses();
    const currentPrompt = getCurrentPrompt();
    const hasResults = currentResponses.synthesis || (currentResponses.rawResponses && currentResponses.rawResponses.length > 0);
    if (!hasResults || !currentPrompt) return;

    const btn = this as HTMLButtonElement;
    btn.disabled = true;

    await saveSession({
      prompt: currentPrompt,
      context: contextEl?.value || '',
      responses: currentResponses.rawResponses,
      synthesis: currentResponses.synthesis || '',
      synthesisModel: synthesisModelEl?.value || '',
      totalDuration: currentResponses.totalDuration || 0
    });

    btn.classList.add('saved');
    const label = btn.querySelector('span');
    if (label) label.textContent = 'Sparat!';
    setTimeout(() => {
      btn.classList.remove('saved');
      if (label) label.textContent = 'Spara';
      btn.disabled = false;
    }, 2000);
  });
}
