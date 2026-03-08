import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { parseDate } from '../utils/date';

function isActiveStatus(status: string): boolean {
  return status === 'active' || status === 'paused';
}

function formatDateHeading(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).toUpperCase();
}

export function HistoryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dateFilter = searchParams.get('date');
  const { data: sessions, loading } = useApi(
    () => api.listSessions({ limit: 50, date: dateFilter ?? undefined }),
    [dateFilter],
  );

  if (loading) return <div className="page empty">Loading...</div>;

  return (
    <div className="page">
      {dateFilter && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: 12,
            color: 'var(--text-secondary)',
            letterSpacing: '1px',
          }}>
            {formatDateHeading(dateFilter)}
          </div>
          <button
            className="btn btn-ghost"
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-data)',
              letterSpacing: '1px',
              color: 'var(--text-secondary)',
              padding: '6px 0',
              minHeight: 44,
            }}
            onClick={() => navigate('/history')}
          >
            ALL HISTORY
          </button>
        </div>
      )}
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
          ? `${s.exercise_count} EX · ${s.set_count} SET${s.set_count !== 1 ? 'S' : ''}`
          : s.status.toUpperCase();

        return (
          <Link key={s.id} to={isActiveStatus(s.status) ? '/workout' : `/sessions/${s.id}`} style={{ textDecoration: 'none' }}>
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
                textShadow: `0 0 7px ${statusColor}`,
              }}>
                {badge}
              </span>
            </div>
          </Link>
        );
      })}

      {sessions && sessions.length === 0 && (
        <div className="empty">
          {dateFilter ? 'No workouts on this date' : 'No workouts recorded'}
        </div>
      )}
    </div>
  );
}
