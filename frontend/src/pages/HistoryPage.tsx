import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';

export function HistoryPage() {
  const { data: sessions, loading } = useApi(() => api.listSessions({ limit: 50 }), []);

  if (loading) return <div className="page empty">Loading...</div>;

  return (
    <div className="page">
      {sessions && sessions.map(s => {
        const name = s.template_name || s.name || 'Freeform';
        const date = new Date(s.started_at + 'Z');
        const dayName = date.toLocaleDateString('en-AU', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        const statusColor = s.status === 'completed'
          ? 'var(--accent-green)'
          : s.status === 'abandoned'
          ? 'var(--accent-red)'
          : 'var(--accent-amber)';

        return (
          <Link key={s.id} to={`/sessions/${s.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>{name}</div>
                <div style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-data)',
                  marginTop: 2,
                }}>
                  {dayName} {dateStr}
                </div>
              </div>
              <span className="data" style={{
                fontSize: 11,
                color: statusColor,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textShadow: `0 0 10px ${statusColor}`,
              }}>
                {s.status}
              </span>
            </div>
          </Link>
        );
      })}

      {sessions && sessions.length === 0 && (
        <div className="empty">No workouts yet. Start one from the home page.</div>
      )}
    </div>
  );
}
