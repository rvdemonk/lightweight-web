import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
            color: 'var(--accent-amber)',
            fontFamily: 'var(--font-data)',
            textShadow: 'var(--glow-amber-text)',
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
                    ? 'var(--accent-amber)'
                    : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: 'none',
                  letterSpacing: '1px',
                  textShadow: active ? 'var(--glow-amber-text)' : 'none',
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
              background: menuOpen ? 'var(--accent-amber)' : 'var(--text-primary)',
              transition: 'transform 0.2s, opacity 0.2s, background 0.2s',
              transform: menuOpen ? 'translateY(6px) rotate(45deg)' : 'none',
              boxShadow: menuOpen ? 'var(--glow-amber-soft)' : 'none',
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
              background: menuOpen ? 'var(--accent-amber)' : 'var(--text-primary)',
              transition: 'transform 0.2s, opacity 0.2s, background 0.2s',
              transform: menuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none',
              boxShadow: menuOpen ? 'var(--glow-amber-soft)' : 'none',
            }} />
          </div>
        </button>
      </nav>

      {/* Full-screen mobile menu */}
      <div
        className="mobile-menu hex-bg"
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
        {/* Decorative top divider with label */}
        <div style={{
          position: 'absolute',
          top: 24,
          left: 24,
          right: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 12,
            height: 1,
            background: 'var(--border-active)',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: 9,
            color: 'var(--accent-amber)',
            letterSpacing: '2px',
            opacity: 0.6,
            whiteSpace: 'nowrap',
          }}>
            NAVIGATION
          </span>
          <div style={{
            flex: 1,
            height: 1,
            background: 'var(--border-subtle)',
          }} />
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
                    ? 'rgba(232, 168, 50, 0.08)'
                    : 'transparent',
                  boxShadow: active
                    ? 'inset 0 0 20px rgba(232, 168, 50, 0.05), 0 0 8px rgba(232, 168, 50, 0.08)'
                    : 'none',
                  border: active
                    ? '1px solid rgba(232, 168, 50, 0.2)'
                    : '1px solid transparent',
                  transition: 'background 0.15s, box-shadow 0.15s',
                  minHeight: 64,
                }}
              >
                <span style={{
                  fontSize: 14,
                  color: 'var(--accent-amber)',
                  opacity: active ? 1 : 0,
                  width: 12,
                  textShadow: 'var(--glow-amber-text)',
                  transition: 'opacity 0.15s',
                }}>
                  ▸
                </span>
                <span style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 12,
                  color: active ? 'var(--accent-amber)' : 'var(--text-secondary)',
                  width: 24,
                  textShadow: active ? 'var(--glow-amber-text)' : 'none',
                }}>
                  {item.num}
                </span>
                <span style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: '2px',
                  fontFamily: 'var(--font-data)',
                  color: active ? 'var(--accent-amber)' : 'var(--text-primary)',
                  textShadow: active ? 'var(--glow-amber-text)' : 'none',
                }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
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

        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 24,
          fontFamily: 'var(--font-data)',
          fontSize: 10,
          color: 'var(--text-secondary)',
          letterSpacing: '1px',
          opacity: 0.6,
        }}>
          LIGHTWEIGHT v0.1.0
        </div>
      </div>

      {children}
    </>
  );
}
