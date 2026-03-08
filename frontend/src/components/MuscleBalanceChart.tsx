import { useRef, useState, useEffect, useMemo } from 'react';
import type { WeeklyVolume } from '../api/types';

type Span = 4 | 8 | 12;
type ViewMode = 'radar' | 'pie';

const SPAN_CONFIG: { key: Span; label: string; color: string; fill: string }[] = [
  { key: 4, label: '4W', color: 'var(--accent-cyan)', fill: 'var(--accent-cyan)' },
  { key: 8, label: '8W', color: 'var(--accent-primary)', fill: 'var(--accent-primary)' },
  { key: 12, label: '12W', color: 'var(--text-secondary)', fill: 'var(--text-secondary)' },
];

const PIE_COLOURS: Record<string, string> = {
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

interface Props {
  data: WeeklyVolume[];
}

function mondayOfWeek(d: Date): string {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy.toISOString().slice(0, 10);
}

function aggregateSpan(data: WeeklyVolume[], allGroups: string[], weeks: number): { name: string; setsPerWeek: number }[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  const cutoffWeek = mondayOfWeek(cutoff);

  const totals = new Map<string, number>();
  for (const mg of allGroups) totals.set(mg, 0);

  for (const row of data) {
    if (row.week < cutoffWeek) continue;
    totals.set(row.muscle_group, (totals.get(row.muscle_group) ?? 0) + row.set_count);
  }

  return allGroups.map(name => ({ name, setsPerWeek: (totals.get(name) ?? 0) / weeks }));
}

export function MuscleBalanceChart({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeSpans, setActiveSpans] = useState<Set<Span>>(new Set([4]));
  const [viewMode, setViewMode] = useState<ViewMode>('radar');

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const allMuscleGroups = useMemo(() => {
    const s = new Set<string>();
    for (const row of data) s.add(row.muscle_group);
    return [...s].sort();
  }, [data]);

  const spanData = useMemo(() => {
    if (data.length === 0 || allMuscleGroups.length === 0) return [];
    return SPAN_CONFIG
      .filter(s => activeSpans.has(s.key))
      .map(s => ({
        ...s,
        groups: aggregateSpan(data, allMuscleGroups, s.key),
      }));
  }, [data, allMuscleGroups, activeSpans]);

  const maxVal = useMemo(() => {
    let max = 1;
    for (const s of spanData) {
      for (const g of s.groups) {
        if (g.setsPerWeek > max) max = g.setsPerWeek;
      }
    }
    return max;
  }, [spanData]);

  const toggleSpan = (key: Span) => {
    setActiveSpans(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Pie data: use smallest active span
  const pieData = useMemo(() => {
    if (spanData.length === 0) return [];
    const primary = spanData.reduce((a, b) => a.key < b.key ? a : b);
    const total = primary.groups.reduce((s, g) => s + g.setsPerWeek, 0);
    if (total === 0) return [];
    return primary.groups
      .filter(g => g.setsPerWeek > 0)
      .sort((a, b) => b.setsPerWeek - a.setsPerWeek)
      .map(g => ({
        name: g.name,
        value: g.setsPerWeek,
        pct: (g.setsPerWeek / total) * 100,
        colour: PIE_COLOURS[g.name] ?? '#7088c0',
      }));
  }, [spanData]);

  if (allMuscleGroups.length < 3) {
    return (
      <div ref={containerRef} style={{
        fontFamily: 'var(--font-data)',
        fontSize: 12,
        color: 'var(--text-secondary)',
        textAlign: 'center',
        padding: 24,
      }}>
        {allMuscleGroups.length === 0 ? 'NO MUSCLE DATA YET' : 'NEED 3+ MUSCLE GROUPS'}
      </div>
    );
  }

  const n = allMuscleGroups.length;
  const size = Math.min(containerWidth, 360);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.34;
  const labelRadius = radius + 20;
  const rings = 4;

  const angleOf = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const pointAt = (i: number, value: number) => {
    const a = angleOf(i);
    const r = (value / maxVal) * radius;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  };

  const primarySpan = spanData.length > 0
    ? spanData.reduce((a, b) => a.key < b.key ? a : b)
    : null;

  const viewModes: { key: ViewMode; label: string }[] = [
    { key: 'radar', label: 'RADAR' },
    { key: 'pie', label: 'VOLUME' },
  ];

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* View mode toggle */}
      <div style={{
        display: 'flex',
        gap: 0,
        marginBottom: 8,
        fontFamily: 'var(--font-data)',
        fontSize: 10,
        letterSpacing: 1,
      }}>
        {viewModes.map((m, mi) => (
          <button
            key={m.key}
            onClick={() => setViewMode(m.key)}
            style={{
              flex: 1,
              padding: '6px 0',
              background: viewMode === m.key ? 'var(--bg-elevated)' : 'transparent',
              color: viewMode === m.key ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRight: mi < viewModes.length - 1 ? 'none' : '1px solid var(--border-subtle)',
              borderRadius: mi === 0 ? '2px 0 0 2px' : '0 2px 2px 0',
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

      {/* Span toggles — shown for radar mode */}
      {viewMode === 'radar' && (
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
              onClick={() => toggleSpan(s.key)}
              style={{
                flex: 1,
                padding: '6px 0',
                background: activeSpans.has(s.key) ? 'var(--bg-elevated)' : 'transparent',
                color: activeSpans.has(s.key) ? s.color : 'var(--text-secondary)',
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
      )}

      {/* Span toggle for pie — single select for which window to show */}
      {viewMode === 'pie' && (
        <div style={{
          display: 'flex',
          gap: 0,
          marginBottom: 8,
          fontFamily: 'var(--font-data)',
          fontSize: 10,
          letterSpacing: 1,
        }}>
          {SPAN_CONFIG.map((s, si) => {
            const isActive = activeSpans.has(s.key) && activeSpans.size === 1;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSpans(new Set([s.key]))}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  background: isActive ? 'var(--bg-elevated)' : 'transparent',
                  color: isActive ? s.color : 'var(--text-secondary)',
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
            );
          })}
        </div>
      )}

      <div className="card" style={{ marginBottom: 0 }}>
        {viewMode === 'radar' && size > 0 && (
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

              {/* Axis lines */}
              {allMuscleGroups.map((_, i) => {
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

              {/* Data polygons — render largest span first (back to front) */}
              {[...spanData].sort((a, b) => b.key - a.key).map(s => {
                const points = s.groups.map((g, i) => pointAt(i, g.setsPerWeek));
                return (
                  <polygon
                    key={s.key}
                    points={points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                    fill={s.fill}
                    fillOpacity={0.1}
                    stroke={s.color}
                    strokeWidth={1.5}
                    opacity={0.9}
                  />
                );
              })}

              {/* Dots only for the primary (smallest) span */}
              {primarySpan && primarySpan.groups.map((g, i) => {
                const p = pointAt(i, g.setsPerWeek);
                return (
                  <circle
                    key={i}
                    cx={p.x} cy={p.y}
                    r={3}
                    fill={primarySpan.color}
                    opacity={0.8}
                  >
                    <title>{g.name}: {g.setsPerWeek.toFixed(1)} sets/wk</title>
                  </circle>
                );
              })}

              {/* Labels — show sets/wk from primary span */}
              {allMuscleGroups.map((name, i) => {
                const a = angleOf(i);
                const lx = cx + Math.cos(a) * labelRadius;
                const ly = cy + Math.sin(a) * labelRadius;
                const anchor = Math.abs(Math.cos(a)) < 0.1 ? 'middle'
                  : Math.cos(a) > 0 ? 'start' : 'end';
                const val = primarySpan ? primarySpan.groups[i].setsPerWeek : 0;
                const isZero = val === 0;
                return (
                  <g key={i}>
                    <text
                      x={lx} y={ly}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      fill={isZero ? 'var(--accent-red)' : 'var(--text-secondary)'}
                      fontSize={9}
                      fontFamily="var(--font-data)"
                      letterSpacing={0.5}
                    >
                      {name.toUpperCase()}
                    </text>
                    <text
                      x={lx} y={ly + 12}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      fill={isZero ? 'var(--accent-red)' : primarySpan?.color ?? 'var(--accent-cyan)'}
                      fontSize={9}
                      fontFamily="var(--font-data)"
                    >
                      {val.toFixed(1)}/W
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {viewMode === 'pie' && size > 0 && (
          <PieChart data={pieData} size={size} />
        )}
      </div>
    </div>
  );
}

function PieChart({ data, size }: { data: { name: string; value: number; pct: number; colour: string }[]; size: number }) {
  if (data.length === 0) {
    return (
      <div style={{
        fontFamily: 'var(--font-data)',
        fontSize: 12,
        color: 'var(--text-secondary)',
        textAlign: 'center',
        padding: 24,
      }}>
        NO DATA FOR THIS PERIOD
      </div>
    );
  }

  const pieSize = Math.min(size, 280);
  const cx = pieSize / 2;
  const cy = pieSize / 2;
  const outerR = pieSize * 0.42;
  const innerR = outerR * 0.55; // donut

  let cumAngle = -Math.PI / 2;

  const arcPath = (startAngle: number, endAngle: number, outer: number, inner: number) => {
    const x1 = cx + Math.cos(startAngle) * outer;
    const y1 = cy + Math.sin(startAngle) * outer;
    const x2 = cx + Math.cos(endAngle) * outer;
    const y2 = cy + Math.sin(endAngle) * outer;
    const x3 = cx + Math.cos(endAngle) * inner;
    const y3 = cy + Math.sin(endAngle) * inner;
    const x4 = cx + Math.cos(startAngle) * inner;
    const y4 = cy + Math.sin(startAngle) * inner;
    const large = endAngle - startAngle > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${outer},${outer} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${inner},${inner} 0 ${large} 0 ${x4},${y4} Z`;
  };

  const totalValue = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={pieSize} height={pieSize} style={{ display: 'block' }}>
          {data.map(d => {
            const sliceAngle = (d.value / totalValue) * Math.PI * 2;
            const startAngle = cumAngle;
            cumAngle += sliceAngle;
            return (
              <path
                key={d.name}
                d={arcPath(startAngle, startAngle + sliceAngle, outerR, innerR)}
                fill={d.colour}
                opacity={0.85}
                stroke="var(--bg-surface)"
                strokeWidth={1.5}
              >
                <title>{d.name}: {d.value.toFixed(1)} sets/wk ({d.pct.toFixed(0)}%)</title>
              </path>
            );
          })}
          {/* Center label */}
          <text
            x={cx} y={cy - 6}
            textAnchor="middle"
            fill="var(--text-secondary)"
            fontSize={9}
            fontFamily="var(--font-data)"
            letterSpacing={1}
          >
            TOTAL
          </text>
          <text
            x={cx} y={cy + 10}
            textAnchor="middle"
            fill="var(--text-primary)"
            fontSize={16}
            fontFamily="var(--font-data)"
            fontWeight={700}
          >
            {totalValue.toFixed(1)}/W
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px 12px',
        marginTop: 12,
        fontFamily: 'var(--font-data)',
        fontSize: 9,
        color: 'var(--text-secondary)',
      }}>
        {data.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: 1,
              background: d.colour,
              opacity: 0.85,
            }} />
            {d.name.toUpperCase()} {d.pct.toFixed(0)}%
          </div>
        ))}
      </div>
    </div>
  );
}
