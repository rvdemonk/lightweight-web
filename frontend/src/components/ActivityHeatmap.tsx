import { useRef, useState, useEffect } from 'react';
import { api } from '../api/client';
import type { DayActivity, DayTemplateActivity, DayPR } from '../api/types';

type HeatmapMode = 'intensity' | 'workouts';

// 5 distinct template colours + 1 for freeform/other
const TEMPLATE_PALETTE = [
  '#e8a832', // amber
  '#32c8e8', // cyan
  '#32e868', // green
  '#a064d8', // purple
  '#e85088', // pink
];
const FREEFORM_COLOUR = '#7088c0';
const MIXED_COLOUR = '#888888';

interface Props {
  data: DayActivity[];
  onDayClick?: (dateStr: string) => void;
}

export function ActivityHeatmap({ data, onDayClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [mode, setMode] = useState<HeatmapMode>('intensity');
  const [templateData, setTemplateData] = useState<DayTemplateActivity[] | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [showPRs, setShowPRs] = useState(false);
  const [prData, setPRData] = useState<DayPR[] | null>(null);
  const [prLoading, setPRLoading] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ dateStr: string; x: number; y: number } | null>(null);
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    setCanHover(window.matchMedia('(hover: hover)').matches);
  }, []);

  // Lazy-load template data when switching to workouts mode
  useEffect(() => {
    if (mode === 'workouts' && !templateData && !templateLoading) {
      setTemplateLoading(true);
      api.activityHeatmapTemplates()
        .then(setTemplateData)
        .catch(() => setTemplateData([]))
        .finally(() => setTemplateLoading(false));
    }
  }, [mode, templateData, templateLoading]);

  // Lazy-load PR data when toggled on
  useEffect(() => {
    if (showPRs && !prData && !prLoading) {
      setPRLoading(true);
      api.activityHeatmapPRs()
        .then(setPRData)
        .catch(() => setPRData([]))
        .finally(() => setPRLoading(false));
    }
  }, [showPRs, prData, prLoading]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Build lookup maps
  const countMap = new Map(data.map(d => [d.date, d.set_count]));

  // Build template lookup: date -> [{template_id, template_name, set_count}]
  const templateMap = new Map<string, DayTemplateActivity[]>();
  if (templateData) {
    for (const d of templateData) {
      const existing = templateMap.get(d.date) ?? [];
      existing.push(d);
      templateMap.set(d.date, existing);
    }
  }

  // Assign stable colours to the most common templates
  const templateColourMap = new Map<number | null, string>();
  if (templateData) {
    const templateTotals = new Map<number | null, number>();
    for (const d of templateData) {
      templateTotals.set(d.template_id, (templateTotals.get(d.template_id) ?? 0) + d.set_count);
    }
    // Sort by total sets descending, take top 5 (excluding null/freeform)
    const sorted = Array.from(templateTotals.entries())
      .filter(([id]) => id !== null)
      .sort((a, b) => b[1] - a[1]);
    sorted.slice(0, TEMPLATE_PALETTE.length).forEach(([id], i) => {
      templateColourMap.set(id, TEMPLATE_PALETTE[i]);
    });
    // Assign freeform colour
    templateColourMap.set(null, FREEFORM_COLOUR);
  }

  // Build PR lookup: date -> DayPR
  const prMap = new Map<string, DayPR>();
  if (prData) {
    for (const d of prData) {
      prMap.set(d.date, d);
    }
  }

  // Template legend entries (for workouts mode)
  const templateLegend: { name: string; colour: string }[] = [];
  if (templateData) {
    const templateTotals = new Map<number | null, { name: string; total: number }>();
    for (const d of templateData) {
      const existing = templateTotals.get(d.template_id);
      if (existing) {
        existing.total += d.set_count;
      } else {
        templateTotals.set(d.template_id, {
          name: d.template_name ?? 'FREEFORM',
          total: d.set_count,
        });
      }
    }
    const sorted = Array.from(templateTotals.entries())
      .sort((a, b) => b[1].total - a[1].total);
    for (const [id, { name }] of sorted) {
      const colour = templateColourMap.get(id) ?? FREEFORM_COLOUR;
      templateLegend.push({ name: name.toUpperCase(), colour });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay()));

  let start: Date;
  if (data.length > 0) {
    const earliest = data.reduce((a, b) => a.date < b.date ? a : b);
    start = new Date(earliest.date);
  } else {
    start = new Date(today);
  }
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  const minWeeks = 16;
  const minStart = new Date(end);
  minStart.setDate(minStart.getDate() - (minWeeks * 7 - 1));
  minStart.setDate(minStart.getDate() - minStart.getDay());
  if (start > minStart) {
    start = minStart;
  }

  const weeks: { date: Date; dateStr: string; count: number }[][] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const week: { date: Date; dateStr: string; count: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = formatDate(cursor);
      week.push({
        date: new Date(cursor),
        dateStr,
        count: countMap.get(dateStr) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...data.map(d => d.set_count));

  const labelWidth = 24;
  const availableWidth = containerWidth - labelWidth;
  const numWeeks = weeks.length || 1;
  const maxStep = 15;
  const step = Math.min(maxStep, Math.max(6, Math.floor(availableWidth / numWeeks)));
  const cellGap = Math.max(1, Math.round(step * 0.15));
  const cellSize = step - cellGap;

  const svgWidth = labelWidth + numWeeks * step;
  const svgHeight = 7 * step + 20;

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  const getCellFill = (day: { dateStr: string; count: number }) => {
    if (day.count === 0) return 'var(--bg-elevated)';

    if (mode === 'intensity' || !templateData) {
      const intensity = Math.max(0.15, day.count / maxCount);
      return `color-mix(in srgb, var(--accent-primary) ${Math.round(intensity * 100)}%, var(--bg-elevated))`;
    }

    // Workouts mode
    const templates = templateMap.get(day.dateStr);
    if (!templates || templates.length === 0) return 'var(--bg-elevated)';

    const totalSets = templates.reduce((s, t) => s + t.set_count, 0);
    const intensity = Math.max(0.3, totalSets / maxCount);

    if (templates.length === 1) {
      const colour = templateColourMap.get(templates[0].template_id) ?? FREEFORM_COLOUR;
      return `color-mix(in srgb, ${colour} ${Math.round(intensity * 100)}%, var(--bg-elevated))`;
    }

    // Mixed — use mixed colour
    return `color-mix(in srgb, ${MIXED_COLOUR} ${Math.round(intensity * 100)}%, var(--bg-elevated))`;
  };

  const getTooltipText = (day: { dateStr: string; count: number }) => {
    const dateLabel = formatDateLabel(day.dateStr);
    if (day.count === 0) return `${dateLabel}\nRest day`;

    const lines: string[] = [dateLabel];

    if (mode === 'workouts' && templateData) {
      const templates = templateMap.get(day.dateStr);
      if (templates && templates.length > 0) {
        for (const t of templates) {
          lines.push(`${t.template_name ?? 'Freeform'}: ${t.set_count} sets`);
        }
      } else {
        lines.push(`${day.count} sets`);
      }
    } else {
      lines.push(`${day.count} sets`);
    }

    if (showPRs && prData) {
      const pr = prMap.get(day.dateStr);
      if (pr?.has_absolute_pr) lines.push('★ E1RM PR');
      else if (pr?.has_set_pr) lines.push('◆ SET PR');
    }

    return lines.join('\n');
  };

  const modes: { key: HeatmapMode; label: string }[] = [
    { key: 'intensity', label: 'INTENSITY' },
    { key: 'workouts', label: 'WORKOUTS' },
  ];

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      {/* Mode toggle + PR toggle — above the card */}
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
              borderRight: 'none',
              borderRadius: m.key === 'intensity' ? '2px 0 0 2px' : 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              letterSpacing: 'inherit',
            }}
          >
            {m.label}
          </button>
        ))}
        <button
          onClick={() => setShowPRs(p => !p)}
          style={{
            padding: '6px 10px',
            background: showPRs ? 'var(--bg-elevated)' : 'transparent',
            color: showPRs ? 'var(--accent-amber)' : 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0 2px 2px 0',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            letterSpacing: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          PRs
        </button>
      </div>

      {containerWidth > 0 && (
        <div className="card" style={{ marginBottom: 0, position: 'relative' }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ display: 'block' }}
          onMouseLeave={() => setHoveredCell(null)}
        >
          {/* Month labels */}
          {weeks.map((week, wi) => {
            if (week[0].date.getDate() <= 7 && wi > 0) {
              return (
                <text
                  key={`month-${wi}`}
                  x={labelWidth + wi * step}
                  y={10}
                  fill="var(--text-secondary)"
                  fontSize={9}
                  fontFamily="var(--font-data)"
                >
                  {week[0].date.toLocaleDateString('en', { month: 'short' })}
                </text>
              );
            }
            return null;
          })}

          {/* Day labels */}
          {dayLabels.map((label, i) =>
            label ? (
              <text
                key={`day-${i}`}
                x={0}
                y={18 + i * step + cellSize - 1}
                fill="var(--text-secondary)"
                fontSize={9}
                fontFamily="var(--font-data)"
              >
                {label}
              </text>
            ) : null
          )}

          {/* Cells */}
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              if (day.date > today) return null;
              const cx = labelWidth + wi * step;
              const cy = 18 + di * step;
              return (
                <rect
                  key={day.dateStr}
                  x={cx}
                  y={cy}
                  width={cellSize}
                  height={cellSize}
                  rx={1}
                  fill={getCellFill(day)}
                  stroke="var(--bg-primary)"
                  strokeWidth={1}
                  style={(canHover || (onDayClick && day.count > 0)) ? { cursor: 'pointer' } : undefined}
                  onMouseEnter={canHover ? () => setHoveredCell({
                    dateStr: day.dateStr,
                    x: cx + cellSize / 2,
                    y: cy,
                  }) : undefined}
                  onClick={onDayClick && day.count > 0 ? () => onDayClick(day.dateStr) : undefined}
                />
              );
            })
          )}

          {/* PR badges overlay */}
          {showPRs && prData && weeks.map((week, wi) =>
            week.map((day, di) => {
              const pr = prMap.get(day.dateStr);
              if (!pr) return null;
              const cx = labelWidth + wi * step;
              const cy = 18 + di * step;
              const r = Math.max(1.5, cellSize * 0.2);
              return (
                <circle
                  key={`pr-${day.dateStr}`}
                  cx={cx + cellSize - r - 1}
                  cy={cy + r + 1}
                  r={r}
                  fill={pr.has_absolute_pr ? 'var(--accent-cyan)' : 'var(--accent-green)'}
                  style={{ pointerEvents: 'none' }}
                />
              );
            })
          )}
        </svg>

      {/* Custom tooltip — desktop only */}
      {canHover && hoveredCell && (() => {
        const day = weeks.flat().find(d => d.dateStr === hoveredCell.dateStr);
        if (!day) return null;
        const text = getTooltipText(day);
        const lines = text.split('\n');
        return (
          <div style={{
            position: 'absolute',
            left: hoveredCell.x,
            top: hoveredCell.y - 8,
            transform: 'translate(-50%, -100%)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 2,
            padding: '6px 10px',
            fontFamily: 'var(--font-data)',
            fontSize: 10,
            color: 'var(--text-primary)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
            lineHeight: 1.5,
          }}>
            {lines.map((line, i) => (
              <div key={i} style={{
                color: i === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
                letterSpacing: i === 0 ? 1 : 0,
              }}>{line}</div>
            ))}
          </div>
        );
      })()}

      {/* Legend — hidden spacer reserves max height, visible layer shows active mode */}
      <div style={{ position: 'relative', marginTop: 8 }}>
        {/* Hidden: reserve height for whichever legend is taller */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 12px',
          justifyContent: 'flex-end',
          fontFamily: 'var(--font-data)',
          fontSize: 9,
          visibility: 'hidden',
        }}>
          {templateLegend.length > 0 ? templateLegend.map(t => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 11, height: 11 }} />
              <span>{t.name}</span>
            </div>
          )) : (
            <>
              <span>LESS</span>
              {[0, 1, 2, 3, 4].map(i => (
                <span key={i} style={{ display: 'inline-block', width: 11, height: 11 }} />
              ))}
              <span>MORE</span>
            </>
          )}
        </div>
        {/* Visible: active legend */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 6,
            fontFamily: 'var(--font-data)',
            fontSize: 9,
            color: 'var(--text-secondary)',
          }}>
            {/* PR legend (left side) */}
            {showPRs && (
              <>
                <span style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--accent-cyan)',
                }} />
                <span>E1RM PR</span>
                <span style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--accent-green)',
                }} />
                <span>SET PR</span>
                <span style={{ width: 6 }} />
              </>
            )}

            {/* Main legend (right side) */}
            {mode === 'workouts' && templateLegend.length > 0 ? (
              <>
                {templateLegend.map(t => (
                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      display: 'inline-block',
                      width: 11,
                      height: 11,
                      borderRadius: 1,
                      background: t.colour,
                      border: '1px solid var(--bg-primary)',
                    }} />
                    <span>{t.name}</span>
                  </div>
                ))}
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>

        </div>
      )}
    </div>
  );
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleDateString('en', { month: 'short' });
  const weekday = d.toLocaleDateString('en', { weekday: 'short' });
  return `${weekday} ${day} ${month}`;
}
