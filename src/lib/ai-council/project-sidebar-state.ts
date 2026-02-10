import { initProjectSidebar } from './project-sidebar';
import type { AiCouncilProject } from './types';

type ProjectSidebarStateOptions = {
  projectList: HTMLElement | null;
  projectSearch: HTMLInputElement | null;
  escapeHtml: (text: string) => string;
  onProjectSelected?: (project: AiCouncilProject | null) => void;
};

export function initProjectSidebarState({
  projectList,
  projectSearch,
  escapeHtml,
  onProjectSelected
}: ProjectSidebarStateOptions) {
  let projects: AiCouncilProject[] = [];
  let currentProjectId: string | null = null;
  const isKbProjectMode = false;

  const projectSidebarApi = initProjectSidebar({
    projectList,
    projectSearch,
    escapeHtml,
    getProjects: () => projects,
    setProjects: (next: AiCouncilProject[]) => { projects = next; },
    getCurrentProjectId: () => currentProjectId,
    setCurrentProjectId: (id) => { currentProjectId = id; },
    onProjectSelected
  });

  return {
    getProjects: () => projects,
    setProjects: (next: AiCouncilProject[]) => { projects = next; },
    getCurrentProjectId: () => currentProjectId,
    setCurrentProjectId: (id: string | null) => { currentProjectId = id; },
    selectProject: projectSidebarApi.selectProject,
    loadProjects: projectSidebarApi.loadProjects,
    updateProject: projectSidebarApi.updateProject,
    deleteProject: projectSidebarApi.deleteProject,
    isKbProjectMode
  };
}
