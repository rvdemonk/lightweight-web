import { useTimer } from '../hooks/useTimer';

interface TimerProps {
  startedAt: string;
  pausedDuration: number;
  isPaused: boolean;
}

export function Timer({ startedAt, pausedDuration, isPaused }: TimerProps) {
  const { formatted } = useTimer(startedAt, pausedDuration, isPaused);

  return (
    <span className="data" style={{
      fontSize: 20,
      fontWeight: 700,
      color: isPaused ? 'var(--accent-amber)' : 'var(--text-primary)',
    }}>
      {formatted}
    </span>
  );
}
