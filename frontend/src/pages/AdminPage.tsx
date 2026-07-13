import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { AdminUser, AdminBetaSignup, AdminActivity } from '../api/types';

const MOBILE_BREAKPOINT = 640;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

function formatDate(datetime: string): string {
  return datetime.split(' ')[0] || datetime.split('T')[0] || datetime;
}

function formatDuration(min: number | null): string {
  if (min == null) return '\u2014';
  if (min >= 60) return `${Math.floor(min / 60)}h${min % 60}m`;
  return `${min}min`;
}

function platformColor(p: string | null): string {
  if (p === 'android') return 'var(--accent-green)';
  if (p === 'web') return 'var(--accent-amber)';
  if (p === 'ios') return 'var(--accent-cyan)';
  return 'var(--text-secondary)';
}

function PlatformIcon({ platform, size = 14 }: { platform: string | null; size?: number }) {
  const color = platformColor(platform);
  if (platform === 'android') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-label="android">
        <path d="M17.523 15.34c-.573 0-1.04-.467-1.04-1.04s.467-1.04 1.04-1.04 1.04.467 1.04 1.04-.467 1.04-1.04 1.04m-11.046 0c-.573 0-1.04-.467-1.04-1.04s.467-1.04 1.04-1.04 1.04.467 1.04 1.04-.467 1.04-1.04 1.04m11.42-6.02l2.076-3.596a.432.432 0 00-.158-.59.432.432 0 00-.59.159l-2.1 3.638a12.78 12.78 0 00-5.225-1.1c-1.852 0-3.616.395-5.225 1.1l-2.1-3.638a.432.432 0 00-.59-.159.432.432 0 00-.158.59L5.9 9.32C2.343 11.259 0 14.906 0 19.08h24c0-4.174-2.344-7.822-6.103-9.76"/>
      </svg>
    );
  }
  if (platform === 'ios') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-label="ios">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    );
  }
  if (platform === 'web') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} aria-label="web">
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </svg>
    );
  }
  return null;
}

