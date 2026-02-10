import type { PromptLibraryItem, ContextLibraryItem } from './types';

type LibrariesOptions = {
  promptEl: HTMLTextAreaElement | null;
  contextEl: HTMLTextAreaElement | null;
  escapeHtml: (text: string) => string;
  setStatus: (text: string, show: boolean) => void;
  showPreviewModal: (title: string, content: string) => void;
  openPromptEditModal: (prompt: PromptLibraryItem, index: number) => void;
};

export function initLibraries({
  promptEl,
  contextEl,
  escapeHtml,
  setStatus,
  showPreviewModal,
  openPromptEditModal
}: LibrariesOptions) {
  let savedPrompts: PromptLibraryItem[] = [];
  let promptLibraryReady = false;
  let savedContexts: ContextLibraryItem[] = [];
  let promptHandlersAttached = false;
  let contextHandlersAttached = false;

  async function loadPromptLibrary() {
    const list = document.getElementById('promptLibraryList');
    if (!list) return;
    list.innerHTML = '<div class="prompt-library-empty">Laddar...</div>';

    try {
      const res = await fetch('/api/ai-council/prompts', { credentials: 'include' });
      const data = await res.json() as { prompts?: PromptLibraryItem[]; error?: string };

      if (data.error) {
        if (data.error.includes('Ej inloggad')) {
          list.innerHTML = '<div class="prompt-library-empty">Logga in för att spara prompter</div>';
          return;
        }
      }

      savedPrompts = data.prompts || [];
      promptLibraryReady = true;
      renderPromptLibrary();
    } catch (e) {
      console.error('Error loading prompts:', e);
      list.innerHTML = '<div class="prompt-library-empty">Kunde inte ladda prompter</div>';
    }
  }

  function renderPromptLibrary() {
    const list = document.getElementById('promptLibraryList');
    if (!list) return;

    if (savedPrompts.length === 0) {
      list.innerHTML = '<div class="prompt-library-empty">Inga sparade prompter.<br>Klicka + for att lagga till.</div>';
      return;
    }

    const icons = {
      doc: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
      eye: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',
      edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
      copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
      trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
    };

    list.innerHTML = savedPrompts.map((p, i) => {
      const preview = (p.prompt || '').substring(0, 40);
      return '<div class="prompt-library-item" data-id="' + p.id + '" data-index="' + i + '" data-preview="' + escapeHtml((p.prompt || '').substring(0, 150)) + '">' +
        '<span class="prompt-library-item-icon">' + icons.doc + '</span>' +
        '<div class="prompt-library-item-content">' +
          '<div class="prompt-library-item-name">' + escapeHtml(p.name) + '</div>' +
          '<div class="prompt-library-item-preview">' + escapeHtml(preview) + (preview.length >= 40 ? '...' : '') + '</div>' +
        '</div>' +
        '<div class="prompt-library-item-actions">' +
          '<button class="prompt-library-item-btn" data-action="view" title="Forhandsgranska">' + icons.eye + '</button>' +
          '<button class="prompt-library-item-btn" data-action="edit" title="Redigera">' + icons.edit + '</button>' +
          '<button class="prompt-library-item-btn" data-action="copy" title="Kopiera till prompt">' + icons.copy + '</button>' +
          '<button class="prompt-library-item-btn delete" data-action="delete" title="Radera">' + icons.trash + '</button>' +
        '</div>' +
      '</div>';
    }).join('');
    if (!promptHandlersAttached) {
      list.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement | null;
        const item = target?.closest('.prompt-library-item') as HTMLElement | null;
        if (!item) return;

        const idx = parseInt(item.dataset.index || '0', 10);
        const id = item.dataset.id || '';
        const p = savedPrompts[idx];
        const actionBtn = target?.closest('.prompt-library-item-btn') as HTMLElement | null;

        if (actionBtn) {
          e.stopPropagation();
          if (!p) return;
          const action = actionBtn.dataset.action;
          if (action === 'view') {
            showPreviewModal('Prompt: ' + p.name, p.prompt);
          } else if (action === 'edit') {
            openPromptEditModal(p, idx);
          } else if (action === 'copy' && promptEl) {
            promptEl.value = p.prompt;
            promptEl.dispatchEvent(new Event('input'));
          } else if (action === 'delete') {
            if (confirm('Radera prompten "' + p.name + '"?')) {
              try {
                const res = await fetch('/api/ai-council/prompts?id=' + id, {
                  method: 'DELETE',
                  credentials: 'include'
                });
                if (res.ok) {
                  savedPrompts = savedPrompts.filter((prompt) => prompt.id !== id);
                  renderPromptLibrary();
                }
              } catch (err) {
                alert('Kunde inte radera prompten');
              }
            }
          }
          return;
        }

        if (p && promptEl) {
          promptEl.value = p.prompt;
          promptEl.dispatchEvent(new Event('input'));
          setStatus('Prompt infogad: ' + p.name, true);
          setTimeout(() => setStatus('', false), 2000);
          if (id) {
            fetch('/api/ai-council/prompts?id=' + id, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ incrementUse: true })
            }).catch(() => {});
          }
        }
      });
      promptHandlersAttached = true;
    }
  }

  async function loadContextLibrary() {
    const list = document.getElementById('contextLibraryList');
    if (!list) return;
    list.innerHTML = '<div class="prompt-library-empty">Laddar...</div>';

    try {
      const res = await fetch('/api/ai-council/contexts', { credentials: 'include' });
      const data = await res.json() as { contexts?: ContextLibraryItem[]; error?: string };

      if (data.error) {
        console.warn('Context library error:', data.error);
        list.innerHTML = '<div class="prompt-library-empty">Logga in för att använda</div>';
        return;
      }

      savedContexts = data.contexts || [];
      renderContextLibrary();
    } catch (e) {
      console.error('Failed to load context library:', e);
      list.innerHTML = '<div class="prompt-library-empty">Kunde inte ladda</div>';
    }
  }

  function renderContextLibrary() {
    const list = document.getElementById('contextLibraryList');
    if (!list) return;

    if (savedContexts.length === 0) {
      list.innerHTML = '<div class="prompt-library-empty">Inga sparade kontexter</div>';
      return;
    }

    list.innerHTML = savedContexts.map(ctx => `
      <div class="prompt-library-item" data-id="${ctx.id}" title="${ctx.name}" data-preview="${(ctx.content || '').substring(0, 150)}">
        <span class="prompt-library-item-text">${ctx.name}</span>
        <div class="prompt-library-item-actions">
          <button class="prompt-library-action view" title="Förhandsgranska">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
          <button class="prompt-library-action copy" title="Kopiera">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="prompt-library-action delete" title="Radera">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `).join('');

    if (!contextHandlersAttached) {
      list.addEventListener('click', async (e) => {
        const target = e.target as HTMLElement | null;
        const item = target?.closest('.prompt-library-item') as HTMLElement | null;
        if (!item) return;

        const ctxId = item.dataset.id || '';
        const ctx = savedContexts.find(c => c.id === ctxId);
        if (!ctx) return;
        const actionBtn = target?.closest('.prompt-library-action') as HTMLElement | null;

        if (actionBtn) {
          e.stopPropagation();
          if (actionBtn.classList.contains('view')) {
            showPreviewModal('Kontext: ' + ctx.name, ctx.content);
          } else if (actionBtn.classList.contains('copy')) {
            navigator.clipboard.writeText(ctx.content);
          } else if (actionBtn.classList.contains('delete')) {
            if (!confirm('Radera kontext "' + ctx.name + '"?')) return;
            try {
              await fetch(`/api/ai-council/contexts?id=${ctxId}`, {
                method: 'DELETE',
                credentials: 'include'
              });
              savedContexts = savedContexts.filter(c => c.id !== ctxId);
              renderContextLibrary();
            } catch (err) {
              alert('Kunde inte radera');
            }
          }
          return;
        }

        if (contextEl) {
          contextEl.value = ctx.content;
          contextEl.dispatchEvent(new Event('input'));
        }
        try {
          await fetch(`/api/ai-council/contexts?id=${ctxId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ incrementUse: true }),
            credentials: 'include'
          });
        } catch (e) {}
      });
      contextHandlersAttached = true;
    }
  }

  document.getElementById('addPromptBtn')?.addEventListener('click', async () => {
    if (!promptLibraryReady) {
      alert('Logga in för att spara prompter');
      return;
    }

    const name = prompt('Namn på prompten:');
    if (!name) return;

    const promptText = promptEl?.value || '';
    if (!promptText.trim()) {
      alert('Skriv en prompt först, sedan kan du spara den.');
      return;
    }

    try {
      const res = await fetch('/api/ai-council/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), prompt: promptText })
      });

      const data = await res.json();
      if (data.error) {
        alert('Kunde inte spara: ' + data.error);
        return;
      }

      savedPrompts.unshift(data.prompt);
      renderPromptLibrary();
      setStatus('Prompt sparad: ' + name, true);
      setTimeout(() => setStatus('', false), 2000);
    } catch (err) {
      alert('Kunde inte spara prompten');
    }
  });

  document.getElementById('savePromptBtn')?.addEventListener('click', () => {
    document.getElementById('addPromptBtn')?.click();
  });

  document.getElementById('addContextBtn')?.addEventListener('click', async () => {
    const contextText = contextEl?.value?.trim();

    if (!contextText) {
      alert('Skriv eller klistra in en kontext först');
      return;
    }

    const name = prompt('Namn på kontexten:');
    if (!name) return;

    try {
      const res = await fetch('/api/ai-council/contexts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, context: contextText }),
        credentials: 'include'
      });

      const data = await res.json();
      if (data.error) {
        alert('Fel: ' + data.error);
        return;
      }

      await loadContextLibrary();
      setStatus('Kontext sparad!', true);
      setTimeout(() => setStatus('', false), 2000);
    } catch (err) {
      alert('Kunde inte spara kontexten');
    }
  });

  document.getElementById('saveContextBtn')?.addEventListener('click', () => {
    document.getElementById('addContextBtn')?.click();
  });

  loadPromptLibrary();
  loadContextLibrary();

  return { loadPromptLibrary, loadContextLibrary };
}
