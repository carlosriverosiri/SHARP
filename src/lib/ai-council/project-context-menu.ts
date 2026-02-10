import type { AiCouncilProject } from './types';

type ProjectContextMenuOptions = {
  projectList: HTMLElement | null;
  contextMenu: HTMLElement | null;
  colorPickerModal: HTMLElement | null;
  iconPickerModal: HTMLElement | null;
  closeColorPickerBtn: HTMLElement | null;
  closeIconPickerBtn: HTMLElement | null;
  isKbProjectMode: boolean;
  getProjects: () => AiCouncilProject[];
  updateProject: (id: string, data: Record<string, any>) => Promise<void> | void;
  deleteProject: (id: string) => Promise<void> | void;
  openKbLinkModal: (projectId: string) => void;
};

export function initProjectContextMenu({
  projectList,
  contextMenu,
  colorPickerModal,
  iconPickerModal,
  closeColorPickerBtn,
  closeIconPickerBtn,
  isKbProjectMode,
  getProjects,
  updateProject,
  deleteProject,
  openKbLinkModal
}: ProjectContextMenuOptions) {
  if (!projectList || !contextMenu) {
    return;
  }

  let contextMenuProjectId: string | null = null;

  projectList.addEventListener('contextmenu', (event) => {
    if (isKbProjectMode) return;
    const target = event.target as HTMLElement | null;
    const projectItem = target?.closest?.('.project-item') as HTMLElement | null;
    const projectId = projectItem?.dataset?.projectId;
    if (!projectId) return;

    event.preventDefault();
    contextMenuProjectId = projectId;
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
    contextMenu.classList.add('open');
  });

  document.addEventListener('click', (event) => {
    const target = event.target as Node | null;
    if (!target || !contextMenu.contains(target)) {
      contextMenu.classList.remove('open');
    }
  });

  contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = (item as HTMLElement).dataset.action;
      if (!contextMenuProjectId) return;
      const project = getProjects().find(p => p.id === contextMenuProjectId);
      if (!project && action !== 'delete') return;

      contextMenu.classList.remove('open');

      switch (action) {
        case 'edit': {
          const newName = prompt('Nytt namn:', project?.name || '');
          if (newName && newName !== project?.name) {
            await updateProject(contextMenuProjectId, { name: newName });
          }
          break;
        }
        case 'context': {
          const newContext = prompt('Automatisk kontext för alla frågor:', project?.context || '');
          if (newContext !== null) {
            await updateProject(contextMenuProjectId, { context: newContext });
          }
          break;
        }
        case 'kb-link':
          openKbLinkModal(contextMenuProjectId);
          break;
        case 'color':
          colorPickerModal?.querySelectorAll('.color-picker-option').forEach(opt => {
            opt.classList.toggle('selected', (opt as HTMLElement).dataset.color === project?.color);
          });
          colorPickerModal?.classList.add('open');
          break;
        case 'icon':
          iconPickerModal?.querySelectorAll('.icon-picker-option').forEach(opt => {
            opt.classList.toggle('selected', (opt as HTMLElement).dataset.icon === project?.icon);
          });
          iconPickerModal?.classList.add('open');
          break;
        case 'pin':
          await updateProject(contextMenuProjectId, { is_pinned: !project?.is_pinned });
          break;
        case 'delete':
          if (confirm('Är du säker på att du vill ta bort projektet? Sessioner flyttas till "Osorterade".')) {
            await deleteProject(contextMenuProjectId);
          }
          break;
      }
    });
  });

  colorPickerModal?.querySelectorAll('.color-picker-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      if (!contextMenuProjectId) return;
      const color = (opt as HTMLElement).dataset.color;
      await updateProject(contextMenuProjectId, { color });
      colorPickerModal.classList.remove('open');
    });
  });
  closeColorPickerBtn?.addEventListener('click', () => {
    colorPickerModal?.classList.remove('open');
  });

  iconPickerModal?.querySelectorAll('.icon-picker-option').forEach(opt => {
    opt.addEventListener('click', async () => {
      if (!contextMenuProjectId) return;
      const icon = (opt as HTMLElement).dataset.icon;
      await updateProject(contextMenuProjectId, { icon });
      iconPickerModal.classList.remove('open');
    });
  });
  closeIconPickerBtn?.addEventListener('click', () => {
    iconPickerModal?.classList.remove('open');
  });
}
