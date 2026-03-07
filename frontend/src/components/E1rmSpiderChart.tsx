import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import type { E1rmSpiderPoint, ExerciseSummary } from '../api/types';

type Span = 4 | 8 | 12;

const SPAN_CONFIG: { key: Span; label: string; color: string }[] = [
  { key: 4, label: '4W', color: 'var(--accent-cyan)' },
  { key: 8, label: '8W', color: 'var(--accent-primary)' },
  { key: 12, label: '12W', color: 'var(--text-secondary)' },
];

const MAX_EXERCISES = 6;

interface Props {
  exercises: ExerciseSummary[];
}

export function E1rmSpiderChart({ exercises }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeSpan, setActiveSpan] = useState<Span>(4);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [spiderData, setSpiderData] = useState<E1rmSpiderPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Load saved preferences
  useEffect(() => {
    api.getE1rmSpiderPrefs().then(prefs => {
      if (prefs.exercise_ids.length > 0) {
        setSelectedIds(prefs.exercise_ids);
      } else if (exercises.length > 0) {
        const defaults = exercises.slice(0, Math.min(MAX_EXERCISES, exercises.length)).map(e => e.id);
        setSelectedIds(defaults);
      }
      setPrefsLoaded(true);
    }).catch(() => setPrefsLoaded(true));
  }, [exercises]);

  // Fetch spider data when selections or span change
  const fetchData = useCallback(async () => {
    if (selectedIds.length < 3) {
      setSpiderData([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.e1rmSpider(selectedIds, activeSpan);
      setSpiderData(data);
    } catch {
      setSpiderData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedIds, activeSpan]);

  useEffect(() => {
    if (prefsLoaded) fetchData();
  }, [fetchData, prefsLoaded]);

  const toggleExercise = (id: number) => {
    setSelectedIds(prev => {
      let next: number[];
      if (prev.includes(id)) {
        next = prev.filter(x => x !== id);
      } else if (prev.length < MAX_EXERCISES) {
        next = [...prev, id];
      } else {
        return prev;
      }
      api.setE1rmSpiderPrefs({ exercise_ids: next }).catch(() => {});
      return next;
    });
  };

  const validPoints = useMemo(() =>
    spiderData.filter(p => p.pct_change !== null),
  [spiderData]);

  const n = validPoints.length;

  // Compute max label chars based on container width
  const maxLabelChars = containerWidth < 300 ? 8 : containerWidth < 380 ? 10 : 14;

  const truncate = (name: string) => {
    const upper = name.toUpperCase();
    return upper.length > maxLabelChars ? upper.substring(0, maxLabelChars - 1) + '…' : upper;
  };

  const size = Math.min(containerWidth, 360);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.32;
  const labelRadius = radius + 22;
  const rings = 4;

  const angleOf = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const values = validPoints.map(p => p.pct_change!);
  const maxAbs = Math.max(...values.map(Math.abs), 1);
  const scaleMax = maxAbs;

  const pointAt = (i: number, value: number) => {
    const a = angleOf(i);
    const normalized = (value + scaleMax) / (2 * scaleMax);
    const r = normalized * radius;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };

  const zeroRadius = radius * 0.5;
  const activeConfig = SPAN_CONFIG.find(s => s.key === activeSpan)!;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Exercise picker trigger — outside card style, matches E1RM dropdown */}
      <div style={{ marginBottom: 12, position: 'relative' }}>
        <button
          onClick={() => setPickerOpen(true)}
          style={{
            width: '100%',
            padding: '10px 32px 10px 12px',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 2,
            fontFamily: 'var(--font-data)',
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedIds.length > 0
            ? `${selectedIds.length} EXERCISES SELECTED`
            : 'SELECT EXERCISES'}
        </button>
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

      {/* Exercise picker modal */}
      {pickerOpen && (
        <div
          onClick={() => setPickerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '80vh',
              background: 'var(--bg-surface)',
              borderRadius: '4px 4px 0 0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <span style={{
                fontFamily: 'var(--font-data)',
                fontSize: 12,
                letterSpacing: 1.5,
                color: 'var(--text-primary)',
              }}>
                SELECT EXERCISES
              </span>
              <span style={{
                fontFamily: 'var(--font-data)',
                fontSize: 11,
                color: selectedIds.length >= MAX_EXERCISES ? 'var(--accent-primary)' : 'var(--text-secondary)',
              }}>
                {selectedIds.length} / {MAX_EXERCISES}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {exercises.map(ex => {
                const isSelected = selectedIds.includes(ex.id);
                const atMax = selectedIds.length >= MAX_EXERCISES && !isSelected;
                return (
                  <button
                    key={ex.id}
                    onClick={() => !atMax && toggleExercise(ex.id)}
                    style={{
                      display: 'flex',
                      width: '100%',
                      padding: '12px 16px',
                      background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                      color: atMax ? 'var(--text-secondary)' : 'var(--text-primary)',
                      opacity: atMax ? 0.4 : 1,
                      border: 'none',
                      borderBottom: '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-data)',
                      fontSize: 12,
                      cursor: atMax ? 'default' : 'pointer',
                      textAlign: 'left',
                      gap: 10,
                      alignItems: 'center',
                      minHeight: 48,
                    }}
                  >
                    <span style={{
                      width: 18,
                      height: 18,
                      flexShrink: 0,
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      borderRadius: 2,
                      background: isSelected ? 'var(--accent-primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      color: 'var(--bg-primary)',
                    }}>
                      {isSelected ? '✓' : ''}
                    </span>
                    <span style={{ flex: 1 }}>{ex.name.toUpperCase()}</span>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: 2,
                      flexShrink: 0,
                    }}>
                      {ex.muscle_group && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: 9, letterSpacing: 0.5 }}>
                          {ex.muscle_group.toUpperCase()}
                        </span>
                      )}
                      <span style={{ color: 'var(--accent-cyan)', fontSize: 9 }}>
                        {ex.session_count} SESSIONS
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setPickerOpen(false)}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  background: 'var(--accent-primary)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: 2,
                  fontFamily: 'var(--font-data)',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  cursor: 'pointer',
                }}
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart card content */}
      <div className="card">
        {/* Span toggles */}
        <div style={{
          display: 'flex',
          gap: 0,
          marginBottom: 8,
          fontFamily: 'var(--font-data)',
          fontSize: 10,
          letterSpacing: 1,
        }}>
          {SPAN_CONFIG.map((s, si) => (
            <button
              key={s.key}
              onClick={() => setActiveSpan(s.key)}
              style={{
                flex: 1,
                padding: '6px 0',
                background: activeSpan === s.key ? 'var(--bg-elevated)' : 'transparent',
                color: activeSpan === s.key ? s.color : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRight: si < SPAN_CONFIG.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                borderRadius: si === 0 ? '2px 0 0 2px' : si === SPAN_CONFIG.length - 1 ? '0 2px 2px 0' : 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                letterSpacing: 'inherit',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {!prefsLoaded && (
          <div style={{
            fontFamily: 'var(--font-data)', fontSize: 12,
            color: 'var(--text-secondary)', textAlign: 'center', padding: 24,
          }}>
            LOADING...
          </div>
        )}

        {prefsLoaded && loading && (
          <div style={{
            fontFamily: 'var(--font-data)', fontSize: 12,
            color: 'var(--text-secondary)', textAlign: 'center', padding: 24,
          }}>
            LOADING...
          </div>
        )}

        {prefsLoaded && !loading && n < 3 && (
          <div style={{
            fontFamily: 'var(--font-data)', fontSize: 12,
            color: 'var(--text-secondary)', textAlign: 'center', padding: 24,
          }}>
            {selectedIds.length < 3
              ? 'SELECT 3+ EXERCISES'
              : 'NEED DATA IN BOTH PERIODS'}
          </div>
        )}

        {prefsLoaded && !loading && n >= 3 && size > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
              {/* Grid rings */}
              {Array.from({ length: rings }, (_, r) => {
                const ringRadius = (radius * (r + 1)) / rings;
                const points = Array.from({ length: n }, (_, i) => {
                  const a = angleOf(i);
                  return `${(cx + Math.cos(a) * ringRadius).toFixed(1)},${(cy + Math.sin(a) * ringRadius).toFixed(1)}`;
                }).join(' ');
                return (
                  <polygon
                    key={r}
                    points={points}
                    fill="none"
                    stroke="var(--border-subtle)"
                    strokeWidth={r === rings - 1 ? 1 : 0.5}
                  />
                );
              })}

              {/* Zero line */}
              {(() => {
                const points = Array.from({ length: n }, (_, i) => {
                  const a = angleOf(i);
                  return `${(cx + Math.cos(a) * zeroRadius).toFixed(1)},${(cy + Math.sin(a) * zeroRadius).toFixed(1)}`;
                }).join(' ');
                return (
                  <polygon
                    points={points}
                    fill="none"
                    stroke="var(--text-secondary)"
                    strokeWidth={0.75}
                    strokeDasharray="3,3"
                    opacity={0.5}
                  />
                );
              })()}

              {/* Axis lines */}
              {validPoints.map((_, i) => {
                const a = angleOf(i);
                return (
                  <line
                    key={i}
                    x1={cx} y1={cy}
                    x2={cx + Math.cos(a) * radius}
                    y2={cy + Math.sin(a) * radius}
                    stroke="var(--border-subtle)"
                    strokeWidth={0.5}
                  />
                );
              })}

              {/* Data polygon */}
              {(() => {
                const points = validPoints.map((p, i) => pointAt(i, p.pct_change!));
                return (
                  <polygon
                    points={points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                    fill={activeConfig.color}
                    fillOpacity={0.1}
                    stroke={activeConfig.color}
                    strokeWidth={1.5}
                    opacity={0.9}
                  />
                );
              })()}

              {/* Dots */}
              {validPoints.map((p, i) => {
                const pt = pointAt(i, p.pct_change!);
                const isPositive = p.pct_change! >= 0;
                return (
                  <circle
                    key={i}
                    cx={pt.x} cy={pt.y}
                    r={3}
                    fill={isPositive ? 'var(--accent-green)' : 'var(--accent-red)'}
                    opacity={0.8}
                  >
                    <title>
                      {p.exercise_name}: {p.pct_change! >= 0 ? '+' : ''}{p.pct_change!.toFixed(1)}%
                      {p.current_e1rm ? ` (${Math.round(p.current_e1rm)}kg)` : ''}
                    </title>
                  </circle>
                );
              })}

              {/* Labels */}
              {validPoints.map((p, i) => {
                const a = angleOf(i);
                const lx = cx + Math.cos(a) * labelRadius;
                const ly = cy + Math.sin(a) * labelRadius;
                const anchor = Math.abs(Math.cos(a)) < 0.1 ? 'middle'
                  : Math.cos(a) > 0 ? 'start' : 'end';
                const isPositive = p.pct_change! >= 0;
                return (
                  <g key={i}>
                    <text
                      x={lx} y={ly}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      fill="var(--text-secondary)"
                      fontSize={10}
                      fontFamily="var(--font-data)"
                      letterSpacing={0.5}
                    >
                      {truncate(p.exercise_name)}
                    </text>
                    <text
                      x={lx} y={ly + 12}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      fill={isPositive ? 'var(--accent-green)' : 'var(--accent-red)'}
                      fontSize={10}
                      fontFamily="var(--font-data)"
                    >
                      {isPositive ? '+' : ''}{p.pct_change!.toFixed(1)}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
