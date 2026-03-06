import type { WorkoutSet, TemplateExercise } from '../api/types';

interface PreviousDataProps {
  sets: WorkoutSet[];
  templateExercise?: TemplateExercise;
}

export function PreviousData({ sets, templateExercise }: PreviousDataProps) {
  if (sets.length === 0 && !templateExercise) return null;

  const lastText = sets.length > 0
    ? (() => {
        const first = sets[0];
        const weight = first.weight_kg !== null ? `${first.weight_kg}KG` : 'BW';
        const reps = sets.map(s => s.reps).join(', ');
        return `LAST  ${weight} × ${reps}`;
      })()
    : null;

  const targetText = templateExercise?.target_sets
    ? `TARGET  ${templateExercise.target_sets}S  ${templateExercise.target_reps_min}${
        templateExercise.target_reps_max && templateExercise.target_reps_max !== templateExercise.target_reps_min
          ? `–${templateExercise.target_reps_max}`
          : ''
      }R`
    : null;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      fontFamily: 'var(--font-data)',
      fontSize: 12,
      letterSpacing: '0.5px',
      marginBottom: 8,
    }}>
      {lastText && (
        <span style={{ color: 'var(--text-primary)' }}>{lastText}</span>
      )}
      {targetText && (
        <span style={{ color: 'var(--text-secondary)' }}>{targetText}</span>
      )}
    </div>
  );
}
