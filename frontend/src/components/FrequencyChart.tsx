import { useRef, useState, useEffect, useMemo } from 'react';
import type { WeeklyFrequency } from '../api/types';

interface Props {
  data: WeeklyFrequency[];
}

export function FrequencyChart({ data }: Props) {
  // Identify current (incomplete) week — show it but exclude from MA
  const currentWeek = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const y = monday.getFullYear();
    const m = String(monday.getMonth() + 1).padStart(2, '0');
    const d = String(monday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

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

  const chart = useMemo(() => {
    if (containerWidth === 0 || data.length === 0) return null;

    const height = 160;
    const pad = { top: 20, right: 8, bottom: 28, left: 32 };
    const width = containerWidth;
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const maxCount = Math.max(...data.map(d => d.session_count));
    const yMax = Math.ceil(maxCount / 2) * 2 || 2;
    const yTicks: number[] = [];
    for (let v = 0; v <= yMax; v += Math.max(1, Math.ceil(yMax / 4))) yTicks.push(v);

    // Rolling average (4-week window, excluding current incomplete week)
    const completedData = data.filter(d => d.week !== currentWeek);
    const rolling = completedData.map((_, i) => {
      const windowStart = Math.max(0, i - 3);
      const window = completedData.slice(windowStart, i + 1);
      return window.reduce((sum, d) => sum + d.session_count, 0) / window.length;
    });

    const toX = (i: number) => pad.left + (i / Math.max(1, data.length - 1)) * plotW;
    const toY = (v: number) => pad.top + plotH - (v / yMax) * plotH;

    // Map completed-data indices back to all-data indices for MA line positioning
    const completedIndices = data
      .map((d, i) => d.week !== currentWeek ? i : -1)
      .filter(i => i >= 0);

    // X-axis labels: show ~5 evenly spaced
    const labelStep = Math.max(1, Math.floor(data.length / 5));
    const xLabels = data
      .map((d, i) => ({ i, label: formatWeekLabel(d.week) }))
      .filter((_, i) => i % labelStep === 0 || i === data.length - 1);

    return { height, width, pad, plotW, plotH, yMax, yTicks, rolling, completedIndices, toX, toY, xLabels };
  }, [data, containerWidth, currentWeek]);

  if (data.length === 0) {
    return (
      <div ref={containerRef} style={{
        fontFamily: 'var(--font-data)',
        fontSize: 12,
        color: 'var(--text-secondary)',
        textAlign: 'center',
        padding: 24,
      }}>
        NO FREQUENCY DATA YET
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {chart && (
        <svg width={chart.width} height={chart.height} style={{ display: 'block' }}>
          {/* Horizontal grid lines */}
          {chart.yTicks.map(tick => (
            <g key={tick}>
              <line
                x1={chart.pad.left} x2={chart.width - chart.pad.right}
                y1={chart.toY(tick)} y2={chart.toY(tick)}
                stroke="var(--border-subtle)" strokeWidth={0.5}
              />
              <text
                x={chart.pad.left - 4} y={chart.toY(tick) + 3}
                textAnchor="end"
                fill="var(--text-secondary)"
                fontSize={9}
                fontFamily="var(--font-data)"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* Bar for each week */}
          {data.map((d, i) => {
            const barWidth = Math.max(4, (chart.plotW / data.length) * 0.6);
            const x = chart.toX(i) - barWidth / 2;
            const barH = (d.session_count / chart.yMax) * chart.plotH;
            const isCurrent = d.week === currentWeek;
            return (
              <rect
                key={d.week}
                x={x}
                y={chart.toY(d.session_count)}
                width={barWidth}
                height={barH}
                fill="var(--accent-cyan)"
                opacity={isCurrent ? 0.18 : 0.35}
                rx={1}
              >
                <title>{d.week}: {d.session_count} sessions{isCurrent ? ' (in progress)' : ''}</title>
              </rect>
            );
          })}

          {/* Rolling average line (completed weeks only) */}
          {chart.rolling.length > 1 && (
            <path
              d={chart.rolling
                .map((v, ri) => {
                  const di = chart.completedIndices[ri];
                  return `${ri === 0 ? 'M' : 'L'}${chart.toX(di).toFixed(1)},${chart.toY(v).toFixed(1)}`;
                })
                .join(' ')}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth={2}
            />
          )}

          {/* Dots on rolling line (completed weeks only) */}
          {chart.rolling.map((v, ri) => (
            <circle
              key={ri}
              cx={chart.toX(chart.completedIndices[ri])}
              cy={chart.toY(v)}
              r={2.5}
              fill="var(--accent-primary)"
            />
          ))}

          {/* X-axis labels */}
          {chart.xLabels.map(({ i, label }) => (
            <text
              key={i}
              x={chart.toX(i)}
              y={chart.height - 4}
              textAnchor="middle"
              fill="var(--text-secondary)"
              fontSize={9}
              fontFamily="var(--font-data)"
            >
              {label}
            </text>
          ))}

          {/* Y axis label */}
          <text
            x={4} y={chart.pad.top - 6}
            fill="var(--text-secondary)"
            fontSize={9}
            fontFamily="var(--font-data)"
          >
            SESSIONS
          </text>
        </svg>
      )}
    </div>
  );
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${d.toLocaleDateString('en', { month: 'short' })}`;
}
