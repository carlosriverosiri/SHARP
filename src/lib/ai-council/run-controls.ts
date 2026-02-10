type RunControlsOptions = {
  runBtn: HTMLButtonElement | null;
  runQuery: () => void | Promise<void>;
  hallucinationToggleBtn: HTMLElement | null;
  hallucinationList: HTMLElement | null;
};

export function initRunControls({
  runBtn,
  runQuery,
  hallucinationToggleBtn,
  hallucinationList
}: RunControlsOptions) {
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      runQuery();
    });
  }

  document.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    const isEditable = target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.isContentEditable;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isEditable) {
      runQuery();
    }
  });

  hallucinationToggleBtn?.addEventListener('click', function() {
    if (!hallucinationList) return;
    const isVisible = hallucinationList.style.display !== 'none';
    hallucinationList.style.display = isVisible ? 'none' : 'block';
    const label = this.querySelector('span');
    if (label) label.textContent = isVisible ? '▼ Visa detaljer' : '▲ Dölj detaljer';
  });
}
