import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';

type Mode = 'choose' | 'template';

export function HomePage() {
  const navigate = useNavigate();
  const { data: activeSession, loading: loadingActive } = useApi(() => api.getActiveSession(), []);
  const { data: templates } = useApi(() => api.listTemplates(), []);
  const [mode, setMode] = useState<Mode>('choose');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (activeSession) {
      navigate('/workout');
    }
  }, [activeSession]);

  const startWorkout = async (templateId?: number) => {
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

  if (loadingActive) {
    return <div className="page empty">Loading...</div>;
  }

  // Template selection view
  if (mode === 'template') {
    return (
      <div className="page">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
        }}>
          <button
            className="btn btn-ghost"
            style={{ fontSize: 16, padding: '4px 0', minHeight: 'auto' }}
            onClick={() => setMode('choose')}
          >
            ←
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Select Workout</h1>
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
                    <button
                      className="btn btn-primary btn-full"
                      style={{ fontSize: 14, minHeight: 44 }}
                      onClick={() => startWorkout(t.id)}
                      disabled={starting}
                    >
                      Start
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {templates && templates.length === 0 && (
          <div className="empty">No workouts saved yet.</div>
        )}
      </div>
    );
  }

  // Main choice view
  return (
    <div className="page" style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      minHeight: 'calc(100dvh - 48px)',
    }}>
      <h1 style={{
        fontSize: 24,
        fontWeight: 700,
        marginBottom: 24,
        textAlign: 'center',
      }}>
        Start Workout
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          className="btn btn-primary btn-full"
          style={{ minHeight: 56, fontSize: 16 }}
          onClick={() => setMode('template')}
          disabled={!templates || templates.length === 0}
        >
          Template
        </button>
        <button
          className="btn btn-secondary btn-full"
          style={{ minHeight: 56, fontSize: 16 }}
          onClick={() => startWorkout()}
          disabled={starting}
        >
          Freeform
        </button>
      </div>
    </div>
  );
}
