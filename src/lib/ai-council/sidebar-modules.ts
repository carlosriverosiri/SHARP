import { initZotero } from './zotero';
import { initSessionAccordions } from './session-accordions';
import { initKbLinkModal } from './kb-link-modal';
import { initProjectContextMenu } from './project-context-menu';

type SidebarModulesOptions = {
  contextEl: HTMLTextAreaElement | HTMLInputElement | null;
  escapeHtml: (value: string) => string;
  projectSidebar: HTMLElement | null;
  projectList: HTMLElement | null;
  projectSearch: HTMLInputElement | null;
  unsortedAccordion: HTMLElement | null;
  allSessionsAccordion: HTMLElement | null;
  unsortedList: HTMLElement | null;
  allSessionsList: HTMLElement | null;
  unsortedCount: HTMLElement | null;
  allSessionsCount: HTMLElement | null;
  getSessions: () => Array<any>;
  openSession: (session: any) => void;
  getProjects: () => Array<any>;
  isKbProjectMode: boolean;
  updateProject: (id: string, data: Record<string, any>) => Promise<void> | void;
  deleteProject: (id: string) => Promise<void> | void;
  showToast?: (message: string, type: 'success' | 'error') => void;
};

export function initSidebarModules({
  contextEl,
  escapeHtml,
  projectSidebar,
  projectList,
  projectSearch,
  unsortedAccordion,
  allSessionsAccordion,
  unsortedList,
  allSessionsList,
  unsortedCount,
  allSessionsCount,
  getSessions,
  openSession,
  getProjects,
  isKbProjectMode,
  updateProject,
  deleteProject,
  showToast
}: SidebarModulesOptions) {
  initZotero({ contextEl: contextEl as HTMLTextAreaElement | null, escapeHtml });

  const { renderSessionAccordions } = initSessionAccordions({
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
  });

  const kbLinkModalApi = initKbLinkModal({
    modalEl: document.getElementById('kbLinkModal'),
    closeBtn: document.getElementById('closeKbLinkModal'),
    projectListEl: document.getElementById('kbProjectList'),
    autoIncludeEl: document.getElementById('kbAutoInclude') as HTMLInputElement | null,
    saveBtn: document.getElementById('kbSaveBtn'),
    unlinkBtn: document.getElementById('kbUnlinkBtn'),
    getProjects,
    showToast: typeof showToast === 'function' ? showToast : undefined
  });

  initProjectContextMenu({
    projectList,
    contextMenu: document.getElementById('projectContextMenu'),
    colorPickerModal: document.getElementById('colorPickerModal'),
    iconPickerModal: document.getElementById('iconPickerModal'),
    closeColorPickerBtn: document.getElementById('closeColorPicker'),
    closeIconPickerBtn: document.getElementById('closeIconPicker'),
    isKbProjectMode,
    getProjects,
    updateProject,
    deleteProject,
    openKbLinkModal: (projectId) => kbLinkModalApi.openKbLinkModal(projectId)
  });

  return { renderSessionAccordions };
}
