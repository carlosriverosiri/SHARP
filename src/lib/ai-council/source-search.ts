type SourceSearchOptions = {
  contextEl: HTMLTextAreaElement | null;
  autoResizeTextarea: (textarea: HTMLTextAreaElement, minHeight?: number, maxHeight?: number) => void;
  escapeHtml: (text: string) => string;
};

export function initSourceSearch({ contextEl, autoResizeTextarea, escapeHtml }: SourceSearchOptions) {
  const sourceModal = document.getElementById('sourceModal') as HTMLElement | null;
  const sourceQuery = document.getElementById('sourceQuery') as HTMLInputElement | null;
  const sourceSearchSubmit = document.getElementById('sourceSearchSubmit') as HTMLButtonElement | null;
  const sourceStatus = document.getElementById('sourceStatus') as HTMLElement | null;
  const sourceResults = document.getElementById('sourceResults') as HTMLElement | null;
  const sourceAddSelected = document.getElementById('sourceAddSelected') as HTMLButtonElement | null;
  const sourceSelectedCount = document.getElementById('sourceSelectedCount') as HTMLElement | null;
  const sourceSearchBtn = document.getElementById('sourceSearchBtn') as HTMLElement | null;
  const closeSourceModal = document.getElementById('closeSourceModal') as HTMLButtonElement | null;

  if (!sourceModal || !sourceQuery || !sourceSearchSubmit || !sourceStatus || !sourceResults || !sourceAddSelected || !sourceSelectedCount) {
    return;
  }

  const safeModal = sourceModal;
  const safeQuery = sourceQuery;
  const safeSearchSubmit = sourceSearchSubmit;
  const safeStatus = sourceStatus;
  const safeResults = sourceResults;
  const safeAddSelected = sourceAddSelected;
  const safeSelectedCount = sourceSelectedCount;

  const searchCache: Record<string, { results: any[]; selected: Set<number> }> = {
    pubmed: { results: [], selected: new Set() },
    google_scholar: { results: [], selected: new Set() },
    google: { results: [], selected: new Set() },
    google_news: { results: [], selected: new Set() }
  };

  let currentEngine: keyof typeof searchCache = 'pubmed';

  if (sourceSearchBtn) {
    sourceSearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      safeModal.classList.add('open');
      safeQuery.focus();
    });
  }

  if (closeSourceModal) {
    closeSourceModal.addEventListener('click', () => {
      safeModal.classList.remove('open');
    });
  }

  safeModal.addEventListener('click', (e) => {
    if (e.target === safeModal) safeModal.classList.remove('open');
  });

  document.querySelectorAll('.source-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const engine = (tab as HTMLElement).dataset.engine as keyof typeof searchCache | undefined;
      if (!engine || engine === currentEngine) return;

      document.querySelectorAll('.source-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentEngine = engine;

      renderSourceResults(searchCache[engine].results, engine);
    });
  });

  async function searchSources() {
    const query = safeQuery.value.trim();
    if (!query) return;

    safeSearchSubmit.disabled = true;
    safeStatus.style.display = 'block';
    safeStatus.className = 'source-status loading';

    const engineLabels: Record<string, string> = {
      pubmed: 'PubMed',
      google_scholar: 'Google Scholar',
      google: 'Google',
      google_news: 'Nyheter'
    };

    safeStatus.innerHTML = '🔍 Söker i ' + engineLabels[currentEngine] + '...';
    safeResults.innerHTML = '';

    try {
      let response: Response;
      let data: any;

      if (currentEngine === 'pubmed') {
        response = await fetch('/api/ai-council/pubmed-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, maxResults: 10 })
        });
        data = await response.json();

        if (data.articles) {
          searchCache.pubmed.results = data.articles.map((article: any) => ({
            title: article.title,
            link: article.pubmedUrl,
            snippet: article.abstract || '',
            source: { category: 'academic', icon: '🏥', label: 'PubMed', credibilityScore: 95 },
            authors: article.authors,
            publicationInfo: article.journal + ' (' + article.year + ')',
            pmid: article.pmid,
            doi: article.doi
          }));
        }
      } else {
        response = await fetch('/api/ai-council/web-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, engine: currentEngine, maxResults: 10 })
        });
        data = await response.json();

        if (data.results) {
          searchCache[currentEngine].results = data.results;
        }

        if (data.configured === false) {
          safeStatus.className = 'source-status error';
          safeStatus.innerHTML = '⚠️ SerpAPI är inte konfigurerat. Lägg till SERPAPI_KEY i miljövariabler för att aktivera ' + engineLabels[currentEngine] + '.';
          safeSearchSubmit.disabled = false;
          return;
        }
      }

      if (data.error) {
        safeStatus.className = 'source-status error';
        safeStatus.innerHTML = '❌ ' + escapeHtml(data.error);
      } else {
        const results = searchCache[currentEngine].results;

        if (results.length === 0) {
          safeStatus.innerHTML = 'Inga resultat hittades. Prova andra söktermer.';
          safeStatus.className = 'source-status';
        } else {
          safeStatus.style.display = 'none';
          renderSourceResults(results, currentEngine);
        }

        updateTabCounts();
      }
    } catch (e: any) {
      console.error('Search error:', e);
      safeStatus.className = 'source-status error';
      safeStatus.innerHTML = '❌ Sökningen misslyckades: ' + e.message;
    } finally {
      safeSearchSubmit.disabled = false;
    }
  }

  safeSearchSubmit.addEventListener('click', searchSources);
  safeQuery.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchSources();
  });

  function renderSourceResults(results: any[], engine: keyof typeof searchCache) {
    if (!results || results.length === 0) {
      safeResults.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Sök för att hitta källor</div>';
      return;
    }

    const selectedSet = searchCache[engine].selected;

    safeResults.innerHTML = results.map((result: any, idx: number) => {
      const isSelected = selectedSet.has(idx);
      const credClass = result.source.credibilityScore >= 80 ? 'high' : result.source.credibilityScore >= 60 ? 'medium' : 'low';
      const categoryClass = result.source.category || 'unknown';

      return `
        <div class="source-result-item ${isSelected ? 'selected' : ''}" data-idx="${idx}" data-engine="${engine}">
          <div class="source-result-header">
            <span class="source-result-badge ${categoryClass}">${result.source.icon} ${result.source.label}</span>
            <span class="source-result-credibility ${credClass}">${result.source.credibilityScore}/100 trovärdighet</span>
          </div>
          <div class="source-result-title">${escapeHtml(result.title)}</div>
          ${result.authors || result.publicationInfo ? `
            <div class="source-result-meta">
              ${result.authors ? '<span>✍️ ' + escapeHtml(result.authors) + '</span>' : ''}
              ${result.publicationInfo ? '<span>📅 ' + escapeHtml(result.publicationInfo) + '</span>' : ''}
              ${result.citationCount ? '<span>📊 ' + result.citationCount + ' citeringar</span>' : ''}
              ${result.date ? '<span>🕐 ' + escapeHtml(result.date) + '</span>' : ''}
            </div>
          ` : ''}
          ${result.snippet ? `<div class="source-result-snippet">${escapeHtml(result.snippet.substring(0, 250))}${result.snippet.length > 250 ? '...' : ''}</div>` : ''}
          <a href="${escapeHtml(result.link)}" target="_blank" rel="noopener" class="source-result-link" onclick="event.stopPropagation()">🔗 ${escapeHtml(new URL(result.link).hostname)}</a>
        </div>
      `;
    }).join('');

    safeResults.querySelectorAll('.source-result-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt((item as HTMLElement).dataset.idx || '0', 10);
        const eng = (item as HTMLElement).dataset.engine || '';
        toggleSourceSelection(idx, eng, item as HTMLElement);
      });
    });
  }

  function toggleSourceSelection(idx: number, engine: string, element: HTMLElement) {
    const selectedSet = searchCache[engine].selected;

    if (selectedSet.has(idx)) {
      selectedSet.delete(idx);
      element.classList.remove('selected');
    } else {
      selectedSet.add(idx);
      element.classList.add('selected');
    }

    updateSelectedCount();
  }

  function updateSelectedCount() {
    let total = 0;
    for (const engine in searchCache) {
      total += searchCache[engine].selected.size;
    }

    safeSelectedCount.textContent = String(total);
    safeAddSelected.disabled = total === 0;
  }

  function updateTabCounts() {
    const pubmedCount = document.getElementById('pubmedCount');
    const scholarCount = document.getElementById('scholarCount');
    const googleCount = document.getElementById('googleCount');
    const newsCount = document.getElementById('newsCount');

    if (pubmedCount) pubmedCount.textContent = String(searchCache.pubmed.results.length);
    if (scholarCount) scholarCount.textContent = String(searchCache.google_scholar.results.length);
    if (googleCount) googleCount.textContent = String(searchCache.google.results.length);
    if (newsCount) newsCount.textContent = String(searchCache.google_news.results.length);
  }

  safeAddSelected.addEventListener('click', () => {
    let allSelected: any[] = [];

    for (const engine in searchCache) {
      const { results, selected } = searchCache[engine];
      selected.forEach((idx) => {
        allSelected.push({ ...results[idx], engine });
      });
    }

    if (allSelected.length === 0) return;

    const byEngine: Record<string, any[]> = {};
    allSelected.forEach((item) => {
      if (!byEngine[item.engine]) byEngine[item.engine] = [];
      byEngine[item.engine].push(item);
    });

    let contextText = '\n\n## 🔍 Verifierade källor\n\n';

    const engineLabels: Record<string, string> = {
      pubmed: '🏥 PubMed-artiklar',
      google_scholar: '🎓 Akademiska källor',
      google: '🌐 Webbkällor',
      google_news: '📰 Nyheter'
    };

    let refNum = 1;
    for (const engine in byEngine) {
      contextText += '### ' + engineLabels[engine] + '\n\n';
      byEngine[engine].forEach((item) => {
        contextText += `**[${refNum}]** ${item.title}\n`;
        contextText += `   ${item.source.icon} ${item.source.label} (trovärdighet: ${item.source.credibilityScore}/100)\n`;
        contextText += `   ${item.link}\n`;
        if (item.authors) contextText += `   ✍️ ${item.authors}\n`;
        if (item.publicationInfo) contextText += `   📅 ${item.publicationInfo}\n`;
        if (item.pmid) contextText += `   PMID: ${item.pmid}\n`;
        if (item.doi) contextText += `   DOI: https://doi.org/${item.doi}\n`;
        if (item.snippet) contextText += `   > ${item.snippet.substring(0, 200)}...\n`;
        contextText += '\n';
        refNum++;
      });
    }

    contextText += '---\n\n⚠️ *Använd dessa källor för att verifiera påståenden. Citera med [nummer] om du hänvisar.*\n\n';

    if (contextEl) {
      contextEl.value += contextText;
      autoResizeTextarea(contextEl, 120, 400);
    }

    for (const engine in searchCache) {
      searchCache[engine].selected.clear();
    }
    updateSelectedCount();

    safeModal.classList.remove('open');

    alert('✓ ' + allSelected.length + ' källa' + (allSelected.length > 1 ? 'r' : '') + ' tillagda i kontext!');
  });

  const pubmedSearchBtn = document.getElementById('pubmedSearchBtn');
  if (pubmedSearchBtn) {
    pubmedSearchBtn.addEventListener('click', () => {
      safeModal.classList.add('open');
      safeQuery.focus();
    });
  }
}
