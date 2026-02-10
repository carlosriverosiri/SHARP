import { initAuthStatus } from './auth-status';
import { initSoundNotifications } from './sound-notifications';

type StatusNotificationsOptions = {
  logoutBanner: HTMLElement | null;
  soundToggleEl: HTMLInputElement | null;
};

export function initStatusNotifications({ logoutBanner, soundToggleEl }: StatusNotificationsOptions) {
  const authStatus = initAuthStatus({ logoutBanner });
  const { showLogoutBanner } = authStatus;
  authStatus.start();

  const { playNotificationSound } = initSoundNotifications({ toggleEl: soundToggleEl });

  return { showLogoutBanner, playNotificationSound };
}
