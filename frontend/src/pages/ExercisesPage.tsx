import { useState } from 'react';
import { api } from '../api/client';
import type { Exercise } from '../api/types';
import { useApi } from '../hooks/useApi';

const MUSCLE_GROUPS = [
  'Back', 'Biceps', 'Calves', 'Chest', 'Core', 'Forearms',
  'Glutes', 'Hamstrings', 'Neck', 'Quads', 'Shoulders', 'Triceps', 'Other',
];

const EQUIPMENT = [
  'Barbell', 'Bodyweight', 'Cable', 'Dumbbells', 'Kettlebell', 'Machine', 'Band', 'Other',
];

export function ExercisesPage() {
  const { data: exercises, refetch } = useApi(() => api.listExercises(), []);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.createExercise({
      name: name.trim(),
      muscle_group: muscleGroup || undefined,
      equipment: equipment || undefined,
    });
    setName('');
    setMuscleGroup('');
    setEquipment('');
    setShowForm(false);
    refetch();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Archive this exercise?')) return;
    await api.deleteExercise(id);
    refetch();
  };

  // Group by muscle group
  const grouped: Record<string, Exercise[]> = {};
  if (exercises) {
    for (const ex of exercises) {
      const group = ex.muscle_group || 'Other';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(ex);
    }
  }

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <button
          className="btn btn-primary btn-full"
          style={{ fontSize: 13, minHeight: 44 }}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Exercise'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card" style={{ marginBottom: 16 }}>
          <input
            placeholder="Exercise name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
            autoFocus
          />
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
            style={{ width: '100%', marginBottom: 8 }}
          >
            <option value="">Equipment</option>
            {EQUIPMENT.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <button type="submit" className="btn btn-primary btn-full">
            Add Exercise
          </button>
        </form>
      )}

      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([group, exs]) => (
          <div key={group} style={{ marginBottom: 20 }}>
            <div className="label" style={{ marginBottom: 8 }}>{group}</div>
            {exs.map(ex => {
              const expanded = expandedId === ex.id;
              return (
                <div
                  key={ex.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    borderColor: expanded ? 'var(--border-active)' : undefined,
                  }}
                  onClick={() => setExpandedId(expanded ? null : ex.id)}
                >
                  <div style={{ fontWeight: 400 }}>{ex.name}</div>

                  {expanded && (
                    <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
                      {ex.equipment && (
                        <div style={{
                          fontSize: 14,
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          marginBottom: 4,
                        }}>
                          {ex.equipment}
                        </div>
                      )}
                      <div style={{
                        fontSize: 14,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: 16,
                      }}>
                        {group}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-danger"
                          style={{
                            fontSize: 12,
                            padding: '6px 16px',
                            minHeight: 36,
                          }}
                          onClick={() => handleDelete(ex.id)}
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

      {exercises && exercises.length === 0 && (
        <div className="empty">No exercises yet. Add one above.</div>
      )}
    </div>
  );
}
