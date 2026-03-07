import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Exercise } from '../api/types';

const MUSCLE_GROUPS = [
  'Back', 'Biceps', 'Calves', 'Chest', 'Core', 'Forearms',
  'Glutes', 'Hamstrings', 'Neck', 'Quads', 'Shoulders', 'Triceps', 'Other',
];

const EQUIPMENT = [
  'Barbell', 'Bodyweight', 'Cable', 'Dumbbells', 'Kettlebell', 'Machine', 'Band', 'Other',
];

interface ExercisePickerProps {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
  excludeIds?: number[];
}

export function ExercisePicker({ onSelect, onClose, excludeIds = [] }: ExercisePickerProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.listExercises().then(setExercises);
  }, []);

  const filtered = exercises
    .filter(e => !excludeIds.includes(e.id))
    .filter(e =>
      e.name.toLowerCase().includes(filter.toLowerCase()) ||
      (e.muscle_group && e.muscle_group.toLowerCase().includes(filter.toLowerCase()))
    );

  const trimmedFilter = filter.trim();
  const exactMatch = exercises.some(e => e.name.toLowerCase() === trimmedFilter.toLowerCase());
  const canCreate = trimmedFilter.length > 0 && !exactMatch;

  const handleCreate = async () => {
    if (!trimmedFilter || creating) return;
    setCreating(true);
    try {
      const created = await api.createExercise({
        name: trimmedFilter,
        muscle_group: muscleGroup || undefined,
        equipment: equipment || undefined,
      });
      onSelect(created);
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--bg-primary)',
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
          placeholder="Search or create exercise..."
          value={filter}
          onChange={e => {
            setFilter(e.target.value);
            setShowCreate(false);
          }}
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
        {filtered.length === 0 && !canCreate && (
          <div className="empty">No exercises found</div>
        )}

        {canCreate && (
          <div style={{ marginTop: 4 }}>
            {!showCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 16px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--accent-amber)',
                  borderRadius: 4,
                  minHeight: 44,
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>
                  + CREATE:
                </span>{' '}
                <span style={{ fontWeight: 600 }}>{trimmedFilter}</span>
              </button>
            ) : (
              <div style={{
                padding: '14px 16px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--accent-amber)',
                borderRadius: 4,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 12 }}>
                  <span style={{ color: 'var(--accent-amber)' }}>NEW:</span>{' '}
                  {trimmedFilter}
                </div>
                <select
                  value={muscleGroup}
                  onChange={e => setMuscleGroup(e.target.value)}
                  style={{ width: '100%', marginBottom: 8 }}
                >
                  <option value="">Muscle group</option>
                  {MUSCLE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <select
                  value={equipment}
                  onChange={e => setEquipment(e.target.value)}
                  style={{ width: '100%', marginBottom: 12 }}
                >
                  <option value="">Equipment</option>
                  {EQUIPMENT.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <button
                  className="btn btn-primary btn-full"
                  onClick={handleCreate}
                  disabled={creating}
                  style={{ opacity: creating ? 0.5 : 1 }}
                >
                  Create & Add
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
