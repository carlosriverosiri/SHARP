type ProjectSidebarUiOptions = {
  projectSidebar: HTMLElement | null;
  mobileMenuBtn: HTMLElement | null;
  notesSidebar: HTMLElement | null;
  mobileNotesFab: HTMLElement | null;
  mobileNotesBadge: HTMLElement | null;
  newChatBtn: HTMLElement | null;
  kbProjectSelect?: HTMLSelectElement | null;
  contextEl: HTMLTextAreaElement | HTMLInputElement | null;
  promptEl: HTMLTextAreaElement | HTMLInputElement | null;
  resultsEl: HTMLElement | null;
  synthesisCard: HTMLElement | null;
  setStatus: (text: string, show: boolean) => void;
  hideError: () => void;
  resetWorkflow: () => void;
  getSessions: () => Array<any>;
  setCurrentPrompt: (value: string) => void;
  setCurrentResponses: (value: any) => void;
  setCurrentSessionId: (value: string | null) => void;
  clearUploadedFiles: () => void;
};

export function initProjectSidebarUi({
  projectSidebar,
  mobileMenuBtn,
  notesSidebar,
  mobileNotesFab,
  mobileNotesBadge,
  newChatBtn,
  kbProjectSelect,
  contextEl,
  promptEl,
  resultsEl,
  synthesisCard,
  setStatus,
  hideError,
  resetWorkflow,
  getSessions,
  setCurrentPrompt,
  setCurrentResponses,
  setCurrentSessionId,
  clearUploadedFiles
}: ProjectSidebarUiOptions) {
  let mobileOverlay = document.querySelector('.mobile-overlay');
  if (!mobileOverlay) {
    mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'mobile-overlay';
    document.body.appendChild(mobileOverlay);
  }

  function updateNotesBadge() {
    if (!mobileNotesBadge) return;
    const count = getSessions().length;
    mobileNotesBadge.textContent = String(count);
    mobileNotesBadge.dataset.count = String(count);
  }

  mobileMenuBtn?.addEventListener('click', () => {
    if (!projectSidebar) return;
    projectSidebar.classList.toggle('open');
    mobileOverlay?.classList.toggle('active', projectSidebar.classList.contains('open'));
  });

  mobileNotesFab?.addEventListener('click', () => {
    if (!notesSidebar) return;
    notesSidebar.classList.add('open');
    notesSidebar.classList.remove('collapsed');
    mobileOverlay?.classList.add('active');
  });

  mobileOverlay?.addEventListener('click', () => {
    projectSidebar?.classList.remove('open');
    notesSidebar?.classList.remove('open');
    mobileOverlay?.classList.remove('active');
  });

  document.addEventListener('click', (e) => {
    if (!projectSidebar || !mobileOverlay) return;
    const target = e.target as Node | null;
    if (
      window.innerWidth <= 1024 &&
      projectSidebar.classList.contains('open') &&
      target &&
      !projectSidebar.contains(target) &&
      target !== mobileMenuBtn &&
      !mobileOverlay.contains(target)
    ) {
      projectSidebar.classList.remove('open');
      mobileOverlay.classList.remove('active');
    }
  });

  newChatBtn?.addEventListener('click', () => {
    if (contextEl) contextEl.value = '';
    if (promptEl) promptEl.value = '';

    clearUploadedFiles();
    const fileListEl = document.getElementById('fileList');
    if (fileListEl) fileListEl.innerHTML = '';

    resetWorkflow();

    resultsEl?.classList.remove('visible');
    if (synthesisCard) synthesisCard.style.display = 'none';
    const synthesisContent = document.getElementById('synthesisContent');
    if (synthesisContent) synthesisContent.innerHTML = '';
    document.getElementById('costBanner')?.classList.remove('visible');

    setCurrentPrompt('');
    setCurrentResponses({});
    setCurrentSessionId(null);

    if (kbProjectSelect) {
      kbProjectSelect.value = '';
      kbProjectSelect.classList.add('kb-project-select--empty');
      kbProjectSelect.focus();
      kbProjectSelect.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setStatus('Välj projekt för chatten.', true);
      setTimeout(() => setStatus('', false), 2000);
    }

    document.querySelectorAll('.result-accordion').forEach(acc => {
      (acc as HTMLElement).style.display = 'none';
    });

    setStatus('', false);
    hideError();

    if (window.innerWidth <= 1024) {
      projectSidebar?.classList.remove('open');
    }

    console.log('🗑️ New chat - all state cleared');
  });

  updateNotesBadge();

  return { updateNotesBadge };
}
