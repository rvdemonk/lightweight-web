import { useState, useRef, useEffect } from 'react';

interface IncrementButtonProps {
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  label: string;
  min?: number;
  muted?: boolean;
  nullable?: boolean;
  decimal?: boolean;
}

export function IncrementButton({ value, onChange, step, label, min = 0, muted = false, nullable = false, decimal = false }: IncrementButtonProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

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

  const startEditing = () => {
    if (value === null && !nullable) return;
    setEditValue(value === null ? '' : String(value));
    setEditing(true);
  };

  const commitEdit = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed === '' && nullable) {
      onChange(null);
      return;
    }
    const parsed = decimal ? parseFloat(trimmed) : parseInt(trimmed, 10);
    if (isNaN(parsed)) return; // revert — don't call onChange
    onChange(Math.max(min, parsed));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  const valueColor = muted ? 'var(--text-secondary)' : 'var(--accent-primary)';

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
        <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              inputMode={decimal ? 'decimal' : 'numeric'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleKeyDown}
              style={{
                fontWeight: 700,
                color: valueColor,
                textShadow: muted ? 'none' : 'var(--glow-primary-text)',
                fontSize: 20,
                fontFamily: 'inherit',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                textAlign: 'center',
                width: '100%',
                padding: 0,
                margin: 0,
                height: 24,
                lineHeight: '24px',
              }}
            />
          ) : (
            <div
              onClick={startEditing}
              style={{
                fontWeight: 700,
                color: valueColor,
                textShadow: muted ? 'none' : 'var(--glow-primary-text)',
                fontSize: 20,
                lineHeight: '24px',
                cursor: 'text',
              }}
            >
              {value === null ? '—' : value}
            </div>
          )}
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
