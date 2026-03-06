import { useState, useEffect } from 'react';

interface NoteInputProps {
  exerciseName: string;
  value: string;
  onSave: (note: string) => void;
}

export function NoteInput({ exerciseName, value, onSave }: NoteInputProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);

  useEffect(() => { setText(value); }, [value]);

  if (!open) {
    return (
      <button
        className="btn btn-secondary btn-full"
        style={{ fontSize: 13 }}
        onClick={() => setOpen(true)}
      >
        {value ? 'EDIT NOTE' : 'NOTE'}
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-primary)',
        zIndex: 300,
        display: 'flex',
        flexDirection: 'column',
        padding: 16,
      }}
    >
      <div style={{
        fontSize: 11,
        color: 'var(--accent-primary)',
        letterSpacing: '2px',
        marginBottom: 12,
        textShadow: 'var(--glow-primary-text)',
        opacity: 0.7,
        textTransform: 'uppercase',
      }}>
        {exerciseName}
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        style={{
          flex: 1,
          width: '100%',
          resize: 'none',
          fontSize: 16,
          lineHeight: 1.5,
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
          padding: 14,
          marginBottom: 12,
        }}
        autoFocus
        placeholder="Add a note..."
      />

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, fontSize: 13, minHeight: 48 }}
          onClick={() => { onSave(text); setOpen(false); }}
        >
          SAVE
        </button>
        <button
          className="btn btn-secondary"
          style={{ flex: 1, fontSize: 13, minHeight: 48 }}
          onClick={() => { setText(value); setOpen(false); }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}
