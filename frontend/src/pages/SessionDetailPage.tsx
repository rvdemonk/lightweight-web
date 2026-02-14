import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { parseDate } from '../utils/date';

export function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: session, loading } = useApi(() => api.getSession(Number(id)), [id]);

  if (loading || !session) return <div className="page empty">Loading...</div>;

  const duration = session.ended_at
    ? Math.floor(
        (parseDate(session.ended_at).getTime() - parseDate(session.started_at).getTime()) / 1000
        - session.paused_duration
      )
    : null;

  const formatDuration = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const handleDelete = async () => {
    if (!confirm('Delete this session?')) return;
    await api.deleteSession(session.id);
    navigate('/history');
  };

  return (
    <div className="page">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
      }}>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 16, padding: '4px 0', minHeight: 'auto' }}
          onClick={() => navigate('/history')}
        >
          ←
        </button>
        <h1 style={{
          fontSize: 18,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          {session.template_name || session.name || 'Freeform'}
        </h1>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {parseDate(session.started_at).toLocaleDateString('en-AU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
          {duration !== null && ` · ${formatDuration(duration)}`}
        </div>
        <button
          className="btn btn-ghost"
          style={{ color: 'var(--accent-red)', fontSize: 13 }}
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>

      {session.notes && (
        <div className="card" style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: 14 }}>
          {session.notes}
        </div>
      )}

      {session.exercises.map(exercise => (
        <div key={exercise.id} className="card">
          <div style={{
            fontWeight: 700,
            fontSize: 14,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: 8,
          }}>
            {exercise.exercise_name}
          </div>

          {exercise.sets.map(set => (
            <div
              key={set.id}
              className="data"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                fontSize: 14,
              }}
            >
              <span>Set {set.set_number}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span style={{ minWidth: 52, textAlign: 'right' }}>
                  {set.weight_kg !== null ? `${set.weight_kg}kg` : 'BW'}
                </span>
                <span style={{ width: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>|</span>
                <span style={{ minWidth: 20, textAlign: 'right' }}>
                  {set.reps}
                </span>
              </span>
            </div>
          ))}

          {exercise.notes && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
              {exercise.notes}
            </div>
          )}
        </div>
      ))}

    </div>
  );
}
