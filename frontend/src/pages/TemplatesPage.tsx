import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';

export function TemplatesPage() {
  const { data: templates } = useApi(() => api.listTemplates(), []);
  const { data: activeSession } = useApi(() => api.getActiveSession(), []);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();
  const hasActive = activeSession !== null && activeSession !== undefined;

  const startWorkout = async (templateId: number) => {
    setStarting(true);
    try {
      await api.createSession({ template_id: templateId });
      navigate('/workout');
    } catch (e) {
      console.error(e);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <Link to="/templates/new">
          <button className="btn btn-primary btn-full" style={{ fontSize: 13, minHeight: 44 }}>
            + New Workout
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
              <div style={{ fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.name}</div>
              <span style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-data)',
                letterSpacing: '0.5px',
              }}>
                {t.exercises.length} EXERCISES
              </span>
            </div>

            {expanded && (
              <div style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
                {t.exercises.map(ex => {
                  const reps = ex.target_reps_min
                    ? (ex.target_reps_max && ex.target_reps_max !== ex.target_reps_min
                        ? `${ex.target_sets}s | ${ex.target_reps_min}-${ex.target_reps_max}r`
                        : `${ex.target_sets}s | ${ex.target_reps_min}r`)
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
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}>
                  <button
                    className="btn btn-primary btn-full"
                    style={{ fontSize: 13, minHeight: 40, opacity: hasActive ? 0.4 : 1 }}
                    disabled={starting || hasActive}
                    onClick={() => startWorkout(t.id)}
                  >
                    {hasActive ? 'Workout in Progress' : 'Start Workout'}
                  </button>
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
        <div className="empty">No workouts created</div>
      )}
    </div>
  );
}
