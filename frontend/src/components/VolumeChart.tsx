import { useRef, useState, useEffect, useMemo } from 'react';
import type { WeeklyVolume } from '../api/types';

type ViewMode = 'total' | 'split' | 'muscle';

const MUSCLE_COLOURS: Record<string, string> = {
  'Back': '#32c8e8',
  'Biceps': '#2896b0',
  'Chest': '#e8a832',
  'Core': '#8888a0',
  'Hamstrings': '#c85050',
  'Quads': '#e86832',
  'Shoulders': '#32e868',
  'Triceps': '#a064d8',
  'Glutes': '#e85088',
  'Calves': '#50b8a0',
  'Forearms': '#b8a050',
  'Other': '#7088c0',
};

const SPLIT_COLOURS: Record<string, string> = {
  'Upper': '#d4762c',
  'Lower': '#2196c8',
  'Core': '#32b858',
};

const UPPER_GROUPS = new Set(['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms']);
const LOWER_GROUPS = new Set(['Quads', 'Hamstrings', 'Glutes', 'Calves']);
const CORE_GROUPS = new Set(['Core']);

function classifyGroup(mg: string): string {
  if (UPPER_GROUPS.has(mg)) return 'Upper';
  if (LOWER_GROUPS.has(mg)) return 'Lower';
  if (CORE_GROUPS.has(mg)) return 'Core';
  return 'Upper'; // default unknown to upper
}

function getColour(group: string, mode: ViewMode): string {
  if (mode === 'total') return 'var(--accent-primary)';
  if (mode === 'split') return SPLIT_COLOURS[group] ?? 'var(--text-secondary)';
  return MUSCLE_COLOURS[group] ?? '#7088c0';
}

interface Props {
  data: WeeklyVolume[];
}

