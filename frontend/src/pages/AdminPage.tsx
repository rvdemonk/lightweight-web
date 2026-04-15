import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type {
  AdminOverview,
  AdminUser,
  AdminBetaSignup,
  AdminInvite,
  AdminActivity,
} from '../api/types';

function formatDate(datetime: string): string {
  return datetime.split(' ')[0] || datetime.split('T')[0] || datetime;
}

function formatDuration(min: number | null): string {
  if (min == null) return '\u2014';
  if (min >= 60) return `${Math.floor(min / 60)}h${min % 60}m`;
  return `${min}min`;
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="card" style={{ flex: 1, minWidth: 120, textAlign: 'center' }}>
      <div style={{
        fontSize: 28,
        fontFamily: 'var(--font-data)',
        fontWeight: 600,
        color: color || 'var(--accent-cyan)',
        textShadow: color ? undefined : 'var(--glow-cyan-text)',
        lineHeight: 1,
        marginBottom: 6,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10,
        fontFamily: 'var(--font-display)',
        letterSpacing: '2px',
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--font-data)',
        fontSize: 12,
        minWidth: 500,
      }}>
        {children}
      </table>
    </div>
  );
}

function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th style={{
      textAlign: 'left',
      padding: '8px 10px',
      fontSize: 10,
      fontFamily: 'var(--font-display)',
      letterSpacing: '2px',
      color: 'var(--text-secondary)',
      borderBottom: '1px solid var(--border-subtle)',
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{
      padding: '8px 10px',
      borderBottom: '1px solid var(--border-subtle)',
      whiteSpace: 'nowrap',
      color: 'var(--text-primary)',
      ...style,
    }}>
      {children}
    </td>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'pending' ? 'var(--accent-amber)'
    : status === 'added' ? 'var(--accent-green)'
    : 'var(--text-secondary)';
  return (
    <span style={{
      color,
      fontSize: 11,
      letterSpacing: '1px',
      textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
}

export function AdminPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [beta, setBeta] = useState<AdminBetaSignup[] | null>(null);
  const [invites, setInvites] = useState<AdminInvite[] | null>(null);
  const [activity, setActivity] = useState<AdminActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.adminOverview().then(setOverview),
      api.adminUsers().then(setUsers),
      api.adminBeta().then(setBeta),
      api.adminInvites().then(setInvites),
      api.adminActivity(14).then(setActivity),
    ]).catch(err => {
      if (err?.status === 403) setError('ACCESS DENIED');
      else setError('FAILED TO LOAD');
    });
  }, []);

  if (error) {
    return (
      <div className="page" style={{ paddingTop: 40, textAlign: 'center' }}>
        <div style={{
          fontSize: 14,
          fontFamily: 'var(--font-data)',
          color: 'var(--accent-red)',
          textShadow: 'var(--glow-red-text)',
          letterSpacing: '2px',
        }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingTop: 20 }}>
      {/* Overview */}
      <div className="nerv-divider" style={{ marginBottom: 20 }}>
        <span>OVERVIEW</span>
      </div>

      {overview ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
          <Stat label="Users" value={overview.total_users} />
          <Stat label="Beta Signups" value={overview.total_beta_signups} />
          <Stat label="Invites" value={`${overview.invites_claimed}/${overview.invites_created}`} />
          <Stat label="Sessions" value={overview.active_auth_sessions} color="var(--accent-green)" />
        </div>
      ) : (
        <div style={{ marginBottom: 32, color: 'var(--text-secondary)', fontSize: 12 }}>Loading...</div>
      )}

      {/* Beta Signups */}
      <div className="nerv-divider" style={{ marginBottom: 16 }}>
        <span>BETA SIGNUPS</span>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 32, overflow: 'hidden' }}>
        {beta ? beta.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>No signups yet</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>EMAIL</Th>
                <Th>USER</Th>
                <Th>PLATFORM</Th>
                <Th>STATUS</Th>
                <Th>DATE</Th>
                <Th>REFERRER</Th>
              </tr>
            </thead>
            <tbody>
              {beta.map(s => (
                <tr key={s.id}>
                  <Td style={{ color: 'var(--accent-cyan)' }}>{s.email}</Td>
                  <Td>{s.username || '\u2014'}</Td>
                  <Td>{s.platform}</Td>
                  <Td><StatusBadge status={s.status} /></Td>
                  <Td>{formatDate(s.created_at)}</Td>
                  <Td style={{ color: 'var(--text-secondary)' }}>{s.referrer || '\u2014'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>Loading...</div>
        )}
      </div>

      {/* Users */}
      <div className="nerv-divider" style={{ marginBottom: 16 }}>
        <span>USERS</span>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 32, overflow: 'hidden' }}>
        {users ? (
          <Table>
            <thead>
              <tr>
                <Th style={{ textAlign: 'right' }}>ID</Th>
                <Th>USERNAME</Th>
                <Th>JOINED</Th>
                <Th>INVITED BY</Th>
                <Th style={{ textAlign: 'right' }}>AUTH</Th>
                <Th style={{ textAlign: 'right' }}>WORKOUTS</Th>
                <Th>LAST WORKOUT</Th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <Td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{u.id}</Td>
                  <Td style={{ fontWeight: 600 }}>{u.username}</Td>
                  <Td>{formatDate(u.created_at)}</Td>
                  <Td style={{ color: 'var(--text-secondary)' }}>{u.invited_by || '(admin)'}</Td>
                  <Td style={{ textAlign: 'right' }}>{u.auth_sessions}</Td>
                  <Td style={{ textAlign: 'right', color: 'var(--accent-cyan)' }}>{u.workout_count}</Td>
                  <Td style={{ color: 'var(--text-secondary)' }}>{u.last_workout ? formatDate(u.last_workout) : '\u2014'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>Loading...</div>
        )}
      </div>

      {/* Activity */}
      <div className="nerv-divider" style={{ marginBottom: 16 }}>
        <span>RECENT ACTIVITY (14D)</span>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 32, overflow: 'hidden' }}>
        {activity ? activity.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>No activity</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>DATE</Th>
                <Th>USER</Th>
                <Th>WORKOUT</Th>
                <Th style={{ textAlign: 'right' }}>DURATION</Th>
                <Th style={{ textAlign: 'right' }}>SETS</Th>
              </tr>
            </thead>
            <tbody>
              {activity.map((a, i) => (
                <tr key={i}>
                  <Td>{a.date}</Td>
                  <Td style={{ fontWeight: 600 }}>{a.username}</Td>
                  <Td>{a.workout_name}</Td>
                  <Td style={{ textAlign: 'right' }}>{formatDuration(a.duration_min)}</Td>
                  <Td style={{ textAlign: 'right', color: 'var(--accent-cyan)' }}>{a.set_count}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>Loading...</div>
        )}
      </div>

      {/* Invites */}
      <div className="nerv-divider" style={{ marginBottom: 16 }}>
        <span>INVITES</span>
      </div>

      <div className="card" style={{ padding: 0, marginBottom: 32, overflow: 'hidden' }}>
        {invites ? invites.length === 0 ? (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>No invites</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>CODE</Th>
                <Th>CREATOR</Th>
                <Th>STATUS</Th>
                <Th>CLAIMED BY</Th>
                <Th>CREATED</Th>
                <Th>CLAIMED</Th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv, i) => (
                <tr key={i}>
                  <Td style={{ fontFamily: 'var(--font-data)' }}>{inv.code_short}</Td>
                  <Td>{inv.creator}</Td>
                  <Td><StatusBadge status={inv.claimed_by ? 'claimed' : 'pending'} /></Td>
                  <Td>{inv.claimed_by || '\u2014'}</Td>
                  <Td>{formatDate(inv.created_at)}</Td>
                  <Td style={{ color: 'var(--text-secondary)' }}>{inv.claimed_at ? formatDate(inv.claimed_at) : '\u2014'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>Loading...</div>
        )}
      </div>
    </div>
  );
}
