import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { E1rmMover } from '../api/types';

export function E1rmMovers() {
  const [movers, setMovers] = useState<E1rmMover[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.e1rmMovers(30).then(setMovers).catch(() => setMovers([])).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ position: 'relative', overflow: 'hidden', minHeight: 80 }}>
        <div className="skeleton-shimmer" />
      </div>
    );
  }

  if (!movers || movers.length === 0) {
    return (
      <div className="card" style={{
        fontFamily: 'var(--font-data)', fontSize: 12,
        color: 'var(--text-secondary)', textAlign: 'center',
      }}>
        NEED 30+ DAYS OF DATA FOR TWO PERIODS
      </div>
    );
  }

  // Top 3 gainers and bottom 3 (losers), if they exist
  const gainers = movers.filter(m => m.pct_change > 0).slice(0, 3);
  const losers = movers.filter(m => m.pct_change < 0).slice(-3).reverse();

  if (gainers.length === 0 && losers.length === 0) {
    return (
      <div className="card" style={{
        fontFamily: 'var(--font-data)', fontSize: 12,
        color: 'var(--text-secondary)', textAlign: 'center',
      }}>
        NO MOVEMENT DETECTED IN 30D WINDOW
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {gainers.length > 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 0 }}>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: 9,
            letterSpacing: 1.5,
            color: 'var(--text-secondary)',
            marginBottom: 10,
          }}>
            RISING
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gainers.map(m => (
              <MoverRow key={m.exercise_id} mover={m} />
            ))}
          </div>
        </div>
      )}
      {losers.length > 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 0 }}>
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: 9,
            letterSpacing: 1.5,
            color: 'var(--text-secondary)',
            marginBottom: 10,
          }}>
            DECLINING
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {losers.map(m => (
              <MoverRow key={m.exercise_id} mover={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MoverRow({ mover }: { mover: E1rmMover }) {
  const isPositive = mover.pct_change >= 0;
  const color = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';
  const glow = isPositive ? 'var(--glow-green-text)' : 'var(--glow-red-text)';

  return (
    <div style={{
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
          {mover.exercise_name.toUpperCase()}
        </div>
        {mover.muscle_group && (
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: 9,
            color: 'var(--text-secondary)',
            letterSpacing: 1,
            marginTop: 1,
          }}>
            {mover.muscle_group.toUpperCase()}
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
          fontWeight: 600,
          color,
          textShadow: glow,
          letterSpacing: 0.5,
        }}>
          {isPositive ? '+' : ''}{mover.pct_change.toFixed(1)}%
        </span>
        <span style={{
          fontFamily: 'var(--font-data)',
          fontSize: 10,
          color: 'var(--text-secondary)',
        }}>
          {Math.round(mover.current_e1rm)}
          <span style={{ fontSize: 8, marginLeft: 1 }}>KG</span>
        </span>
      </div>
    </div>
  );
}
