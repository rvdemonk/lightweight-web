import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { parseDate } from '../utils/date';
import { SetBars } from '../components/SetBars';
import type { TemplateExercise, ExercisePRData } from '../api/types';

export function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: session, loading } = useApi(() => api.getSession(Number(id)), [id]);
  const { data: template } = useApi(
    () => session?.template_id ? api.getTemplate(session.template_id) : Promise.resolve(null),
    [session?.template_id],
  );
  const { data: prDataList } = useApi(
    () => session ? api.sessionPRs(session.id) : Promise.resolve([] as ExercisePRData[]),
    [session?.id],
  );
  const prMap: Record<number, ExercisePRData> = {};
  if (prDataList) {
    for (const pr of prDataList) {
      prMap[pr.exercise_id] = pr;
    }
  }

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

  const getTemplateExercise = (exerciseId: number): TemplateExercise | undefined =>
    template?.exercises.find(te => te.exercise_id === exerciseId);

  return (
    <div className="page">
      <button
        className="btn btn-ghost"
        style={{
          fontSize: 12,
          padding: '8px 0',
          minHeight: 44,
          fontFamily: 'var(--font-data)',
          letterSpacing: '1px',
          color: 'var(--text-secondary)',
          marginBottom: 4,
        }}
        onClick={() => navigate('/history')}
      >
        ← BACK
      </button>
      <h1 style={{
        fontSize: 20,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '2px',
        marginBottom: 8,
      }}>
        {session.template_name || session.name || 'Freeform'}
      </h1>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
        <div className="card" style={{ color: 'var(--text-primary)', fontSize: 13 }}>
          {session.notes}
        </div>
      )}

      {session.exercises.map(exercise => {
        const te = getTemplateExercise(exercise.exercise_id);
        const isAddon = session.template_id && template && !te;
        return (
          <div key={exercise.id} className="card">
            <div style={{
              fontWeight: 700,
              fontSize: 14,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: 8,
              color: isAddon ? 'var(--text-secondary)' : undefined,
              fontStyle: isAddon ? 'italic' : undefined,
            }}>
              {exercise.exercise_name}
              {isAddon && (
                <span style={{
                  fontSize: 9,
                  fontStyle: 'normal',
                  fontWeight: 500,
                  letterSpacing: '1px',
                  marginLeft: 8,
                  color: 'var(--accent-cyan)',
                  opacity: 0.7,
                }}>
                  ADDED
                </span>
              )}
            </div>

            <SetBars sets={exercise.sets} templateExercise={te} prData={prMap[exercise.exercise_id]} />

            {exercise.notes && (
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 8 }}>
                {exercise.notes}
              </div>
            )}
          </div>
        );
      })}

    </div>
  );
}
