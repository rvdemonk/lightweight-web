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

function StatusBadge({ status }: { status: string }) {
  const color = status === 'pending' ? 'var(--accent-amber)'
    : status === 'claimed' || status === 'added' ? 'var(--accent-green)'
    : 'var(--text-secondary)';
  return (
    <span style={{
      color,
      fontWeight: 500,
      letterSpacing: '1px',
      textTransform: 'uppercase',
    }}>
      {status}
    </span>
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

// ── Tabs ──

const TABS = ['overview', 'beta', 'users', 'activity', 'invites'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: 'OVERVIEW',
  beta: 'BETA SIGNUPS',
  users: 'USERS',
  activity: 'ACTIVITY',
  invites: 'INVITES',
};

// ── Tab content ──

function OverviewTab({ overview }: { overview: AdminOverview | null }) {
  if (!overview) return <Empty text="Loading..." />;

  const stats = [
    { label: 'USERS', value: overview.total_users, color: 'var(--accent-cyan)' },
    { label: 'BETA SIGNUPS', value: overview.total_beta_signups, color: 'var(--accent-cyan)' },
    { label: 'INVITES CLAIMED', value: `${overview.invites_claimed} / ${overview.invites_created}`, color: 'var(--accent-amber)' },
    { label: 'ACTIVE SESSIONS', value: overview.active_auth_sessions, color: 'var(--accent-green)' },
  ];

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 32,
      }}>
        {stats.map(s => (
          <div className="card" key={s.label} style={{ textAlign: 'center', padding: 20 }}>
            <div style={{
              fontSize: 36,
              fontFamily: 'var(--font-data)',
              fontWeight: 700,
              color: s.color,
              lineHeight: 1,
              marginBottom: 8,
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: 12,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              letterSpacing: '2px',
              color: 'var(--text-secondary)',
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {overview.recent_registrations.length > 0 && (
        <>
          <div style={{
            fontSize: 16,
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            letterSpacing: '2px',
            color: 'var(--text-primary)',
            marginBottom: 12,
          }}>
            RECENT REGISTRATIONS (7D)
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <Table>
              <thead>
                <tr>
                  <Th>USERNAME</Th>
                  <Th>JOINED</Th>
                  <Th>INVITED BY</Th>
                </tr>
              </thead>
              <tbody>
                {overview.recent_registrations.map((r, i) => (
                  <tr key={i}>
                    <Td style={{ fontWeight: 600 }}>{r.username || '\u2014'}</Td>
                    <Td>{formatDate(r.created_at)}</Td>
                    <Td style={{ color: 'var(--text-secondary)' }}>{r.invited_by || '(admin)'}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </>
      )}
    </>
  );
}

function BetaTab({ beta }: { beta: AdminBetaSignup[] | null }) {
  if (!beta) return <Empty text="Loading..." />;
  if (beta.length === 0) return <Empty text="No signups yet" />;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <Table>
        <thead>
          <tr>
            <Th>EMAIL</Th>
            <Th>USERNAME</Th>
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
    </div>
  );
}

function UsersTab({ users }: { users: AdminUser[] | null }) {
  if (!users) return <Empty text="Loading..." />;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <Table>
        <thead>
          <tr>
            <Th style={{ textAlign: 'right' }}>ID</Th>
            <Th>USERNAME</Th>
            <Th>EMAIL</Th>
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
              <Td style={{ fontWeight: 600 }}>{u.username || '\u2014'}</Td>
              <Td style={{ color: 'var(--text-secondary)' }}>{u.email || '\u2014'}</Td>
              <Td>{formatDate(u.created_at)}</Td>
              <Td style={{ color: 'var(--text-secondary)' }}>{u.invited_by || '(admin)'}</Td>
              <Td style={{ textAlign: 'right' }}>{u.auth_sessions}</Td>
              <Td style={{ textAlign: 'right', color: 'var(--accent-cyan)' }}>{u.workout_count}</Td>
              <Td style={{ color: 'var(--text-secondary)' }}>{u.last_workout ? formatDate(u.last_workout) : '\u2014'}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function ActivityTab({ activity }: { activity: AdminActivity[] | null }) {
  if (!activity) return <Empty text="Loading..." />;
  if (activity.length === 0) return <Empty text="No activity" />;

  return (
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
  );
}

function InvitesTab({ invites }: { invites: AdminInvite[] | null }) {
  if (!invites) return <Empty text="Loading..." />;
  if (invites.length === 0) return <Empty text="No invites" />;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
    </div>
  );
}

// ── Page ──

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('overview');
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
        {tab === 'overview' && <OverviewTab overview={overview} />}
        {tab === 'beta' && <BetaTab beta={beta} />}
        {tab === 'users' && <UsersTab users={users} />}
        {tab === 'activity' && <ActivityTab activity={activity} />}
        {tab === 'invites' && <InvitesTab invites={invites} />}
      </div>
    </div>
  );
}
