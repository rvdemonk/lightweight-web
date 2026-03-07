import { useState, useEffect } from 'react';
import { APP_VERSION } from '../version';
import { CHANGELOG, ChangelogVersion } from '../changelog';
import { api } from '../api/client';

const PREF_KEY_LAST_SEEN = 'last_seen_version';
const PREF_KEY_SHOW_WHATS_NEW = 'show_whats_new';

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function getUnseenVersions(lastSeen: string | null): ChangelogVersion[] {
  if (!lastSeen) return CHANGELOG.filter(v => compareVersions(v.version, APP_VERSION) <= 0);
  return CHANGELOG.filter(
    v => compareVersions(v.version, lastSeen) > 0 && compareVersions(v.version, APP_VERSION) <= 0
  );
}

export function WhatsNew() {
  const [visible, setVisible] = useState(false);
  const [versions, setVersions] = useState<ChangelogVersion[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [showPref, lastSeen] = await Promise.all([
          api.getPreference(PREF_KEY_SHOW_WHATS_NEW),
          api.getPreference(PREF_KEY_LAST_SEEN),
        ]);
        if (cancelled) return;
        if (showPref === 'false') return;

        if (lastSeen === null) {
          // First time — mark current version as seen, don't show history
          api.setPreference(PREF_KEY_LAST_SEEN, APP_VERSION).catch(() => {});
          return;
        }

        const unseen = getUnseenVersions(lastSeen);
        if (unseen.length > 0) {
          setVersions(unseen);
          setVisible(true);
        }
      } catch {
        // Network/auth error — don't block the app
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = async () => {
    setVisible(false);
    try {
      await api.setPreference(PREF_KEY_LAST_SEEN, APP_VERSION);
    } catch { /* best effort */ }
  };

  const dismissAndDisable = async () => {
    setVisible(false);
    try {
      await Promise.all([
        api.setPreference(PREF_KEY_LAST_SEEN, APP_VERSION),
        api.setPreference(PREF_KEY_SHOW_WHATS_NEW, 'false'),
      ]);
    } catch { /* best effort */ }
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px 0',
        maxWidth: 600,
        width: '100%',
        margin: '0 auto',
      }}>
        <div className="nerv-divider" style={{ marginBottom: 16 }}>
          <span style={{ color: 'var(--accent-primary)', textShadow: 'var(--glow-primary-text)' }}>
            SYSTEM UPDATE
          </span>
        </div>
        <div style={{
          fontFamily: 'var(--font-data)',
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--accent-primary)',
          textShadow: 'var(--glow-primary-text)',
          letterSpacing: '3px',
          marginBottom: 4,
        }}>
          WHAT'S NEW
        </div>
        <div style={{
          fontFamily: 'var(--font-data)',
          fontSize: 13,
          color: 'var(--text-secondary)',
          letterSpacing: '1px',
          marginBottom: 20,
        }}>
          v{APP_VERSION}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '0 16px',
      }}>
        <div style={{ maxWidth: 600, width: '100%', margin: '0 auto' }}>
          <VersionList versions={versions} />
        </div>
      </div>

      {/* Footer actions */}
      <div style={{
        padding: '16px',
        maxWidth: 600,
        width: '100%',
        margin: '0 auto',
      }}>
        <button
          className="btn btn-primary btn-full"
          onClick={dismiss}
        >
          CONTINUE
        </button>
        <button
          onClick={dismissAndDisable}
          style={{
            display: 'block',
            width: '100%',
            padding: '12px 0',
            background: 'none',
            border: 'none',
            fontFamily: 'var(--font-data)',
            fontSize: 11,
            color: 'var(--text-secondary)',
            letterSpacing: '1px',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          DON'T SHOW AGAIN
        </button>
      </div>
    </div>
  );
}

export function VersionList({ versions }: { versions: ChangelogVersion[] }) {
  return (
    <>
      {versions.map((ver) => (
        <div key={ver.version} style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 12,
            marginBottom: 12,
          }}>
            <span style={{
              fontFamily: 'var(--font-data)',
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--accent-cyan)',
              textShadow: 'var(--glow-cyan-text)',
              letterSpacing: '1px',
            }}>
              v{ver.version}
            </span>
            <span style={{
              fontFamily: 'var(--font-data)',
              fontSize: 11,
              color: 'var(--text-secondary)',
              letterSpacing: '1px',
            }}>
              {ver.date}
            </span>
          </div>

          {ver.highlights.map((h, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: 10,
              padding: '8px 0',
              borderBottom: i < ver.highlights.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}>
              <span style={{
                fontFamily: 'var(--font-data)',
                fontSize: 11,
                color: 'var(--accent-primary)',
                opacity: 0.6,
                lineHeight: '20px',
                flexShrink: 0,
                width: 16,
                textAlign: 'right',
              }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{
                fontSize: 14,
                color: 'var(--text-primary)',
                lineHeight: '20px',
              }}>
                {h}
              </span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
