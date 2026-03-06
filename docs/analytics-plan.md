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

### 1a. Activity Heatmap
- Calendar grid (GitHub contribution style), trailing 12 months
- Heat intensity = total sets completed that day
- Immediately satisfying, zero complexity

### 1b. Weekly Volume (Total Sets)
- Bar chart: total working sets per week
- The single metric most correlated with hypertrophy (Schoenfeld et al.)
- Filter: all exercises, or by muscle group

### 1c. Sets Per Muscle Group Per Week
- Stacked bar or grouped bar chart
- Requires muscle_group on exercises (already in schema)
- Answers "am I training balanced?"

### 1d. Session Frequency
- Workouts per week, rolling average
- Simple line chart

## Tier 2 — Calculated Metrics

### 2a. e1RM Progression Chart
- THE progressive overload chart
- Per-exercise line chart with scatter dots (session best) and rolling-best line
- Exercise selector dropdown
- Highest value, most visually striking

### 2b. Personal Records
- Best e1RM, heaviest single, most reps at a given weight, per exercise
- PR detection with dates
- "NEW RECORD DETECTED" display moments

### 2c. Average RIR Trend
- For users recording RIR: mean RIR per session over time
- Trending down = training harder / closer to failure
- Only show when sufficient RIR data exists

## Tier 3 — Insights

### 3a. Plateau Detection
- e1RM flat (+/- noise) for N weeks on a given lift
- "STAGNATION WARNING: BENCH PRESS — 4 WEEKS NO PROGRESSION"
- Requires e1RM chart as prerequisite

### 3b. Muscle Group Balance
- Radar/spider chart of weekly sets by muscle group
- Very NERV, very visual

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
- Frontend charting: lightweight library TBD (recharts, chart.js, or raw SVG for heatmap)
- API endpoints under `/api/analytics/*`, keep read-only and simple
- Consider a single flexible endpoint vs. one per chart — lean toward one per chart for simplicity
