/**
 * Shared project picker modal.
 * Shows a list of KB projects as clickable cards and resolves with the selected project.
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

  listEl.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    const item = target?.closest('[data-project-id]') as HTMLElement | null;
    if (!item) return;

    const projectId = item.dataset.projectId || '';
    const projectName = item.dataset.projectName || '';
    const projectIcon = item.dataset.projectIcon || '📁';

    modal!.classList.remove('open');
    if (resolveSelection) {
      resolveSelection({ id: projectId, name: projectName, icon: projectIcon });
      resolveSelection = null;
    }
  });

  /**
   * Shows the project picker and returns a promise that resolves with the chosen project,
   * or null if cancelled.
   */
  async function pickProject(options?: { title?: string }): Promise<KbProjectBasic | null> {
    if (titleEl && options?.title) {
      titleEl.textContent = options.title;
    } else if (titleEl) {
      titleEl.textContent = '📁 Välj projekt';
    }

    listEl!.innerHTML = '<div style="color: var(--text-muted); padding: 20px; text-align: center;">Laddar projekt...</div>';
    modal!.classList.add('open');

    try {
      const res = await fetch('/api/ai-council/projects', { credentials: 'include' });
      const data = await res.json();
      const projects: KbProjectBasic[] = (data.projects || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        icon: p.icon || '📁'
      }));

      if (projects.length === 0) {
        listEl!.innerHTML = `
          <div style="padding: 24px; text-align: center; color: var(--text-muted);">
            <p style="margin-bottom: 12px;">Inga projekt hittade.</p>
            <a href="/admin/kunskapsbas" target="_blank" style="color: var(--color-accent, #2563eb);">Skapa ett projekt</a>
          </div>
        `;
      } else {
        listEl!.innerHTML = projects.map(p => `
          <button type="button" class="project-picker-item" data-project-id="${p.id}" data-project-name="${escapeAttr(p.name)}" data-project-icon="${escapeAttr(p.icon || '📁')}">
            <span class="project-picker-icon">${p.icon || '📁'}</span>
            <span class="project-picker-name">${escapeHtml(p.name)}</span>
          </button>
        `).join('');
      }
    } catch (err) {
      console.error('Error loading projects for picker:', err);
      listEl!.innerHTML = '<div style="padding: 20px; text-align: center; color: #ef4444;">Kunde inte ladda projekt.</div>';
    }

    return new Promise<KbProjectBasic | null>((resolve) => {
      resolveSelection = resolve;
    });
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