export function VolumeChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [mode, setMode] = useState<ViewMode>('split');

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // All muscle groups from raw data — used to keep legend height stable
  const allGroups = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) s.add(row.muscle_group);
    return Array.from(s).sort();
  }, [data]);

  // Transform data based on view mode
  const transformed = useMemo(() => {
    if (mode === 'muscle') return data;
    if (mode === 'total') {
      // Collapse all muscle groups into one
      const weekMap = new Map<string, number>();
      for (const row of data) {
        weekMap.set(row.week, (weekMap.get(row.week) ?? 0) + row.set_count);
      }
      return Array.from(weekMap.entries()).map(([week, count]) => ({
        week, muscle_group: 'Total', set_count: count,
      }));
    }
    // split mode: upper/lower/core
    const weekMap = new Map<string, Map<string, number>>();
    for (const row of data) {
      const split = classifyGroup(row.muscle_group);
      if (!weekMap.has(row.week)) weekMap.set(row.week, new Map());
      const wk = weekMap.get(row.week)!;
      wk.set(split, (wk.get(split) ?? 0) + row.set_count);
    }
    const result: WeeklyVolume[] = [];
    for (const [week, splits] of weekMap) {
      for (const [split, count] of splits) {
        result.push({ week, muscle_group: split, set_count: count });
      }
    }
    return result;
  }, [data, mode]);

  const { weeks, groups, maxTotal } = useMemo(() => {
    const weekMap = new Map<string, Map<string, number>>();
    const groupSet = new Set<string>();

    for (const row of transformed) {
      groupSet.add(row.muscle_group);
      if (!weekMap.has(row.week)) weekMap.set(row.week, new Map());
      weekMap.get(row.week)!.set(row.muscle_group, row.set_count);
    }

    const groups = Array.from(groupSet).sort();
    const weeks = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, counts]) => {
        const segments = groups.map(g => ({ group: g, count: counts.get(g) ?? 0 }));
        const total = segments.reduce((sum, s) => sum + s.count, 0);
        return { week, segments, total };
      });

    const maxTotal = Math.max(1, ...weeks.map(w => w.total));
    return { weeks, groups, maxTotal };
  }, [transformed]);

  if (data.length === 0) {
    return (
      <div ref={containerRef} style={{
        fontFamily: 'var(--font-data)',
        fontSize: 12,
        color: 'var(--text-secondary)',
        textAlign: 'center',
        padding: 24,
      }}>
        NO VOLUME DATA YET
      </div>
    );
  }

  const height = 200;
  const pad = { top: 24, right: 8, bottom: 28, left: 32 };
  const width = containerWidth;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const barGap = Math.max(2, Math.round(plotW * 0.02));
  const barWidth = Math.max(8, (plotW - barGap * (weeks.length - 1)) / weeks.length);

  const tickStep = niceStep(maxTotal / 4);
  const yMax = Math.ceil(maxTotal / tickStep) * tickStep;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += tickStep) yTicks.push(v);

  const toY = (v: number) => pad.top + plotH - (v / yMax) * plotH;

  const modes: { key: ViewMode; label: string }[] = [
    { key: 'total', label: 'TOTAL' },
    { key: 'split', label: 'UPPER/LOWER' },
    { key: 'muscle', label: 'MUSCLE' },
  ];

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Mode toggle */}
      <div style={{
        display: 'flex',
        gap: 0,
        marginBottom: 8,
        fontFamily: 'var(--font-data)',
        fontSize: 10,
        letterSpacing: 1,
      }}>
        {modes.map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              flex: 1,
              padding: '6px 0',
              background: mode === m.key ? 'var(--bg-elevated)' : 'transparent',
              color: mode === m.key ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRight: m.key !== 'muscle' ? 'none' : '1px solid var(--border-subtle)',
              borderRadius: m.key === 'total' ? '2px 0 0 2px' : m.key === 'muscle' ? '0 2px 2px 0' : 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              letterSpacing: 'inherit',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {containerWidth > 0 && (
        <>
          <svg width={width} height={height} style={{ display: 'block' }}>
            {/* Horizontal grid lines */}
            {yTicks.map(tick => (
              <g key={tick}>
                <line
                  x1={pad.left} x2={width - pad.right}
                  y1={toY(tick)} y2={toY(tick)}
                  stroke="var(--border-subtle)" strokeWidth={0.5}
                />
                <text
                  x={pad.left - 4} y={toY(tick) + 3}
                  textAnchor="end"
                  fill="var(--text-secondary)"
                  fontSize={9}
                  fontFamily="var(--font-data)"
                >
                  {tick}
                </text>
              </g>
            ))}

            {/* Stacked bars */}
            {weeks.map((week, wi) => {
              const x = pad.left + wi * (barWidth + barGap);
              let y = toY(0);

              return (
                <g key={week.week}>
                  {week.segments.map(seg => {
                    if (seg.count === 0) return null;
                    const barH = (seg.count / yMax) * plotH;
                    y -= barH;
                    return (
                      <rect
                        key={seg.group}
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barH}
                        fill={getColour(seg.group, mode)}
                        opacity={0.85}
                        rx={1}
                      >
                        <title>{week.week}: {seg.group} — {seg.count} sets</title>
                      </rect>
                    );
                  })}
                  {/* Total label on top */}
                  <text
                    x={x + barWidth / 2}
                    y={toY(week.total) - 4}
                    textAnchor="middle"
                    fill="var(--text-secondary)"
                    fontSize={9}
                    fontFamily="var(--font-data)"
                  >
                    {week.total}
                  </text>
                  {/* Week label */}
                  <text
                    x={x + barWidth / 2}
                    y={height - 4}
                    textAnchor="middle"
                    fill="var(--text-secondary)"
                    fontSize={9}
                    fontFamily="var(--font-data)"
                  >
                    {formatWeekLabel(week.week)}
                  </text>
                </g>
              );
            })}

            {/* Y axis label */}
            <text
              x={4} y={pad.top - 10}
              fill="var(--text-secondary)"
              fontSize={9}
              fontFamily="var(--font-data)"
            >
              SETS
            </text>
          </svg>

          {/* Legend — visible layer shows active mode, hidden layer reserves max height */}
          <div style={{ position: 'relative', marginTop: 6 }}>
            {/* Hidden: always render muscle groups to reserve height */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px 12px',
              fontFamily: 'var(--font-data)',
              fontSize: 9,
              visibility: 'hidden',
            }}>
              {allGroups.map(g => (
                <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8 }} />
                  {g.toUpperCase()}
                </div>
              ))}
            </div>
            {/* Visible: show active mode's groups */}
            {mode !== 'total' && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px 12px',
                fontFamily: 'var(--font-data)',
                fontSize: 9,
                color: 'var(--text-secondary)',
              }}>
                {groups.map(g => (
                  <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: 1,
                      background: getColour(g, mode),
                      opacity: 0.85,
                    }} />
                    {g.toUpperCase()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleDateString('en', { month: 'short' });
  return `${day} ${month}`;
}

function niceStep(rough: number): number {
  const candidates = [1, 2, 5, 10, 15, 20, 25, 50];
  for (const c of candidates) {
    if (c >= rough * 0.8) return c;
  }
  return Math.ceil(rough);
}
