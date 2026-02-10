import type { AiCouncilProject } from './types';

type ProjectSelectionStorageOptions = {
  loadProjects: () => Promise<void>;
  getProjects: () => AiCouncilProject[];
  selectProject: (projectId: string) => void;
  storageKey?: string;
};

export function initProjectSelectionStorage({
  loadProjects,
  getProjects,
  selectProject,
  storageKey = 'ai-council-current-project-id'
}: ProjectSelectionStorageOptions) {
  async function loadProjectsWithSelection() {
    await loadProjects();
    const storedId = localStorage.getItem(storageKey);
    if (!storedId) return;
    const projectExists = getProjects().some((project) => project.id === storedId);
    if (projectExists) {
      selectProject(storedId);
    }
  }

  return { loadProjectsWithSelection };
}
