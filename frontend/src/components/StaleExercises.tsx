import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { StaleExercise } from '../api/types';

export function StaleExercises() {
  const [stale, setStale] = useState<StaleExercise[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.staleExercises(30).then(setStale).catch(() => setStale([])).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ position: 'relative', overflow: 'hidden', minHeight: 60 }}>
        <div className="skeleton-shimmer" />
      </div>
    );
  }

  if (!stale || stale.length === 0) {
    return (
      <div className="card" style={{
        fontFamily: 'var(--font-data)', fontSize: 12,
        color: 'var(--accent-green)', textAlign: 'center',
        textShadow: 'var(--glow-green-text)',
      }}>
        ALL EXERCISES ACTIVE WITHIN 30D
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stale.map(ex => (
          <div key={ex.exercise_id} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-data)',
                fontSize: 12,
                color: 'var(--text-primary)',
                letterSpacing: 0.5,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {ex.exercise_name.toUpperCase()}
              </div>
              {ex.muscle_group && (
                <div style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 9,
                  color: 'var(--text-secondary)',
                  letterSpacing: 1,
                  marginTop: 1,
                }}>
                  {ex.muscle_group.toUpperCase()}
                </div>
              )}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              flexShrink: 0,
              gap: 2,
            }}>
              <span style={{
                fontFamily: 'var(--font-data)',
                fontSize: 12,
                color: ex.days_ago >= 60 ? 'var(--accent-red)' : 'var(--accent-primary)',
                textShadow: ex.days_ago >= 60 ? 'var(--glow-red-text)' : 'var(--glow-primary-text)',
                letterSpacing: 0.5,
              }}>
                {ex.days_ago}<span style={{ fontSize: 8, marginLeft: 1 }}>D AGO</span>
              </span>
              <span style={{
                fontFamily: 'var(--font-data)',
                fontSize: 10,
                color: 'var(--text-secondary)',
              }}>
                {ex.total_sets}<span style={{ fontSize: 8, marginLeft: 1 }}>SETS</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
