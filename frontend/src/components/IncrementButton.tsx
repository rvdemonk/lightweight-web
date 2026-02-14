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
        style={{ minWidth: 44, minHeight: 44, padding: 0, fontSize: 18 }}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        -{step}
      </button>
      <div style={{
        flex: 1,
        textAlign: 'center',
        fontFamily: 'var(--font-data)',
        fontSize: 16,
      }}>
        <div className="label">{label}</div>
        <div style={{ fontWeight: 700 }}>{value}</div>
      </div>
      <button
        className="btn btn-secondary"
        style={{ minWidth: 44, minHeight: 44, padding: 0, fontSize: 18 }}
        onClick={() => onChange(value + step)}
      >
        +{step}
      </button>
    </div>
  );
}
