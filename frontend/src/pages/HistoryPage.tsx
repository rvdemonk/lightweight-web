import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { parseDate } from '../utils/date';

export function HistoryPage() {
  const { data: sessions, loading } = useApi(() => api.listSessions({ limit: 50 }), []);

  if (loading) return <div className="page empty">Loading...</div>;

  return (
    <div className="page">
      {sessions && sessions.map(s => {
        const name = s.template_name || s.name || 'Freeform';
        const date = parseDate(s.started_at);
        const dayName = date.toLocaleDateString('en-AU', { weekday: 'short' });
        const dateStr = date.toLocaleDateString('en-AU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        const isCompleted = s.status === 'completed';

        let statusColor: string;
        if (!isCompleted) {
          statusColor = s.status === 'abandoned' ? 'var(--accent-red)' : 'var(--accent-amber)';
        } else if (s.target_set_count === null) {
          // Freeform — no target, neutral green
          statusColor = 'var(--accent-green)';
        } else {
          const diff = s.set_count - s.target_set_count;
          if (diff > 0) statusColor = 'var(--accent-cyan)';
          else if (diff === 0) statusColor = 'var(--accent-green)';
          else if (diff >= -2) statusColor = 'var(--accent-amber)';
          else statusColor = 'var(--accent-red)';
        }

        const badge = isCompleted
          ? `${s.set_count} SET${s.set_count !== 1 ? 'S' : ''}`
          : s.status.toUpperCase();

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
                  textTransform: 'uppercase',
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
                {badge}
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
