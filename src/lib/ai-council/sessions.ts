import type { AiCouncilSession } from './types';

type SessionsInitOptions = {
  notesList: HTMLElement | null;
  notesSync: HTMLElement | null;
  notesSidebar: HTMLElement | null;
  promptEl: HTMLTextAreaElement | null;
  renderMarkdown: (text: string) => string;
  escapeHtml: (text: string) => string;
  copyToClipboard?: (text: string, btn?: HTMLElement) => void;
  updateNotesBadge?: () => void;
  showLogoutBanner?: () => void;
  getSessions: () => AiCouncilSession[];
  setSessions: (sessions: AiCouncilSession[]) => void;
  getUserIsLoggedIn: () => boolean;
  setUserIsLoggedIn: (value: boolean) => void;
  getUseSupabase: () => boolean;
  setUseSupabase: (value: boolean) => void;
  getKbProjectMap: () => Record<string, string>;
  getCurrentProjectFilter: () => string;
  pickProject?: (options?: { title?: string }) => Promise<{ id: string; name: string } | null>;
};

export function initSessions({
  notesList,
  notesSync,
  notesSidebar,
  promptEl,
  renderMarkdown,
  escapeHtml,
  copyToClipboard,
  updateNotesBadge,
  showLogoutBanner,
  getSessions,
  setSessions,
  getUserIsLoggedIn,
  setUserIsLoggedIn,
  getUseSupabase,
  setUseSupabase,
  getKbProjectMap,
  getCurrentProjectFilter,
  pickProject
}: SessionsInitOptions) {
  let lastSavedSessionId: string | null = null;
  let currentFilter = 'all';
  let notesListHandlersAttached = false;
  const urlSessionId = new URLSearchParams(window.location.search).get('session_id');
  let openedSessionFromUrl = false;

  const safeCopy = (text: string, btn?: HTMLElement) => {
    if (typeof copyToClipboard === 'function') {
      copyToClipboard(text, btn);
    } else {
      navigator.clipboard.writeText(text);
    }
  };

  function setNotesSyncStatus(state: string, label: string, title?: string) {
    if (!notesSync) return;
    const icons: Record<string, string> = {
      synced: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="9 12 12 15 17 10"></polyline></svg>',
      warning: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
      error: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      loading: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>'
    };
    notesSync.className = 'notes-sync' + (state ? ' ' + state : '');
    notesSync.innerHTML = `${icons[state] || icons.loading}<span>${label}</span>`;
    notesSync.title = title || label;
  }

  function disableSaveFeatures() {
    const saveBtn = document.getElementById('saveSessionBtn') as HTMLButtonElement | null;
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.title = 'Logga in för att spara sessioner';
      saveBtn.style.opacity = '0.5';
      saveBtn.style.cursor = 'not-allowed';
    }
    const autoSaveCheckbox = document.getElementById('enableAutoSave') as HTMLInputElement | null;
    if (autoSaveCheckbox) {
      autoSaveCheckbox.disabled = true;
      autoSaveCheckbox.checked = false;
    }
  }

  function enableSaveFeatures() {
    const saveBtn = document.getElementById('saveSessionBtn') as HTMLButtonElement | null;
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.title = 'Spara session';
      saveBtn.style.opacity = '1';
      saveBtn.style.cursor = 'pointer';
    }
    const autoSaveCheckbox = document.getElementById('enableAutoSave') as HTMLInputElement | null;
    if (autoSaveCheckbox) {
      autoSaveCheckbox.disabled = false;
    }
  }

  function checkAndOfferMigration() {
    const localSessions = JSON.parse(localStorage.getItem('ai-council-sessions') || '[]');
    if (localSessions.length === 0) return;

    document.querySelector('.migration-banner')?.remove();

    const banner = document.createElement('div');
    banner.className = 'migration-banner';
    banner.innerHTML = `
      <div class="migration-icon">💾</div>
      <div class="migration-text">
        <strong>${localSessions.length} lokala sessioner hittades</strong>
        <span>Dessa finns bara i denna webbläsare</span>
      </div>
      <div class="migration-actions">
        ${getUserIsLoggedIn() ? '<button id="migrateSessions" class="btn-migrate">Spara till molnet ☁️</button>' : ''}
        <button id="discardLocalSessions" class="btn-discard">Radera</button>
      </div>
    `;

    if (notesList?.parentNode) {
      notesList.parentNode.insertBefore(banner, notesList);
    }

    if (getUserIsLoggedIn()) {
      document.getElementById('migrateSessions')?.addEventListener('click', migrateLocalSessions);
    }
    document.getElementById('discardLocalSessions')?.addEventListener('click', discardLocalSessions);
  }

  async function migrateLocalSessions() {
    const localSessions = JSON.parse(localStorage.getItem('ai-council-sessions') || '[]');
    if (localSessions.length === 0) return;

    const btn = document.getElementById('migrateSessions') as HTMLButtonElement | null;
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Migrerar...';
    }

    let migrated = 0;
    let failed = 0;

    for (const session of localSessions) {
      try {
        let responsesArray: any[] = [];
        if (session.responses) {
          if (Array.isArray(session.responses)) {
            responsesArray = session.responses;
          } else {
            for (const [key, value] of Object.entries(session.responses)) {
              if (value && typeof value === 'object') {
                let provider = 'Unknown';
                if (key.includes('gpt') || key.includes('openai') || key === 'gpt-5' || key.includes('gpt-5')) provider = 'OpenAI';
                else if (key.includes('claude') || key.includes('anthropic')) provider = 'Anthropic';
                else if (key.includes('gemini') || key.includes('google')) provider = 'Google';
                else if (key.includes('grok') || key.includes('xai')) provider = 'xAI';
                else if (key.includes('deepseek')) provider = 'DeepSeek';

                responsesArray.push({
                  ...(value as object),
                  provider,
                  model: key
                });
              }
            }
          }
        }

        const res = await fetch('/api/ai-council/sessions', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: session.prompt,
            context: session.context,
            responses: responsesArray,
            synthesis: session.synthesis,
            supersynthesis: session.supersynthesis,
            name: session.name,
            synthesisModel: session.synthesis_model
          })
        });
        if (res.ok) migrated++;
        else {
          const errData = await res.json().catch(() => ({}));
          console.error('Migration failed for session:', session.id, errData);
          failed++;
        }
      } catch (e) {
        console.error('Migration error:', e);
        failed++;
      }
    }

    if (failed === 0) {
      localStorage.removeItem('ai-council-sessions');
      alert('✅ ' + migrated + ' sessioner sparade till molnet!');
      document.querySelector('.migration-banner')?.remove();
    } else {
      alert(migrated + ' sparade, ' + failed + ' misslyckades. Försök igen.');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Försök igen';
      }
    }

    await loadSessions();
  }

  function discardLocalSessions() {
    if (confirm('Är du säker? De lokala sessionerna raderas permanent och kan inte återställas.')) {
      localStorage.removeItem('ai-council-sessions');
      document.querySelector('.migration-banner')?.remove();
      alert('Lokala sessioner raderade.');
    }
  }

  async function loadSessions() {
    setNotesSyncStatus('loading', 'Laddar...');

    try {
      const res = await fetch('/api/ai-council/sessions', { credentials: 'include' });
      const data = await res.json();

      if (data.error && (data.error.includes('Ej inloggad') || data.error.includes('användare'))) {
        setUserIsLoggedIn(false);
        setUseSupabase(false);
        setSessions([]);
        setNotesSyncStatus('warning', 'Logga in', 'Du måste vara inloggad för att spara sessioner.');
        console.warn('Auth error:', data.error);
        showLogoutBanner?.();
        disableSaveFeatures();
        checkAndOfferMigration();
      } else if (data.error && data.error.includes('ej konfigurerat')) {
        setUserIsLoggedIn(false);
        setUseSupabase(false);
        setSessions([]);
        setNotesSyncStatus('error', 'Ej konfigurerat');
        disableSaveFeatures();
      } else if (data.sessions) {
        setUserIsLoggedIn(true);
        setUseSupabase(true);
        setSessions(data.sessions);
        setNotesSyncStatus('synced', 'Synkad');
        enableSaveFeatures();
        checkAndOfferMigration();
      } else {
        setUserIsLoggedIn(true);
        setUseSupabase(true);
        setSessions([]);
        setNotesSyncStatus('synced', 'Redo');
        enableSaveFeatures();
        checkAndOfferMigration();
      }
    } catch (e) {
      setUserIsLoggedIn(false);
      setUseSupabase(false);
      setSessions([]);
      setNotesSyncStatus('error', 'Anslutningsfel');
      console.error('Session load error:', e);
      disableSaveFeatures();
    }

    renderSessions();

    if (urlSessionId && !openedSessionFromUrl) {
      const match = getSessions().find((s) => s.id === urlSessionId);
      if (match) {
        openedSessionFromUrl = true;
        openFullSessionModal(match);
      }
    }
  }

  async function saveSession(data: any) {
    if (!getUserIsLoggedIn() || !getUseSupabase()) {
      alert('Du måste vara inloggad för att spara sessioner.\n\nGå till /personal för att logga in.');
      return false;
    }

    try {
      const res = await fetch('/api/ai-council/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      const result = await res.json();

      if (result.success) {
        await loadSessions();
        const sessions = getSessions();
        if (sessions.length > 0) {
          lastSavedSessionId = sessions[0].id || null;
          renderSessions();
          if (notesSidebar?.classList.contains('collapsed')) {
            notesSidebar.classList.remove('collapsed');
            localStorage.setItem('ai-council-sidebar-collapsed', 'false');
          }
          setTimeout(() => { lastSavedSessionId = null; }, 2500);
        }
        return true;
      }

      console.error('Save failed:', result.error);
      alert('Kunde inte spara sessionen: ' + (result.error || 'Okänt fel'));
      return false;
    } catch (e) {
      console.error('Save error:', e);
      alert('Kunde inte spara sessionen. Kontrollera din internetanslutning.');
      return false;
    }
  }

  // Delete confirmation modal
  const deleteConfirmModal = document.getElementById('deleteConfirmModal');
  const deleteConfirmName = document.getElementById('deleteConfirmName');
  const deleteConfirmDate = document.getElementById('deleteConfirmDate');
  let pendingDeleteId: string | null = null;

  function showDeleteConfirm(session: any) {
    pendingDeleteId = session.id;
    const name = session.name || (session.prompt ? session.prompt.substring(0, 60) + (session.prompt.length > 60 ? '...' : '') : 'Namnlös session');
    if (deleteConfirmName) deleteConfirmName.textContent = name;

    const date = new Date(session.created_at);
    const dateStr = date.toLocaleString('sv-SE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    if (deleteConfirmDate) deleteConfirmDate.textContent = dateStr;
    deleteConfirmModal?.classList.add('open');
  }

  function closeDeleteConfirm() {
    deleteConfirmModal?.classList.remove('open');
    pendingDeleteId = null;
  }

  document.getElementById('deleteConfirmCancel')?.addEventListener('click', closeDeleteConfirm);
  deleteConfirmModal?.addEventListener('click', (e) => { if (e.target === deleteConfirmModal) closeDeleteConfirm(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && deleteConfirmModal?.classList.contains('open')) closeDeleteConfirm(); });

  document.getElementById('deleteConfirmDelete')?.addEventListener('click', async () => {
    if (!pendingDeleteId) return;

    const id = pendingDeleteId;
    closeDeleteConfirm();

    try {
      const res = await fetch('/api/ai-council/sessions?id=' + id, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Kunde inte radera');
      }

      await loadSessions();
    } catch (e: any) {
      console.error('Delete error:', e);
      alert('Kunde inte radera sessionen: ' + e.message);
    }
  });

  // Inline edit session name
  let currentEditingNameEl: HTMLElement | null = null;

  function startInlineEdit(nameEl: HTMLElement) {
    if (nameEl === currentEditingNameEl) return;
    if (currentEditingNameEl) {
      finishInlineEdit(currentEditingNameEl, false);
    }

    const sessionId = nameEl.dataset.sessionId;
    const session = getSessions().find((s) => s.id === sessionId);
    if (!session) return;

    currentEditingNameEl = nameEl;

    const currentName = session.name || '';
    nameEl.contentEditable = 'true';
    nameEl.classList.add('editing');
    nameEl.classList.remove('note-item-name-placeholder');
    nameEl.textContent = currentName;
    nameEl.focus();

    const range = document.createRange();
    range.selectNodeContents(nameEl);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    nameEl.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        finishInlineEdit(nameEl, true);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        finishInlineEdit(nameEl, false);
      }
    };

    nameEl.onblur = () => {
      setTimeout(() => {
        if (currentEditingNameEl === nameEl) {
          finishInlineEdit(nameEl, true);
        }
      }, 100);
    };
  }

  async function finishInlineEdit(nameEl: HTMLElement, save: boolean) {
    const sessionId = nameEl.dataset.sessionId;
    const session = getSessions().find((s) => s.id === sessionId);
    const newName = nameEl.textContent?.trim() || '';

    nameEl.contentEditable = 'false';
    nameEl.classList.remove('editing');
    nameEl.onkeydown = null;
    nameEl.onblur = null;
    currentEditingNameEl = null;

    if (save && session) {
      const oldName = session.name || '';

      if (newName !== oldName) {
        session.name = newName || null;

        if (newName) {
          nameEl.textContent = newName;
          nameEl.classList.remove('note-item-name-placeholder');
        } else {
          nameEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 4px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>Namnge session...';
          nameEl.classList.add('note-item-name-placeholder');
        }

        try {
          const response = await fetch(`/api/ai-council/sessions?id=${sessionId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName || null })
          });

          if (!response.ok) {
            throw new Error('Kunde inte spara');
          }
        } catch (err) {
          console.error('Failed to save session name:', err);
          session.name = oldName;
          if (oldName) {
            nameEl.textContent = oldName;
            nameEl.classList.remove('note-item-name-placeholder');
          } else {
            nameEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 4px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>Namnge session...';
            nameEl.classList.add('note-item-name-placeholder');
          }
        }
      }
    } else {
      if (session && session.name) {
        nameEl.textContent = session.name;
        nameEl.classList.remove('note-item-name-placeholder');
      } else {
        nameEl.textContent = '✏️ Namnge session...';
        nameEl.classList.add('note-item-name-placeholder');
      }
    }
  }

  async function saveToKnowledgeBase(session: any) {
    if (!getUserIsLoggedIn()) {
      alert('Du måste vara inloggad för att spara till kunskapsbasen.');
      return;
    }

    if (!pickProject) {
      console.warn('Project picker not available');
      return;
    }

    const project = await pickProject({ title: '📁 Spara session till projekt' });
    if (!project) return;

    try {
      const content = session.supersynthesis || session.synthesis ||
        (session.responses ? Object.values(session.responses).map((r: any) => r.content).join('\n\n---\n\n') : '');

      const title = session.name || ('AI-session ' + new Date(session.created_at).toLocaleString('sv-SE'));

      const saveRes = await fetch('/api/kunskapsbas/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          project_id: project.id,
          category: 'ai_fragor',
          title: title,
          content: '## Prompt\n\n' + (session.prompt || '') + '\n\n## Svar\n\n' + content,
          summary: (session.prompt || '').substring(0, 200),
          metadata: {
            session_id: session.id,
            models: session.selected_models || [],
            has_synthesis: !!session.synthesis,
            has_supersynthesis: !!session.supersynthesis
          }
        })
      });

      if (saveRes.ok) {
        alert('✅ Session sparad!\n\nProjekt: ' + project.name);
      } else {
        const errData = await saveRes.json();
        alert('Fel: ' + (errData.error || 'Kunde inte spara'));
      }
    } catch (e) {
      console.error('Error saving to KB:', e);
      alert('Något gick fel vid sparande till kunskapsbasen.');
    }
  }

  async function deleteSession(id: string) {
    if (!getUserIsLoggedIn() || !getUseSupabase()) {
      alert('Du måste vara inloggad för att radera sessioner.');
      return;
    }

    const session = getSessions().find((s) => s.id === id);
    if (session) {
      showDeleteConfirm(session);
    }
  }

  document.querySelectorAll('.notes-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentFilter = (btn as HTMLElement).dataset.filter || 'all';
      document.querySelectorAll('.notes-filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderSessions();
    });
  });

  function renderSessions() {
    if (!notesList) return;
    const sessions = getSessions();
    if (sessions.length === 0) {
      notesList.innerHTML = '<div class="notes-empty">Ingen historik ännu.</div>';
      return;
    }

    const icons = {
      eye: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
      copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
      trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
      arrow: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
      star: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',
      lightbulb: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>',
      chat: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',
      kb: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>'
    };

    const kbProjectMap = getKbProjectMap();
    const currentProjectFilter = getCurrentProjectFilter();

    let projectFilteredSessions = sessions;
    if (currentProjectFilter !== 'all') {
      if (currentProjectFilter === 'unsorted') {
        projectFilteredSessions = sessions.filter((s) => !s.kb_project_id);
      } else {
        projectFilteredSessions = sessions.filter((s) => s.kb_project_id === currentProjectFilter);
      }
    }

    let filteredSessions = sessions;
    if (currentFilter !== 'all') {
      filteredSessions = projectFilteredSessions.filter((s) => {
        if (currentFilter === 'supersynthesis') return s.supersynthesis;
        if (currentFilter === 'synthesis') return s.synthesis && !s.supersynthesis;
        if (currentFilter === 'response') return !s.synthesis && !s.supersynthesis;
        return true;
      });
    } else {
      filteredSessions = projectFilteredSessions;
    }

    if (filteredSessions.length === 0) {
      const filterLabels: Record<string, string> = { all: 'inga', supersynthesis: 'inga supersynteser', synthesis: 'inga synteser', response: 'inga enkelsvar' };
      notesList.innerHTML = '<div class="notes-empty">Hittade ' + filterLabels[currentFilter] + '.</div>';
      return;
    }

    notesList.innerHTML = filteredSessions.map((s, index) => {
      const date = new Date(s.created_at || 0);
      const timeStr = date.toLocaleString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      let answerText = '';
      let typeIcon = icons.chat;
      let typeLabel = '';
      let typeClass = 'type-response';
      if (s.supersynthesis) {
        answerText = s.supersynthesis;
        typeIcon = icons.star;
        typeClass = 'type-supersynthesis';
      } else if (s.synthesis) {
        answerText = s.synthesis;
        typeIcon = icons.lightbulb;
        typeClass = 'type-synthesis';
      } else if (s.responses) {
        const firstResponse = Object.values(s.responses)[0] as any;
        if (firstResponse && firstResponse.content) {
          answerText = firstResponse.content;
        }
      }

      const promptPreview = (s.prompt || '').substring(0, 50).trim();
      const projectId = s.kb_project_id || '';
      const projectName = s.kb_project_name || (projectId ? kbProjectMap[projectId] : '') || (projectId ? 'Okänt projekt' : 'Övrigt');
      const projectBadge = projectName ? '<span class="note-item-project" title="' + escapeHtml(projectName) + '">' + icons.kb + '</span>' : '';
      const hasName = s.name && s.name.trim();
      const isNew = (index === 0 && lastSavedSessionId === s.id);

      const titleHTML = hasName
        ? '<div class="note-item-name" data-session-id="' + s.id + '" title="Klicka för att redigera">' + escapeHtml(s.name || '') + '</div>'
        : '<div class="note-item-name note-item-name-placeholder" data-session-id="' + s.id + '" title="Klicka för att namnge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: -1px; margin-right: 4px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>Namnge session...</div>';

      const typeTitle = typeClass === 'type-supersynthesis' ? 'SUPERSYNTES' : typeClass === 'type-synthesis' ? 'SYNTES' : 'SVAR';
      return '<div class="note-item ' + typeClass + (isNew ? ' new-item' : '') + '" data-id="' + s.id + '" data-preview="' + escapeHtml((answerText || '').substring(0, 200)) + '">' +
        '<div class="note-item-header">' +
          '<span class="note-item-time">' + timeStr + '</span>' +
          projectBadge +
          '<span class="note-item-type-badge ' + typeClass + '" title="' + typeTitle + '"><span class="note-item-type-icon">' + typeIcon + '</span>' + typeLabel + '</span>' +
          '<div class="note-item-actions">' +
            '<button class="note-item-btn" data-action="view" title="Visa" aria-label="Visa session">' + icons.eye + '</button>' +
            '<button class="note-item-btn" data-action="copy" title="Kopiera" aria-label="Kopiera till urklipp">' + icons.copy + '</button>' +
            '<button class="note-item-btn" data-action="kb" title="Spara i projekt" aria-label="Spara i projekt">' + icons.kb + '</button>' +
            '<button class="note-item-btn" data-action="delete" title="Radera" aria-label="Radera session">' + icons.trash + '</button>' +
          '</div>' +
        '</div>' +
        titleHTML +
        '<div class="note-item-prompt"><span class="note-item-arrow">' + icons.arrow + '</span> ' + escapeHtml(promptPreview) + (promptPreview.length >= 50 ? '...' : '') + '</div>' +
      '</div>';
    }).join('');

    if (!notesListHandlersAttached && notesList) {
      notesList.addEventListener('click', (e) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const actionBtn = target.closest('.note-item-btn') as HTMLElement | null;
        if (actionBtn) {
          e.stopPropagation();
          const item = actionBtn.closest('.note-item') as HTMLElement | null;
          const id = item?.dataset.id || '';
          const action = actionBtn.dataset.action;

          if (action === 'delete') deleteSession(id);
          else if (action === 'copy') {
            const session = getSessions().find((s) => s.id === id);
            if (session) {
              const textToCopy = session.supersynthesis || session.synthesis || session.prompt || '';
              safeCopy(textToCopy, actionBtn as HTMLElement);
            }
          } else if (action === 'view') {
            const session = getSessions().find((s) => s.id === id);
            if (session) openFullSessionModal(session);
          } else if (action === 'kb') {
            const session = getSessions().find((s) => s.id === id);
            if (session) saveToKnowledgeBase(session);
          }
          return;
        }

        const nameEl = target.closest('.note-item-name') as HTMLElement | null;
        if (nameEl) {
          e.stopPropagation();
          startInlineEdit(nameEl);
          return;
        }

        const item = target.closest('.note-item') as HTMLElement | null;
        if (item) {
          const session = getSessions().find((s) => s.id === item.dataset.id);
          if (session) openSessionModal(session);
        }
      });

      notesList.addEventListener('mouseover', (e) => {
        const target = e.target as HTMLElement | null;
        const badge = target?.closest('.note-item-type-badge, .note-item-project') as HTMLElement | null;
        if (!badge) return;
        const item = badge.closest('.note-item') as HTMLElement | null;
        if (!item) return;
        if (!item.dataset.previewBackup) item.dataset.previewBackup = item.dataset.preview || '';
        item.dataset.preview = '';
      });

      notesList.addEventListener('mouseout', (e) => {
        const target = e.target as HTMLElement | null;
        const badge = target?.closest('.note-item-type-badge, .note-item-project') as HTMLElement | null;
        if (!badge) return;
        const related = e.relatedTarget as Node | null;
        if (related && badge.contains(related)) return;
        const item = badge.closest('.note-item') as HTMLElement | null;
        if (!item) return;
        if (item.dataset.previewBackup !== undefined) {
          item.dataset.preview = item.dataset.previewBackup;
          delete item.dataset.previewBackup;
        }
      });

      notesListHandlersAttached = true;
    }

    if (typeof updateNotesBadge === 'function') {
      updateNotesBadge();
    }
  }

  // Session modal
  let currentModalSession: any = null;
  const sessionModal = document.getElementById('sessionModal');
  const sessionModalPrompt = document.getElementById('sessionModalPrompt');
  const sessionModalSynthesis = document.getElementById('sessionModalSynthesis');
  const sessionModalMeta = document.getElementById('sessionModalMeta');
  const sessionModalMetaPanel = document.getElementById('sessionModalMetaPanel');

  const modelDisplayNames: Record<string, string> = {
    openai: 'OpenAI GPT-5.2',
    anthropic: 'Claude',
    google: 'Gemini',
    grok: 'Grok'
  };
  const profileDisplayNames: Record<string, string> = {
    snabb: '⚡ Snabb',
    patient: '🏥 Patient',
    kodning: '💻 Kodning',
    vetenskap: '🔬 Vetenskap',
    strategi: '📊 Strategi',
    custom: '🔧 Anpassad'
  };
  const synthesisModelDisplayNames: Record<string, string> = {
    claude: 'Claude Sonnet',
    'claude-opus': 'Claude Opus 4.5',
    openai: 'OpenAI GPT-5.2',
    gpt4o: 'GPT-4o',
    gemini: 'Gemini',
    grok: 'Grok'
  };

  function buildMetaPanelHTML(session: any) {
    const date = new Date(session.created_at);
    const dateStr = date.toLocaleString('sv-SE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const kbProjectMap = getKbProjectMap();
    const projectName = session.kb_project_name || kbProjectMap[session.kb_project_id] || (session.kb_project_id ? 'Okänt projekt' : 'Övrigt');

    let modelsHTML = '<div class="meta-panel-models">';
    if (session.selected_models && session.selected_models.length > 0) {
      session.selected_models.forEach((m: string) => {
        modelsHTML += '<span class="meta-model-dot ' + m + '" title="' + (modelDisplayNames[m] || m) + '"></span>';
      });
      modelsHTML += '<span style="margin-left: 0.25rem; font-size: 0.8rem;">' + session.selected_models.map((m: string) => modelDisplayNames[m] || m).join(', ') + '</span>';
    } else if (session.responses) {
      const providers = Object.keys(session.responses);
      providers.forEach((p) => {
        const key = p.toLowerCase().includes('openai') ? 'openai' :
          p.toLowerCase().includes('claude') || p.toLowerCase().includes('anthropic') ? 'anthropic' :
          p.toLowerCase().includes('gemini') || p.toLowerCase().includes('google') ? 'google' :
          p.toLowerCase().includes('grok') ? 'grok' : 'unknown';
        modelsHTML += '<span class="meta-model-dot ' + key + '" title="' + p + '"></span>';
      });
      modelsHTML += '<span style="margin-left: 0.25rem; font-size: 0.8rem;">' + providers.join(', ') + '</span>';
    } else {
      modelsHTML += '<span style="color: var(--text-muted);">Ej sparat</span>';
    }
    modelsHTML += '</div>';

    const profileName = session.profile ? (profileDisplayNames[session.profile] || session.profile) : 'Ej sparat';
    const synthModel = session.synthesis_model ? (synthesisModelDisplayNames[session.synthesis_model] || session.synthesis_model) : 'Ej sparat';

    const hasDelib = session.deliberation_enabled || (session.round2_responses && Object.keys(session.round2_responses).length > 0);
    const delibHTML = hasDelib ?
      '<span class="meta-deliberation-yes">✓ Ja (Runda 2)</span>' :
      '<span class="meta-deliberation-no">Nej</span>';

    let costHTML = 'Ej sparat';
    if (session.total_cost) {
      const usd = session.total_cost;
      const sek = usd * 10.5;
      costHTML = `$${usd.toFixed(4)} (~${sek.toFixed(2)} kr)`;
    }

    return `
      <div class="meta-panel-item">
        <span class="meta-panel-label">Datum</span>
        <span class="meta-panel-value">${dateStr}</span>
      </div>
      <div class="meta-panel-item">
        <span class="meta-panel-label">Projekt</span>
        <span class="meta-panel-value">${escapeHtml(projectName)}</span>
      </div>
      <div class="meta-panel-item">
        <span class="meta-panel-label">Profil</span>
        <span class="meta-panel-value">${profileName}</span>
      </div>
      <div class="meta-panel-item">
        <span class="meta-panel-label">Modeller</span>
        <span class="meta-panel-value">${modelsHTML}</span>
      </div>
      <div class="meta-panel-item">
        <span class="meta-panel-label">Syntesmodell</span>
        <span class="meta-panel-value">${synthModel}</span>
      </div>
      <div class="meta-panel-item">
        <span class="meta-panel-label">Faktagranskning</span>
        <span class="meta-panel-value">${delibHTML}</span>
      </div>
      <div class="meta-panel-item">
        <span class="meta-panel-label">Kostnad</span>
        <span class="meta-panel-value">${costHTML}</span>
      </div>
    `;
  }

  function openSessionModal(session: any) {
    if (!sessionModal || !sessionModalPrompt || !sessionModalSynthesis || !sessionModalMeta || !sessionModalMetaPanel) return;
    currentModalSession = session;
    const date = new Date(session.created_at);
    const modelLabel = synthesisModelDisplayNames[session.synthesis_model] || session.synthesis_model || '';

    sessionModalMeta.textContent = date.toLocaleString('sv-SE') + (modelLabel ? ' • ' + modelLabel : '');
    sessionModalMetaPanel.innerHTML = buildMetaPanelHTML(session);
    sessionModalPrompt.textContent = session.prompt;

    const synthesisContent = session.supersynthesis || session.synthesis || 'Ingen syntes sparad';
    sessionModalSynthesis.innerHTML = renderMarkdown(synthesisContent);
    sessionModal.classList.add('open');
  }

  function closeSessionModal() {
    sessionModal?.classList.remove('open');
    currentModalSession = null;
  }

  document.getElementById('closeSessionModal')?.addEventListener('click', closeSessionModal);
  sessionModal?.addEventListener('click', (e) => { if (e.target === sessionModal) closeSessionModal(); });

  document.getElementById('copySessionSynthesis')?.addEventListener('click', () => {
    if (currentModalSession) {
      const text = currentModalSession.supersynthesis || currentModalSession.synthesis || '';
      navigator.clipboard.writeText(text);
      alert('Syntes kopierad!');
    }
  });

  document.getElementById('copySessionAll')?.addEventListener('click', () => {
    if (currentModalSession) {
      const synth = currentModalSession.supersynthesis || currentModalSession.synthesis || '';
      const text = '## Prompt\n\n' + currentModalSession.prompt + '\n\n## Syntes\n\n' + synth;
      navigator.clipboard.writeText(text);
      alert('Prompt + syntes kopierat!');
    }
  });

  document.getElementById('loadSessionPrompt')?.addEventListener('click', () => {
    if (currentModalSession && promptEl) {
      promptEl.value = currentModalSession.prompt;
      closeSessionModal();
      promptEl.focus();
    }
  });

  document.getElementById('deleteSession')?.addEventListener('click', () => {
    if (currentModalSession) {
      const sessionToDelete = currentModalSession;
      closeSessionModal();
      showDeleteConfirm(sessionToDelete);
    }
  });

  const fullSessionModal = document.getElementById('fullSessionModal');

  function openFullSessionModal(session: any) {
    currentModalSession = session;
    const date = new Date(session.created_at);

    document.getElementById('fullSessionModalMeta')!.textContent = date.toLocaleString('sv-SE');
    document.getElementById('fullSessionMetaPanel')!.innerHTML = buildMetaPanelHTML(session);
    document.getElementById('fullSessionPrompt')!.textContent = session.prompt || 'Ingen prompt';

    const round1Container = document.getElementById('fullSessionRound1');
    let round1HTML = '';
    if (session.responses && typeof session.responses === 'object') {
      const responses = Array.isArray(session.responses) ? session.responses : Object.values(session.responses);
      responses.forEach((r: any, idx: number) => {
        const provider = r.provider || Object.keys(session.responses)[idx] || 'Modell ' + (idx + 1);
        const model = r.model || '';
        const duration = r.duration ? (r.duration / 1000).toFixed(1) + 's' : '';
        const cost = r.cost ? '$' + r.cost.totalCost.toFixed(4) : '';
        const content = r.response || r.content || 'Inget svar';

        round1HTML += `
          <div class="full-session-response-item" data-idx="${idx}">
            <div class="full-session-response-header" onclick="this.parentElement.classList.toggle('expanded'); this.nextElementSibling.classList.toggle('expanded');">
              <div class="full-session-response-model">
                <span class="meta-model-dot ${provider.toLowerCase().includes('openai') ? 'openai' : provider.toLowerCase().includes('claude') || provider.toLowerCase().includes('anthropic') ? 'anthropic' : provider.toLowerCase().includes('gemini') || provider.toLowerCase().includes('google') ? 'google' : provider.toLowerCase().includes('grok') ? 'grok' : ''}"></span>
                ${escapeHtml(provider)} ${model ? '(' + escapeHtml(model) + ')' : ''}
              </div>
              <div class="full-session-response-meta">
                ${duration} ${cost ? ' · ' + cost : ''}
                <span class="full-session-response-expand">▼</span>
              </div>
            </div>
            <div class="full-session-response-content">${renderMarkdown(content)}</div>
          </div>
        `;
      });
    } else {
      round1HTML = '<div style="padding: 1rem; color: var(--text-muted);">Inga individuella svar sparade</div>';
    }
    if (round1Container) round1Container.innerHTML = round1HTML;

    const round2Section = document.getElementById('fullSessionRound2Section');
    const round2Container = document.getElementById('fullSessionRound2');
    if (session.round2_responses && Object.keys(session.round2_responses).length > 0) {
      if (round2Section) round2Section.style.display = 'block';
      let round2HTML = '';
      const r2Responses = Array.isArray(session.round2_responses) ? session.round2_responses : Object.values(session.round2_responses);
      r2Responses.forEach((r: any, idx: number) => {
        const provider = r.provider || 'Modell ' + (idx + 1);
        const model = r.model || '';
        const duration = r.duration ? (r.duration / 1000).toFixed(1) + 's' : '';
        const content = r.response || r.content || 'Inget svar';

        round2HTML += `
          <div class="full-session-response-item" data-idx="${idx}">
            <div class="full-session-response-header" onclick="this.parentElement.classList.toggle('expanded'); this.nextElementSibling.classList.toggle('expanded');">
              <div class="full-session-response-model">
                <span class="meta-model-dot ${provider.toLowerCase().includes('openai') ? 'openai' : provider.toLowerCase().includes('claude') || provider.toLowerCase().includes('anthropic') ? 'anthropic' : provider.toLowerCase().includes('gemini') || provider.toLowerCase().includes('google') ? 'google' : provider.toLowerCase().includes('grok') ? 'grok' : ''}"></span>
                ${escapeHtml(provider)} ${model ? '(' + escapeHtml(model) + ')' : ''} - Förbättrat
              </div>
              <div class="full-session-response-meta">
                ${duration}
                <span class="full-session-response-expand">▼</span>
              </div>
            </div>
            <div class="full-session-response-content">${renderMarkdown(content)}</div>
          </div>
        `;
      });
      if (round2Container) round2Container.innerHTML = round2HTML;
    } else {
      if (round2Section) round2Section.style.display = 'none';
    }

    const synthIcon = document.getElementById('fullSessionSynthesisIcon');
    const synthTitle = document.getElementById('fullSessionSynthesisTitle');
    const synthContent = document.getElementById('fullSessionSynthesis');

    const lightbulbSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"></path></svg>';
    const starSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>';

    if (session.supersynthesis) {
      if (synthIcon) synthIcon.innerHTML = starSvg;
      if (synthIcon) synthIcon.style.color = '#F59E0B';
      if (synthTitle) synthTitle.textContent = 'Supersyntes';
      if (synthContent) synthContent.innerHTML = renderMarkdown(session.supersynthesis);
    } else if (session.synthesis) {
      if (synthIcon) synthIcon.innerHTML = lightbulbSvg;
      if (synthIcon) synthIcon.style.color = '#3B82F6';
      if (synthTitle) synthTitle.textContent = 'Syntes';
      if (synthContent) synthContent.innerHTML = renderMarkdown(session.synthesis);
    } else {
      if (synthIcon) synthIcon.innerHTML = lightbulbSvg;
      if (synthIcon) synthIcon.style.color = 'var(--text-muted)';
      if (synthTitle) synthTitle.textContent = 'Syntes';
      if (synthContent) synthContent.innerHTML = '<p style="color: var(--text-muted);">Ingen syntes sparad</p>';
    }

    fullSessionModal?.classList.add('open');
  }

  function closeFullSessionModal() {
    fullSessionModal?.classList.remove('open');
    currentModalSession = null;
  }

  function openSession(session: any) {
    if (fullSessionModal) {
      openFullSessionModal(session);
    } else {
      openSessionModal(session);
    }
  }

  document.getElementById('closeFullSessionModal')?.addEventListener('click', closeFullSessionModal);
  fullSessionModal?.addEventListener('click', (e) => { if (e.target === fullSessionModal) closeFullSessionModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (fullSessionModal?.classList.contains('open')) closeFullSessionModal();
      else if (sessionModal?.classList.contains('open')) closeSessionModal();
    }
  });

  document.getElementById('copyFullSessionSynthesis')?.addEventListener('click', () => {
    if (currentModalSession) {
      const text = currentModalSession.supersynthesis || currentModalSession.synthesis || '';
      navigator.clipboard.writeText(text);
      alert('Syntes kopierad!');
    }
  });

  document.getElementById('exportFullSession')?.addEventListener('click', () => {
    if (!currentModalSession) return;
    const s = currentModalSession;
    const date = new Date(s.created_at);

    let md = '# AI Council Session\n\n';
    md += '**Datum:** ' + date.toLocaleString('sv-SE') + '\n';
    md += '**Profil:** ' + (profileDisplayNames[s.profile] || s.profile || 'Ej angiven') + '\n';
    md += '**Syntesmodell:** ' + (synthesisModelDisplayNames[s.synthesis_model] || s.synthesis_model || 'Ej angiven') + '\n';
    md += '**Faktagranskning:** ' + (s.deliberation_enabled ? 'Ja' : 'Nej') + '\n\n';

    md += '---\n\n## Prompt\n\n' + (s.prompt || '') + '\n\n';

    if (s.responses) {
      md += '---\n\n## Runda 1 - Individuella svar\n\n';
      const responses = Array.isArray(s.responses) ? s.responses : Object.values(s.responses);
      responses.forEach((r: any) => {
        md += '### ' + (r.provider || 'Modell') + '\n\n' + (r.response || r.content || '') + '\n\n';
      });
    }

    if (s.round2_responses && Object.keys(s.round2_responses).length > 0) {
      md += '---\n\n## Runda 2 - Faktagranskning\n\n';
      const r2 = Array.isArray(s.round2_responses) ? s.round2_responses : Object.values(s.round2_responses);
      r2.forEach((r: any) => {
        md += '### ' + (r.provider || 'Modell') + ' - Förbättrat\n\n' + (r.response || r.content || '') + '\n\n';
      });
    }

    md += '---\n\n## ' + (s.supersynthesis ? 'Supersyntes' : 'Syntes') + '\n\n';
    md += (s.supersynthesis || s.synthesis || 'Ingen syntes') + '\n';

    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const fileDate = date.toISOString().split('T')[0];
    a.download = 'ai-council-session-' + fileDate + '.md';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('loadFullSessionPrompt')?.addEventListener('click', () => {
    if (currentModalSession && promptEl) {
      promptEl.value = currentModalSession.prompt;
      closeFullSessionModal();
      promptEl.focus();
    }
  });

  document.getElementById('deleteFullSession')?.addEventListener('click', () => {
    if (currentModalSession) {
      const sessionToDelete = currentModalSession;
      closeFullSessionModal();
      showDeleteConfirm(sessionToDelete);
    }
  });

  return {
    loadSessions,
    renderSessions,
    saveSession,
    openSession
  };
}
