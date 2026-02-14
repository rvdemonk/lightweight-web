import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

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
          }}>
            LW
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="desktop-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                color: location.pathname === item.path
                  ? 'var(--accent-amber)'
                  : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              {item.label}
            </Link>
          ))}
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
              background: 'var(--text-primary)',
              borderRadius: 1,
              transition: 'transform 0.2s, opacity 0.2s',
              transform: menuOpen ? 'translateY(6px) rotate(45deg)' : 'none',
            }} />
            <span style={{
              display: 'block',
              height: 2,
              background: 'var(--text-primary)',
              borderRadius: 1,
              transition: 'opacity 0.2s',
              opacity: menuOpen ? 0 : 1,
            }} />
            <span style={{
              display: 'block',
              height: 2,
              background: 'var(--text-primary)',
              borderRadius: 1,
              transition: 'transform 0.2s, opacity 0.2s',
              transform: menuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none',
            }} />
          </div>
        </button>
      </nav>

      {/* Full-screen mobile menu */}
      <div
        className="mobile-menu"
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
        {/* Decorative top line */}
        <div style={{
          position: 'absolute',
          top: 24,
          left: 24,
          right: 24,
          height: 1,
          background: 'var(--border-subtle)',
        }} />

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
                  gap: 16,
                  padding: '20px 16px',
                  textDecoration: 'none',
                  borderLeft: active
                    ? '3px solid var(--accent-amber)'
                    : '3px solid transparent',
                  background: active ? 'var(--bg-elevated)' : 'transparent',
                  borderRadius: '0 4px 4px 0',
                  transition: 'background 0.15s',
                  minHeight: 64,
                }}
              >
                <span style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 12,
                  color: active ? 'var(--accent-amber)' : 'var(--text-secondary)',
                  width: 24,
                }}>
                  {item.num}
                </span>
                <span style={{
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: '2px',
                  fontFamily: 'var(--font-data)',
                  color: active ? 'var(--accent-amber)' : 'var(--text-primary)',
                }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Decorative bottom line */}
        <div style={{
          position: 'absolute',
          bottom: 48,
          left: 24,
          right: 24,
          height: 1,
          background: 'var(--border-subtle)',
        }} />

        {/* Status line */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 24,
          fontFamily: 'var(--font-data)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          letterSpacing: '1px',
        }}>
          LIGHTWEIGHT v0.1.0
        </div>
      </div>

      {children}
    </>
  );
}
