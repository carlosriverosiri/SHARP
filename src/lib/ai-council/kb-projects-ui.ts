import type { KbProject } from './types';

type KbProjectsUiOptions = {
  kbProjectSelect: HTMLInputElement | HTMLSelectElement | null;
  kbProjectPickerBtn: HTMLElement | null;
  kbProjectBtnText: HTMLElement | null;
  sessionProjectFilter: HTMLInputElement | HTMLSelectElement | null;
  sessionProjectFilterBtn: HTMLElement | null;
  sessionProjectFilterText: HTMLElement | null;
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
  sessionProjectFilterBtn,
  sessionProjectFilterText,
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
      const current = (sessionProjectFilter as HTMLInputElement).value || getCurrentProjectFilter() || 'all';
      // Update button text
      if (sessionProjectFilterText) {
        if (current === 'all') {
          sessionProjectFilterText.textContent = 'Alla projekt';
          sessionProjectFilterBtn?.classList.add('kb-project-btn--empty');
        } else if (current === 'unsorted') {
          sessionProjectFilterText.textContent = '\u00d6vrigt';
          sessionProjectFilterBtn?.classList.remove('kb-project-btn--empty');
        } else {
          const proj = kbProjects.find(p => p.id === current);
          sessionProjectFilterText.textContent = proj ? proj.name : 'Alla projekt';
          sessionProjectFilterBtn?.classList.remove('kb-project-btn--empty');
        }
      }
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

  // Filter button opens a picker-style menu
  sessionProjectFilterBtn?.addEventListener('click', async () => {
    if (!pickProject) return;
    const selected = await pickProject({ title: '\uD83D\uDCC1 Filtrera per projekt' });
    if (!selected) return;
    if (sessionProjectFilter) { (sessionProjectFilter as HTMLInputElement).value = selected.id; }
    if (sessionProjectFilterText) {
      sessionProjectFilterText.textContent = selected.name;
      sessionProjectFilterBtn.classList.remove('kb-project-btn--empty');
    }
    setCurrentProjectFilter(selected.id);
    renderSessions();
  });

  document.addEventListener('ai-council:projects-changed', () => { void loadKbProjects(); });

  return { loadKbProjects, renderKbProjectSelectors };
}