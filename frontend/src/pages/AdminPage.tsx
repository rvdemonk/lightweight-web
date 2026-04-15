import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { AdminUser, AdminBetaSignup, AdminActivity } from '../api/types';

function formatDate(datetime: string): string {
  return datetime.split(' ')[0] || datetime.split('T')[0] || datetime;
}

function formatDuration(min: number | null): string {
  if (min == null) return '\u2014';
  if (min >= 60) return `${Math.floor(min / 60)}h${min % 60}m`;
  return `${min}min`;
}

// ── Shared table primitives ──

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
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
      padding: '10px 14px',
      fontSize: 11,
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
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
      padding: '10px 14px',
      borderBottom: '1px solid var(--border-subtle)',
      whiteSpace: 'nowrap',
      color: 'var(--text-primary)',
      ...style,
    }}>
      {children}
    </td>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{
      padding: 32,
      color: 'var(--text-secondary)',
      fontSize: 14,
      fontFamily: 'var(--font-body)',
      textAlign: 'center',
    }}>
      {text}
    </div>
  );
}

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 20 }}>
      <div style={{
        fontSize: 36,
        fontFamily: 'var(--font-data)',
        fontWeight: 700,
        color,
        lineHeight: 1,
        marginBottom: 8,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 12,
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        letterSpacing: '2px',
        color: 'var(--text-secondary)',
      }}>
        {label}
      </div>
    </div>
  );
}

// ── Tabs ──

const TABS = ['pipeline', 'users', 'activity'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  pipeline: 'BETA PIPELINE',
  users: 'USERS',
  activity: 'ACTIVITY',
};

// ── Add Beta Form ──

function AddBetaForm({ onAdd }: { onAdd: (signup: AdminBetaSignup) => void }) {
  const [email, setEmail] = useState('');
  const [platform, setPlatform] = useState('android');
  const [referrer, setReferrer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const signup = await api.adminAddBeta(email.trim(), platform, referrer.trim() || undefined);
      onAdd(signup);
      setEmail('');
      setReferrer('');
    } catch (err: any) {
      if (err?.status === 409) setError('Email already exists');
      else setError('Failed to add');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 2,
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 14,
    outline: 'none',
  };

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 16,
    }}>
      <input
        type="email"
        placeholder="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        style={{ ...inputStyle, flex: '1 1 200px', minWidth: 160 }}
      />
      <select
        value={platform}
        onChange={e => setPlatform(e.target.value)}
        style={{ ...inputStyle, minWidth: 100 }}
      >
        <option value="android">android</option>
        <option value="ios">ios</option>
        <option value="web">web</option>
      </select>
      <input
        type="text"
        placeholder="referrer"
        value={referrer}
        onChange={e => setReferrer(e.target.value)}
        style={{ ...inputStyle, flex: '0 1 140px', minWidth: 100 }}
      />
      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: '8px 20px',
          background: 'var(--accent-amber)',
          border: 'none',
          borderRadius: 2,
          color: 'var(--bg-primary)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '2px',
          cursor: submitting ? 'wait' : 'pointer',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        ADD
      </button>
      {error && (
        <span style={{
          color: 'var(--accent-red)',
          fontSize: 13,
          fontFamily: 'var(--font-body)',
        }}>
          {error}
        </span>
      )}
    </form>
  );
}

// ── Tab content ──

