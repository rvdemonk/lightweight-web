import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_VERSION } from '../version';
import { isLoggedIn } from '../api/client';

const SECTIONS = [
  { id: 'section-workout', num: '01', label: 'Workout Construction' },
  { id: 'section-session', num: '02', label: 'Active Session' },
  { id: 'section-history', num: '03', label: 'Session History' },
  { id: 'section-analytics', num: '04', label: 'Analytics' },
];

const sectionNumStyle: React.CSSProperties = {
  fontSize: 13,
  fontFamily: 'var(--font-data)',
  color: 'var(--text-secondary)',
  letterSpacing: '2px',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontFamily: 'var(--font-data)',
  fontWeight: 700,
  color: 'var(--accent-primary)',
  letterSpacing: '3px',
  textTransform: 'uppercase',
  textShadow: 'var(--glow-primary-text)',
  margin: '4px 0 12px',
};

const copyStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  color: 'var(--text-secondary)',
  margin: 0,
};

function AnnotationLine({ direction = 'right', label }: { direction?: 'left' | 'right'; label: string }) {
  const isRight = direction === 'right';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexDirection: isRight ? 'row' : 'row-reverse',
      width: '100%',
    }}>
      <div style={{
        fontSize: 12,
        fontFamily: 'var(--font-data)',
        color: 'var(--accent-cyan)',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        textShadow: 'var(--glow-cyan-text)',
      }}>
        {label}
      </div>
      <svg height="2" style={{ flex: 1, minWidth: 20 }}>
        <line x1="0" y1="1" x2="100%" y2="1" stroke="var(--accent-cyan)" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
      </svg>
      <svg width="6" height="6" style={{ flexShrink: 0 }}>
        <circle cx="3" cy="3" r="2.5" fill="none" stroke="var(--accent-cyan)" strokeWidth="1" opacity="0.7" />
      </svg>
    </div>
  );
}

function SectionDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', margin: '52px 0', gap: 12 }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
      <svg width="8" height="8" style={{ opacity: 0.35, flexShrink: 0 }}>
        <rect x="1" y="1" width="6" height="6" fill="none" stroke="var(--accent-primary)" strokeWidth="1" transform="rotate(45 4 4)" />
      </svg>
      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
    </div>
  );
}

function Screenshot({ src, alt, maxWidth, offset, caption }: { src: string; alt: string; maxWidth?: number; offset?: boolean; caption?: string }) {
  return (
    <div style={{ marginTop: offset ? 28 : 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <img
        src={src}
        alt={alt}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          maxWidth: maxWidth ?? 220,
          borderRadius: 2,
          border: '1px solid var(--border-subtle)',
        }}
      />
      {caption && (
        <div style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--text-secondary)',
          marginTop: 10,
        }}>
          {caption}
        </div>
      )}
    </div>
  );
}

function FeatureChip({ color, label, body }: { color: string; label: string; body: string }) {
  const glowMap: Record<string, string> = {
    cyan: 'var(--glow-cyan-text)',
    green: 'var(--glow-green-text)',
  };
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 2,
      padding: '14px 16px',
    }}>
      <div style={{
        fontSize: 12,
        fontFamily: 'var(--font-data)',
        color: `var(--accent-${color})`,
        letterSpacing: '1.5px',
        marginBottom: 6,
        textShadow: glowMap[color] ?? 'none',
      }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {body}
      </div>
    </div>
  );
}

function TableOfContents({ activeId }: { activeId: string }) {
  return (
    <nav className="briefing-toc">
      {SECTIONS.map(s => {
        const isActive = activeId === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={e => {
              e.preventDefault();
              document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              display: 'block',
              fontFamily: 'var(--font-data)',
              fontSize: 13,
              letterSpacing: '1px',
              textDecoration: 'none',
              marginBottom: 12,
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              textShadow: isActive ? 'var(--glow-primary-text)' : 'none',
              opacity: isActive ? 1 : 0.5,
              transition: 'color 0.2s, opacity 0.2s',
            }}
          >
            <span style={{ marginRight: 8, opacity: 0.5 }}>{s.num}</span>
            {s.label.toUpperCase()}
          </a>
        );
      })}
    </nav>
  );
}