function InlineStat({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <div style={{
        fontSize: 22,
        fontFamily: 'var(--font-data)',
        fontWeight: 700,
        color,
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 9,
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

function AddButton({ onClick, label = '+ ADD' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        background: 'var(--accent-amber)',
        border: 'none',
        borderRadius: 2,
        color: 'var(--bg-primary)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: '2px',
        cursor: 'pointer',
        minHeight: 36,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ── Mobile compact list ──

function MobileList({ children }: { children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {children}
    </div>
  );
}

function MobileRow({ children, isLast }: { children: React.ReactNode; isLast: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 12px',
      borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
      minHeight: 44,
    }}>
      {children}
    </div>
  );
}

function ShortDate(dt: string): string {
  // "2026-04-15" → "04-15"
  const d = formatDate(dt);
  return d.length >= 10 ? d.slice(5) : d;
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

// ── Tabs ──

const TABS = ['pipeline', 'users', 'activity'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  pipeline: 'BETA PIPELINE',
  users: 'USERS',
  activity: 'ACTIVITY',
};

// ── Add Beta Form ──

function AddBetaModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (signup: AdminBetaSignup) => void;
}) {
  const [email, setEmail] = useState('');
  const [platform, setPlatform] = useState('android');
  const [referrer, setReferrer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const signup = await api.adminAddBeta(email.trim(), platform, referrer.trim() || undefined);
      onAdd(signup);
      onClose();
    } catch (err: any) {
      if (err?.status === 409) setError('Email already exists');
      else setError('Failed to add');
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-primary)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 2,
    padding: '12px',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: 16, // prevents iOS Safari zoom
    outline: 'none',
    width: '100%',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 20,
          margin: 0,
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '2px',
            color: 'var(--text-primary)',
          }}>
            ADD BETA SIGNUP
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 22,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoFocus
            style={inputStyle}
          />
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            style={inputStyle}
          >
            <option value="android">android</option>
            <option value="ios">ios</option>
            <option value="web">web</option>
          </select>
          <input
            type="text"
            placeholder="referrer (optional)"
            value={referrer}
            onChange={e => setReferrer(e.target.value)}
            style={inputStyle}
          />
          <div style={{
            fontSize: 11,
            fontFamily: 'var(--font-body)',
            color: 'var(--text-secondary)',
            marginTop: 4,
          }}>
            Status will default to PENDING.
          </div>
          {error && (
            <div style={{
              color: 'var(--accent-red)',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '14px',
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
              minHeight: 44,
              marginTop: 4,
            }}
          >
            {submitting ? 'ADDING…' : 'ADD SIGNUP'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Tab content ──

function PipelineTab({ beta, setBeta, isMobile }: {
  beta: AdminBetaSignup[] | null;
  setBeta: React.Dispatch<React.SetStateAction<AdminBetaSignup[] | null>>;
  isMobile: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);

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
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        marginBottom: 20,
      }}>
        <InlineStat value={pending} label="PENDING" color="var(--accent-amber)" />
        <InlineStat value={added} label="ADDED" color="var(--accent-green)" />
        <div style={{ flex: 1 }} />
        <AddButton onClick={() => setShowAdd(true)} />
      </div>

      {showAdd && <AddBetaModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}

      {beta.length === 0 ? (
        <Empty text="No signups yet" />
      ) : isMobile ? (
        <MobileList>
          {beta.map((s, i) => {
            const statusColor = s.status === 'pending' ? 'var(--accent-amber)' : 'var(--accent-green)';
            return (
              <MobileRow key={s.id} isLast={i === beta.length - 1}>
                <div style={{
                  width: 7,
                  height: 7,
                  borderRadius: 4,
                  background: statusColor,
                  boxShadow: `0 0 4px ${statusColor}`,
                  flexShrink: 0,
                }} />
                <span style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {s.email}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <PlatformIcon platform={s.platform} />
                </span>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-data)',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                }}>
                  {ShortDate(s.created_at)}
                </span>
              </MobileRow>
            );
          })}
        </MobileList>
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
                  <Td>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <PlatformIcon platform={s.platform} size={16} />
                    </span>
                  </Td>
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

function UsersTab({ users, isMobile }: { users: AdminUser[] | null; isMobile: boolean }) {
  if (!users) return <Empty text="Loading..." />;
  if (users.length === 0) return <Empty text="No users" />;

  const androidCount = users.filter(u => u.platform === 'android').length;
  const webCount = users.filter(u => u.platform === 'web').length;

  return (
    <>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        marginBottom: 20,
      }}>
        <InlineStat value={users.length} label="TOTAL" color="var(--accent-cyan)" />
        <InlineStat value={androidCount} label="ANDROID" color="var(--accent-green)" />
        <InlineStat value={webCount} label="WEB" color="var(--accent-amber)" />
      </div>

      {isMobile ? (
        <MobileList>
          {users.map((u, i) => (
            <MobileRow key={u.id} isLast={i === users.length - 1}>
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <PlatformIcon platform={u.platform} />
              </span>
              <span style={{
                flex: 1,
                minWidth: 0,
                fontSize: 13,
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {u.username || '\u2014'}
              </span>
              <span style={{
                fontSize: 13,
                fontFamily: 'var(--font-data)',
                color: 'var(--accent-cyan)',
                flexShrink: 0,
                minWidth: 24,
                textAlign: 'right',
              }}>
                {u.workout_count}
              </span>
              <span style={{
                fontSize: 11,
                fontFamily: 'var(--font-data)',
                color: 'var(--text-secondary)',
                flexShrink: 0,
                minWidth: 40,
                textAlign: 'right',
              }}>
                {u.last_workout ? ShortDate(u.last_workout) : '\u2014'}
              </span>
            </MobileRow>
          ))}
        </MobileList>
      ) : (
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
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <PlatformIcon platform={u.platform} size={16} />
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
      )}
    </>
  );
}

function ActivityTab({ activity, isMobile }: { activity: AdminActivity[] | null; isMobile: boolean }) {
  if (!activity) return <Empty text="Loading..." />;

  const activeUsers = new Set(activity.map(a => a.username)).size;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <InlineStat value={activeUsers} label="ACTIVE USERS (14D)" color="var(--accent-cyan)" />
      </div>

      {activity.length === 0 ? (
        <Empty text="No activity" />
      ) : isMobile ? (
        <MobileList>
          {activity.map((a, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              padding: '8px 12px',
              borderBottom: i === activity.length - 1 ? 'none' : '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 13,
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {a.username}
                </span>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-data)',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                }}>
                  {ShortDate(a.date)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 12,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {a.workout_name}
                </span>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-data)',
                  color: 'var(--text-secondary)',
                  flexShrink: 0,
                }}>
                  {formatDuration(a.duration_min)}
                </span>
                <span style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-data)',
                  color: 'var(--accent-cyan)',
                  flexShrink: 0,
                  minWidth: 24,
                  textAlign: 'right',
                }}>
                  {a.set_count}
                </span>
              </div>
            </div>
          ))}
        </MobileList>
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
  const isMobile = useIsMobile();

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
    <div className="page admin-page" style={{
      paddingTop: isMobile ? 12 : 20,
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: 0,
    }}>
      {/* Tabs: sidebar on desktop, top bar on mobile */}
      <div style={isMobile ? {
        display: 'flex',
        gap: 2,
        marginBottom: 16,
        borderBottom: '1px solid var(--border-subtle)',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      } : {
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
              style={isMobile ? {
                flex: 1,
                padding: '12px 10px',
                background: active ? 'var(--bg-elevated)' : 'none',
                border: 'none',
                borderBottom: active ? '2px solid var(--accent-amber)' : '2px solid transparent',
                borderRadius: 0,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '2px',
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                minHeight: 44,
                transition: 'color 0.15s, background 0.15s',
              } : {
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
        {tab === 'pipeline' && <PipelineTab beta={beta} setBeta={setBeta} isMobile={isMobile} />}
        {tab === 'users' && <UsersTab users={users} isMobile={isMobile} />}
        {tab === 'activity' && <ActivityTab activity={activity} isMobile={isMobile} />}
      </div>
    </div>
  );
}
