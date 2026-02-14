import { useState } from 'react';
import { api } from '../api/client';
import type { Exercise } from '../api/types';
import { useApi } from '../hooks/useApi';

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
            {exs.map(ex => {
              const expanded = expandedId === ex.id;
              return (
                <div
                  key={ex.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    background: expanded ? 'var(--bg-elevated)' : undefined,
                  }}
                  onClick={() => setExpandedId(expanded ? null : ex.id)}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div style={{ fontWeight: 600 }}>{ex.name}</div>
                    {!expanded && ex.equipment && (
                      <span style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-data)',
                      }}>
                        {ex.equipment}
                      </span>
                    )}
                  </div>

                  {expanded && (
                    <div style={{ marginTop: 10 }} onClick={e => e.stopPropagation()}>
                      {ex.equipment && (
                        <div style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          marginBottom: 4,
                        }}>
                          {ex.equipment}
                        </div>
                      )}
                      <div style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        marginBottom: 12,
                      }}>
                        {group}
                      </div>
                      <button
                        className="btn btn-ghost"
                        style={{
                          fontSize: 12,
                          color: 'var(--accent-red)',
                          textShadow: 'var(--glow-red-text)',
                          padding: '4px 0',
                        }}
                        onClick={() => handleDelete(ex.id)}
                      >
                        Archive
                      </button>
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
