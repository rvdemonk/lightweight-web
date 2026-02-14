import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';

export function TemplatesPage() {
  const { data: templates } = useApi(() => api.listTemplates(), []);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="page">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Workouts</h1>
        <Link to="/templates/new">
          <button className="btn btn-primary" style={{ fontSize: 13, minHeight: 36, padding: '6px 16px' }}>
            + New
          </button>
        </Link>
      </div>

      {templates && templates.map(t => {
        const expanded = expandedId === t.id;
        return (
          <div
            key={t.id}
            className="card"
            style={{
              cursor: 'pointer',
              padding: '14px 16px',
              background: expanded ? 'var(--bg-elevated)' : undefined,
            }}
            onClick={() => setExpandedId(expanded ? null : t.id)}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{t.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-data)',
                }}>
                  {t.exercises.length}
                </span>
                <span style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  transition: 'transform 0.15s',
                  transform: expanded ? 'rotate(180deg)' : 'none',
                  display: 'inline-block',
                }}>
                  ▾
                </span>
              </div>
            </div>

            {expanded && (
              <div style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
                {t.exercises.map(ex => {
                  const reps = ex.target_reps_min
                    ? (ex.target_reps_max && ex.target_reps_max !== ex.target_reps_min
                        ? `${ex.target_sets}×${ex.target_reps_min}-${ex.target_reps_max}`
                        : `${ex.target_sets}×${ex.target_reps_min}`)
                    : '';
                  return (
                    <div
                      key={ex.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        borderTop: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{ex.exercise_name}</span>
                      <span className="data" style={{
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                      }}>
                        {reps}
                      </span>
                    </div>
                  );
                })}

                <div style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-subtle)',
                }}>
                  <Link to={`/templates/${t.id}`}>
                    <button className="btn btn-secondary btn-full" style={{ fontSize: 13, minHeight: 40 }}>
                      Edit
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {templates && templates.length === 0 && (
        <div className="empty">No workouts yet. Create one above.</div>
      )}
    </div>
  );
}
