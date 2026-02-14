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
        className="btn btn-ghost"
        style={{ fontSize: 12, letterSpacing: '0.5px' }}
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
        background: 'rgba(7, 7, 13, 0.85)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setText(value);
          setOpen(false);
        }
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-active)',
        boxShadow: 'var(--glow-amber-soft)',
        padding: 24,
      }}>
        <div style={{
          fontSize: 10,
          color: 'var(--accent-amber)',
          letterSpacing: '2px',
          marginBottom: 16,
          textShadow: 'var(--glow-amber-text)',
          opacity: 0.7,
          textTransform: 'uppercase',
        }}>
          {exerciseName} NOTE
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={6}
          style={{
            width: '100%',
            resize: 'vertical',
            marginBottom: 20,
            fontSize: 14,
            border: 'none',
            background: 'var(--bg-primary)',
            padding: 14,
          }}
          autoFocus
          placeholder="Add a note..."
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            style={{ flex: 1, fontSize: 13, minHeight: 44 }}
            onClick={() => { onSave(text); setOpen(false); }}
          >
            Save
          </button>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, fontSize: 13, minHeight: 44 }}
            onClick={() => { setText(value); setOpen(false); }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
