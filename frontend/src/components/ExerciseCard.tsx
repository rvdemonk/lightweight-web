import { useState, useEffect, useRef } from 'react';
import type { SessionExercise, WorkoutSet, TemplateExercise, ExercisePRData } from '../api/types';
import { PreviousData } from './PreviousData';
import { SetBars, getRepStatus, STATUS_COLORS } from './SetBars';
import { SetLogger } from './SetLogger';
import { NoteInput } from './NoteInput';
import { setProgressionTargets, type ProgressionTarget } from '../utils/e1rm';

interface ExerciseCardProps {
  exercise: SessionExercise;
  expanded: boolean;
  onToggle: () => void;
  onLogSet: (weight: number | null, reps: number, rir: number | null) => void;
  onDeleteSet: (setId: number) => void;
  onUpdateNote: (note: string) => void;
  previousSets?: WorkoutSet[];
  templateExercise?: TemplateExercise;
  prData?: ExercisePRData;
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
  prData,
}: ExerciseCardProps) {
  const lastSet = exercise.sets[exercise.sets.length - 1];
  const defaultWeight = lastSet?.weight_kg ?? (previousSets[0]?.weight_kg ?? null);
  const defaultReps = lastSet?.reps ?? (previousSets[0]?.reps ?? 8);

  // Track logger weight with debounce for reactive at-weight target
  const [loggerWeight, setLoggerWeight] = useState<number | null>(null);
  const [debouncedWeight, setDebouncedWeight] = useState<number | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (loggerWeight === null) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setDebouncedWeight(loggerWeight);
    }, 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [loggerWeight]);

  return (
    <div className="card" style={{
      cursor: expanded ? 'default' : 'pointer',
      background: expanded ? undefined : 'transparent',
      borderColor: expanded ? 'var(--border-active)' : undefined,
    }}>
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
          fontFamily: 'var(--font-data)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            color: exercise.sets.length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)',
            textShadow: exercise.sets.length > 0 ? 'var(--glow-primary-text)' : 'none',
          }}>
            {exercise.sets.length}
          </span>
          {templateExercise?.target_sets != null && (
            <span style={{ color: 'var(--text-secondary)' }}>
              /{templateExercise.target_sets}
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div>
          <PreviousData sets={previousSets} templateExercise={templateExercise} />

          {/* Progression targets for next set */}
          {(() => {
            const nextSetNum = exercise.sets.length + 1;
            const baseWeight = lastSet?.weight_kg ?? previousSets[0]?.weight_kg ?? loggerWeight;
            if (!baseWeight || !prData) return null;

            const repMin = templateExercise?.target_reps_min;
            const repMax = templateExercise?.target_reps_max;

            // Get a wide range of weight options to find in-range targets
            const targets = setProgressionTargets(prData, nextSetNum, baseWeight, {
              stepsBelow: 1,
              stepsAbove: 20,
            });
            if (targets.length === 0) return null;

            // 1. In-range target: first weight where repsNeeded falls within template rep range
            const inRange = repMin && repMax
              ? targets.find(t => t.repsNeeded >= repMin && t.repsNeeded <= repMax)
              : null;

            // 2. At-weight target: reactive to logger weight (debounced), falls back to base weight
            const atWeightVal = debouncedWeight ?? baseWeight;
            const atWeightTargets = setProgressionTargets(prData, nextSetNum, atWeightVal, {
              stepsBelow: 0,
              stepsAbove: 0,
            });
            const atWeight = atWeightTargets.find(t => t.isCurrentWeight);

            if (!atWeight && !inRange) return null;

            // Don't show both if they're the same weight
            const showBoth = atWeight && inRange && atWeight.weight !== inRange.weight;

            const getTargetColor = (t: ProgressionTarget) => {
              if (!repMin || !repMax) return 'var(--accent-cyan)';
              if (t.repsNeeded > repMax) return 'var(--accent-cyan)';
              if (t.repsNeeded >= repMin) return 'var(--accent-green)';
              if (t.repsNeeded === repMin - 1) return 'var(--accent-amber)';
              return 'var(--accent-red)';
            };

            return (
              <div style={{
                fontSize: 12,
                fontFamily: 'var(--font-data)',
                color: 'var(--text-secondary)',
                padding: '4px 0 6px',
                letterSpacing: '0.5px',
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                textTransform: 'uppercase',
              }}>
                <span style={{ color: 'var(--accent-primary)', textShadow: 'var(--glow-primary-text)' }}>
                  SET {nextSetNum} TO BEAT
                </span>
                {inRange && (
                  <span style={{ color: getTargetColor(inRange) }}>
                    {inRange.repsNeeded}R × {inRange.weight}KG
                  </span>
                )}
                {showBoth && atWeight && (
                  <span style={{ color: getTargetColor(atWeight) }}>
                    {atWeight.repsNeeded}R × {atWeight.weight}KG
                  </span>
                )}
                {!inRange && atWeight && (
                  <span style={{ color: getTargetColor(atWeight) }}>
                    {atWeight.repsNeeded}R × {atWeight.weight}KG
                  </span>
                )}
              </div>
            );
          })()}

          {exercise.sets.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SetBars
                sets={exercise.sets}
                templateExercise={templateExercise}
                onDeleteSet={onDeleteSet}
                prData={prData}
              />
            </div>
          )}

          {/* Set Logger */}
          <SetLogger
            defaultWeight={defaultWeight}
            defaultReps={defaultReps}
            onLog={onLogSet}
            onWeightChange={setLoggerWeight}
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
