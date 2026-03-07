import { APP_VERSION } from '../version';
import { CHANGELOG } from '../changelog';
import { VersionList } from '../components/WhatsNew';

export function WhatsNewPage() {
  return (
    <div className="page" style={{ paddingTop: 20 }}>
      <div className="nerv-divider" style={{ marginBottom: 16 }}>
        <span style={{ color: 'var(--accent-primary)', textShadow: 'var(--glow-primary-text)' }}>
          CHANGELOG
        </span>
      </div>
      <div style={{
        fontFamily: 'var(--font-data)',
        fontSize: 24,
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
        marginBottom: 24,
      }}>
        v{APP_VERSION}
      </div>

      <VersionList versions={CHANGELOG} />
    </div>
  );
}
