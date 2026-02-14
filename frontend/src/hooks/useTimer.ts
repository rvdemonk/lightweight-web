import { useState, useEffect, useRef } from 'react';
import { parseDate } from '../utils/date';

export function useTimer(startedAt: string, pausedDuration: number, isPaused: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = parseDate(startedAt).getTime();

    const tick = () => {
      const now = Date.now();
      const totalSeconds = Math.floor((now - startTime) / 1000) - pausedDuration;
      setElapsed(Math.max(0, totalSeconds));
    };

    tick();

    if (!isPaused) {
      intervalRef.current = window.setInterval(tick, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [startedAt, pausedDuration, isPaused]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const formatted = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;

  return { elapsed, formatted };
}
