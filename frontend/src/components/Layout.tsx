import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_VERSION } from '../version';
import { useTheme } from '../hooks/useTheme';
import { api } from '../api/client';
import { Timer } from './Timer';

const PAGE_TITLES: Record<string, string> = {
  '/': 'HOME',
  '/exercises': 'EXERCISES',
  '/templates': 'WORKOUTS',
  '/workout': 'WORKOUT',
  '/history': 'HISTORY',
  '/analytics': 'ANALYTICS',
  '/settings': 'SETTINGS',
  '/settings/invites': 'INVITES',
  '/whats-new': 'CHANGELOG',
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/templates/')) return 'WORKOUT';
  if (pathname.startsWith('/sessions/')) return 'SESSION';
  return 'LIGHTWEIGHT';
}

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const pageTitle = getPageTitle(location.pathname);
  const [activeWorkout, setActiveWorkout] = useState<{
    name: string;
    started_at: string;
    paused_duration: number;
    status: string;
  } | null>(null);

  useEffect(() => {
    api.getActiveSession().then(session => {
      if (session) {
        setActiveWorkout({
          name: (session.template_name || session.name || 'WORKOUT').toUpperCase(),
          started_at: session.started_at,
          paused_duration: session.paused_duration,
          status: session.status,
        });
      } else {
        setActiveWorkout(null);
      }
    }).catch(() => {});
  }, [location.pathname]);

  const homeLabel = activeWorkout ? activeWorkout.name : 'HOME';

  const navItems = [
    { path: activeWorkout ? '/workout' : '/', label: homeLabel, num: '01' },
    { path: '/exercises', label: 'EXERCISES', num: '02' },
    { path: '/templates', label: 'WORKOUTS', num: '03' },
    { path: '/history', label: 'HISTORY', num: '04' },
    { path: '/analytics', label: 'ANALYTICS', num: '05' },
  ];

  return (
    <>
      <nav style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 48,
        position: 'sticky',
        top: 0,
        zIndex: 200,
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontWeight: 700,
            fontSize: 16,
            color: 'var(--accent-primary)',
            fontFamily: 'var(--font-data)',
            textShadow: 'var(--glow-primary-text)',
            letterSpacing: '2px',
          }}>
            LW
          </span>
        </Link>

        {/* Active page title — same size as logo */}
        <span style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-secondary)',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--font-data)',
        }}>
          {pageTitle}
        </span>

        {/* Desktop nav */}
        <div className="desktop-nav">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            const highlighted = active || (activeWorkout && item.num === '01');
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  color: highlighted
                    ? 'var(--accent-primary)'
                    : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: 'none',
                  letterSpacing: '1px',
                  textShadow: highlighted ? 'var(--glow-primary-text)' : 'none',
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            to="/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke={location.pathname === '/settings' ? 'var(--accent-primary)' : 'var(--text-secondary)'} strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter">
              <path d="M8.5 1h3l.4 2.4a7 7 0 012 1.2l2.3-.9 1.5 2.6-1.9 1.5a7 7 0 010 2.4l1.9 1.5-1.5 2.6-2.3-.9a7 7 0 01-2 1.2L11.5 19h-3l-.4-2.4a7 7 0 01-2-1.2l-2.3.9-1.5-2.6 1.9-1.5a7 7 0 010-2.4l-1.9-1.5 1.5-2.6 2.3.9a7 7 0 012-1.2z" />
              <circle cx="10" cy="10" r="3" />
            </svg>
          </Link>
        </div>

        {/* Hamburger button */}
        <button
          className="hamburger-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <div style={{
            width: 20,
            height: 14,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <span style={{
              display: 'block',
              height: 2,
              background: menuOpen ? 'var(--accent-primary)' : 'var(--text-primary)',
              transition: 'transform 0.2s, opacity 0.2s, background 0.2s',
              transform: menuOpen ? 'translateY(6px) rotate(45deg)' : 'none',
              boxShadow: menuOpen ? 'var(--glow-primary-soft)' : 'none',
            }} />
            <span style={{
              display: 'block',
              height: 2,
              background: 'var(--text-primary)',
              transition: 'opacity 0.2s',
              opacity: menuOpen ? 0 : 1,
            }} />
            <span style={{
              display: 'block',
              height: 2,
              background: menuOpen ? 'var(--accent-primary)' : 'var(--text-primary)',
              transition: 'transform 0.2s, opacity 0.2s, background 0.2s',
              transform: menuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none',
              boxShadow: menuOpen ? 'var(--glow-primary-soft)' : 'none',
            }} />
          </div>
        </button>
      </nav>

      {/* Full-screen mobile menu */}
      <div
        className="mobile-menu grid-bg"
        style={{
          position: 'fixed',
          inset: 0,
          top: 48,
          background: 'var(--bg-primary)',
          zIndex: 150,
          display: 'flex',
          flexDirection: 'column',
          padding: '0 24px',
          overflowY: 'auto',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity 0.15s ease',
        }}
      >
        {/* Top spacer — pushes content toward center */}
        <div style={{ flex: 1 }} />

        {/* Content group */}
        <div>
          {/* NAVIGATION divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}>
            <div style={{ width: 12, height: 1, background: 'var(--border-active)', flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: 'var(--accent-primary)', letterSpacing: '2px', opacity: 0.6, whiteSpace: 'nowrap' }}>
              NAVIGATION
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '20px 16px',
                  textDecoration: 'none',
                  background: active
                    ? 'var(--menu-active-bg)'
                    : 'transparent',
                  boxShadow: active
                    ? 'var(--menu-active-shadow)'
                    : 'none',
                  border: active
                    ? '1px solid var(--menu-active-border)'
                    : '1px solid transparent',
                  transition: 'background 0.15s, box-shadow 0.15s',
                  minHeight: 64,
                }}
              >
                <span style={{
                  fontSize: 14,
                  color: 'var(--accent-primary)',
                  opacity: active ? 1 : 0,
                  width: 12,
                  textShadow: 'var(--glow-primary-text)',
                  transition: 'opacity 0.15s',
                }}>
                  ▸
                </span>
                <span style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 12,
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  width: 24,
                  textShadow: active ? 'var(--glow-primary-text)' : 'none',
                }}>
                  {item.num}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: '2px',
                    fontFamily: 'var(--font-data)',
                    color: activeWorkout && item.num === '01'
                      ? 'var(--accent-primary)'
                      : active ? 'var(--accent-primary)' : 'var(--text-primary)',
                    textShadow: (activeWorkout && item.num === '01') || active
                      ? 'var(--glow-primary-text)' : 'none',
                  }}>
                    {item.label}
                  </span>
                  {activeWorkout && item.num === '01' && (
                    <span style={{ fontSize: 11, marginTop: 2 }}>
                      <Timer
                        startedAt={activeWorkout.started_at}
                        pausedDuration={activeWorkout.paused_duration}
                        isPaused={activeWorkout.status === 'paused'}
                      />
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>

          {/* Display mode selector */}
          <div style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}>
            <div style={{ width: 12, height: 1, background: 'var(--border-active)', flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: 'var(--accent-primary)', letterSpacing: '2px', opacity: 0.6, whiteSpace: 'nowrap' }}>
              DISPLAY
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>

          <div style={{ display: 'flex', gap: 0 }}>
            {(['dark', 'light'] as const).map(mode => {
              const active = theme === mode;
              return (
                <button
                  key={mode}
                  onClick={() => { if (!active) toggleTheme(); }}
                  style={{
                    flex: 1,
                    padding: '14px 0',
                    background: active ? 'var(--menu-active-bg)' : 'transparent',
                    border: active ? '1px solid var(--menu-active-border)' : '1px solid transparent',
                    cursor: active ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                  }}
                >
                  <span style={{
                    width: 8,
                    height: 8,
                    borderRadius: 1,
                    background: active ? 'var(--accent-primary)' : 'transparent',
                    border: active ? 'none' : '1px solid var(--border-subtle)',
                    boxShadow: active ? 'var(--glow-primary-soft)' : 'none',
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: '2px',
                    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    textShadow: active ? 'var(--glow-primary-text)' : 'none',
                  }}>
                    {mode === 'dark' ? 'NIGHT' : 'DAY'}
                  </span>
                </button>
              );
            })}
          </div>
          </div>

          {/* Secondary links */}
          <div style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
          }}>
            <div style={{ width: 12, height: 1, background: 'var(--border-active)', flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: 'var(--accent-primary)', letterSpacing: '2px', opacity: 0.6, whiteSpace: 'nowrap' }}>
              SYSTEM
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { path: '/settings', label: 'SETTINGS', icon: '⚙' },
              { path: '/settings/invites', label: 'INVITES', icon: '✉' },
            ].map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 16px',
                    textDecoration: 'none',
                    background: active ? 'var(--menu-active-bg)' : 'transparent',
                    border: active ? '1px solid var(--menu-active-border)' : '1px solid transparent',
                  }}
                >
                  <span style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1,
                    width: 16,
                    textAlign: 'center',
                  }}>
                    {item.icon}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: '2px',
                    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    textShadow: active ? 'var(--glow-primary-text)' : 'none',
                  }}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
          </div>
        </div>

        {/* Bottom spacer — matches top spacer for centering */}
        <div style={{ flex: 1 }} />

        {/* Decorative bottom divider with status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}>
          <div style={{
            flex: 1,
            height: 1,
            background: 'var(--border-subtle)',
          }} />
          <span style={{
            fontSize: 9,
            color: 'var(--accent-green)',
            letterSpacing: '2px',
            opacity: 0.5,
            whiteSpace: 'nowrap',
            textShadow: 'var(--glow-green-text)',
          }}>
            BETA
          </span>
          <div style={{
            width: 12,
            height: 1,
            background: 'var(--border-active)',
            flexShrink: 0,
          }} />
        </div>

        {/* Version */}
        <div style={{
          fontFamily: 'var(--font-data)',
          fontSize: 13,
          color: 'var(--accent-primary)',
          letterSpacing: '2px',
          opacity: 0.7,
          textShadow: 'var(--glow-primary-text)',
          paddingBottom: 16,
        }}>
          LIGHTWEIGHT v{APP_VERSION}
        </div>
      </div>

      {children}
    </>
  );
}
