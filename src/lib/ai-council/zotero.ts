type ZoteroOptions = {
  contextEl: HTMLTextAreaElement | null;
  escapeHtml: (text: string) => string;
};

export function initZotero({ contextEl, escapeHtml }: ZoteroOptions) {
  const zoteroOpenBtn = document.getElementById('zoteroOpenBtn');
  const zoteroStatus = document.getElementById('zoteroStatus');
  const zoteroModal = document.getElementById('zoteroModal');
  const zoteroModalClose = document.getElementById('zoteroModalClose');
  const zoteroModalUser = document.getElementById('zoteroModalUser');
  const zoteroCollectionsList = document.getElementById('zoteroCollectionsList');
  const zoteroModalSearch = document.getElementById('zoteroModalSearch') as HTMLInputElement | null;
  const zoteroModalSearchBtn = document.getElementById('zoteroModalSearchBtn');
  const zoteroModalResults = document.getElementById('zoteroModalResults');
  const zoteroResultsCount = document.getElementById('zoteroResultsCount');
  const zoteroSelectAll = document.getElementById('zoteroSelectAll') as HTMLInputElement | null;
  const zoteroSelectedInfo = document.getElementById('zoteroSelectedInfo');
  const zoteroImportSelectedBtn = document.getElementById('zoteroImportSelectedBtn') as HTMLButtonElement | null;
  const zoteroDisconnectBtn = document.getElementById('zoteroDisconnectBtn');
  const zoteroRefreshCollections = document.getElementById('zoteroRefreshCollections');
  const zoteroSetDefault = document.getElementById('zoteroSetDefault') as HTMLInputElement | null;

  const zoteroConfigModal = document.getElementById('zoteroConfigModal');
  const zoteroConfigClose = document.getElementById('zoteroConfigClose');
  const zoteroApiKeyInput = document.getElementById('zoteroApiKeyInput') as HTMLInputElement | null;
  const zoteroConfigSave = document.getElementById('zoteroConfigSave') as HTMLButtonElement | null;
  const zoteroConfigCancel = document.getElementById('zoteroConfigCancel');

  if (!zoteroStatus || !zoteroModal || !zoteroModalResults || !zoteroCollectionsList || !zoteroApiKeyInput || !zoteroResultsCount) {
    return;
  }

  const safeZoteroStatus = zoteroStatus as HTMLElement;
  const safeZoteroModal = zoteroModal as HTMLElement;
  const safeZoteroModalResults = zoteroModalResults as HTMLElement;
  const safeZoteroCollectionsList = zoteroCollectionsList as HTMLElement;
  const safeZoteroApiKeyInput = zoteroApiKeyInput as HTMLInputElement;
  const safeZoteroResultsCount = zoteroResultsCount as HTMLElement;

  let zoteroConfigured = false;
  let zoteroConfig: { username?: string } | null = null;
  let currentCollection: string | null = null;
  let selectedZoteroItems = new Set<string>();

  zoteroOpenBtn?.addEventListener('click', async () => {
    const isConfigured = await checkZoteroConfig();

    if (safeZoteroStatus.textContent === '🔒') {
      alert('Du måste vara inloggad för att använda Zotero.\n\nOm du ser detta meddelande, prova att logga ut och logga in igen.');
      return;
    }

    if (safeZoteroStatus.textContent === '⚠️') {
      alert('Kunde inte kontrollera Zotero-status.\n\nKontrollera din internetanslutning och försök igen.');
      return;
    }

    if (isConfigured || zoteroConfigured) {
      openZoteroModal();
    } else {
      openZoteroConfigModal();
    }
  });

  async function checkZoteroConfig() {
    try {
      const response = await fetch('/api/ai-council/zotero/validate');
      const data = await response.json();

      if (response.status === 401) {
        safeZoteroStatus.textContent = '🔒';
        safeZoteroStatus.title = 'Logga in för att använda Zotero';
        return false;
      }

      if (data.configured) {
        zoteroConfigured = true;
        zoteroConfig = data.config;
        safeZoteroStatus.textContent = '✓';
        safeZoteroStatus.classList.add('configured');
        return true;
      }

      zoteroConfigured = false;
      safeZoteroStatus.textContent = '—';
      safeZoteroStatus.classList.remove('configured');
      return false;
    } catch (error) {
      console.error('Zotero config check error:', error);
      safeZoteroStatus.textContent = '⚠️';
      return false;
    }
  }

  function openZoteroConfigModal() {
    if (!zoteroConfigModal) return;
    safeZoteroApiKeyInput.value = '';
    zoteroConfigModal.classList.add('open');
  }

  zoteroConfigClose?.addEventListener('click', () => zoteroConfigModal?.classList.remove('open'));
  zoteroConfigCancel?.addEventListener('click', () => zoteroConfigModal?.classList.remove('open'));

  zoteroConfigSave?.addEventListener('click', async () => {
    const apiKey = safeZoteroApiKeyInput.value.trim() || '';
    if (!apiKey) return;

    zoteroConfigSave.disabled = true;
    zoteroConfigSave.textContent = 'Validerar...';

    try {
      const response = await fetch('/api/ai-council/zotero/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        zoteroConfigured = true;
        zoteroConfig = data.config;
        safeZoteroStatus.textContent = '✓';
        safeZoteroStatus.classList.add('configured');
        zoteroConfigModal?.classList.remove('open');
        openZoteroModal();
      } else {
        alert(data.message || 'Kunde inte validera API-nyckeln');
      }
    } catch (error) {
      console.error('Zotero save error:', error);
      alert('Ett fel uppstod. Försök igen.');
    } finally {
      zoteroConfigSave.disabled = false;
      zoteroConfigSave.textContent = '🔑 Spara';
    }
  });

  function openZoteroModal() {
    safeZoteroModal.classList.add('open');
    if (zoteroModalUser) zoteroModalUser.textContent = zoteroConfig?.username || '';
    selectedZoteroItems.clear();
    updateZoteroSelection();
    safeZoteroModalResults.innerHTML = `
      <div class="zotero-empty">
        <div class="zotero-empty-icon">📂</div>
        <p>Välj en collection eller sök i hela biblioteket</p>
      </div>
    `;
    loadZoteroCollections();
  }

  zoteroModalClose?.addEventListener('click', () => safeZoteroModal.classList.remove('open'));
  safeZoteroModal.addEventListener('click', (e) => {
    if (e.target === safeZoteroModal) safeZoteroModal.classList.remove('open');
  });

  async function loadZoteroCollections() {
    safeZoteroCollectionsList.innerHTML = '<div class="zotero-loading">Laddar collections...</div>';

    try {
      const response = await fetch('/api/ai-council/zotero/collections');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Kunde inte hämta collections');
      }

      const allCollections = [...(data.collections || [])];
      Object.values(data.subCollections || {}).forEach((subs) => {
        allCollections.push(...(subs as Array<{ key: string; parentKey?: string; name: string; numItems: number }>));
      });

      const childrenMap = new Map<string, Array<{ key: string; parentKey?: string; name: string; numItems: number }>>();
      allCollections.forEach((c) => {
        if (c.parentKey) {
          const children = childrenMap.get(c.parentKey) || [];
          children.push(c);
          childrenMap.set(c.parentKey, children);
        }
      });

      function renderCollection(col: { key: string; name: string; numItems: number }, depth = 0) {
        const isActive = currentCollection === col.key;
        const isDefault = data.defaultCollection === col.key;
        const indent = depth * 1.25;
        const children = childrenMap.get(col.key) || [];
        const hasChildren = children.length > 0;

        let html = `
          <div class="zotero-collection-item ${isActive ? 'active' : ''}" data-key="${col.key}" style="padding-left: ${0.75 + indent}rem;">
            <span class="zotero-collection-icon">${hasChildren ? '📁' : '📄'}</span>
            <span class="zotero-collection-name">${escapeHtml(col.name)}${isDefault ? ' ⭐' : ''}</span>
            <span class="zotero-collection-count">${col.numItems}</span>
          </div>
        `;

        children.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
        children.forEach((child) => {
          html += renderCollection(child, depth + 1);
        });

        return html;
      }

      let html = `
        <div class="zotero-collection-item library ${!currentCollection ? 'active' : ''}" data-key="">
          <span class="zotero-collection-icon">📚</span>
          <span class="zotero-collection-name">Mitt bibliotek</span>
        </div>
      `;

      const topLevel = (data.collections || []) as Array<{ key: string; name: string; numItems: number }>;
      topLevel.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
      topLevel.forEach((col) => {
        html += renderCollection(col, 1);
      });

      safeZoteroCollectionsList.innerHTML = html;

      safeZoteroCollectionsList.querySelectorAll('.zotero-collection-item').forEach((el) => {
        el.addEventListener('click', () => {
          const key = (el as HTMLElement).dataset.key || '';
          currentCollection = key || null;

          document.querySelectorAll('.zotero-collection-item').forEach((node) => node.classList.remove('active'));
          el.classList.add('active');

          if (zoteroSetDefault) {
            zoteroSetDefault.checked = data.defaultCollection === key;
          }

          if (key) {
            searchZotero('');
          } else {
            safeZoteroResultsCount.textContent = 'Sök eller välj en collection';
            safeZoteroModalResults.innerHTML = `
              <div class="zotero-empty">
                <div class="zotero-empty-icon">📂</div>
                <p>Välj en collection eller sök i hela biblioteket</p>
              </div>
            `;
          }
        });
      });
    } catch (error: any) {
      console.error('Failed to load collections:', error);
      safeZoteroCollectionsList.innerHTML = `
        <div class="zotero-error">
          ${escapeHtml(error.message || 'Kunde inte ladda collections')}
          <br><small>Kontrollera att du är inloggad och att API-nyckeln är giltig.</small>
          <br><button class="zotero-reconfigure-btn" onclick="window.reconfigureZotero()">🔑 Konfigurera om API-nyckel</button>
        </div>
      `;
    }
  }

  async function searchZotero(query: string) {
    safeZoteroModalResults.innerHTML = '<div class="zotero-loading">Söker...</div>';

    try {
      const params = new URLSearchParams({ limit: '25' });
      if (query) params.set('q', query);
      if (currentCollection) params.set('collection', currentCollection);

      const response = await fetch(`/api/ai-council/zotero/search?${params}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Sökningen misslyckades');

      if (data.items.length === 0) {
        safeZoteroModalResults.innerHTML = `
          <div class="zotero-empty">
            <div class="zotero-empty-icon">📭</div>
            <p>Inga resultat hittades</p>
          </div>
        `;
        safeZoteroResultsCount.textContent = '0 resultat';
      } else {
        safeZoteroResultsCount.textContent = `${data.totalResults} resultat`;
        renderZoteroResults(data.items);
      }
    } catch (error: any) {
      console.error('Zotero search error:', error);
      safeZoteroModalResults.innerHTML = `<div class="zotero-error">${escapeHtml(error.message)}</div>`;
    }
  }

  function renderZoteroResults(items: any[]) {
    safeZoteroModalResults.innerHTML = items.map((item) => `
      <div class="zotero-result-item ${selectedZoteroItems.has(item.key) ? 'selected' : ''}" data-key="${item.key}">
        <input type="checkbox" class="zotero-result-checkbox" data-key="${item.key}" 
          ${selectedZoteroItems.has(item.key) ? 'checked' : ''}>
        <div class="zotero-result-info">
          <div class="zotero-result-title">${escapeHtml(item.title)}</div>
          <div class="zotero-result-meta">${escapeHtml(item.authors)} ${item.year ? '(' + item.year + ')' : ''}</div>
          ${item.journal ? `<div class="zotero-result-journal">${escapeHtml(item.journal)}</div>` : ''}
          <div style="display: flex; gap: 0.5rem; align-items: center; margin-top: 0.375rem;">
            ${item.hasPdf ? '<span class="zotero-result-pdf"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg> PDF</span>' : ''}
            ${item.abstract && item.abstract.split(' ').length >= 20 ? '<span class="zotero-result-abstract"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> ' + item.abstract.split(' ').length + ' ord</span>' : ''}
            ${item.tags.length > 0 ? `
              <div class="zotero-result-tags">
                ${item.tags.slice(0, 4).map((t: string) => `<span class="zotero-result-tag">${escapeHtml(t)}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');

    safeZoteroModalResults.querySelectorAll('.zotero-result-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        const target = e.target as HTMLInputElement;
        if (target?.type !== 'checkbox') {
          const checkbox = el.querySelector('.zotero-result-checkbox') as HTMLInputElement | null;
          if (checkbox) checkbox.checked = !checkbox.checked;
        }
        const key = (el as HTMLElement).dataset.key;
        if (!key) return;
        const checked = (el.querySelector('.zotero-result-checkbox') as HTMLInputElement | null)?.checked;
        if (checked) {
          selectedZoteroItems.add(key);
          el.classList.add('selected');
        } else {
          selectedZoteroItems.delete(key);
          el.classList.remove('selected');
        }
        updateZoteroSelection();
      });
    });
  }

  function updateZoteroSelection() {
    const count = selectedZoteroItems.size;
    if (zoteroSelectedInfo) zoteroSelectedInfo.textContent = `${count} valda`;
    if (zoteroImportSelectedBtn) zoteroImportSelectedBtn.disabled = count === 0;
    if (zoteroSelectAll) {
      zoteroSelectAll.checked = count > 0 &&
        safeZoteroModalResults.querySelectorAll('.zotero-result-checkbox').length === count;
    }
  }

  zoteroModalSearchBtn?.addEventListener('click', () => {
    searchZotero(zoteroModalSearch?.value.trim() || '');
  });
  zoteroModalSearch?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchZotero(zoteroModalSearch.value.trim());
  });

  zoteroSelectAll?.addEventListener('change', () => {
    const checkboxes = safeZoteroModalResults.querySelectorAll('.zotero-result-checkbox') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach((cb) => {
      cb.checked = !!zoteroSelectAll?.checked;
      const item = cb.closest('.zotero-result-item');
      if (!item) return;
      if (zoteroSelectAll?.checked) {
        selectedZoteroItems.add(cb.dataset.key || '');
        item.classList.add('selected');
      } else {
        selectedZoteroItems.delete(cb.dataset.key || '');
        item.classList.remove('selected');
      }
    });
    updateZoteroSelection();
  });

  zoteroImportSelectedBtn?.addEventListener('click', async () => {
    if (selectedZoteroItems.size === 0) return;

    zoteroImportSelectedBtn.disabled = true;
    zoteroImportSelectedBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg> Importerar...';

    let importedCount = 0;
    let importedText = '';
    const errorMessages: string[] = [];

    const itemMetadata: Record<string, { title: string; meta: string; journal: string }> = {};
    safeZoteroModalResults.querySelectorAll('.zotero-result-item').forEach((el) => {
      const key = (el as HTMLElement).dataset.key || '';
      const title = el.querySelector('.zotero-result-title')?.textContent || '';
      const meta = el.querySelector('.zotero-result-meta')?.textContent || '';
      const journal = el.querySelector('.zotero-result-journal')?.textContent || '';
      itemMetadata[key] = { title, meta, journal };
    });

    for (const itemKey of selectedZoteroItems) {
      try {
        const response = await fetch('/api/ai-council/zotero/fetch-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ itemKey })
        });

        const data = await response.json();

        if (response.ok && data.success && data.pdf.textContent) {
          const pdfText = data.pdf.textContent;
          const filename = data.pdf.filename;
          const meta = itemMetadata[itemKey];

          let content = `\n\n---\n\n📄 **${meta?.title || filename}**`;
          if (meta?.meta) content += `\n*${meta.meta}*`;
          if (meta?.journal) content += ` - ${meta.journal}`;
          content += `\n\n${pdfText.slice(0, 30000)}${pdfText.length > 30000 ? '\n\n[...trunkerad...]' : ''}`;

          importedText += content;
          importedCount++;
        } else if (data.message) {
          let errorMsg = data.message;
          if (data.debug) {
            console.log('Zotero PDF debug:', data.debug);
            if (data.debug.pdfAttachments && data.debug.pdfAttachments.length > 0) {
              errorMsg += '\n\nPDF-filer som hittades:\n' + data.debug.pdfAttachments.map((p: { filename?: string; linkMode?: string }) =>
                `- ${p.filename || 'Utan namn'} (${p.linkMode})`
              ).join('\n');
            }
          }
          errorMessages.push(errorMsg);
        }
      } catch (error) {
        console.error('Import error for', itemKey, error);
        errorMessages.push('Nätverksfel vid hämtning');
      }
    }

    if (importedCount > 0 && contextEl) {
      contextEl.value = (contextEl.value.trim() ? contextEl.value : '') + importedText;
      alert(`✅ Importerade ${importedCount} PDF:er till kontexten`);
      zoteroModal.classList.remove('open');
    } else {
      const uniqueErrors = [...new Set(errorMessages)];
      if (uniqueErrors.length > 0) {
        alert('Kunde inte importera PDF:er:\n\n' + uniqueErrors.join('\n\n'));
      } else {
        alert('Kunde inte importera några PDF:er. Kontrollera att artiklarna har bifogade PDF-filer.');
      }
    }

    zoteroImportSelectedBtn.disabled = false;
    zoteroImportSelectedBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Importera valda PDF:er';
  });

  zoteroDisconnectBtn?.addEventListener('click', async () => {
    if (!confirm('Vill du koppla från Zotero? Din API-nyckel kommer tas bort.')) return;

    try {
      await fetch('/api/ai-council/zotero/validate', { method: 'DELETE' });
      zoteroConfigured = false;
      zoteroConfig = null;
      zoteroStatus.textContent = '—';
      zoteroStatus.classList.remove('configured');
      zoteroModal.classList.remove('open');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  });

  zoteroRefreshCollections?.addEventListener('click', loadZoteroCollections);

  (window as any).reconfigureZotero = function () {
    zoteroModal.classList.remove('open');
    openZoteroConfigModal();
  };

  checkZoteroConfig();
}
