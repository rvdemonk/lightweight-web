import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { ActivityHeatmap } from '../components/ActivityHeatmap';
import { E1rmChart } from '../components/E1rmChart';
import { VolumeChart } from '../components/VolumeChart';
import { FrequencyChart } from '../components/FrequencyChart';
import { MuscleBalanceChart } from '../components/MuscleBalanceChart';
import { E1rmSpiderChart } from '../components/E1rmSpiderChart';
import type { ExerciseE1rm } from '../api/types';

export function AnalyticsPage() {
  const { data: heatmapData, loading: heatmapLoading } = useApi(() => api.activityHeatmap(), []);
  const { data: exercises, loading: exercisesLoading } = useApi(() => api.analyticsExercises(), []);
  const { data: volumeData, loading: volumeLoading } = useApi(() => api.weeklyVolume(), []);
  const { data: frequencyData, loading: frequencyLoading } = useApi(() => api.sessionFrequency(), []);

  const pageLoading = heatmapLoading || exercisesLoading || volumeLoading || frequencyLoading;

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

  if (pageLoading) {
    return (
      <div className="page">
        <div className="page-loading">
          <div className="page-loading-lines" />
          <div style={{
            fontFamily: 'var(--font-data)',
            fontSize: 11,
            letterSpacing: 3,
            color: 'var(--text-secondary)',
          }}>
            LOADING
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Activity Heatmap */}
      <div style={{ ...sectionTitle, marginBottom: 12 }}>ACTIVITY</div>

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

      {/* Weekly Volume */}
      <div style={{ ...sectionTitle, marginTop: 24, marginBottom: 12 }}>WEEKLY VOLUME</div>

      {volumeData && (
        <div className="card">
          <VolumeChart data={volumeData} />
        </div>
      )}

      {/* Session Frequency */}
      <div style={{ ...sectionTitle, marginTop: 24, marginBottom: 12 }}>SESSION FREQUENCY</div>

      {frequencyData && (
        <div className="card">
          <FrequencyChart data={frequencyData} />
        </div>
      )}

      {/* Muscle Balance */}
      <div style={{ ...sectionTitle, marginTop: 24, marginBottom: 12 }}>MUSCLE BALANCE</div>

      {volumeData && (
        <div className="card">
          <MuscleBalanceChart data={volumeData} />
        </div>
      )}

      {/* E1RM Progression Spider */}
      <div style={{ ...sectionTitle, marginTop: 24, marginBottom: 12 }}>E1RM PROGRESSION COMPARISON</div>

      {exercises && exercises.length >= 3 && (
        <E1rmSpiderChart exercises={exercises} />
      )}

      {exercises && exercises.length > 0 && exercises.length < 3 && (
        <div className="card" style={{
          fontFamily: 'var(--font-data)', fontSize: 12,
          color: 'var(--text-secondary)', textAlign: 'center',
        }}>
          NEED 3+ EXERCISES WITH DATA
        </div>
      )}

      {/* e1RM Section */}
      <div style={{ ...sectionTitle, marginTop: 24, marginBottom: 12 }}>ESTIMATED 1RM</div>

      {exercises && exercises.length > 0 && (
        <div style={{ marginBottom: 12, position: 'relative' }}>
          <select
            value={selectedExerciseId ?? ''}
            onChange={e => {
              const val = e.target.value;
              if (val) loadExercise(Number(val));
            }}
            style={{
              width: '100%',
              padding: '10px 32px 10px 12px',
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
          {/* NERV-style angular indicator */}
          <svg
            width="14" height="14"
            viewBox="0 0 14 14"
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          >
            <path
              d="M2 4 L7 10 L12 4"
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="1.5"
              strokeLinecap="square"
            />
          </svg>
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
        <div className="card" style={{
          position: 'relative',
          overflow: 'hidden',
          minHeight: 340,
        }}>
          <div className="skeleton-shimmer" />
        </div>
      )}

      {e1rmData && !e1rmLoading && (
        <>
          <div className="card">
            <E1rmChart data={e1rmData.data} exerciseName={e1rmData.exercise_name} />
          </div>
          <PRCards e1rmData={e1rmData} delta={delta} />
        </>
      )}
    </div>
  );
}

interface PRCardData {
  label: string;
  value: string;
  unit: string;
  detail: string;
  date: string;
  accent: string;
  delta?: { diff: number; pct: string } | null;
}

function PRCards({ e1rmData, delta }: { e1rmData: ExerciseE1rm; delta: { diff: number; pct: string } | null }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const cards: PRCardData[] = [
    {
      label: 'EST. 1RM',
      value: e1rmData.prs.best_e1rm ? `${Math.round(e1rmData.prs.best_e1rm.value)}` : '—',
      unit: 'KG',
      detail: e1rmData.prs.best_e1rm?.detail ?? '',
      date: e1rmData.prs.best_e1rm?.date ?? '',
      accent: 'var(--accent-primary)',
      delta,
    },
    {
      label: 'HEAVIEST',
      value: e1rmData.prs.heaviest_weight ? `${Math.round(e1rmData.prs.heaviest_weight.value)}` : '—',
      unit: 'KG',
      detail: e1rmData.prs.heaviest_weight?.detail ?? '',
      date: e1rmData.prs.heaviest_weight?.date ?? '',
      accent: 'var(--accent-cyan)',
    },
    {
      label: 'MOST REPS',
      value: e1rmData.prs.most_reps ? `${Math.round(e1rmData.prs.most_reps.value)}` : '—',
      unit: 'REPS',
      detail: e1rmData.prs.most_reps?.detail ?? '',
      date: e1rmData.prs.most_reps?.date ?? '',
      accent: 'var(--accent-cyan)',
    },
  ];

  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getDate()} ${d.toLocaleDateString('en', { month: 'short' })}`;
  };

  const cleanDetail = (detail: string) => detail.replace(/\.0kg/g, 'kg').replace(/kg/gi, 'KG');

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: expanded !== null ? '1fr' : '1fr 1fr 1fr',
      gap: 8,
      marginTop: 8,
    }}>
      {cards.map((card, i) => {
        const isExpanded = expanded === i;
        const isHidden = expanded !== null && !isExpanded;

        if (isHidden) return null;

        return (
          <div
            key={card.label}
            className="card"
            onClick={() => setExpanded(isExpanded ? null : i)}
            style={{
              padding: 12,
              marginBottom: 0,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              minHeight: 88,
              maxHeight: 88,
              overflow: 'hidden',
              transition: 'border-color 0.2s',
            }}
          >
            {/* Left: label + value, fixed position */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{
                fontFamily: 'var(--font-data)',
                fontSize: 11,
                letterSpacing: 1.5,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
              }}>
                {card.label}
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--font-data)',
                  fontSize: 24,
                  fontWeight: 700,
                  color: card.accent,
                  lineHeight: 1,
                  textShadow: 'var(--glow-primary-text)',
                }}>
                  {card.value}
                  <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 2, color: 'var(--text-secondary)' }}>{card.unit}</span>
                </div>
                {card.delta && (
                  <div style={{
                    fontFamily: 'var(--font-data)',
                    fontSize: 10,
                    color: card.delta.diff >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                    textShadow: card.delta.diff >= 0 ? 'var(--glow-green-text)' : 'var(--glow-red-text)',
                    marginTop: 4,
                  }}>
                    {card.delta.diff >= 0 ? '+' : ''}{card.delta.diff}kg · 30d
                  </div>
                )}
              </div>
            </div>

            {/* Right: expanded detail with NERV accent divider */}
            {isExpanded && card.detail && (
              <>
                <div style={{
                  width: 1,
                  background: card.accent,
                  margin: '0 20px',
                  opacity: 0.3,
                }} />
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  fontFamily: 'var(--font-data)',
                }}>
                  <div style={{
                    fontSize: 9,
                    letterSpacing: 1.5,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}>
                    RECORD SET
                  </div>
                  <div style={{
                    fontSize: 16,
                    color: 'var(--text-primary)',
                    letterSpacing: 1,
                  }}>
                    {cleanDetail(card.detail)}
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: 'var(--text-secondary)',
                    letterSpacing: 1,
                  }}>
                    {card.date ? formatDate(card.date) : ''}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
