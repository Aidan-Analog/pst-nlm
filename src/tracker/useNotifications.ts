import { useEffect, useRef, useState } from 'react';

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const STORAGE_KEY = 'activityTracker_lastNotified';

export function useNotifications() {
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof Notification === 'undefined') return;

    async function init() {
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermissionState(result);
        if (result !== 'granted') return;
      } else if (Notification.permission === 'denied') {
        setPermissionState('denied');
        return;
      }
      scheduleNext();
    }

    function scheduleNext() {
      const raw = localStorage.getItem(STORAGE_KEY);
      const lastNotified = raw ? parseInt(raw, 10) : 0;
      const elapsed = Date.now() - lastNotified;
      const delay = Math.max(0, FOUR_HOURS_MS - elapsed);
      timerRef.current = setTimeout(fire, delay);
    }

    function fire() {
      new Notification('Time to log your activities!', {
        body: 'Open the tracker to record what you\'ve done in the past 4 hours.',
      });
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      scheduleNext();
    }

    init();

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return { permissionState };
}
