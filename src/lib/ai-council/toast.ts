type ToastOptions = {
  container: HTMLElement | null;
  defaultDurationMs?: number;
};

export type ToastType = 'success' | 'error' | 'info';

export function initToast({ container, defaultDurationMs = 3200 }: ToastOptions) {
  if (!container) {
    return {
      showToast: (_message: string, _type: ToastType = 'info') => {}
    };
  }
  const safeContainer = container;

  function showToast(message: string, type: ToastType = 'info', durationMs?: number) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    safeContainer.appendChild(toast);

    const duration = typeof durationMs === 'number' ? durationMs : defaultDurationMs;
    const timeout = window.setTimeout(() => {
      toast.classList.add('hide');
      window.setTimeout(() => toast.remove(), 250);
    }, duration);

    toast.addEventListener('click', () => {
      window.clearTimeout(timeout);
      toast.classList.add('hide');
      window.setTimeout(() => toast.remove(), 250);
    });
  }

  return { showToast };
}
