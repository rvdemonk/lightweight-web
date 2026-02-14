import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Session, WorkoutSet, TemplateExercise } from '../api/types';
import { Timer } from '../components/Timer';
import { ExerciseCard } from '../components/ExerciseCard';
import { ExercisePicker } from '../components/ExercisePicker';

export function ActiveWorkoutPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [previousData, setPreviousData] = useState<Record<number, WorkoutSet[]>>({});
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);

  const fetchSession = useCallback(async () => {
    try {
      const active = await api.getActiveSession();
      if (!active) {
        navigate('/');
        return;
      }
      setSession(active);

      // Fetch previous data if template-based
      if (active.template_id) {
        const prev = await api.templatePrevious(active.template_id);
        if (prev) {
          const map: Record<number, WorkoutSet[]> = {};
          for (const ex of prev.exercises) {
            map[ex.exercise_id] = ex.sets;
          }
          setPreviousData(map);
        }

        // Get template exercise targets
        const template = await api.getTemplate(active.template_id);
        setTemplateExercises(template.exercises);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleLogSet = async (seId: number, weight: number | null, reps: number) => {
    if (!session) return;
    await api.addSet(session.id, seId, { weight_kg: weight, reps });
    fetchSession();
  };

  const handleDeleteSet = async (setId: number) => {
    await api.deleteSet(setId);
    fetchSession();
  };

  const handleUpdateNote = async (seId: number, note: string) => {
    if (!session) return;
    await api.updateSessionExercise(session.id, seId, { notes: note });
    fetchSession();
  };

  const handleAddExercise = async (exercise: { id: number }) => {
    if (!session) return;
    await api.addSessionExercise(session.id, { exercise_id: exercise.id });
    setShowPicker(false);
    fetchSession();
  };

  const handlePause = async () => {
    if (!session) return;
    const newStatus = session.status === 'paused' ? 'active' : 'paused';
    await api.updateSession(session.id, { status: newStatus });
    fetchSession();
  };

  const handleEnd = async () => {
    if (!session) return;
    if (!confirm('End this workout?')) return;
    await api.updateSession(session.id, { status: 'completed' });
    navigate('/');
  };

  if (loading || !session) {
    return <div className="page empty">Loading...</div>;
  }

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
      }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            {session.template_name || session.name || 'Freeform'}
          </div>
        </div>
        <Timer
          startedAt={session.started_at}
          pausedDuration={session.paused_duration}
          isPaused={session.status === 'paused'}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          className="btn btn-secondary"
          style={{ flex: 1 }}
          onClick={handlePause}
        >
          {session.status === 'paused' ? 'Resume' : 'Pause'}
        </button>
        <button
          className="btn btn-danger"
          style={{ flex: 1 }}
          onClick={handleEnd}
        >
          End Workout
        </button>
      </div>

      {/* Exercise cards */}
      {session.exercises.map((exercise, idx) => {
        const te = templateExercises.find(t => t.exercise_id === exercise.exercise_id);
        return (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            expanded={idx === expandedIdx}
            onToggle={() => setExpandedIdx(idx)}
            onLogSet={(w, r) => handleLogSet(exercise.id, w, r)}
            onDeleteSet={handleDeleteSet}
            onUpdateNote={(note) => handleUpdateNote(exercise.id, note)}
            previousSets={previousData[exercise.exercise_id] || []}
            templateExercise={te}
          />
        );
      })}

      {/* Add exercise button */}
      <button
        className="btn btn-secondary btn-full"
        onClick={() => setShowPicker(true)}
        style={{ marginTop: 8 }}
      >
        + Add Exercise
      </button>

      {showPicker && (
        <ExercisePicker
          onSelect={handleAddExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
