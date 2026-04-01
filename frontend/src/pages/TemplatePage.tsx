import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Exercise, Template, TemplateSnapshot } from '../api/types';
import { useApi } from '../hooks/useApi';
import { ExercisePicker } from '../components/ExercisePicker';

interface TemplateExerciseInput {
  exercise_id: number;
  exercise_name: string;
  position: number;
  target_sets: number;
  target_reps_min: number;
  target_reps_max: number;
}

interface SnapshotExercise {
  exercise_name: string;
  position: number;
  target_sets: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
}

export function TemplatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [name, setName] = useState('');
  const [version, setVersion] = useState(1);
  const [exercises, setExercises] = useState<TemplateExerciseInput[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  const { data: versions, refetch: refetchVersions } = useApi<TemplateSnapshot[]>(
    () => !isNew && id ? api.listTemplateVersions(Number(id)) : Promise.resolve([]),
    [id],
  );

  useEffect(() => {
    if (!isNew && id) {
      api.getTemplate(Number(id)).then(t => {
        setName(t.name);
        setVersion(t.version);
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
        <h1 style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase' as const }}>
          {isNew ? 'New Workout' : 'Edit Workout'}
          {!isNew && (
            <span style={{
              fontSize: 12,
              fontFamily: 'var(--font-data)',
              color: 'var(--text-secondary)',
              marginLeft: 8,
              fontWeight: 400,
            }}>
              v{version}
            </span>
          )}
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
        <div key={idx} className="card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-data)', fontSize: 12 }}>
                {ex.position}
              </span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{ex.exercise_name}</span>
            </div>
            <button
              className="btn btn-ghost"
              style={{ color: 'var(--accent-red)', fontSize: 18, padding: 4, minHeight: 32 }}
              onClick={() => removeExercise(idx)}
            >
              ×
            </button>
          </div>
          {[
            { label: 'SETS', field: 'target_sets' as const, min: 1, max: 20 },
            { label: 'MIN REPS', field: 'target_reps_min' as const, min: 1, max: 100 },
            { label: 'MAX REPS', field: 'target_reps_max' as const, min: 1, max: 100 },
          ].map(({ label, field, min, max }) => (
            <div key={field} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 0',
            }}>
              <span className="label" style={{ fontSize: 11, margin: 0, letterSpacing: '0.05em' }}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  style={{
                    width: 36, height: 36, padding: 0,
                    fontSize: 18, fontFamily: 'var(--font-data)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 36,
                  }}
                  onClick={() => {
                    const next = [...exercises];
                    next[idx] = { ...next[idx], [field]: Math.max(min, ex[field] - 1) };
                    setExercises(next);
                  }}
                >−</button>
                <input
                  type="number"
                  value={ex[field]}
                  onChange={e => {
                    const val = Math.max(min, Math.min(max, Number(e.target.value) || min));
                    const next = [...exercises];
                    next[idx] = { ...next[idx], [field]: val };
                    setExercises(next);
                  }}
                  style={{
                    width: 48, padding: '6px 4px', fontSize: 15,
                    textAlign: 'center', fontFamily: 'var(--font-data)',
                  }}
                />
                <button
                  className="btn btn-ghost"
                  style={{
                    width: 36, height: 36, padding: 0,
                    fontSize: 18, fontFamily: 'var(--font-data)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: 36,
                  }}
                  onClick={() => {
                    const next = [...exercises];
                    next[idx] = { ...next[idx], [field]: Math.min(max, ex[field] + 1) };
                    setExercises(next);
                  }}
                >+</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <button
          className="btn btn-full"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            minHeight: 44,
            fontSize: 14,
          }}
          onClick={() => setShowPicker(true)}
        >
          + Add exercise...
        </button>
      </div>

      {showPicker && (
        <ExercisePicker
          excludeIds={exercises.map(e => e.exercise_id)}
          onSelect={ex => {
            addExercise(ex);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}

      <button
        className="btn btn-primary btn-full"
        onClick={handleSave}
        disabled={saving || !name.trim() || exercises.length === 0}
        style={{ opacity: saving ? 0.5 : 1 }}
      >
        {isNew ? 'Create Workout' : 'Save Changes'}
      </button>

      {!isNew && versions && versions.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="label" style={{ marginBottom: 8 }}>Version History</div>
          {versions.map(snap => {
            const isExpanded = expandedVersion === snap.version;
            let parsed: { name?: string; exercises?: SnapshotExercise[] } | null = null;
            if (isExpanded) {
              try { parsed = JSON.parse(snap.snapshot_json); } catch { /* ignore */ }
            }
            return (
              <div
                key={snap.version}
                className="card"
                style={{ padding: '10px 14px', cursor: 'pointer' }}
                onClick={() => setExpandedVersion(isExpanded ? null : snap.version)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 13 }}>
                    v{snap.version}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-data)' }}>
                    {snap.created_at.slice(0, 10)}
                  </span>
                </div>
                {isExpanded && parsed?.exercises && (
                  <div style={{ marginTop: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                    {parsed.exercises.map((ex, i) => (
                      <div key={i} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        fontSize: 13,
                      }}>
                        <span>{ex.exercise_name}</span>
                        <span style={{ fontFamily: 'var(--font-data)', color: 'var(--text-secondary)', fontSize: 12 }}>
                          {ex.target_sets ?? '?'}×{ex.target_reps_min ?? '?'}-{ex.target_reps_max ?? '?'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
