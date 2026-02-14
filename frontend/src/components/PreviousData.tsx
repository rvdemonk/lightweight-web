import type { WorkoutSet } from '../api/types';

interface PreviousDataProps {
  sets: WorkoutSet[];
}

export function PreviousData({ sets }: PreviousDataProps) {
  if (sets.length === 0) return null;

  const first = sets[0];
  const weight = first.weight_kg !== null ? `${first.weight_kg}kg` : 'BW';
  const reps = sets.map(s => s.reps).join(', ');

  return (
    <div style={{
      fontSize: 13,
      color: 'var(--text-secondary)',
      fontFamily: 'var(--font-data)',
      marginBottom: 8,
    }}>
      Last: {weight} × {reps}
    </div>
  );
}
