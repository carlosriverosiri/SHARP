import type { AiCouncilProject, KbProjectInfo } from './types';

type KbLinkModalOptions = {
  modalEl: HTMLElement | null;
  closeBtn: HTMLElement | null;
  projectListEl: HTMLElement | null;
  autoIncludeEl: HTMLInputElement | null;
  saveBtn: HTMLElement | null;
  unlinkBtn: HTMLElement | null;
  getProjects: () => AiCouncilProject[];
  showToast?: (message: string, type: 'success' | 'error') => void;
};

export function initKbLinkModal({
  modalEl,
  closeBtn,
  projectListEl,
  autoIncludeEl,
  saveBtn,
  unlinkBtn,
  getProjects,
  showToast
}: KbLinkModalOptions) {
  let currentKbLinkProjectId: string | null = null;
  let selectedKbProjectId: string | null = null;
  let handlersAttached = false;

  async function openKbLinkModal(projectId: string | null) {
    if (!projectId) return;

    currentKbLinkProjectId = projectId;
    selectedKbProjectId = null;

    const projects = getProjects();
    const project = projects.find(p => p.id === projectId);

    if (modalEl) modalEl.classList.add('open');
    if (projectListEl) {
      projectListEl.innerHTML = '<div style="color: var(--text-muted); padding: 20px; text-align: center;">Laddar kunskapsbas-projekt...</div>';
    }

    try {
      const res = await fetch('/api/ai-council/kb-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'listKbProjects' })
      });
      const { kbProjects, error } = await res.json() as { kbProjects?: KbProjectInfo[]; error?: string };

      if (error || !kbProjects || kbProjects.length === 0) {
        if (projectListEl) {
          projectListEl.innerHTML = '<div style="color: var(--text-muted); padding: 20px; text-align: center;">Inga kunskapsbas-projekt hittades.<br><a href="/admin/kunskapsbas" style="color: var(--color-primary);">Skapa ett projekt</a></div>';
        }
        return;
      }

      if (projectListEl) {
        projectListEl.innerHTML = (kbProjects as KbProjectInfo[]).map(kb => {
          const isSelected = project?.kb_project_id === kb.id;
          return '<div class="kb-project-option' + (isSelected ? ' selected' : '') + '" data-kb-id="' + kb.id + '" style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.15s;' + (isSelected ? ' background: #eff6ff; border-color: var(--color-primary);' : '') + '">' +
            '<span style="font-size: 24px;">' + (kb.icon || String.fromCodePoint(0x1F4C1)) + '</span>' +
            '<div style="flex: 1; min-width: 0;">' +
              '<div style="font-weight: 500; color: var(--text-primary);">' + kb.name + '</div>' +
              '<div style="font-size: 12px; color: var(--text-muted);">' + kb.itemCount + ' dokument - ~' + (kb.tokens || 0).toLocaleString() + ' tokens</div>' +
            '</div>' +
            (isSelected ? '<span style="color: var(--color-primary); font-weight: 600;">' + String.fromCodePoint(0x2713) + '</span>' : '') +
          '</div>';
        }).join('');
      }

      if (project?.kb_project_id) {
        selectedKbProjectId = project.kb_project_id;
        if (autoIncludeEl) autoIncludeEl.checked = project.auto_include_kb !== false;
      } else {
        if (autoIncludeEl) autoIncludeEl.checked = true;
      }

      if (projectListEl && !handlersAttached) {
        projectListEl.addEventListener('click', (event) => {
          const target = event.target as HTMLElement | null;
          const option = target?.closest('.kb-project-option') as HTMLElement | null;
          if (!option) return;
          projectListEl.querySelectorAll('.kb-project-option').forEach(opt => {
            opt.classList.remove('selected');
            (opt as HTMLElement).style.background = '';
            (opt as HTMLElement).style.borderColor = 'var(--border-color)';
            const checkmark = opt.querySelector('span:last-child');
            if (checkmark && checkmark.textContent === String.fromCodePoint(0x2713)) checkmark.remove();
          });
          option.classList.add('selected');
          option.style.background = '#eff6ff';
          option.style.borderColor = 'var(--color-primary)';
          option.insertAdjacentHTML('beforeend', '<span style="color: var(--color-primary); font-weight: 600;">' + String.fromCodePoint(0x2713) + '</span>');
          selectedKbProjectId = option.dataset.kbId || null;
        });
        handlersAttached = true;
      }
    } catch (err) {
      console.error('Error loading KB projects:', err);
      if (projectListEl) {
        projectListEl.innerHTML = '<div style="color: var(--color-danger); padding: 20px; text-align: center;">Kunde inte ladda projekt</div>';
      }
    }
  }

  closeBtn?.addEventListener('click', () => {
    if (modalEl) modalEl.classList.remove('open');
  });

  saveBtn?.addEventListener('click', async () => {
    if (!currentKbLinkProjectId) return;

    try {
      const res = await fetch('/api/ai-council/kb-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'linkKbProject',
          projectId: currentKbLinkProjectId,
          kbProjectId: selectedKbProjectId,
          autoInclude: autoIncludeEl ? autoIncludeEl.checked : true
        })
      });

      const result = await res.json();
      if (result.success) {
        const project = getProjects().find(p => p.id === currentKbLinkProjectId);
        if (project) {
          project.kb_project_id = selectedKbProjectId;
          project.auto_include_kb = autoIncludeEl ? autoIncludeEl.checked : true;
        }
        if (modalEl) modalEl.classList.remove('open');
        if (showToast) showToast('Kunskapsbas kopplad!', 'success');
      } else {
        if (showToast) showToast('Kunde inte spara', 'error');
      }
    } catch (err) {
      console.error('Error saving KB link:', err);
      if (showToast) showToast('Nagot gick fel', 'error');
    }
  });

  unlinkBtn?.addEventListener('click', async () => {
    if (!currentKbLinkProjectId) return;

    try {
      const res = await fetch('/api/ai-council/kb-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'linkKbProject',
          projectId: currentKbLinkProjectId,
          kbProjectId: null,
          autoInclude: false
        })
      });

      const result = await res.json();
      if (result.success) {
        const project = getProjects().find(p => p.id === currentKbLinkProjectId);
        if (project) {
          project.kb_project_id = null;
          project.auto_include_kb = false;
        }
        if (modalEl) modalEl.classList.remove('open');
        if (showToast) showToast('Kunskapsbas-koppling borttagen', 'success');
      }
    } catch (err) {
      console.error('Error unlinking KB:', err);
    }
  });

  return { openKbLinkModal };
}
