import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Exercise, Template } from '../api/types';
import { useApi } from '../hooks/useApi';

interface TemplateExerciseInput {
  exercise_id: number;
  exercise_name: string;
  position: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
}

export function TemplatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<TemplateExerciseInput[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.listExercises().then(setAllExercises);
  }, []);

  useEffect(() => {
    if (!isNew && id) {
      api.getTemplate(Number(id)).then(t => {
        setName(t.name);
        setExercises(t.exercises.map(e => ({
          exercise_id: e.exercise_id,
          exercise_name: e.exercise_name,
          position: e.position,
          target_sets: e.target_sets || 3,
          target_reps_min: e.target_reps_min || 8,
          target_reps_max: e.target_reps_max || 12,
        })));
      });
    }
  }, [id]);

  const addExercise = (ex: Exercise) => {
    setExercises([...exercises, {
      exercise_id: ex.id,
      exercise_name: ex.name,
      position: exercises.length + 1,
      target_sets: 3,
      target_reps_min: 8,
      target_reps_max: 12,
    }]);
  };

  const removeExercise = (idx: number) => {
    const next = exercises.filter((_, i) => i !== idx);
    setExercises(next.map((e, i) => ({ ...e, position: i + 1 })));
  };

  const handleArchive = async () => {
    if (!confirm('Archive this workout? It won\'t appear in your list but historical data is kept.')) return;
    await api.deleteTemplate(Number(id));
    navigate('/templates');
  };

  const handleSave = async () => {
    if (!name.trim() || exercises.length === 0) return;
    setSaving(true);

    const data = {
      name: name.trim(),
      exercises: exercises.map(e => ({
        exercise_id: e.exercise_id,
        position: e.position,
        target_sets: e.target_sets,
        target_reps_min: e.target_reps_min,
        target_reps_max: e.target_reps_max,
      })),
    };

    try {
      if (isNew) {
        await api.createTemplate(data);
      } else {
        await api.updateTemplate(Number(id), data);
      }
      navigate('/templates');
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>
          {isNew ? 'New Workout' : 'Edit Workout'}
        </h1>
        {!isNew && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: 13, color: 'var(--accent-red)' }}
            onClick={handleArchive}
          >
            Archive
          </button>
        )}
      </div>

      <input
        placeholder="Template name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={{ width: '100%', marginBottom: 16 }}
      />

      <div className="label" style={{ marginBottom: 8 }}>Exercises</div>

      {exercises.map((ex, idx) => (
        <div key={idx} className="card" style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
        }}>
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-data)', fontSize: 12, width: 20 }}>
            {ex.position}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.exercise_name}</div>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <input
                type="number"
                value={ex.target_sets}
                onChange={e => {
                  const next = [...exercises];
                  next[idx] = { ...next[idx], target_sets: Number(e.target.value) };
                  setExercises(next);
                }}
                style={{ width: 50, padding: '4px 6px', fontSize: 13, textAlign: 'center' }}
              />
              <span style={{ color: 'var(--text-secondary)', alignSelf: 'center' }}>×</span>
              <input
                type="number"
                value={ex.target_reps_min}
                onChange={e => {
                  const next = [...exercises];
                  next[idx] = { ...next[idx], target_reps_min: Number(e.target.value) };
                  setExercises(next);
                }}
                style={{ width: 50, padding: '4px 6px', fontSize: 13, textAlign: 'center' }}
              />
              <span style={{ color: 'var(--text-secondary)', alignSelf: 'center' }}>-</span>
              <input
                type="number"
                value={ex.target_reps_max}
                onChange={e => {
                  const next = [...exercises];
                  next[idx] = { ...next[idx], target_reps_max: Number(e.target.value) };
                  setExercises(next);
                }}
                style={{ width: 50, padding: '4px 6px', fontSize: 13, textAlign: 'center' }}
              />
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ color: 'var(--accent-red)', fontSize: 18, padding: 4, minHeight: 32 }}
            onClick={() => removeExercise(idx)}
          >
            ×
          </button>
        </div>
      ))}

      {/* Add exercise dropdown */}
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <select
          style={{ width: '100%' }}
          value=""
          onChange={e => {
            const ex = allExercises.find(x => x.id === Number(e.target.value));
            if (ex) addExercise(ex);
          }}
        >
          <option value="">+ Add exercise...</option>
          {allExercises
            .filter(ex => !exercises.some(e => e.exercise_id === ex.id))
            .map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
        </select>
      </div>

      <button
        className="btn btn-primary btn-full"
        onClick={handleSave}
        disabled={saving || !name.trim() || exercises.length === 0}
        style={{ opacity: saving ? 0.5 : 1 }}
      >
        {isNew ? 'Create Workout' : 'Save Changes'}
      </button>
    </div>
  );
}
