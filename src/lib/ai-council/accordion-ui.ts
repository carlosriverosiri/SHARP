type AccordionUiOptions = {
  root?: Document | HTMLElement;
};

let handlersAttached = false;

export function initAccordionUi({ root = document }: AccordionUiOptions = {}) {
  const rootEl = root;

  const setAccordionHeight = (accordion: HTMLElement | null) => {
    if (!accordion) return;
    const contentEl = accordion.querySelector('.accordion-content') as HTMLElement | null;
    if (!contentEl) return;
    if (accordion.classList.contains('open')) {
      const nextHeight = contentEl.scrollHeight;
      contentEl.style.maxHeight = `${nextHeight}px`;
    } else {
      contentEl.style.maxHeight = '0px';
    }
  };

  if (!handlersAttached) {
    handlersAttached = true;
    rootEl.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      const header = target?.closest('.accordion-header') as HTMLElement | null;
      if (!header) return;
      const accordion = header.closest('.accordion') as HTMLElement | null;
      if (!accordion) return;
      accordion.classList.toggle('open');
      setAccordionHeight(accordion);
    });
  }

  const refreshAccordionHeight = (accordion: HTMLElement | null) => {
    if (!accordion) return;
    if (!accordion.classList.contains('open')) return;
    const contentEl = accordion.querySelector('.accordion-content') as HTMLElement | null;
    if (!contentEl) return;
    requestAnimationFrame(() => {
      contentEl.style.maxHeight = `${contentEl.scrollHeight}px`;
    });
  };

  return { refreshAccordionHeight };
}
