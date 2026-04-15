import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, clearToken } from '../api/client';
import { useTheme } from '../hooks/useTheme';
import { APP_VERSION } from '../version';
import type { ExportMeta, InviteList } from '../api/types';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase();
}

// Reusable settings row — tappable card with label, description, and right-side action
function SettingsRow({ label, description, onClick, right, style }: {
  label: string;
  description?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="card"
      onClick={onClick}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'pre-line' }}>
            {description}
          </div>
        )}
      </div>
      {right && <div style={{ flexShrink: 0, marginLeft: 16 }}>{right}</div>}
    </div>
  );
}

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      disabled={disabled}
      style={{
        width: 44,
        height: 24,
        borderRadius: 2,
        border: '1px solid',
        borderColor: on ? 'var(--accent-primary)' : 'var(--border-subtle)',
        background: on ? 'var(--accent-primary)' : 'var(--bg-elevated)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.15s, border-color 0.15s',
        padding: 0,
      }}
    >
      <div style={{
        width: 18,
        height: 18,
        borderRadius: 1,
        background: on ? 'var(--btn-filled-text)' : 'var(--text-secondary)',
        position: 'absolute',
        top: 2,
        left: on ? 22 : 2,
        transition: 'left 0.15s, background 0.15s',
      }} />
    </button>
  );
}

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [showWhatsNew, setShowWhatsNew] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exportMeta, setExportMeta] = useState<ExportMeta | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportDone, setExportDone] = useState(false);
  const [exportCooldown, setExportCooldown] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteList | null>(null);
  const [user, setUser] = useState<{ username: string | null; email: string | null; created_at: string } | null>(null);

  useEffect(() => {
    api.me().then(setUser).catch(() => {});

    api.getPreference('show_whats_new').then(val => {
      if (val === 'false') setShowWhatsNew(false);
    }).catch(() => {});

    api.exportMeta().then(setExportMeta).catch(() => {});
    api.listInvites().then(setInviteData).catch(() => {});

    if (!import.meta.env.DEV) {
      api.getPreference('last_export_at').then(val => {
        if (!val) return;
        const lastMs = new Date(val.replace(' ', 'T') + 'Z').getTime();
        const nowMs = Date.now();
        const weekMs = 7 * 24 * 60 * 60 * 1000;
        const remaining = weekMs - (nowMs - lastMs);
        if (remaining > 0) {
          const days = Math.ceil(remaining / (24 * 60 * 60 * 1000));
          setExportCooldown(`Available in ${days}d`);
        }
      }).catch(() => {});
    }
  }, []);

  const toggleWhatsNew = async () => {
    const next = !showWhatsNew;
    setShowWhatsNew(next);
    setSaving(true);
    try {
      await api.setPreference('show_whats_new', next ? 'true' : 'false');
    } catch { /* best effort */ }
    setSaving(false);
  };

  const handleExport = async () => {
    if (exporting || exportDone || exportCooldown) return;
    setExporting(true);
    setExportError(null);
    try {
      const blob = await api.exportSessions();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `lightweight-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportDone(true);
    } catch (e: any) {
      if (e.status === 429) {
        setExportError('Export limited to once per week');
      } else {
        setExportError('Export failed');
      }
    }
    setExporting(false);
  };

  const logout = async () => {
    try { await api.logout(); } catch { /* best effort */ }
    clearToken();
    window.location.href = '/login';
  };

  // Build export description
  let exportDesc = 'Download all session data as CSV';
  if (exportMeta && exportMeta.session_count > 0) {
    const line1 = `${exportMeta.session_count} sessions, ${exportMeta.set_count} sets`;
    const line2 = exportMeta.first_session && exportMeta.last_session
      ? `${formatDate(exportMeta.first_session)} — ${formatDate(exportMeta.last_session)}`
      : null;
    exportDesc = line2 ? `${line1}\n${line2}` : line1;
  }

  // Export right-side element
  const exportRight = exporting ? (
    <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '1px' }}>...</span>
  ) : exportDone ? (
    <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--accent-green)', textShadow: 'var(--glow-green-text)', letterSpacing: '1px' }}>DONE</span>
  ) : exportError ? (
    <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--accent-red)', textShadow: 'var(--glow-red-text)' }}>{exportError.toUpperCase()}</span>
  ) : exportCooldown ? (
    <span style={{ fontFamily: 'var(--font-data)', fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '1px' }}>{exportCooldown.toUpperCase()}</span>
  ) : (
    <span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '1px' }}>CSV →</span>
  );

  return (
    <div className="page" style={{ paddingTop: 20 }}>
      {/* User profile */}
      {user && (
        <div style={{ marginBottom: 24 }}>
          <div className="label" style={{ marginBottom: 12 }}>ACCOUNT</div>
          <div className="card">
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              fontFamily: 'var(--font-body)',
              marginBottom: user.email ? 4 : 0,
            }}>
              {user.username || user.email || 'User'}
            </div>
            {user.email && user.username && (
              <div style={{
                fontSize: 13,
                fontFamily: 'var(--font-data)',
                color: 'var(--text-secondary)',
              }}>
                {user.email}
              </div>
            )}
            <div style={{
              fontSize: 11,
              fontFamily: 'var(--font-data)',
              color: 'var(--text-secondary)',
              marginTop: 6,
            }}>
              JOINED {formatDate(user.created_at)}
            </div>
          </div>
        </div>
      )}

      <div className="nerv-divider" style={{ marginBottom: 24 }}>
        <span>CONFIGURATION</span>
      </div>

      {/* Appearance */}
      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 12 }}>APPEARANCE</div>
        <SettingsRow
          label="LIGHT MODE"
          description="Switch between dark and light theme"
          right={<Toggle on={theme === 'light'} onToggle={toggleTheme} />}
        />
      </div>

      {/* Notifications */}
      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 12 }}>NOTIFICATIONS</div>
        <SettingsRow
          label="SHOW WHAT'S NEW"
          description="Display changelog on version updates"
          right={<Toggle on={showWhatsNew} onToggle={toggleWhatsNew} disabled={saving} />}
        />
      </div>

      {/* Data */}
      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 12 }}>DATA</div>
        <SettingsRow
          label="EXPORT SESSIONS"
          description={exportDesc}
          onClick={handleExport}
          right={exportRight}
        />
      </div>

      {/* Invites */}
      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 12 }}>INVITES</div>
        <Link to="/settings/invites" style={{ textDecoration: 'none' }}>
          <SettingsRow
            label="MANAGE INVITES"
            description={inviteData
              ? `${inviteData.quota - inviteData.invites.length} of ${inviteData.quota} remaining`
              : 'Invite others to Lightweight'
            }
            right={<span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '1px' }}>→</span>}
          />
        </Link>
      </div>

      {/* About */}
      <div style={{ marginBottom: 24 }}>
        <div className="label" style={{ marginBottom: 12 }}>ABOUT</div>
        <Link to="/whats-new" style={{ textDecoration: 'none' }}>
          <SettingsRow
            label="CHANGELOG"
            description="View all version updates"
            right={<span style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '1px' }}>v{APP_VERSION} →</span>}
          />
        </Link>
      </div>

      {/* Logout */}
      <div>
        <SettingsRow
          label="LOG OUT"
          onClick={logout}
          right={<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>→</span>}
          style={{ color: 'var(--accent-red)' }}
        />
      </div>
    </div>
  );
}
