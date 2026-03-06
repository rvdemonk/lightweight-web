---
Document Context:
  Created: 2026-03-06
  Source: Discussion about analytics page features and exercise science metrics
  Status: DRAFT PLAN
  Purpose: Tiered implementation plan for the Lightweight analytics page
---

# Analytics Page Plan

Metrics and visualisations for the analytics page, prioritised by value-to-effort ratio. All calculations derive from existing data: sets (weight_kg, reps, rir, set_type, completed_at), exercises (muscle_group), and sessions (started_at, ended_at, paused_duration).

---

## Core Metric: Estimated 1RM (e1RM)

The unifying metric for progressive overload across different rep ranges.

**Formula (Epley):** `e1RM = weight * (1 + reps / 30)`

**RIR adjustment:** When RIR is recorded, use `reps + rir` instead of raw reps (estimates reps-to-failure, giving a more accurate e1RM). When RIR is absent, use raw reps — the Epley formula already assumes near-failure sets. Do not fabricate a default RIR.

**Deload/injury resilience:** Plot best e1RM in a rolling 2-3 week window rather than per-session. Light weeks don't crater the trendline because the previous heavy session anchors it. Sustained declines (cuts, detraining) still show clearly. Zero user input required — no "mark as deload" friction.

**Display:** Session e1RMs as scatter dots, rolling-best as a line. Dots dip during light weeks, line holds steady. Both decline during a real cut — that's signal, not noise.

## Tier 1 — Aggregations (SQL only, no formulas)

### 1a. Activity Heatmap [DONE]
- Calendar grid (GitHub contribution style), auto-sizing, 16-week minimum window
- Heat intensity = total working sets completed that day
- Pure SVG, ResizeObserver for responsive sizing

### 1b. Weekly Volume (Total Sets) [DONE]
### 1c. Sets Per Muscle Group Per Week [DONE]
- Combined into single stacked bar chart with three-way toggle: Total / Upper-Lower-Core / Muscle Group
- High-contrast hardcoded colours for theme compatibility

### 1d. Session Frequency [DONE]
- Workouts per week bar chart with 4-week rolling average line
- Amber trend line, cyan bars

## Tier 2 — Calculated Metrics

### 2a. e1RM Progression Chart [DONE]
- Per-exercise line chart with cyan scatter dots (session best) and amber rolling-best line (21-day window)
- Rolling line extends to today as flat line showing current ceiling
- Time-based x-axis, auto-selects exercise with most data, RIR-adjusted when available

### 2b. Personal Records [DONE]
- Three square cards below chart: best e1RM, heaviest weight, most reps
- Computed server-side in same endpoint as e1RM data
- 30-day delta on e1RM card in green/red

### 2c. Average RIR Trend
- For users recording RIR: mean RIR per session over time
- Trending down = training harder / closer to failure
- Only show when sufficient RIR data exists

## Tier 3 — Insights

### 3a. Plateau Detection
- e1RM flat (+/- noise) for N weeks on a given lift
- "STAGNATION WARNING: BENCH PRESS — 4 WEEKS NO PROGRESSION"
- Requires e1RM chart as prerequisite

### 3b. Muscle Group Balance [DONE]
- Radar/spider chart with multi-span overlay (4W/8W/12W), normalised to sets/week
- All ever-trained groups shown, zero groups in red, polygonal grid rings
- Multi-select toggles: cyan (4W), amber (8W), muted (12W)

### 3c. Session Duration Trend
- `ended_at - started_at - paused_duration` over time
- Training density: volume per unit time

## Implementation Order

1. **Activity heatmap** (1a) — pure SQL aggregation, high visual impact, standalone
2. **e1RM progression chart** (2a) — the centrepiece, highest analytical value
3. **Weekly volume** (1b) + **sets per muscle group** (1c) — natural companions
4. **Personal records** (2b) — builds on e1RM calculation already implemented
5. Remaining tier 2-3 as appetite dictates

## Technical Notes

- All queries scoped to authenticated user (user_id)
- Filter by `set_type = 'working'` for volume/e1RM calculations (exclude warmups)
- Frontend charting: pure SVG, no library dependencies
- API endpoints: `/api/v1/analytics/heatmap`, `/analytics/exercises`, `/analytics/e1rm/:id`, `/analytics/volume`
- One endpoint per chart, read-only
