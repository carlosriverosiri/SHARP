import type { AiCouncilProject } from './types';

type ProjectSidebarOptions = {
  projectList: HTMLElement | null;
  projectSearch: HTMLInputElement | null;
  escapeHtml: (text: string) => string;
  getProjects: () => AiCouncilProject[];
  setProjects: (projects: AiCouncilProject[]) => void;
  getCurrentProjectId: () => string | null;
  setCurrentProjectId: (id: string | null) => void;
  onProjectSelected?: (project: AiCouncilProject | null) => void;
};

const LAST_USED_STORAGE_KEY = 'ai-council-project-last-used';

export function initProjectSidebar({
  projectList,
  projectSearch,
  escapeHtml,
  getProjects,
  setProjects,
  getCurrentProjectId,
  setCurrentProjectId,
  onProjectSelected
}: ProjectSidebarOptions) {
  function readLastUsedMap(): Record<string, number> {
    try {
      const raw = localStorage.getItem(LAST_USED_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, number>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      console.warn('Could not read last-used map:', err);
      return {};
    }
  }

  function writeLastUsed(projectId: string) {
    try {
      const map = readLastUsedMap();
      map[projectId] = Date.now();
      localStorage.setItem(LAST_USED_STORAGE_KEY, JSON.stringify(map));
    } catch (err) {
      console.warn('Could not write last-used map:', err);
    }
  }

  function renderProjects() {
    if (!projectList) return;

    const projects = getProjects();
    const lastUsedMap = readLastUsedMap();
    const sortedProjects = [...projects].sort((a, b) => {
      const aUsed = lastUsedMap[a.id || ''] || 0;
      const bUsed = lastUsedMap[b.id || ''] || 0;
      if (aUsed !== bUsed) return bUsed - aUsed;
      const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
      const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
      return bDate - aDate;
    });

    let html = '';
    const currentProjectId = getCurrentProjectId();

    sortedProjects.forEach((p) => {
      const totalCount = Array.isArray(p.categories)
        ? p.categories.reduce((sum: number, c: { count?: number }) => sum + (c.count || 0), 0)
        : 0;
      const dateStr = p.updated_at || p.created_at
        ? new Date(p.updated_at || p.created_at || 0).toLocaleDateString('sv-SE')
        : '';
      html += `
        <div class="project-item ${currentProjectId === p.id ? 'active' : ''}" data-project-id="${p.id}">
          <span class="project-item-icon">${p.icon || '📁'}</span>
          <div class="project-item-info">
            <div class="project-item-name">${escapeHtml(p.name || 'Namnlöst')}</div>
            <div class="project-item-count">${totalCount} dokument${dateStr ? ' · ' + dateStr : ''}</div>
          </div>
        </div>
      `;
    });

    if (!html) {
      html = '<div class="session-empty" style="padding: 0.75rem 1.25rem;">Inga projekt ännu. Skapa ett i Projektöversikt.</div>';
    }

    projectList.innerHTML = html;
  }

  async function loadProjects() {
    try {
      const res = await fetch('/api/kunskapsbas/projects', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        renderProjects();
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  }

  function selectProject(projectId: string | null) {
    if (!projectId) return;
    setCurrentProjectId(projectId);
    writeLastUsed(projectId);
    renderProjects();
    const project = getProjects().find((p) => p.id === projectId) || null;
    if (typeof onProjectSelected === 'function') {
      onProjectSelected(project);
    }
  }

  async function updateProject(projectId: string, data: Record<string, unknown>) {
    try {
      const res = await fetch('/api/kunskapsbas/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: projectId, ...data })
      });

      if (res.ok) {
        const result = await res.json();
        if (result.project) {
          const projects = getProjects();
          const idx = projects.findIndex((p) => p.id === projectId);
          if (idx !== -1) {
            const next = [...projects];
            next[idx] = result.project;
            setProjects(next);
            renderProjects();
          }
        }
      }
    } catch (err) {
      console.error('Error updating project:', err);
    }
  }

  async function deleteProject(projectId: string) {
    try {
      const res = await fetch('/api/kunskapsbas/projects?id=' + projectId, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        const projects = getProjects();
        const next = projects.filter((p) => p.id !== projectId);
        setProjects(next);
        if (getCurrentProjectId() === projectId) {
          selectProject(null);
        }
        renderProjects();
      }
    } catch (err) {
      console.error('Error deleting project:', err);
    }
  }

  if (projectSearch) {
    projectSearch.addEventListener('input', () => {
      const query = projectSearch.value.trim().toLowerCase();
      if (!projectList) return;

      if (!query) {
        renderProjects();
        return;
      }

      const projects = getProjects();
      const filtered = projects.filter((p) => String(p.name || '').toLowerCase().includes(query));
      const current = getCurrentProjectId();

      let html = '';
      filtered.forEach((p) => {
        const totalCount = Array.isArray(p.categories)
          ? p.categories.reduce((sum: number, c: { count?: number }) => sum + (c.count || 0), 0)
          : 0;
        const dateStr = p.updated_at || p.created_at
          ? new Date(p.updated_at || p.created_at || 0).toLocaleDateString('sv-SE')
          : '';
        html += `
          <div class="project-item ${current === p.id ? 'active' : ''}" data-project-id="${p.id}">
            <span class="project-item-icon">${p.icon || '📁'}</span>
            <div class="project-item-info">
              <div class="project-item-name">${escapeHtml(p.name || 'Namnlöst')}</div>
              <div class="project-item-count">${totalCount} dokument${dateStr ? ' · ' + dateStr : ''}</div>
            </div>
          </div>
        `;
      });

      if (!html) {
        html = '<div class="session-empty" style="padding: 0.75rem 1.25rem;">Inga projekt matchar din sökning.</div>';
      }

      projectList.innerHTML = html;
    });
  }

  if (projectList) {
    projectList.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      const item = target?.closest('.project-item') as HTMLElement | null;
      const id = item?.dataset.projectId || null;
      if (!id) return;
      setCurrentProjectId(id);
      writeLastUsed(id);
      renderProjects();
      const project = getProjects().find((p) => p.id === id) || null;
      if (typeof onProjectSelected === 'function') {
        onProjectSelected(project);
      }
    });
  }

  return {
    loadProjects,
    renderProjects,
    selectProject,
    updateProject,
    deleteProject
  };
}