function PipelineTab({ beta, setBeta }: {
  beta: AdminBetaSignup[] | null;
  setBeta: React.Dispatch<React.SetStateAction<AdminBetaSignup[] | null>>;
}) {
  if (!beta) return <Empty text="Loading..." />;

  const pending = beta.filter(s => s.status === 'pending').length;
  const added = beta.filter(s => s.status === 'added').length;

  const toggleStatus = async (signup: AdminBetaSignup) => {
    const newStatus = signup.status === 'pending' ? 'added' : 'pending';
    // Optimistic update
    setBeta(prev => prev!.map(s => s.id === signup.id ? { ...s, status: newStatus } : s));
    try {
      await api.adminUpdateBetaStatus(signup.id, newStatus);
    } catch {
      // Revert on failure
      setBeta(prev => prev!.map(s => s.id === signup.id ? { ...s, status: signup.status } : s));
    }
  };

  const handleAdd = (signup: AdminBetaSignup) => {
    setBeta(prev => [signup, ...(prev || [])]);
  };

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
        marginBottom: 24,
        maxWidth: 400,
      }}>
        <StatCard value={pending} label="PENDING" color="var(--accent-amber)" />
        <StatCard value={added} label="ADDED" color="var(--accent-green)" />
      </div>

      <AddBetaForm onAdd={handleAdd} />

      {beta.length === 0 ? (
        <Empty text="No signups yet" />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <Table>
            <thead>
              <tr>
                <Th>EMAIL</Th>
                <Th>PLATFORM</Th>
                <Th>REFERRER</Th>
                <Th>STATUS</Th>
                <Th>DATE</Th>
              </tr>
            </thead>
            <tbody>
              {beta.map(s => (
                <tr key={s.id}>
                  <Td style={{ color: 'var(--accent-cyan)' }}>{s.email}</Td>
                  <Td>{s.platform}</Td>
                  <Td style={{ color: 'var(--text-secondary)' }}>{s.referrer || '\u2014'}</Td>
                  <Td>
                    <button
                      onClick={() => toggleStatus(s)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        color: s.status === 'pending' ? 'var(--accent-amber)' : 'var(--accent-green)',
                        fontWeight: 500,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                      }}
                      title={s.status === 'pending' ? 'Click to mark as added' : 'Click to mark as pending'}
                    >
                      {s.status}
                    </button>
                  </Td>
                  <Td>{formatDate(s.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </>
  );
}

function UsersTab({ users }: { users: AdminUser[] | null }) {
  if (!users) return <Empty text="Loading..." />;
  if (users.length === 0) return <Empty text="No users" />;

  const androidCount = users.filter(u => u.platform === 'android').length;
  const webCount = users.filter(u => u.platform === 'web').length;

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        marginBottom: 24,
        maxWidth: 500,
      }}>
        <StatCard value={users.length} label="TOTAL" color="var(--accent-cyan)" />
        <StatCard value={androidCount} label="ANDROID" color="var(--accent-green)" />
        <StatCard value={webCount} label="WEB" color="var(--accent-amber)" />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <Table>
          <thead>
            <tr>
              <Th>USERNAME</Th>
              <Th>EMAIL</Th>
              <Th>PLATFORM</Th>
              <Th style={{ textAlign: 'right' }}>WORKOUTS</Th>
              <Th>LAST WORKOUT</Th>
              <Th>JOINED</Th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <Td style={{ fontWeight: 600 }}>{u.username || '\u2014'}</Td>
                <Td style={{ color: 'var(--text-secondary)' }}>{u.email || '\u2014'}</Td>
                <Td>
                  {u.platform ? (
                    <span style={{
                      color: u.platform === 'android' ? 'var(--accent-green)' : 'var(--accent-amber)',
                      fontWeight: 500,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}>
                      {u.platform}
                    </span>
                  ) : '\u2014'}
                </Td>
                <Td style={{ textAlign: 'right', color: 'var(--accent-cyan)', fontFamily: 'var(--font-data)' }}>{u.workout_count}</Td>
                <Td style={{ color: 'var(--text-secondary)' }}>{u.last_workout ? formatDate(u.last_workout) : '\u2014'}</Td>
                <Td style={{ color: 'var(--text-secondary)' }}>{formatDate(u.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}

function ActivityTab({ activity }: { activity: AdminActivity[] | null }) {
  if (!activity) return <Empty text="Loading..." />;

  const activeUsers = new Set(activity.map(a => a.username)).size;

  return (
    <>
      <div style={{ marginBottom: 24, maxWidth: 200 }}>
        <StatCard value={activeUsers} label="ACTIVE USERS (14D)" color="var(--accent-cyan)" />
      </div>

      {activity.length === 0 ? (
        <Empty text="No activity" />
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
        </div>
      )}
    </>
  );
}

// ── Page ──

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('pipeline');
  const [beta, setBeta] = useState<AdminBetaSignup[] | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [activity, setActivity] = useState<AdminActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.adminBeta().then(setBeta),
      api.adminUsers().then(setUsers),
      api.adminActivity(14).then(setActivity),
    ]).catch(err => {
      if (err?.status === 403) setError('ACCESS DENIED');
      else setError('FAILED TO LOAD');
    });
  }, []);

  if (error) {
    return (
      <div className="page admin-page" style={{ paddingTop: 40, textAlign: 'center' }}>
        <div style={{
          fontSize: 16,
          fontFamily: 'var(--font-body)',
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
    <div className="page admin-page" style={{ paddingTop: 20, display: 'flex', gap: 0 }}>
      {/* Sidebar tabs */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        width: 180,
        flexShrink: 0,
        paddingRight: 24,
        borderRight: '1px solid var(--border-subtle)',
        marginRight: 24,
      }}>
        {TABS.map(t => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 14px',
                background: active ? 'var(--bg-elevated)' : 'none',
                border: 'none',
                borderRadius: 2,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '2px',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                transition: 'color 0.15s, background 0.15s',
              }}
            >
              {TAB_LABELS[t]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {tab === 'pipeline' && <PipelineTab beta={beta} setBeta={setBeta} />}
        {tab === 'users' && <UsersTab users={users} />}
        {tab === 'activity' && <ActivityTab activity={activity} />}
      </div>
    </div>
  );
}
