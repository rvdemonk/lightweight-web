import { useRef, useState, useEffect } from 'react';
import type { DayActivity } from '../api/types';

interface Props {
  data: DayActivity[];
}

export function ActivityHeatmap({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Build a lookup map: date string -> set_count
  const countMap = new Map(data.map(d => [d.date, d.set_count]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // End on the current week's Saturday (right edge = this week)
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay()));

  // Start from earliest data, but enforce minimum 16 weeks
  const minWeeks = 16;
  let start: Date;
  if (data.length > 0) {
    const earliest = data.reduce((a, b) => a.date < b.date ? a : b);
    start = new Date(earliest.date);
  } else {
    start = new Date(today);
  }
  start.setHours(0, 0, 0, 0);
  // Roll back to Sunday to align the grid
  start.setDate(start.getDate() - start.getDay());

  // Ensure minimum window
  const minStart = new Date(end);
  minStart.setDate(minStart.getDate() - (minWeeks * 7 - 1));
  minStart.setDate(minStart.getDate() - minStart.getDay());
  if (start > minStart) {
    start = minStart;
  }

  // Generate all weeks (columns) with days (rows 0-6, Sun-Sat)
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

  // Size cells to fit container width, capped at 13px
  const labelWidth = 24;
  const availableWidth = containerWidth - labelWidth;
  const numWeeks = weeks.length || 1;
  const maxStep = 15; // 13px cell + 2px gap
  const step = Math.min(maxStep, Math.max(6, Math.floor(availableWidth / numWeeks)));
  const cellGap = Math.max(1, Math.round(step * 0.15));
  const cellSize = step - cellGap;

  const svgWidth = labelWidth + numWeeks * step;
  const svgHeight = 7 * step + 20;

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {containerWidth > 0 && (
        <svg
          width={svgWidth}
          height={svgHeight}
          style={{ display: 'block' }}
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
              const intensity = day.count > 0 ? Math.max(0.15, day.count / maxCount) : 0;
              return (
                <rect
                  key={day.dateStr}
                  x={labelWidth + wi * step}
                  y={18 + di * step}
                  width={cellSize}
                  height={cellSize}
                  rx={1}
                  fill={intensity > 0
                    ? `color-mix(in srgb, var(--accent-primary) ${Math.round(intensity * 100)}%, var(--bg-elevated))`
                    : 'var(--bg-elevated)'
                  }
                  stroke="var(--bg-primary)"
                  strokeWidth={1}
                >
                  <title>{day.dateStr}: {day.count} sets</title>
                </rect>
              );
            })
          )}
        </svg>
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
