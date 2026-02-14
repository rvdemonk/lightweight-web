import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Exercise } from '../api/types';

interface ExercisePickerProps {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

export function ExercisePicker({ onSelect, onClose }: ExercisePickerProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.listExercises().then(setExercises);
  }, []);

  const filtered = exercises.filter(e =>
    e.name.toLowerCase().includes(filter.toLowerCase()) ||
    (e.muscle_group && e.muscle_group.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        padding: 16,
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Search exercises..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ flex: 1 }}
          autoFocus
        />
        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {filtered.map(exercise => (
          <button
            key={exercise.id}
            onClick={() => onSelect(exercise)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 4,
              marginBottom: 8,
              minHeight: 44,
            }}
          >
            <div style={{ fontWeight: 600 }}>{exercise.name}</div>
            {exercise.muscle_group && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {exercise.muscle_group}
                {exercise.equipment && ` · ${exercise.equipment}`}
              </div>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="empty">No exercises found</div>
        )}
      </div>
    </div>
  );
}
