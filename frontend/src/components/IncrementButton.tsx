interface IncrementButtonProps {
  value: number;
  onChange: (v: number) => void;
  step: number;
  label: string;
  min?: number;
}

export function IncrementButton({ value, onChange, step, label, min = 0 }: IncrementButtonProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <button
        className="btn btn-secondary"
        style={{ minWidth: 44, minHeight: 44, padding: 0, fontSize: 14 }}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        -{step}
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
          color: 'var(--accent-amber)',
          textShadow: 'var(--glow-amber-text)',
          fontSize: 20,
        }}>
          {value}
        </div>
      </div>
      <button
        className="btn btn-secondary"
        style={{ minWidth: 44, minHeight: 44, padding: 0, fontSize: 14 }}
        onClick={() => onChange(value + step)}
      >
        +{step}
      </button>
    </div>
  );
}
