import type { KbProject } from './types';

type KbProjectsUiOptions = {
  kbProjectSelect: HTMLSelectElement | null;
  sessionProjectFilter: HTMLSelectElement | null;
  escapeHtml: (value: string) => string;
  getKbProjects: () => KbProject[];
  setKbProjects: (projects: KbProject[]) => void;
  setKbProjectMap: (map: Record<string, string>) => void;
  getCurrentProjectFilter: () => string;
  setCurrentProjectFilter: (value: string) => void;
  renderSessions: () => void;
};

export function initKbProjectsUi({
  kbProjectSelect,
  sessionProjectFilter,
  escapeHtml,
  getKbProjects,
  setKbProjects,
  setKbProjectMap,
  getCurrentProjectFilter,
  setCurrentProjectFilter,
  renderSessions
}: KbProjectsUiOptions) {
  const createOptionValue = '__create__';

  function updateProjectSelectState() {
    if (!kbProjectSelect) return;
    const isEmpty = !kbProjectSelect.value;
    kbProjectSelect.classList.toggle('kb-project-select--empty', isEmpty);
  }

  function rebuildKbProjectMap(projects: KbProject[]) {
    const kbMap: Record<string, string> = {};
    projects.forEach((p) => { kbMap[p.id] = p.name; });
    setKbProjectMap(kbMap);
  }

  async function createKbProject() {
    if (!kbProjectSelect) return;
    const name = window.prompt('Namn på nytt projekt?');
    if (!name || !name.trim()) {
      kbProjectSelect.value = '';
      updateProjectSelectState();
      return;
    }

    try {
      const res = await fetch('/api/kunskapsbas/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.project?.id) {
        console.error('Kunde inte skapa projekt:', data.error || res.statusText);
        kbProjectSelect.value = '';
        updateProjectSelectState();
        return;
      }

      const next = [...getKbProjects(), { id: data.project.id, name: data.project.name }];
      setKbProjects(next);
      rebuildKbProjectMap(next);
      renderKbProjectSelectors();
      kbProjectSelect.value = data.project.id;
      updateProjectSelectState();
    } catch (err) {
      console.error('Kunde inte skapa projekt:', err);
      kbProjectSelect.value = '';
      updateProjectSelectState();
    }
  }

  function renderKbProjectSelectors() {
    const kbProjects = [...getKbProjects()].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'sv-SE', { sensitivity: 'base' })
    );
    if (kbProjectSelect) {
      const rawValue = kbProjectSelect.value || '';
      const current = rawValue === createOptionValue ? '' : rawValue;
      kbProjectSelect.innerHTML = `
        <option value="" disabled>Välj projekt</option>
        <option value="${createOptionValue}">＋ Skapa nytt projekt</option>
        <option value="unsorted">Övrigt</option>
        ${kbProjects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
      `;
      const urlProjectId = new URLSearchParams(window.location.search).get('kb_project');
      if (urlProjectId && kbProjects.find(p => p.id === urlProjectId)) {
        kbProjectSelect.value = urlProjectId;
      } else {
        kbProjectSelect.value = kbProjects.find(p => p.id === current) ? current : (current || '');
      }
      updateProjectSelectState();
    }
    if (sessionProjectFilter) {
      const current = sessionProjectFilter.value || getCurrentProjectFilter() || 'all';
      sessionProjectFilter.innerHTML = `
        <option value="all">Alla projekt</option>
        <option value="unsorted">Övrigt</option>
        ${kbProjects.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
      `;
      sessionProjectFilter.value = kbProjects.find(p => p.id === current) ? current : current;
      setCurrentProjectFilter(sessionProjectFilter.value || 'all');
    }
  }

  async function loadKbProjects() {
    try {
      const res = await fetch('/api/kunskapsbas/projects', { credentials: 'include' });
      const data = await res.json();
      const kbProjects: KbProject[] = (data.projects || []).map((p: any) => ({ id: p.id, name: p.name }));
      setKbProjects(kbProjects);
      const kbMap: Record<string, string> = {};
      kbProjects.forEach((p) => { kbMap[p.id] = p.name; });
      setKbProjectMap(kbMap);
      renderKbProjectSelectors();
    } catch (err) {
      console.error('KB projects load error:', err);
    }
  }

  sessionProjectFilter?.addEventListener('change', () => {
    setCurrentProjectFilter(sessionProjectFilter.value || 'all');
    renderSessions();
  });

  kbProjectSelect?.addEventListener('change', () => {
    if (kbProjectSelect.value === createOptionValue) {
      void createKbProject();
      return;
    }
    updateProjectSelectState();
  });

  return { loadKbProjects, renderKbProjectSelectors };
}
