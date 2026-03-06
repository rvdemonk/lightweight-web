import type { SessionExercise, WorkoutSet, TemplateExercise } from '../api/types';
import { PreviousData } from './PreviousData';
import { SetBars, getRepStatus, STATUS_COLORS } from './SetBars';
import { SetLogger } from './SetLogger';
import { NoteInput } from './NoteInput';

interface ExerciseCardProps {
  exercise: SessionExercise;
  expanded: boolean;
  onToggle: () => void;
  onLogSet: (weight: number | null, reps: number, rir: number | null) => void;
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

  return (
    <div className="card" style={{ cursor: expanded ? 'default' : 'pointer' }}>
      <div className="card-header" style={{ marginBottom: expanded ? 8 : 0 }} onClick={onToggle}>
        <div>
          <div style={{
            fontWeight: 700,
            fontSize: 13,
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}>
            {exercise.exercise_name}
          </div>
          {/* Collapsed set summary with per-set colors */}
          {!expanded && exercise.sets.length > 0 && (
            <div style={{ marginTop: 2, fontSize: 11, fontFamily: 'var(--font-data)' }}>
              {exercise.sets.map((s, i) => {
                const sc = STATUS_COLORS[getRepStatus(s.reps, templateExercise)];
                const w = s.weight_kg !== null ? `${s.weight_kg}kg` : 'BW';
                return (
                  <span key={s.id}>
                    {i > 0 && <span style={{ color: 'var(--text-secondary)' }}>, </span>}
                    <span style={{
                      color: sc.color,
                      textShadow: `0 0 10px ${sc.glow}`,
                    }}>
                      {w}|{s.reps}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <div style={{
          fontSize: 12,
          color: exercise.sets.length > 0 ? 'var(--accent-amber)' : 'var(--text-secondary)',
          fontFamily: 'var(--font-data)',
          textShadow: exercise.sets.length > 0 ? 'var(--glow-amber-text)' : 'none',
        }}>
          {String(exercise.sets.length).padStart(2, '0')}
        </div>
      </div>

      {expanded && (
        <div>
          <PreviousData sets={previousSets} templateExercise={templateExercise} />

          {exercise.sets.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SetBars
                sets={exercise.sets}
                templateExercise={templateExercise}
                onDeleteSet={onDeleteSet}
              />
            </div>
          )}

          {/* Set Logger */}
          <SetLogger
            defaultWeight={defaultWeight}
            defaultReps={defaultReps}
            onLog={onLogSet}
          />

          <div style={{ marginTop: 8 }}>
            <NoteInput
              exerciseName={exercise.exercise_name}
              value={exercise.notes || ''}
              onSave={onUpdateNote}
            />
          </div>
        </div>
      )}
    </div>
  );
}
