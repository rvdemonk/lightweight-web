import { useRef, useState, useEffect, useMemo } from 'react';
import type { E1rmDataPoint } from '../api/types';

interface Props {
  data: E1rmDataPoint[];
  exerciseName: string;
}

export function E1rmChart({ data, exerciseName }: Props) {
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

  if (data.length === 0) {
    return (
      <div ref={containerRef} style={{
        fontFamily: 'var(--font-data)',
        fontSize: 12,
        color: 'var(--text-secondary)',
        textAlign: 'center',
        padding: 24,
      }}>
        NO DATA FOR {exerciseName.toUpperCase()}
      </div>
    );
  }

  const chart = useMemo(() => computeChart(data, containerWidth), [data, containerWidth]);

  if (!chart || containerWidth === 0) {
    return <div ref={containerRef} style={{ width: '100%', height: 280 }} />;
  }

  const { yMin, yMax, yTicks, gridDates, height, pad } = chart;
  const width = containerWidth;

  const yRange = yMax - yMin || 1;
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  // Time-based x axis: earliest data to today (or beyond for grid fill)
  const firstDate = new Date(data[0].date).getTime();
  const lastDate = Math.max(new Date(data[data.length - 1].date).getTime(), Date.now());
  const xRange = lastDate - firstDate || 1;

  const toX = (dateStr: string) => pad.left + ((new Date(dateStr).getTime() - firstDate) / xRange) * plotW;
  const toY = (v: number) => pad.top + plotH - ((v - yMin) / yRange) * plotH;

  // Rolling best line — extend to today as flat line from last value
  const rollingLine = computeRollingBest(data);
  const todayStr = formatDate(new Date());
  const lastRolling = rollingLine[rollingLine.length - 1];
  const extendedRolling = lastRolling && lastRolling.date < todayStr
    ? [...rollingLine, { date: todayStr, value: lastRolling.value }]
    : rollingLine;
  const rollingPath = extendedRolling
    .map((pt, i) => `${i === 0 ? 'M' : 'L'}${toX(pt.date).toFixed(1)},${toY(pt.value).toFixed(1)}`)
    .join(' ');

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {/* Horizontal grid lines and Y labels */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line
              x1={pad.left} x2={width - pad.right}
              y1={toY(tick)} y2={toY(tick)}
              stroke="var(--border-subtle)" strokeWidth={0.5}
            />
            <text
              x={pad.left - 6} y={toY(tick) + 3}
              textAnchor="end"
              fill="var(--text-secondary)"
              fontSize={9}
              fontFamily="var(--font-data)"
            >
              {Math.round(tick)}
            </text>
          </g>
        ))}

        {/* Vertical grid lines — evenly spaced across full width including future */}
        {gridDates.map(({ dateStr, label }) => {
          const x = pad.left + ((new Date(dateStr).getTime() - firstDate) / xRange) * plotW;
          return (
            <g key={dateStr}>
              <line
                x1={x} x2={x}
                y1={pad.top} y2={pad.top + plotH}
                stroke="var(--border-subtle)" strokeWidth={0.5}
              />
              <text
                x={x} y={height - 4}
                textAnchor="middle"
                fill="var(--text-secondary)"
                fontSize={9}
                fontFamily="var(--font-data)"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Rolling best line — extends to today */}
        {extendedRolling.length > 1 && (
          <path
            d={rollingPath}
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth={2}
          />
        )}

        {/* Session dots */}
        {data.map((pt, i) => (
          <circle
            key={i}
            cx={toX(pt.date)}
            cy={toY(pt.e1rm)}
            r={3.5}
            fill="var(--accent-cyan)"
            opacity={0.7}
          >
            <title>
              {pt.date}: {pt.e1rm.toFixed(1)}kg e1RM ({pt.weight_kg}kg x {pt.reps}{pt.rir !== null ? ` @${pt.rir}RIR` : ''})
            </title>
          </circle>
        ))}

        {/* Y axis label — horizontal */}
        <text
          x={4} y={pad.top - 4}
          fill="var(--text-secondary)"
          fontSize={9}
          fontFamily="var(--font-data)"
        >
          KG
        </text>
      </svg>
    </div>
  );
}

interface GridDate {
  dateStr: string;
  label: string;
}

function computeChart(data: E1rmDataPoint[], containerWidth: number) {
  if (containerWidth === 0) return null;

  const height = 280;
  const pad = { top: 20, right: 16, bottom: 28, left: 44 };

  const e1rms = data.map(d => d.e1rm);
  const rawMin = Math.min(...e1rms);
  const rawMax = Math.max(...e1rms);
  const rangePad = (rawMax - rawMin) * 0.1 || 5;
  const yMin = Math.floor((rawMin - rangePad) / 5) * 5;
  const yMax = Math.ceil((rawMax + rangePad) / 5) * 5;

  const yTicks: number[] = [];
  const tickStep = niceStep((yMax - yMin) / 5);
  for (let v = Math.ceil(yMin / tickStep) * tickStep; v <= yMax; v += tickStep) {
    yTicks.push(v);
  }

  // Grid dates: weekly intervals from first data to today
  const first = new Date(data[0].date);
  const last = new Date(Math.max(new Date(data[data.length - 1].date).getTime(), Date.now()));
  const totalDays = Math.ceil((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));

  // Choose interval: weekly if < 90 days, biweekly if < 180, monthly otherwise
  const intervalDays = totalDays < 90 ? 7 : totalDays < 180 ? 14 : 30;

  const gridDates: GridDate[] = [];
  const cursor = new Date(first);
  let lastMonth = '';
  while (cursor <= last) {
    const dateStr = formatDate(cursor);
    const month = cursor.toLocaleDateString('en', { month: 'short' });
    const day = cursor.getDate();
    const label = month !== lastMonth ? `${day} ${month}` : String(day);
    lastMonth = month;
    gridDates.push({ dateStr, label });
    cursor.setDate(cursor.getDate() + intervalDays);
  }

  return { yMin, yMax, yTicks, gridDates, height, pad };
}

function computeRollingBest(data: E1rmDataPoint[]): { date: string; value: number }[] {
  const result: { date: string; value: number }[] = [];
  for (let i = 0; i < data.length; i++) {
    const cutoff = new Date(data[i].date);
    cutoff.setDate(cutoff.getDate() - 21);
    const cutoffStr = formatDate(cutoff);

    let best = 0;
    for (let j = 0; j <= i; j++) {
      if (data[j].date >= cutoffStr && data[j].e1rm > best) {
        best = data[j].e1rm;
      }
    }
    result.push({ date: data[i].date, value: best });
  }
  return result;
}

function niceStep(rough: number): number {
  const candidates = [1, 2, 2.5, 5, 10, 20, 25, 50];
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  for (const c of candidates) {
    if (c * mag >= rough * 0.8) return c * mag;
  }
  return rough;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
