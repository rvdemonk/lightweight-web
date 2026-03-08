interface IncrementButtonProps {
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  label: string;
  min?: number;
  muted?: boolean;
  nullable?: boolean;
}

export function IncrementButton({ value, onChange, step, label, min = 0, muted = false, nullable = false }: IncrementButtonProps) {
  const handleDecrement = () => {
    if (value === null) return;
    const next = value - step;
    if (nullable && next < min) {
      onChange(null);
    } else {
      onChange(Math.max(min, next));
    }
  };

  const handleIncrement = () => {
    if (value === null) {
      onChange(min);
    } else {
      onChange(value + step);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <button
        className="btn btn-secondary"
        style={{ minWidth: 44, minHeight: 44, padding: 0, fontSize: 18, background: 'transparent' }}
        onClick={handleDecrement}
      >
        −
      </button>
      <div style={{
        flex: 1,
        textAlign: 'center',
        fontFamily: 'var(--font-data)',
        padding: '8px 0',
      }}>
        <div style={{
          fontSize: 10,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: 2,
        }}>
          {label}
        </div>
        <div style={{
          fontWeight: 700,
          color: muted ? 'var(--text-secondary)' : 'var(--accent-primary)',
          textShadow: muted ? 'none' : 'var(--glow-primary-text)',
          fontSize: 20,
        }}>
          {value === null ? '—' : value}
        </div>
      </div>
      <button
        className="btn btn-secondary"
        style={{ minWidth: 44, minHeight: 44, padding: 0, fontSize: 18, background: 'transparent' }}
        onClick={handleIncrement}
      >
        +
      </button>
    </div>
  );
}
