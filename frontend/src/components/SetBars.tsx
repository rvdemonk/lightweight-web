import { useState, useRef, useCallback } from 'react';
import type { WorkoutSet, TemplateExercise, ExercisePRData } from '../api/types';
import { getPRBadge } from '../utils/e1rm';

type RepStatus = 'in-range' | 'one-below' | 'under' | 'over';

export function getRepStatus(
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

export const STATUS_COLORS: Record<RepStatus, { color: string; bar: string; glow: string; trackBg: string; trackBorder: string }> = {
  'in-range': {
    color: 'var(--accent-green)',
    bar: '#28a050',
    glow: 'rgba(40, 160, 80, 0.6)',
    trackBg: 'rgba(40, 160, 80, 0.06)',
    trackBorder: 'rgba(40, 160, 80, 0.12)',
  },
  'one-below': {
    color: 'var(--accent-amber)',
    bar: '#b8862a',
    glow: 'rgba(184, 134, 42, 0.6)',
    trackBg: 'rgba(184, 134, 42, 0.06)',
    trackBorder: 'rgba(184, 134, 42, 0.12)',
  },
  'under': {
    color: 'var(--accent-red)',
    bar: '#b03030',
    glow: 'rgba(176, 48, 48, 0.6)',
    trackBg: 'rgba(176, 48, 48, 0.06)',
    trackBorder: 'rgba(176, 48, 48, 0.12)',
  },
  'over': {
    color: 'var(--accent-cyan)',
    bar: '#2898b0',
    glow: 'rgba(40, 152, 176, 0.6)',
    trackBg: 'rgba(40, 152, 176, 0.06)',
    trackBorder: 'rgba(40, 152, 176, 0.12)',
  },
};

interface SetBarsProps {
  sets: WorkoutSet[];
  templateExercise?: TemplateExercise;
  onDeleteSet?: (setId: number) => void;
  prData?: ExercisePRData;
}

export function SetBars({ sets, templateExercise, onDeleteSet, prData }: SetBarsProps) {
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const startPress = useCallback((setId: number) => {
    if (!onDeleteSet) return;
    timerRef.current = window.setTimeout(() => {
      setDeleteId(setId);
    }, 500);
  }, [onDeleteSet]);

  const endPress = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  if (sets.length === 0) return null;

  const targetMax = templateExercise?.target_reps_max ?? templateExercise?.target_reps_min;
  const maxReps = targetMax
    ? Math.max(targetMax, ...sets.map(s => s.reps))
    : Math.max(12, ...sets.map(s => s.reps));

  return (
    <div style={{ padding: '6px 0' }}>
      {sets.map(set => {
        const sc = STATUS_COLORS[getRepStatus(set.reps, templateExercise)];
        const isDeleting = deleteId === set.id;

        const badge = getPRBadge(set, prData);

        return (
          <div
            key={set.id}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '5px 0',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            onTouchStart={() => startPress(set.id)}
            onTouchEnd={endPress}
            onTouchCancel={endPress}
            onMouseDown={() => startPress(set.id)}
            onMouseUp={endPress}
            onMouseLeave={endPress}
          >
            <span style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-data)',
              width: 20,
              letterSpacing: '0.5px',
              flexShrink: 0,
            }}>
              {String(set.set_number).padStart(2, '0')}
            </span>

            {/* Bar track */}
            <div style={{
              flex: 1,
              height: 10,
              background: sc.trackBg,
              border: `1px solid ${sc.trackBorder}`,
              borderRadius: 2,
              overflow: 'hidden',
              clipPath: 'polygon(0 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (set.reps / maxReps) * 100)}%`,
                background: badge
                  ? `${sc.bar} repeating-linear-gradient(45deg, transparent, transparent 3px, ${badge === 'absolute' ? 'rgba(232, 168, 50, 0.9)' : 'rgba(50, 200, 232, 0.7)'} 3px, ${badge === 'absolute' ? 'rgba(232, 168, 50, 0.9)' : 'rgba(50, 200, 232, 0.7)'} 5px)`
                  : sc.bar,
                boxShadow: badge
                  ? `0 0 10px ${sc.glow}, 0 0 4px ${sc.glow}, 0 0 8px ${badge === 'absolute' ? 'rgba(232, 168, 50, 0.4)' : 'rgba(50, 200, 232, 0.3)'}`
                  : `0 0 10px ${sc.glow}, 0 0 4px ${sc.glow}`,
                clipPath: 'polygon(0 0, 100% 0, calc(100% - 6px) 100%, 0 100%)',
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
              {set.rir !== null && (
                <span style={{ color: 'var(--text-secondary)', minWidth: 28, textAlign: 'right', marginLeft: 6 }}>
                  R{set.rir}
                </span>
              )}
            </span>


            {/* Delete overlay */}
            {isDeleting && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 8,
                background: 'var(--bg-surface)',
                padding: '0 4px',
              }}>
                <span style={{
                  fontSize: 12,
                  fontFamily: 'var(--font-data)',
                  color: 'var(--accent-red)',
                  letterSpacing: '0.5px',
                  flex: 1,
                }}>
                  DELETE SET {String(set.set_number).padStart(2, '0')}?
                </span>
                <button
                  className="btn btn-ghost"
                  style={{
                    fontSize: 12,
                    color: 'var(--accent-red)',
                    minHeight: 36,
                    padding: '0 12px',
                    fontFamily: 'var(--font-data)',
                    letterSpacing: '0.5px',
                    border: '1px solid var(--accent-red)',
                  }}
                  onClick={() => onDeleteSet!(set.id)}
                >
                  DELETE
                </button>
                <button
                  className="btn btn-ghost"
                  style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    minHeight: 36,
                    padding: '0 12px',
                    fontFamily: 'var(--font-data)',
                    letterSpacing: '0.5px',
                  }}
                  onClick={() => setDeleteId(null)}
                >
                  CANCEL
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
