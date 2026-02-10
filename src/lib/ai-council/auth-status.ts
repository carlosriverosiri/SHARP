type AuthStatusOptions = {
  logoutBanner: HTMLElement | null;
  checkUrl?: string;
  intervalMs?: number;
  onLogout?: () => void;
};

export function initAuthStatus({
  logoutBanner,
  checkUrl = '/api/ai-council/sessions',
  intervalMs = 2 * 60 * 1000,
  onLogout
}: AuthStatusOptions) {
  let isLoggedOut = false;
  let authCheckInterval: number | null = null;

  async function checkAuthStatus() {
    if (isLoggedOut) return false;

    try {
      const res = await fetch(checkUrl, {
        credentials: 'include',
        method: 'HEAD'
      });

      if (res.status === 401) {
        showLogoutBanner();
        return false;
      }

      if (res.status === 200) {
        const checkRes = await fetch(checkUrl, { credentials: 'include' });
        const data = await checkRes.json();
        if (data?.error && (data.error.includes('Ej inloggad') || data.error.includes('användare'))) {
          showLogoutBanner();
          return false;
        }
      }

      return true;
    } catch (error) {
      console.warn('Auth check failed:', error);
      return true;
    }
  }

  function showLogoutBanner() {
    if (isLoggedOut) return;
    isLoggedOut = true;
    logoutBanner?.classList.add('visible');
    document.body.classList.add('has-logout-banner');

    if (authCheckInterval) {
      clearInterval(authCheckInterval);
      authCheckInterval = null;
    }

    onLogout?.();
  }

  function start() {
    checkAuthStatus();
    authCheckInterval = window.setInterval(checkAuthStatus, intervalMs);
  }

  function stop() {
    if (authCheckInterval) {
      clearInterval(authCheckInterval);
      authCheckInterval = null;
    }
  }

  (window as any).dismissLogoutBanner = function dismissLogoutBanner() {
    logoutBanner?.classList.remove('visible');
    document.body.classList.remove('has-logout-banner');
  };

  return { checkAuthStatus, showLogoutBanner, start, stop };
}
