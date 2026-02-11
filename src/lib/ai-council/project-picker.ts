/**
 * Shared project picker modal.
 * Shows a list of KB projects as clickable cards and resolves with the selected project.
 * Includes inline "Create new project" functionality.
 */

type KbProjectBasic = { id: string; name: string; icon?: string };

let resolveSelection: ((project: KbProjectBasic | null) => void) | null = null;

export function initProjectPicker() {
  const modal = document.getElementById('projectPickerModal');
  const closeBtn = document.getElementById('closeProjectPicker');
  const listEl = document.getElementById('projectPickerList');
  const titleEl = document.getElementById('projectPickerTitle');

  if (!modal || !listEl) return { pickProject: async () => null };

  function close() {
    modal!.classList.remove('open');
    if (resolveSelection) {
      resolveSelection(null);
      resolveSelection = null;
    }
  }

  closeBtn?.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal!.classList.contains('open')) close();
  });

  // Handle clicks on project items AND create button
  listEl.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement | null;

    // Handle "Create new project" button
    const createBtn = target?.closest('#pickerCreateProjectBtn') as HTMLElement | null;
    if (createBtn) {
      e.stopPropagation();
      handleCreateProject();
      return;
    }

    // Handle "Save new project" button
    const saveBtn = target?.closest('#pickerSaveNewProject') as HTMLElement | null;
    if (saveBtn) {
      e.stopPropagation();
      await handleSaveNewProject();
      return;
    }

    // Handle "Cancel new project" button
    const cancelBtn = target?.closest('#pickerCancelNewProject') as HTMLElement | null;
    if (cancelBtn) {
      e.stopPropagation();
      const form = listEl!.querySelector('.picker-create-form');
      if (form) form.remove();
      const btn = listEl!.querySelector('#pickerCreateProjectBtn') as HTMLElement;
      if (btn) btn.style.display = '';
      return;
    }

    // Handle project selection
    const item = target?.closest('[data-project-id]') as HTMLElement | null;
    if (!item) return;

    const projectId = item.dataset.projectId || '';
    const projectName = item.dataset.projectName || '';
    const projectIcon = item.dataset.projectIcon || '\uD83D\uDCC1';

    modal!.classList.remove('open');
    if (resolveSelection) {
      resolveSelection({ id: projectId, name: projectName, icon: projectIcon });
      resolveSelection = null;
    }
  });

  function handleCreateProject() {
    const createBtn = listEl!.querySelector('#pickerCreateProjectBtn') as HTMLElement;
    if (createBtn) createBtn.style.display = 'none';

    const form = document.createElement('div');
    form.className = 'picker-create-form';
    form.innerHTML = '<input type="text" id="pickerNewProjectName" class="picker-create-input" placeholder="Projektnamn...">' +
      '<div class="picker-create-actions">' +
      '<button type="button" id="pickerCancelNewProject" class="picker-create-cancel">Avbryt</button>' +
      '<button type="button" id="pickerSaveNewProject" class="picker-create-save">Skapa</button>' +
      '</div>';
    listEl!.appendChild(form);

    const input = form.querySelector('#pickerNewProjectName') as HTMLInputElement;
    input?.focus();

    input?.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') { ev.preventDefault(); handleSaveNewProject(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); form.remove(); if (createBtn) createBtn.style.display = ''; }
    });
  }

  async function handleSaveNewProject() {
    const input = listEl!.querySelector('#pickerNewProjectName') as HTMLInputElement;
    const name = input?.value?.trim();
    if (!name) { input?.focus(); return; }

    const saveBtn = listEl!.querySelector('#pickerSaveNewProject') as HTMLButtonElement;
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Skapar...'; }

    try {
      const res = await fetch('/api/kunskapsbas/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description: '' })
      });

      if (res.ok) {
        const data = await res.json();
        const newProject: KbProjectBasic = { id: data.project?.id || data.id, name, icon: '\uD83D\uDCC1' };
        modal!.classList.remove('open');
        if (resolveSelection) { resolveSelection(newProject); resolveSelection = null; }
        document.dispatchEvent(new CustomEvent('ai-council:projects-changed'));
      } else {
        const errData = await res.json().catch(() => ({}));
        const toast = (window as any).__showToast;
        if (toast) toast(errData.error || 'Kunde inte skapa projektet', 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Skapa'; }
      }
    } catch (err) {
      console.error('Error creating project:', err);
      const toast = (window as any).__showToast;
      if (toast) toast('Kunde inte skapa projektet.', 'error');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Skapa'; }
    }
  }

  async function pickProject(options?: { title?: string }): Promise<KbProjectBasic | null> {
    if (titleEl && options?.title) { titleEl.textContent = options.title; }
    else if (titleEl) { titleEl.textContent = '\uD83D\uDCC1 V\u00e4lj projekt'; }

    listEl!.innerHTML = '<div style="color: var(--text-muted); padding: 20px; text-align: center;">Laddar projekt...</div>';
    modal!.classList.add('open');

    try {
      const res = await fetch('/api/kunskapsbas/projects', { credentials: 'include' });
      const data = await res.json();
      const projects: KbProjectBasic[] = (data.projects || []).map((p: any) => ({
        id: p.id, name: p.name, icon: p.icon || '\uD83D\uDCC1'
      }));

      let html = '<button type="button" class="project-picker-item project-picker-none" data-project-id="__none__" data-project-name="" data-project-icon="">' +
        '<span class="project-picker-icon" style="opacity:0.4">\u2716</span>' +
        '<span class="project-picker-name" style="color:var(--text-muted,#9ca3af)">Inget projekt</span>' +
        '</button>';
      if (projects.length > 0) {
        html = projects.map(p =>
          '<button type="button" class="project-picker-item" data-project-id="' + escapeAttr(p.id) + '" data-project-name="' + escapeAttr(p.name) + '" data-project-icon="' + escapeAttr(p.icon || '\uD83D\uDCC1') + '">' +
          '<span class="project-picker-icon">' + (p.icon || '\uD83D\uDCC1') + '</span>' +
          '<span class="project-picker-name">' + escapeHtml(p.name) + '</span>' +
          '</button>'
        ).join('');
      }

      html += '<button type="button" id="pickerCreateProjectBtn" class="project-picker-item project-picker-create">' +
        '<span class="project-picker-icon">\u2795</span>' +
        '<span class="project-picker-name">Skapa nytt projekt</span>' +
        '</button>';

      listEl!.innerHTML = html;
    } catch (err) {
      console.error('Error loading projects for picker:', err);
      listEl!.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Kunde inte ladda projekt.</div>';
    }

    return new Promise<KbProjectBasic | null>((resolve) => { resolveSelection = resolve; });
  }

  return { pickProject };
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text: string): string {
  return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}