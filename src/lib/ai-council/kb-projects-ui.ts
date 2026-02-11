import type { KbProject } from './types';

type KbProjectsUiOptions = {
  kbProjectSelect: HTMLInputElement | HTMLSelectElement | null;
  kbProjectPickerBtn: HTMLElement | null;
  kbProjectBtnText: HTMLElement | null;
  sessionProjectFilter: HTMLSelectElement | null;
  escapeHtml: (value: string) => string;
  getKbProjects: () => KbProject[];
  setKbProjects: (projects: KbProject[]) => void;
  setKbProjectMap: (map: Record<string, string>) => void;
  getCurrentProjectFilter: () => string;
  setCurrentProjectFilter: (value: string) => void;
  renderSessions: () => void;
  pickProject?: (options?: { title?: string }) => Promise<{ id: string; name: string; icon?: string } | null>;
};

export function initKbProjectsUi({
  kbProjectSelect,
  kbProjectPickerBtn,
  kbProjectBtnText,
  sessionProjectFilter,
  escapeHtml,
  getKbProjects,
  setKbProjects,
  setKbProjectMap,
  getCurrentProjectFilter,
  setCurrentProjectFilter,
  renderSessions,
  pickProject
}: KbProjectsUiOptions) {

  function rebuildKbProjectMap(projects: KbProject[]) {
    const kbMap: Record<string, string> = {};
    projects.forEach((p) => { kbMap[p.id] = p.name; });
    setKbProjectMap(kbMap);
  }

  function updateBtnText(projectName?: string) {
    if (!kbProjectBtnText) return;
    if (projectName) {
      kbProjectBtnText.textContent = projectName;
      kbProjectPickerBtn?.classList.remove('kb-project-btn--empty');
    } else {
      kbProjectBtnText.textContent = 'V\u00e4lj projekt';
      kbProjectPickerBtn?.classList.add('kb-project-btn--empty');
    }
  }

  kbProjectPickerBtn?.addEventListener('click', async () => {
    if (!pickProject) return;
    const selected = await pickProject({ title: '\uD83D\uDCC1 V\u00e4lj projekt f\u00f6r session' });
    if (!selected) return;
    if (kbProjectSelect) { (kbProjectSelect as HTMLInputElement).value = selected.id; }
    updateBtnText(selected.name);
    const existing = getKbProjects().find(p => p.id === selected.id);
    if (!existing) { await loadKbProjects(); }
  });

  function renderKbProjectSelectors() {
    const kbProjects = [...getKbProjects()].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'sv-SE', { sensitivity: 'base' })
    );
    if (kbProjectSelect) {
      const currentId = (kbProjectSelect as HTMLInputElement).value;
      const currentProject = kbProjects.find(p => p.id === currentId);
      updateBtnText(currentProject?.name);
      const urlProjectId = new URLSearchParams(window.location.search).get('kb_project');
      if (urlProjectId) {
        const urlProject = kbProjects.find(p => p.id === urlProjectId);
        if (urlProject) {
          (kbProjectSelect as HTMLInputElement).value = urlProjectId;
          updateBtnText(urlProject.name);
        }
      }
    }
    if (sessionProjectFilter) {
      const current = sessionProjectFilter.value || getCurrentProjectFilter() || 'all';
      sessionProjectFilter.innerHTML =
        '<option value="all">Alla projekt</option>' +
        '<option value="unsorted">\u00d6vrigt</option>' +
        kbProjects.map(p => '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>').join('');
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
      rebuildKbProjectMap(kbProjects);
      renderKbProjectSelectors();
    } catch (err) {
      console.error('KB projects load error:', err);
    }
  }

  sessionProjectFilter?.addEventListener('change', () => {
    setCurrentProjectFilter(sessionProjectFilter.value || 'all');
    renderSessions();
  });

  document.addEventListener('ai-council:projects-changed', () => { void loadKbProjects(); });

  return { loadKbProjects, renderKbProjectSelectors };
}