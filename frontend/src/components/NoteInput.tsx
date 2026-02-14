import { useState } from 'react';

interface NoteInputProps {
  value: string;
  onSave: (note: string) => void;
}

export function NoteInput({ value, onSave }: NoteInputProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value);

  if (!open) {
    return (
      <button
        className="btn btn-ghost"
        style={{ fontSize: 13 }}
        onClick={() => setOpen(true)}
      >
        {value ? 'Edit Note' : 'Note'}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 8 }}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={2}
        style={{ width: '100%', resize: 'vertical' }}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12, minHeight: 32, padding: '4px 12px' }}
          onClick={() => { onSave(text); setOpen(false); }}
        >
          Save
        </button>
        <button
          className="btn btn-ghost"
          style={{ fontSize: 12, minHeight: 32 }}
          onClick={() => { setText(value); setOpen(false); }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
