import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';

export function HistoryPage() {
  const { data: sessions, loading } = useApi(() => api.listSessions({ limit: 50 }), []);

  if (loading) return <div className="page empty">Loading...</div>;

  return (
    <div className="page">
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>History</h1>

      {sessions && sessions.map(s => {
        const name = s.template_name || s.name || 'Freeform';
        const date = new Date(s.started_at + 'Z').toLocaleDateString('en-AU', {
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
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{date}</div>
              </div>
              <span className="data" style={{
                fontSize: 12,
                color: statusColor,
                textTransform: 'uppercase',
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
