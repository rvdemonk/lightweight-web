import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { E1rmChart } from '../components/E1rmChart';
import type { ExerciseE1rm, ExercisePRs } from '../api/types';

export function AnalyticsPage() {
  const { data: heatmapData, loading: heatmapLoading } = useApi(() => api.activityHeatmap(), []);
  const { data: exercises } = useApi(() => api.analyticsExercises(), []);

  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [e1rmData, setE1rmData] = useState<ExerciseE1rm | null>(null);
  const [e1rmLoading, setE1rmLoading] = useState(false);
  const autoSelected = useRef(false);

  useEffect(() => {
    if (exercises && exercises.length > 0 && !autoSelected.current) {
      autoSelected.current = true;
      loadExercise(exercises[0].id);
    }
  }, [exercises]);

  const loadExercise = async (id: number) => {
    setSelectedExerciseId(id);
    setE1rmLoading(true);
    try {
      const data = await api.e1rmProgression(id);
      setE1rmData(data);
    } catch {
      setE1rmData(null);
    } finally {
      setE1rmLoading(false);
    }
  };

  // Compute delta: current (rolling best) vs 30 days ago
  const computeDelta = (data: ExerciseE1rm) => {
    if (data.data.length < 2) return null;
    const latest = data.data[data.data.length - 1];
    const cutoff = new Date(latest.date);
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const older = data.data.filter(d => d.date <= cutoffStr);
    if (older.length === 0) return null;
    const oldBest = Math.max(...older.map(d => d.e1rm));
    const diff = latest.e1rm - oldBest;
    return { diff: Math.round(diff * 10) / 10, pct: ((diff / oldBest) * 100).toFixed(1) };
  };

  const sectionTitle = {
    fontFamily: 'var(--font-data)',
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    color: 'var(--text-primary)',
  };

  const delta = e1rmData ? computeDelta(e1rmData) : null;

  return (
    <div className="page">
      {/* Activity Heatmap */}
      <div style={{ ...sectionTitle, marginBottom: 12 }}>ACTIVITY</div>

      {heatmapLoading && (
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--text-secondary)' }}>
          LOADING...
        </div>
      )}

      {heatmapData && (
        <div className="card">
          <ActivityHeatmap data={heatmapData} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 6,
            marginTop: 8,
            fontFamily: 'var(--font-data)',
            fontSize: 9,
            color: 'var(--text-secondary)',
          }}>
            <span>LESS</span>
            {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  width: 11,
                  height: 11,
                  borderRadius: 1,
                  background: intensity > 0
                    ? `color-mix(in srgb, var(--accent-primary) ${Math.round(intensity * 100)}%, var(--bg-elevated))`
                    : 'var(--bg-elevated)',
                  border: '1px solid var(--bg-primary)',
                }}
              />
            ))}
            <span>MORE</span>
          </div>
        </div>
      )}

      {/* e1RM Section */}
      <div style={{ ...sectionTitle, marginTop: 24, marginBottom: 12 }}>ESTIMATED 1RM</div>

      {exercises && exercises.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <select
            value={selectedExerciseId ?? ''}
            onChange={e => {
              const val = e.target.value;
              if (val) loadExercise(Number(val));
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 2,
              fontFamily: 'var(--font-data)',
              fontSize: 13,
              appearance: 'none',
              cursor: 'pointer',
            }}
          >
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.name.toUpperCase()}{ex.muscle_group ? ` — ${ex.muscle_group.toUpperCase()}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {exercises && exercises.length === 0 && (
        <div className="card" style={{
          fontFamily: 'var(--font-data)', fontSize: 12,
          color: 'var(--text-secondary)', textAlign: 'center',
        }}>
          NO EXERCISE DATA YET
        </div>
      )}

      {e1rmLoading && (
        <div style={{ fontFamily: 'var(--font-data)', fontSize: 12, color: 'var(--text-secondary)' }}>
          LOADING...
        </div>
      )}

      {e1rmData && !e1rmLoading && (
        <>
          {/* Chart */}
          <div className="card">
            <E1rmChart data={e1rmData.data} exerciseName={e1rmData.exercise_name} />
          </div>

          {/* PR Cards below chart */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 8,
            marginTop: 8,
          }}>
            <PRCard
              label="EST. 1RM"
              value={e1rmData.prs.best_e1rm ? `${Math.round(e1rmData.prs.best_e1rm.value)}` : '—'}
              unit="KG"
              detail={e1rmData.prs.best_e1rm?.detail ?? ''}
              date={e1rmData.prs.best_e1rm?.date ?? ''}
              accent="var(--accent-primary)"
              delta={delta}
            />
            <PRCard
              label="HEAVIEST"
              value={e1rmData.prs.heaviest_weight ? `${Math.round(e1rmData.prs.heaviest_weight.value)}` : '—'}
              unit="KG"
              detail={e1rmData.prs.heaviest_weight?.detail ?? ''}
              date={e1rmData.prs.heaviest_weight?.date ?? ''}
              accent="var(--accent-cyan)"
            />
            <PRCard
              label="MOST REPS"
              value={e1rmData.prs.most_reps ? `${Math.round(e1rmData.prs.most_reps.value)}` : '—'}
              unit="REPS"
              detail={e1rmData.prs.most_reps?.detail ?? ''}
              date={e1rmData.prs.most_reps?.date ?? ''}
              accent="var(--accent-cyan)"
            />
          </div>
        </>
      )}
    </div>
  );
}

function PRCard({ label, value, unit, detail, date, accent, delta }: {
  label: string;
  value: string;
  unit: string;
  detail: string;
  date: string;
  accent: string;
  delta?: { diff: number; pct: string } | null;
}) {
  // dd/mm format
  const formattedDate = date ? (() => {
    const d = new Date(date);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  })() : '';

  // Strip .0 from weights in detail (e.g. "60.0kg x 9" -> "60kg x 9")
  const cleanDetail = detail.replace(/\.0kg/g, 'kg');

  return (
    <div className="card" style={{ padding: 12, marginBottom: 0, aspectRatio: '1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{
        fontFamily: 'var(--font-data)',
        fontSize: 9,
        letterSpacing: 1,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-data)',
        fontSize: 24,
        fontWeight: 700,
        color: accent,
        lineHeight: 1,
        textShadow: 'var(--glow-primary-text)',
      }}>
        {value}
        <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2, color: 'var(--text-secondary)' }}>{unit}</span>
      </div>
      {delta && (
        <div style={{
          fontFamily: 'var(--font-data)',
          fontSize: 10,
          color: delta.diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
          textShadow: delta.diff >= 0 ? 'var(--glow-green-text)' : 'var(--glow-red-text)',
          marginTop: 2,
        }}>
          {delta.diff >= 0 ? '+' : ''}{delta.diff}kg
        </div>
      )}
      <div style={{
        fontFamily: 'var(--font-data)',
        fontSize: 10,
        color: 'var(--text-secondary)',
        marginTop: 4,
      }}>
        {cleanDetail}{cleanDetail && formattedDate ? ' · ' : ''}{formattedDate}
      </div>
    </div>
  );
}