export function BriefingPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Force dark theme for this page
  useEffect(() => {
    const prev = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'dark');
    return () => {
      if (prev) document.documentElement.setAttribute('data-theme', prev);
    };
  }, []);

  // Track active section for TOC
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px' }
    );
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  const handleRegister = () => {
    navigate(isLoggedIn() ? '/' : '/login');
  };

  return (
    <>
      <style>{`
        .briefing-toc {
          display: none;
        }
        @media (min-width: 960px) {
          .briefing-toc {
            display: block;
            position: fixed;
            left: 24px;
            top: 50%;
            transform: translateY(-50%);
          }
        }
      `}</style>

      <div style={{
        minHeight: '100dvh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        overflowX: 'hidden',
        paddingBottom: 64,
      }}>
        <div className="grid-bg" />

        <TableOfContents activeId={activeSection} />

        <div style={{
          maxWidth: 600,
          margin: '0 auto',
          padding: '0 20px',
          position: 'relative',
        }}>

          {/* ── HERO ── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 80,
            paddingBottom: 24,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 40,
              fontWeight: 700,
              fontFamily: 'var(--font-data)',
              color: 'var(--accent-primary)',
              letterSpacing: '8px',
              textShadow: 'var(--glow-primary-text)',
            }}>
              LIGHTWEIGHT
            </div>
            <div style={{
              fontSize: 14,
              fontFamily: 'var(--font-data)',
              color: 'var(--text-secondary)',
              letterSpacing: '3px',
              marginTop: 12,
            }}>
              RESISTANCE TRAINING LOGGER
            </div>
            <svg width="2" height="52" style={{ margin: '28px 0 0', opacity: 0.25 }}>
              <line x1="1" y1="0" x2="1" y2="52" stroke="var(--accent-primary)" strokeWidth="1" strokeDasharray="4 3" />
            </svg>
          </div>

          {/* ── OVERVIEW ── */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 2,
            padding: '18px 20px',
          }}>
            <div style={{ ...copyStyle, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>Log resistance training sessions.</div>
              <div>Track progressive overload.</div>
              <div>Optimised for one-handed operation between sets.</div>
              <div>No social features.</div>
              <div>Export your data for analysis by AI of choice.</div>
            </div>
          </div>

          <SectionDivider />

          {/* ── 01 WORKOUT CONSTRUCTION ── */}
          <section id="section-workout">
            <span style={sectionNumStyle}>01</span>
            <h2 style={sectionTitleStyle}>Workout Construction</h2>
            <p style={copyStyle}>
              Define reusable workout templates. Name the session, add exercises from
              the database, set target sets and rep ranges.
            </p>

            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnnotationLine label="Template editor" />
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Screenshot src="/briefing/workout-empty.png" alt="New workout — empty state" caption="Name the session, add exercises." />
                <Screenshot src="/briefing/workout-configured.png" alt="New workout — with exercise configured" offset caption="Set target sets and rep ranges." />
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnnotationLine direction="left" label="Exercise library" />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Screenshot src="/briefing/exercise-list.png" alt="Exercise library" maxWidth={280} caption="Grouped by muscle. Add custom exercises." />
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* ── 02 ACTIVE SESSION ── */}
          <section id="section-session">
            <span style={sectionNumStyle}>02</span>
            <h2 style={sectionTitleStyle}>Active Session</h2>
            <p style={copyStyle}>
              Start from a template or go freeform. Session timer runs automatically.
              Each set displays against target — under, achieved, or exceeded.
              Skip exercises by simply not logging them.
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 10,
              margin: '20px 0',
            }}>
              <FeatureChip color="cyan" label="TEMPLATE MODE" body="Pre-loaded exercises with target sets and rep ranges." />
              <FeatureChip color="cyan" label="FREEFORM MODE" body="Empty session. Add exercises on the fly." />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnnotationLine label="Session interface" />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Screenshot src="/briefing/active-session.png" alt="Active session view" maxWidth={280} caption="Frictionless logging. Timer, progress bar, per-set input." />
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnnotationLine direction="left" label="Rep target bars" />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Screenshot src="/briefing/progress-bars.png" alt="Per-set rep target bars" maxWidth={360} caption="Green: on target. Red: under." />
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* ── 03 SESSION HISTORY ── */}
          <section id="section-history">
            <span style={sectionNumStyle}>03</span>
            <h2 style={sectionTitleStyle}>Session History</h2>
            <p style={copyStyle}>
              Chronological log of every completed session. Date, total sets.
              Expand for per-exercise breakdown.
            </p>

            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnnotationLine label="History feed" />
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Screenshot src="/briefing/history.png" alt="Session history list" maxWidth={180} caption="Date, set count, active status." />
                <Screenshot src="/briefing/session-detail.png" alt="Session detail view" offset caption="Per-exercise breakdown with progress bars." />
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* ── 04 ANALYTICS ── */}
          <section id="section-analytics">
            <span style={sectionNumStyle}>04</span>
            <h2 style={sectionTitleStyle}>Analytics</h2>
            <p style={copyStyle}>
              Training data visualised from logged sessions.
            </p>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnnotationLine label="Activity" />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Screenshot src="/briefing/heatmap.png" alt="Activity heatmap" maxWidth={380} caption="Training frequency grid. Intensity mapped to session volume." />
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnnotationLine direction="left" label="Progression" />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Screenshot src="/briefing/e1rm.png" alt="Estimated 1RM progression chart" maxWidth={300} caption="Track true strength progression per exercise regardless of rep range or weight strategy. Normalises every set to an estimated one-rep max via the Epley formula." />
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnnotationLine label="Volume" />
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Screenshot src="/briefing/volume-upper.png" alt="Weekly volume — upper/lower split" maxWidth={340} caption="Sets by week. Upper/lower split." />
                <Screenshot src="/briefing/volume-muscle.png" alt="Weekly volume — muscle group breakdown" maxWidth={340} offset caption="Per muscle group breakdown." />
              </div>
            </div>

            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <AnnotationLine direction="left" label="Frequency + balance" />
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <Screenshot src="/briefing/session-frequency.png" alt="Session frequency chart" maxWidth={340} caption="Track consistency. Stay alert for off weeks." />
                <Screenshot src="/briefing/muscle-balance.png" alt="Muscle balance radar chart" maxWidth={300} offset caption="Radar chart by muscle group. Skipping legs, I see." />
              </div>
            </div>
          </section>

          <SectionDivider />

          {/* ── CTA ── */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            paddingBottom: 48,
          }}>
            <div style={{
              fontSize: 13,
              fontFamily: 'var(--font-data)',
              color: 'var(--text-secondary)',
              letterSpacing: '2px',
              marginBottom: 24,
              opacity: 0.6,
            }}>
              INVITE-GATED REGISTRATION
            </div>
            <button
              className="btn btn-primary"
              style={{ ['--btn-cut' as string]: '10px', padding: '16px 80px', fontSize: 16 }}
              onClick={handleRegister}
            >
              Register
            </button>
          </div>

        </div>
      </div>

      {/* ── PINNED FOOTER ── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        padding: '10px 20px',
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-subtle)',
        zIndex: 10,
      }}>
        <span style={{
          fontSize: 13,
          fontFamily: 'var(--font-data)',
          color: 'var(--accent-primary)',
          letterSpacing: '3px',
          textShadow: 'var(--glow-primary-text)',
        }}>
          LIGHTWEIGHT
        </span>
        <span style={{ fontSize: 12, color: 'var(--border-subtle)' }}>·</span>
        <span style={{
          fontSize: 12,
          fontFamily: 'var(--font-data)',
          color: 'var(--text-secondary)',
          letterSpacing: '1px',
          opacity: 0.5,
        }}>
          v{APP_VERSION}
        </span>
      </div>
    </>
  );
}
