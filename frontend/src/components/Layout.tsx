import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_VERSION } from '../version';
import { useTheme } from '../hooks/useTheme';

const PAGE_TITLES: Record<string, string> = {
  '/': 'HOME',
  '/exercises': 'EXERCISES',
  '/templates': 'WORKOUTS',
  '/workout': 'WORKOUT',
  '/history': 'HISTORY',
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

  const navItems = [
    { path: '/', label: 'HOME', num: '01' },
    { path: '/exercises', label: 'EXERCISES', num: '02' },
    { path: '/templates', label: 'WORKOUTS', num: '03' },
    { path: '/history', label: 'HISTORY', num: '04' },
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
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  color: active
                    ? 'var(--accent-primary)'
                    : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: 'none',
                  letterSpacing: '1px',
                  textShadow: active ? 'var(--glow-primary-text)' : 'none',
                }}
              >
                {item.label}
              </Link>
            );
          })}
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
          justifyContent: 'center',
          padding: '0 24px',
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? 'auto' : 'none',
          transition: 'opacity 0.15s ease',
        }}
      >
        {/* Centered content group */}
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
                <span style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: '2px',
                  fontFamily: 'var(--font-data)',
                  color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
                  textShadow: active ? 'var(--glow-primary-text)' : 'none',
                }}>
                  {item.label}
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
        </div>

        {/* Decorative bottom divider with status */}
        <div style={{
          position: 'absolute',
          bottom: 48,
          left: 24,
          right: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
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
            OPERATIONAL
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
          position: 'absolute',
          bottom: 16,
          left: 24,
          fontFamily: 'var(--font-data)',
          fontSize: 13,
          color: 'var(--accent-primary)',
          letterSpacing: '2px',
          opacity: 0.7,
          textShadow: 'var(--glow-primary-text)',
        }}>
          LIGHTWEIGHT v{APP_VERSION}
        </div>
      </div>

      {children}
    </>
  );
}
