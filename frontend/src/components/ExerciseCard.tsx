import type { SessionExercise, WorkoutSet, TemplateExercise } from '../api/types';
import { PreviousData } from './PreviousData';
import { SetLogger } from './SetLogger';
import { NoteInput } from './NoteInput';

interface ExerciseCardProps {
  exercise: SessionExercise;
  expanded: boolean;
  onToggle: () => void;
  onLogSet: (weight: number | null, reps: number) => void;
  onDeleteSet: (setId: number) => void;
  onUpdateNote: (note: string) => void;
  previousSets?: WorkoutSet[];
  templateExercise?: TemplateExercise;
}

export function ExerciseCard({
  exercise,
  expanded,
  onToggle,
  onLogSet,
  onDeleteSet,
  onUpdateNote,
  previousSets = [],
  templateExercise,
}: ExerciseCardProps) {
  const lastSet = exercise.sets[exercise.sets.length - 1];
  const defaultWeight = lastSet?.weight_kg ?? (previousSets[0]?.weight_kg ?? null);
  const defaultReps = lastSet?.reps ?? (previousSets[0]?.reps ?? 8);

  // Completed set summary
  const setsSummary = exercise.sets.length > 0
    ? exercise.sets.map(s => {
        const w = s.weight_kg !== null ? `${s.weight_kg}kg` : 'BW';
        return `${w}×${s.reps}`;
      }).join(', ')
    : null;

  return (
    <div className="card" style={{ cursor: expanded ? 'default' : 'pointer' }}>
      <div className="card-header" onClick={onToggle}>
        <div>
          <div style={{
            fontWeight: 700,
            fontSize: 14,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            {exercise.exercise_name}
          </div>
          {!expanded && setsSummary && (
            <div className="data" style={{
              fontSize: 12,
              color: 'var(--accent-green)',
              marginTop: 2,
            }}>
              {setsSummary}
            </div>
          )}
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-data)',
        }}>
          {exercise.sets.length} sets
        </div>
      </div>

      {expanded && (
        <div>
          <PreviousData sets={previousSets} />

          {templateExercise && (
            <div style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginBottom: 8,
            }}>
              Target: {templateExercise.target_sets}×{templateExercise.target_reps_min}
              {templateExercise.target_reps_max && templateExercise.target_reps_max !== templateExercise.target_reps_min
                ? `-${templateExercise.target_reps_max}`
                : ''}
            </div>
          )}

          {/* Completed sets */}
          {exercise.sets.map(set => (
            <div
              key={set.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span className="data" style={{ fontSize: 14 }}>
                Set {set.set_number}:{' '}
                {set.weight_kg !== null ? `${set.weight_kg}kg` : 'BW'} × {set.reps}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--accent-green)', fontSize: 16 }}>✓</span>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12, color: 'var(--accent-red)', minHeight: 32, padding: '4px 8px' }}
                  onClick={() => onDeleteSet(set.id)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* Set Logger */}
          <SetLogger
            defaultWeight={defaultWeight}
            defaultReps={defaultReps}
            onLog={onLogSet}
            hasLastSet={!!lastSet}
            onRepeatLast={lastSet ? () => onLogSet(lastSet.weight_kg, lastSet.reps) : undefined}
          />

          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <NoteInput
              value={exercise.notes || ''}
              onSave={onUpdateNote}
            />
          </div>
        </div>
      )}
    </div>
  );
}
