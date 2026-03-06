export function AnalyticsPage() {
  return (
    <div className="page" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100dvh - 48px)',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 2,
        padding: '20px 40px',
        textAlign: 'center',
        fontFamily: 'var(--font-data)',
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: 3,
        textTransform: 'uppercase',
        color: 'var(--accent-primary)',
      }}>
        COMING SOON
      </div>
    </div>
  );
}
