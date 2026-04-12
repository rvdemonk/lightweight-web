import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Session, WorkoutSet, TemplateExercise, ExercisePRData } from '../api/types';
import { Timer } from '../components/Timer';
import { ExerciseCard } from '../components/ExerciseCard';
import { ExercisePicker } from '../components/ExercisePicker';
import { WorkoutProgressBar } from '../components/WorkoutProgressBar';

export function ActiveWorkoutPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [previousData, setPreviousData] = useState<Record<number, WorkoutSet[]>>({});
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);
  const [prData, setPrData] = useState<Record<number, ExercisePRData>>({});

  const fetchSession = useCallback(async () => {
    try {
      const active = await api.getActiveSession();
      if (!active) {
        navigate('/');
        return;
      }
      setSession(active);

      // Fetch PR data for this session
      try {
        const prs = await api.sessionPRs(active.id);
        const prMap: Record<number, ExercisePRData> = {};
        for (const pr of prs) {
          prMap[pr.exercise_id] = pr;
        }
        setPrData(prMap);
      } catch {
        // PR data is non-critical — silently ignore failures
      }

      if (active.template_id) {
        // Template: fetch previous data from last run of this template
        const prev = await api.templatePrevious(active.template_id);
        if (prev) {
          const map: Record<number, WorkoutSet[]> = {};
          for (const ex of prev.exercises) {
            map[ex.exercise_id] = ex.sets;
          }
          setPreviousData(map);
        }

        const template = await api.getTemplate(active.template_id);
        setTemplateExercises(template.exercises);
      } else {
        // Freeform: fetch previous data from last time each exercise was done
        try {
          const prevSets = await api.sessionExercisePrevious(active.id);
          const map: Record<number, WorkoutSet[]> = {};
          for (const ep of prevSets) {
            map[ep.exercise_id] = ep.sets;
          }
          setPreviousData(map);
        } catch {
          // Non-critical
        }
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

  const handleLogSet = async (seId: number, weight: number | null, reps: number, rir: number | null) => {
    if (!session) return;
    await api.addSet(session.id, seId, { weight_kg: weight, reps, rir });
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
    try {
      await api.updateSession(session.id, { status: 'completed' });
    } catch {
      // Empty sessions are auto-deleted server-side — 404 is expected
    }
    navigate('/');
  };

  if (loading || !session) {
    return <div className="page empty">Loading...</div>;
  }

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      {/* Sticky header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'var(--bg-primary)',
        paddingTop: 16,
        paddingBottom: 12,
        marginTop: -16,
        marginLeft: -16,
        marginRight: -16,
        paddingLeft: 16,
        paddingRight: 16,
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {session.template_name || session.name || 'Freeform'}
            </div>
          </div>
          <span style={{ fontSize: 20 }}>
            <Timer
              startedAt={session.started_at}
              pausedDuration={session.paused_duration}
              isPaused={session.status === 'paused'}
            />
          </span>
        </div>

        {/* Workout progress bar */}
        {(() => {
          const totalTarget = templateExercises.reduce((sum, te) => sum + (te.target_sets ?? 0), 0);
          const totalDone = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
          return totalTarget > 0 ? (
            <div style={{ marginBottom: 12 }}>
              <WorkoutProgressBar completedSets={totalDone} targetSets={totalTarget} />
            </div>
          ) : null;
        })()}

        <div style={{ display: 'flex', gap: 8 }}>
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
      </div>

      <div style={{ height: 16 }} />

      {/* Exercise cards */}
      {session.exercises.map((exercise, idx) => {
        const te = templateExercises.find(t => t.exercise_id === exercise.exercise_id);
        return (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            expanded={idx === expandedIdx}
            onToggle={() => setExpandedIdx(idx === expandedIdx ? -1 : idx)}
            onLogSet={(w, r, rir) => handleLogSet(exercise.id, w, r, rir)}
            onDeleteSet={handleDeleteSet}
            onUpdateNote={(note) => handleUpdateNote(exercise.id, note)}
            previousSets={previousData[exercise.exercise_id] || []}
            templateExercise={te}
            prData={prData[exercise.exercise_id]}
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
