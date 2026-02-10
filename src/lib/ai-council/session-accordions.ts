type SessionAccordionsOptions = {
  unsortedAccordion: HTMLElement | null;
  allSessionsAccordion: HTMLElement | null;
  unsortedList: HTMLElement | null;
  allSessionsList: HTMLElement | null;
  unsortedCount: HTMLElement | null;
  allSessionsCount: HTMLElement | null;
  projectSearch: HTMLInputElement | null;
  projectSidebar: HTMLElement | null;
  escapeHtml: (value: string) => string;
  getSessions: () => Array<any>;
  openSession: (session: any) => void;
};

export function initSessionAccordions({
  unsortedAccordion,
  allSessionsAccordion,
  unsortedList,
  allSessionsList,
  unsortedCount,
  allSessionsCount,
  projectSearch,
  projectSidebar,
  escapeHtml,
  getSessions,
  openSession
}: SessionAccordionsOptions) {
  unsortedAccordion?.querySelector('.session-accordion-header')?.addEventListener('click', () => {
    unsortedAccordion.classList.toggle('open');
  });
  allSessionsAccordion?.querySelector('.session-accordion-header')?.addEventListener('click', () => {
    allSessionsAccordion.classList.toggle('open');
  });

  function renderSessionAccordions() {
    const sessions = getSessions();
    const unsortedSessions = sessions.filter(s => !s.project_id);
    const allSessions = sessions;

    if (unsortedCount) unsortedCount.textContent = String(unsortedSessions.length);
    if (allSessionsCount) allSessionsCount.textContent = String(allSessions.length);

    if (unsortedList) {
      unsortedList.innerHTML = unsortedSessions.length > 0
        ? unsortedSessions.slice(0, 15).map(s => `
            <div class="session-item" data-session-id="${s.id}">
              <span class="session-item-icon">💬</span>
              <div class="session-item-info">
                <div class="session-item-name">${escapeHtml(s.name || s.prompt?.substring(0, 40) || 'Utan titel')}</div>
                <div class="session-item-meta">${new Date(s.created_at).toLocaleDateString('sv-SE')}</div>
              </div>
            </div>
          `).join('')
        : '<div class="session-empty">Inga sessioner ännu</div>';

      unsortedList.querySelectorAll('.session-item').forEach(item => {
        item.addEventListener('click', () => {
          const session = sessions.find(s => s.id === (item as HTMLElement).dataset.sessionId);
          if (session) {
            openSession(session);
            if (window.innerWidth <= 1024) {
              projectSidebar?.classList.remove('open');
            }
          }
        });
      });
    }

    if (allSessionsList) {
      allSessionsList.innerHTML = allSessions.length > 0
        ? allSessions.slice(0, 15).map(s => `
            <div class="session-item" data-session-id="${s.id}">
              <span class="session-item-icon">💬</span>
              <div class="session-item-info">
                <div class="session-item-name">${escapeHtml(s.name || s.prompt?.substring(0, 40) || 'Utan titel')}</div>
                <div class="session-item-meta">${new Date(s.created_at).toLocaleDateString('sv-SE')}</div>
              </div>
            </div>
          `).join('')
        : '<div class="session-empty">Inga sessioner ännu</div>';

      allSessionsList.querySelectorAll('.session-item').forEach(item => {
        item.addEventListener('click', () => {
          const session = sessions.find(s => s.id === (item as HTMLElement).dataset.sessionId);
          if (session) {
            openSession(session);
            if (window.innerWidth <= 1024) {
              projectSidebar?.classList.remove('open');
            }
          }
        });
      });
    }
  }

  let searchTimeout: number | undefined;
  projectSearch?.addEventListener('input', (event) => {
    if (searchTimeout) window.clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(() => {
      const target = event.target as HTMLInputElement | null;
      const query = (target?.value || '').toLowerCase();
      const sessions = getSessions();

      if (query) {
        const filtered = sessions.filter(s =>
          (s.name || '').toLowerCase().includes(query) ||
          (s.prompt || '').toLowerCase().includes(query)
        );

        if (allSessionsList) {
          allSessionsList.innerHTML = filtered.length > 0
            ? filtered.slice(0, 20).map(s => `
                <div class="session-item" data-session-id="${s.id}">
                  <span class="session-item-icon">💬</span>
                  <div class="session-item-info">
                    <div class="session-item-name">${escapeHtml(s.name || s.prompt?.substring(0, 40) || 'Utan titel')}</div>
                    <div class="session-item-meta">${new Date(s.created_at).toLocaleDateString('sv-SE')}</div>
                  </div>
                </div>
              `).join('')
            : '<div class="session-empty">Inga resultat</div>';

          if (allSessionsCount) allSessionsCount.textContent = String(filtered.length);

          allSessionsList.querySelectorAll('.session-item').forEach(item => {
            item.addEventListener('click', () => {
              const session = sessions.find(s => s.id === (item as HTMLElement).dataset.sessionId);
              if (session) {
                openSession(session);
                if (window.innerWidth <= 1024) {
                  projectSidebar?.classList.remove('open');
                }
              }
            });
          });

          if (allSessionsAccordion && !allSessionsAccordion.classList.contains('open')) {
            allSessionsAccordion.classList.add('open');
          }
        }
      } else {
        renderSessionAccordions();
      }
    }, 300);
  });

  return { renderSessionAccordions };
}
