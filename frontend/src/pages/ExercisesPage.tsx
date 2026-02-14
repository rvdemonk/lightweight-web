import { useState } from 'react';
import { api } from '../api/client';
import type { Exercise } from '../api/types';
import { useApi } from '../hooks/useApi';

export function ExercisesPage() {
  const { data: exercises, refetch } = useApi(() => api.listExercises(), []);
  const [showForm, setShowForm] = useState(false);
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Exercises</h1>
        <button
          className="btn btn-primary"
          style={{ fontSize: 13, minHeight: 36, padding: '6px 16px' }}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New'}
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
          <input
            placeholder="Muscle group"
            value={muscleGroup}
            onChange={e => setMuscleGroup(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
          />
          <input
            placeholder="Equipment"
            value={equipment}
            onChange={e => setEquipment(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
          />
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
            {exs.map(ex => (
              <div key={ex.id} className="card" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{ex.name}</div>
                  {ex.equipment && (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {ex.equipment}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12, color: 'var(--accent-red)' }}
                  onClick={() => handleDelete(ex.id)}
                >
                  Archive
                </button>
              </div>
            ))}
          </div>
        ))}

      {exercises && exercises.length === 0 && (
        <div className="empty">No exercises yet. Add one above.</div>
      )}
    </div>
  );
}
