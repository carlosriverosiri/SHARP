type SoundNotificationsOptions = {
  toggleEl: HTMLInputElement | null;
};

export function initSoundNotifications({ toggleEl }: SoundNotificationsOptions) {
  function playNotificationSound(type: 'success' | 'error' | 'complete' = 'success') {
    if (!toggleEl?.checked) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioContext = new AudioCtx();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      if (type === 'success') {
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      } else if (type === 'error') {
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(165, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      } else {
        const osc2 = audioContext.createOscillator();
        const osc3 = audioContext.createOscillator();
        osc2.connect(gainNode);
        osc3.connect(gainNode);
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
        osc2.frequency.setValueAtTime(659, audioContext.currentTime);
        osc3.frequency.setValueAtTime(784, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
        osc2.start(audioContext.currentTime);
        osc3.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.8);
        osc3.stop(audioContext.currentTime + 0.8);
      }

      oscillator.type = 'sine';
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }

  return { playNotificationSound };
}
