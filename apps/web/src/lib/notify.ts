/** Browser notifications (local — no server push needed). */

export function notifySupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notifyPermission(): NotificationPermission {
  return notifySupported() ? Notification.permission : 'denied';
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export function notify(title: string, body?: string) {
  if (notifySupported() && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/icon.svg' });
    } catch {
      /* notifications can throw on some platforms — ignore */
    }
  }
}
