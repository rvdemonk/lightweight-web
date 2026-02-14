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

type RepStatus = 'in-range' | 'one-below' | 'under' | 'over';

function getRepStatus(
  reps: number,
  template?: TemplateExercise,
): RepStatus {
  if (!template?.target_reps_min) return 'in-range';
  const min = template.target_reps_min;
  const max = template.target_reps_max ?? min;

  if (reps >= min && reps <= max) return 'in-range';
  if (reps === min - 1) return 'one-below';
  if (reps < min - 1) return 'under';
  return 'over';
}

const STATUS_COLORS: Record<RepStatus, { color: string; glow: string; trackBg: string; trackBorder: string }> = {
  'in-range': {
    color: 'var(--accent-green)',
    glow: 'rgba(50, 232, 104, 0.5)',
    trackBg: 'rgba(50, 232, 104, 0.06)',
    trackBorder: 'rgba(50, 232, 104, 0.1)',
  },
  'one-below': {
    color: 'var(--accent-amber)',
    glow: 'rgba(232, 168, 50, 0.5)',
    trackBg: 'rgba(232, 168, 50, 0.06)',
    trackBorder: 'rgba(232, 168, 50, 0.1)',
  },
  'under': {
    color: 'var(--accent-red)',
    glow: 'rgba(232, 50, 50, 0.5)',
    trackBg: 'rgba(232, 50, 50, 0.06)',
    trackBorder: 'rgba(232, 50, 50, 0.1)',
  },
  'over': {
    color: 'var(--accent-cyan)',
    glow: 'rgba(50, 200, 232, 0.5)',
    trackBg: 'rgba(50, 200, 232, 0.06)',
    trackBorder: 'rgba(50, 200, 232, 0.1)',
  },
};

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

  // Bar reference: target max if available, otherwise max(12, highest reps)
  const targetMax = templateExercise?.target_reps_max ?? templateExercise?.target_reps_min;
  const maxReps = targetMax
    ? Math.max(targetMax, ...exercise.sets.map(s => s.reps))
    : Math.max(12, ...exercise.sets.map(s => s.reps));

  return (
    <div className="card" style={{ cursor: expanded ? 'default' : 'pointer' }}>
      <div className="card-header" onClick={onToggle}>
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
          <PreviousData sets={previousSets} />

          {templateExercise && (
            <div style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              marginBottom: 8,
              letterSpacing: '0.5px',
            }}>
              TARGET: {templateExercise.target_sets} SETS | {templateExercise.target_reps_min}
              {templateExercise.target_reps_max && templateExercise.target_reps_max !== templateExercise.target_reps_min
                ? `-${templateExercise.target_reps_max}`
                : ''} REP RANGE
            </div>
          )}

          {/* Set bars visualization */}
          {exercise.sets.length > 0 && (
            <div style={{
              marginBottom: 8,
              padding: '6px 0',
              borderTop: '1px solid var(--border-subtle)',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              {exercise.sets.map(set => {
                const sc = STATUS_COLORS[getRepStatus(set.reps, templateExercise)];

                return (
                  <div
                    key={set.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '5px 0',
                    }}
                  >
                    <span style={{
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-data)',
                      width: 44,
                      letterSpacing: '0.5px',
                      flexShrink: 0,
                    }}>
                      SET {String(set.set_number).padStart(2, '0')}
                    </span>

                    {/* Bar track */}
                    <div style={{
                      flex: 1,
                      height: 8,
                      background: sc.trackBg,
                      border: `1px solid ${sc.trackBorder}`,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(100, (set.reps / maxReps) * 100)}%`,
                        background: sc.color,
                        boxShadow: `0 0 8px ${sc.glow}`,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>

                    <span style={{
                      fontSize: 13,
                      fontFamily: 'var(--font-data)',
                      color: sc.color,
                      textShadow: `0 0 10px ${sc.glow}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ minWidth: 52, textAlign: 'right' }}>
                        {set.weight_kg !== null ? `${set.weight_kg}kg` : 'BW'}
                      </span>
                      <span style={{ width: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>|</span>
                      <span style={{ minWidth: 20, textAlign: 'right' }}>
                        {set.reps}
                      </span>
                    </span>

                    <button
                      className="btn btn-ghost"
                      style={{
                        fontSize: 16,
                        color: 'var(--accent-red)',
                        minWidth: 44,
                        minHeight: 44,
                        padding: 0,
                        textShadow: 'var(--glow-red-text)',
                      }}
                      onClick={() => onDeleteSet(set.id)}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}

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
