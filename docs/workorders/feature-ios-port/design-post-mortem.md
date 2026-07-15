---
created: 2026-07-16
status: RATIFIED 2026-07-16 (supervisor + Lewis) — all open questions resolved, see §7 rulings
tags: [ios, design, post-mortem, workout, feature-ios-port]
source: "Supervisor + Lewis brief (2026-07-16) — workout post-mortem/summary screen for the Lightweight iOS app"
purpose: Buildable design spec for the end-of-workout post-mortem screen, handed verbatim to an implementation agent.
---

# Workout Post-Mortem — Design

When Lewis ends a workout, the app shows a one-screen summary: PRs hit, slots beaten, a per-exercise
verdict, a PR sparkline in context, session vitals, and weekly frequency. The same screen is reachable
later from that session's history detail, so it is a persistent artefact, not an ephemeral congratulation.

Everything the screen displays is answerable from the **local GRDB store** — the session is fully
written locally at `finish()` before the screen appears. The post-mortem never waits on the network;
the sync push runs in the background and its success/failure surfaces where it already does (Home /
History via `appState.syncState`), not here. This is the design's backbone: **the post-mortem is
sync-agnostic and works fully offline.**

This doc is written against the code as it stands 2026-07-16. Key reuse target:
`AppDatabase.sessionDetail(id:)` (`Store/AppDatabase.swift`) already returns, per exercise, the
session's `sets`, the pre-session `baselineBestE1rm`, and the previous session's `previousSets` —
which is nearly the entire data spine for this screen.

---

## 1. Presentation & navigation

### 1.1 The End-Workout path (recommended: content swap inside the existing cover)

The active workout is presented app-wide as the **sole** `fullScreenCover` on `MainTabView`
(`appState.workoutPresented`, see `MainTabView.swift` and the AppState note "one cover, one live
instance"). The current End flow (`ActiveWorkoutView.finish`) is:

```
confirmEnd dialog → workout.finish() → refreshActiveSession() → await pushCompletedSessions() → dismiss()
```

**Recommendation:** do not `dismiss()` straight to Home. Instead, **swap the cover's content** from the
active workout to the post-mortem, driven by a lightweight coordinator wrapping the cover root:

```swift
// New: WorkoutFlowView is the fullScreenCover root (replaces the bare NavigationStack{ActiveWorkoutView()})
enum WorkoutPhase: Equatable { case logging, review(sessionId: Int64) }

struct WorkoutFlowView: View {
    @State private var phase: WorkoutPhase = .logging
    var body: some View {
        switch phase {
        case .logging:
            NavigationStack { ActiveWorkoutView(onFinished: { id in
                withAnimation(.smooth) { phase = .review(sessionId: id) }
            }) }
        case .review(let id):
            NavigationStack { PostMortemView(sessionId: id, mode: .review) }
        }
    }
}
```

`ActiveWorkoutView.finish` changes from `dismiss()` to:

```swift
try workout.finish()
appState.refreshActiveSession()          // bar drops immediately (unchanged)
Task { await appState.pushCompletedSessions() }   // fire-and-forget; NOT awaited before review
onFinished(workout.sessionId)            // hand off to the coordinator
```

Rationale, grounded in iOS 26 conventions:
- **No back-to-corpse.** A pushed child on the workout's own `NavigationStack` would give an
  interactive swipe-back to a workout that is already `completed` — incoherent. A content swap presents
  the summary as a clean full-screen takeover with no back affordance (the Apple Fitness "end → summary
  → Done" shape).
- **Preserves the one-cover invariant.** No second cover/sheet stacked over the first (which AppState's
  design note explicitly guards against). Dismissal remains the single `workoutPresented = false`.
- **Sync stays non-blocking.** Because the review screen is local-only, the push no longer gates the
  transition; a slow or failed push never delays or corrupts the summary.

`PostMortemView` in `.review` mode shows a single prominent **Done** toolbar item in
`.confirmationAction` (auto `.glassProminent` per the glass guide), which sets
`appState.workoutPresented = false`. Home's existing `onChange(workoutPresented)` reload then repaints
the fresh stats.

**Alternative considered (not recommended):** push `PostMortemView` via `navigationDestination` on the
workout's stack with `.navigationBarBackButtonHidden(true)`. Simpler by ~15 lines, but it leans on
hiding system chrome to suppress a back gesture that shouldn't exist, and the completed workout remains
alive one level down. The swap is cleaner for a marginal cost.

### 1.2 The History path

Reuse the same `PostMortemView(sessionId:)` in `.history` mode. Add a toolbar affordance to
`SessionDetailView` (`Features/History/SessionDetailView.swift`) — a trailing button,
`Image(systemName: "chart.line.uptrend.xyaxis")`, label "Summary" — that pushes it via the existing
`NavigationStack`:

```swift
.toolbar { ToolbarItem(placement: .topBarTrailing) {
    NavigationLink { PostMortemView(sessionId: sessionId, mode: .history) } label: {
        Image(systemName: "chart.line.uptrend.xyaxis")
    }.accessibilityLabel("Summary")
}}
```

Here a **standard push with back is correct** — the user came from the set-by-set ledger and back
returns to it. `mode` differentiates the two entries:

| mode | leading | trailing | notes |
|---|---|---|---|
| `.review` (end-workout) | none | **Done** (glassProminent) → `workoutPresented = false` | full-screen takeover, no back |
| `.history` (pushed) | system back | none | normal navigation child |

The two screens (detail = the exhaustive ledger, post-mortem = the narrative) stay distinct rather than
merged; the detail's set rows and the post-mortem's verdicts read as the same surface at two altitudes.

---

## 2. Layout

One vertical `ScrollView` in the content layer (standard materials, **never** `.glassEffect` in the
scroll body — see `Theme.swift` / `ios/CLAUDE.md`). Section order = descending emotional weight; PRs sit
at the summit. Chrome (nav bar) is automatic glass.

Nav bar (iOS 26): `navigationTitle(title.uppercased())` where `title` = template name ?? session name ??
"Freeform"; `navigationSubtitle("\(dayLabel) · \(duration)")`. Inline display mode.

```
┌──────────────────────────────────────────────┐  ← glass nav bar (auto)
│  LOWER X                                       │     navigationTitle
│  Thu 16 Jul 2026 · 58m                         │     navigationSubtitle
├──────────────────────────────────────────────┤
│                                                │  ScrollView (content layer)
│  ── PRs ──────────────────────  (metaLabel)    │  §A  SUMMIT
│                                                │
│   INCLINE DUMBBELL CURL           (exerciseTitle, condensed caps)
│   e1RM 18.5   ▲ new best          (titleData, GREEN)   · 12.5 × 14
│   ╭────────────────────────────╮               │      sparkline (weekly-best, 12wk)
│   │      ·  ·  ·  ·      ● 18.5 │  +3.2kg       │      amber line, end dot, delta label
│   ╰────────────────────────────╯   since Apr   │
│                                                │
│  ── SLOTS ────────────────────                 │  §B
│   7 of 12 slots beat last session   (data, amber "7")
│                                                │
│  ── EXERCISES ────────────────                 │  §C  VERDICTS
│   SQUAT                       Lighter day       │      row per exercise
│   ROMANIAN DEADLIFT           PR                │      (PR green; rest secondary)
│   LEG PRESS                   Progressed        │
│   INCLINE DUMBBELL CURL       PR                │
│                                                │
│  ── SESSION ──────────────────                 │  §D  VITALS (3 tiles, like Home statsRow)
│   ┌─────────┬─────────┬─────────┐              │
│   │ 58m     │ 12      │ 4,850kg │              │      Duration · Sets · Tonnage
│   │ TIME    │ SETS    │ +320 ▲  │              │      tonnage Δ vs comparable session
│   └─────────┴─────────┴─────────┘              │
│                                                │
│   3rd session this week          (data, secondary)  §E  FREQUENCY
│                                                │
└──────────────────────────────────────────────┘
```

Hierarchy / token rules:
- Section headers: `.metaLabel()` (13pt tracked caps) — the sole sub-17pt style, structural furniture.
- Exercise names: `Theme.exerciseTitle` (22pt condensed), rendered `.uppercased()`, matching every other
  surface.
- All numbers `.monospacedDigit()`; PR values `Theme.titleData`. Numeric transitions use
  `.contentTransition(.numericText())` where a value can animate in.
- **Color discipline (unchanged from the system):** green = PR only (PR values, PR verdicts, "new best").
  Amber = target/win accent (the slots-beaten count, the tonnage-up triangle, the sparkline line/dot).
  Everything else `.primary` / `.secondary`. **Red is never used** — a lighter day is not destructive and
  must not read as one.
- 17pt floor on all data/numbers. Cards: `Color(.secondarySystemBackground)` +
  `RoundedRectangle(cornerRadius: Theme.cardRadius)`, identical to Home/Data tiles.
- Vitals tiles reuse the exact `statTile` pattern from `HomeView`/`DataView` (do not reinvent).

---

## 3. Data model & queries

**Primary source:** one call to `AppDatabase.sessionDetail(id:)` yields `SessionDetail` with, per
`ExerciseDetail`: `sets: [SetRecord]`, `baselineBestE1rm: Double?` (best e1RM *before* this session,
`status='completed' AND started_at < session.startedAt`), and `previousSets: [SetRecord]` (the most
recent earlier session's sets for that exercise). This already carries calibration semantics (nil
baseline for first exposure) and drives §A, §B, §C without new queries.

Define one derived model built once from `SessionDetail`:

```swift
struct PostMortem {
    struct ExerciseOutcome {
        let name: String
        let sessionBestE1rm: Double?     // Calc.bestE1rm(sets)
        let prevBestE1rm: Double?        // Calc.bestE1rm(previousSets)
        let baselineE1rm: Double?        // ExerciseDetail.baselineBestE1rm
        let isPR: Bool
        let prSet: SetRecord?            // the set whose e1rm == sessionBest (evidence)
        let verdict: Verdict
        let isBodyweight: Bool           // every set weightKg == nil
        let bestReps: Int                // max reps this session (BW fallback dimension)
        let prevBestReps: Int            // max reps in previousSets
    }
    enum Verdict { case pr, progressed, held, lighter, firstTime }
    let outcomes: [ExerciseOutcome]
    let prs: [ExerciseOutcome]           // outcomes.filter(\.isPR), PR-only summit
    let slotsBeaten: Int
    let slotsComparable: Int             // denominator
    let durationLabel: String?
    let totalSets: Int
    let tonnageKg: Double
    let tonnageDelta: Double?            // nil when no comparable session
    let sessionsThisWeek: Int
}
```

### §A — PRs hit
Per exercise: `sessionBest = Calc.bestE1rm(sets.map{($0.weightKg,$0.reps)})`.
`isPR = sessionBest != nil && baselineBestE1rm != nil && sessionBest! > baselineBestE1rm!` — strict beat,
never against nil baseline (calibration). `prSet` = first set whose `Calc.e1rm` equals `sessionBest`
(the "12.5 × 14" evidence line). This is exactly the active screen's `isPR` and `detect_prs` semantics.
No new query.

*Bodyweight PRs:* e1RM is nil for BW, so weighted-PR logic can't fire. A pure-BW exercise (e.g.
PULL-UPS) gets a PR when its max reps this session strictly beats its all-time BW max. This needs one
small query (baseline reps are not in `sessionDetail`):

```swift
// bestBodyweightRepsBefore(exerciseId:, startedAt:) -> Int
"SELECT COALESCE(MAX(st.reps),0) FROM sets st
   JOIN session_exercises se ON st.session_exercise_id = se.id
   JOIN sessions s ON se.session_id = s.id
  WHERE se.exercise_id = ? AND st.weight_kg IS NULL
    AND s.status='completed' AND s.started_at < ?"
```
BW PR is a single-dimension record (reps at bodyweight) — no cross-weight comparison, so it does not
violate the e1RM-normalization rule. See Open Question 1 on whether BW PRs ship in v1.

### §B — Slots beaten
Reuse the exact slot logic from `SessionDetailView.badge` (e1RM-normalized; BW-vs-BW = raw reps race).
For every set across all exercises whose owning exercise has non-empty `previousSets`:
match the same-numbered previous set (fallback: previous session's last set), and count a win when
`Calc.e1rm(set) > Calc.e1rm(matchedSlot)` (or `set.reps > slot.reps` for BW-vs-BW). A PR set that also
clears its slot counts once.
`slotsComparable` (denominator) = count of sets belonging to exercises with a previous session.
Copy: `"\(slotsBeaten) of \(slotsComparable) slots beat last session"`. No new query.

### §C — Per-exercise verdict
From the same per-exercise values (`prevBest = Calc.bestE1rm(previousSets)`):
```
baselineBestE1rm == nil  → .firstTime          // no prior completed session with this lift
sessionBest > baseline   → .pr
else vs prevBest:  > +ε   → .progressed
                  |Δ| ≤ ε → .held
                  < −ε    → .lighter            // "Lighter day", never "regression"
```
`ε` = 0.1 (kg-e1RM) to absorb float noise on equal work. BW exercises substitute `bestReps` vs
`prevBestReps` (integer compare, ε=0). No trend/multi-week decline logic in v1 (Open Question 4).
No new query.

### §D — Session vitals
- **Duration:** `ServerDate.duration(from: session.startedAt, to: session.endedAt)`. Recommend a
  paused-aware variant that subtracts `session.pausedDuration` seconds ("time training"), since the
  field exists and is carried through sync (Open Question 3). Format identical to the existing helper
  (`"58m"`, `"1h 12m"`).
- **Total sets:** `outcomes` sum of `sets.count` (or reuse `HistoryItem.setCount`).
- **Tonnage:** `Σ weightKg × reps` over sets with a weight (BW sets contribute 0 — a known undercount for
  BW-heavy days; do **not** invent a bodyweight-load model for v1, flag it in copy only if it matters).
  New tiny query or in-Swift sum over `sessionDetail`.
- **Tonnage Δ:** only defined for templated sessions — compare to the most recent earlier completed
  session with the same `template_id`. Two small queries:
  ```swift
  // previousComparableSessionId(templateId:, before:) -> Int64?
  "SELECT id FROM sessions WHERE template_id = ? AND status='completed'
     AND started_at < ? ORDER BY started_at DESC LIMIT 1"
  // sessionTonnage(sessionId:) -> Double
  "SELECT COALESCE(SUM(st.weight_kg * st.reps),0) FROM sets st
     JOIN session_exercises se ON st.session_exercise_id = se.id
    WHERE se.session_id = ? AND st.weight_kg IS NOT NULL"
  ```
  Freeform sessions (`template_id IS NULL`) → `tonnageDelta = nil`, show tonnage alone (Open Question 2).

### §E — Frequency
`sessionsThisWeek` = `statsSince(utc:).sessions` with `utc` = ISO of the local week start (the exact
pattern already in `HomeView.reload`). The just-finished session is `completed`, so it is included →
"3rd session this week". Ordinal via a small formatter (`1st/2nd/3rd…`). No new query.

### §A sparkline data (per PR exercise)
Weekly-**best** e1RM over ~12 weeks — **weekly max, not EMA and not per-session** (a light day must not
dent the curve; that is the whole point). New query + a Swift week-bucket, mirroring
`DataView.weekBuckets`:

```swift
// weeklyBestE1rm(exerciseId:, sinceWeeks: 12) -> [(weekStart: Date, e1rm: Double)]
"SELECT s.started_at AS at, MAX(st.weight_kg * (1.0 + st.reps/30.0)) AS best
   FROM sessions s
   JOIN session_exercises se ON se.session_id = s.id
   JOIN sets st ON st.session_exercise_id = se.id
  WHERE se.exercise_id = ? AND s.status='completed'
    AND s.started_at >= datetime('now', '-84 days')
    AND st.weight_kg IS NOT NULL AND st.weight_kg > 0 AND st.reps > 0
  GROUP BY s.id ORDER BY s.started_at"
```
Then bucket rows into calendar weeks taking `max(e1rm)` per week (reuse the `Calendar.weekOfYear` bucket
from `DataView.weekBuckets`, `MAX` instead of `SUM`). Include only weeks with data; draw a monotone line
through them (gaps close naturally — a sparkline, not a calendar).
Delta label `"+\(Int(last-first))kg since \(monthName(firstWeek))"`.

**Local DB scope note:** every number above is answerable locally. Nothing here needs server work. The
only genuine limitations are inherent to the data: BW sets have no e1RM and no tonnage (single-dimension
rep records used instead), and "comparable session" tonnage Δ is undefined for freeform.

---

## 4. States

The screen renders **once** and is static, so it does not have the active screen's mid-workout
line-jitter hazard. Even so, keep **section scaffolding stable**: every section (§A–§E) always renders
with its header and a filled-or-placeholder body — no whole section silently vanishes. The one
legitimately-absent element is the sparkline, because it is intrinsically PR-keyed (no PR → no curve);
that is a section presence decision, not a jittering line.

| State | Behaviour |
|---|---|
| **First workout ever** (empty history) | Every exercise `baseline==nil` → all verdicts "First time". §A shows the calm placeholder ("No PRs yet — first time on record"), no sparkline. §B: `slotsComparable==0` → "No prior session to compare". §D tonnage shown, Δ nil. §E "1st session this week". |
| **No PRs hit** | §A collapses to one line: "No PRs today" + a quiet second line "Steady work — \(slotsBeaten) slots beaten". Header stays. No sparkline. §B–§E normal. |
| **PR hit but thin history** (< 3 weekly points for that lift) | Show the PR value + evidence set, but **no sparkline** — substitute "First PR on record" (mirrors DataView's "three sessions draws a line" honesty). No trivial 1–2 point chart. |
| **Freeform session** | Title "FREEFORM". §D tonnage without Δ. All else identical (verdicts/PRs/slots are per-exercise and template-agnostic). |
| **Single-exercise session** | §A/§C/§B all valid at N=1; one verdict row, "M of N slots", at most one sparkline. |
| **Bodyweight-only session** | e1RM PRs impossible; BW rep-PRs per §A (if shipped). Tonnage = 0 → §D shows "—" for tonnage with a caption "bodyweight" rather than "0 kg" (never render a misleading 0). Verdicts use the reps dimension. |
| **Offline** | Fully renders — all-local. The background `pushCompletedSessions()` may fail; that surfaces only on Home/History via `syncState`, never on this screen. |
| **Empty session finished** (0 sets) | End is already `disabled` at 0 sets in `ActiveWorkoutView`, so this screen is unreachable from End. From history it is reachable in principle: show a minimal "No sets logged" state (§A–§E placeholders). Low priority. |

---

## 5. Copy bank

**Section headers** (`.metaLabel()`, rendered uppercase): `PRs` · `Slots` · `Exercises` · `Session` ·
(no header for the single frequency line).

**Nav:** title = template/session name uppercased, or `FREEFORM`. Subtitle = `"\(dayLabel) · \(duration)"`.

**§A PRs:**
- PR row value: `"e1RM \(oneDecimal(sessionBest))"` + `"new best"` (green) + evidence `"\(weight) × \(reps)"`.
- BW PR row value: `"\(reps) reps"` + `"new best"` + `"bodyweight"`.
- Sparkline delta: `"+\(Int(delta))kg since \(month)"` (e.g. "+3kg since Apr"). If delta ≤ 0 in-window
  but a PR still landed this week: `"new peak"` (no negative delta shown — never frame a PR as a loss).
- No-PR placeholder: `"No PRs today"` / second line `"Steady work — \(slotsBeaten) slots beaten"`.
- First-ever placeholder: `"No PRs yet — first time on record"`.

**§B Slots:** `"\(n) of \(m) slots beat last session"`. When `m == 0`: `"No prior session to compare"`.

**§C Verdict vocabulary** (the whole set — no other words; **never** "regression", "decline", "failed",
"worse", "down"):
| verdict | label | color |
|---|---|---|
| `.pr` | `PR` | green |
| `.progressed` | `Progressed` | secondary |
| `.held` | `Held` | secondary |
| `.lighter` | `Lighter day` | secondary |
| `.firstTime` | `First time` | secondary |

**§D Vitals tile labels** (`.metaLabel()`): `TIME` · `SETS` · `TONNAGE`.
- Tonnage value: `"\(grouped(tonnageKg))kg"` (thousands separator). BW-only → `"—"` value, caption `bodyweight`.
- Tonnage Δ (amber when +, secondary when −/0, never red): `"+\(Int(delta)) ▲"` / `"\(Int(delta)) ▼"`;
  hidden when `tonnageDelta == nil`.
- Duration: `"58m"` / `"1h 12m"`.

**§E Frequency:** `"\(ordinal(sessionsThisWeek)) session this week"` (e.g. "3rd session this week").

**Done button** (`.review` mode): `Done`.

---

## 6. Chart approach (sparkline)

Swift Charts, one series, one exercise. It bends the amber-only rule the *least* — a single series, so
amber (the hero-lift color per `ChartTheme`) is the only line color; green/red stay reserved.

- **Data:** weekly-best e1RM points (§3), monotone interpolation. **No EMA** (DataView EMAs per-session
  bests; here the weekly-max buckets already do the smoothing that keeps light days from denting the
  curve — do not double-smooth).
- **Marks:** `LineMark` amber at `ChartTheme.lineAlpha` (0.7), `lineWidth` 2, `.interpolationMethod(.monotone)`;
  terminal `PointMark` amber full-opacity, `symbolSize(36)` — identical to DataView's end-dot idiom.
- **Axes:** minimal sparkline. `.chartYAxis(.hidden)`, `.chartLegend(.hidden)`. X axis either hidden or a
  single sparse `AxisMarks(values: .stride(by: .month))` with `Theme.label` font — prefer hidden inside
  the compact card; the "+3kg since Apr" text label carries the context instead.
- **Y domain:** hug the data — `[min*0.98 ... max*1.02]` (a PR curve never needs a zero baseline; a
  zero-anchored axis would flatten a +3kg move into nothing). Do **not** copy DataView's zero-anchored
  domain here.
- **Height:** compact — add `ChartTheme.sparkHeight` ≈ 88 (well below `chartHeight` 240). The card holds:
  exercise name, PR value line, sparkline, delta label.
- **Multiple PRs:** one sparkline per PR exercise, stacked in §A. If PRs are many (rare), cap the summit
  at the top 3 by e1RM-gain and list the rest as text PR rows without charts (keeps the screen one
  scroll, not a chart wall). See Open Question 5.

---

## 7. Open questions — RATIFIED 2026-07-16

> **Rulings:** Q1 → (a) single e1RM PR, evidence set shown, BW rep-PRs ship (Lewis). Q2 → as recommended
> (Δ same-template only). Q3 → training time (subtract paused). Q4 → as recommended ("Lighter day" stays;
> zero trend-decline logic in v1). Q5 → cap 3 sparklines, ranked by e1RM gain. Presentation §1 content-swap
> coordinator: approved. Build exactly this; original questions kept below for context.

**1. PR taxonomy: single e1RM PR vs weight/rep/e1RM split.**
The brief lists "weight/rep/e1RM PRs." *Situation:* a raw "weight PR" (heaviest load ever) and a "rep PR"
sit uneasily beside CLAUDE.md's hard rule "don't compare sets across sessions by raw weight×reps —
normalize through e1RM," and "rep PR" is ambiguous in the local data (most reps ever? at a given load?).
*Options:* (a) single **e1RM PR**, with the achieving set (`weight × reps`) shown as evidence — the weight
and reps are *visible* without being independent comparison axes; (b) three PR categories with separate
detection. *Recommendation:* **(a) for v1.** It matches the active screen's PR language, `detect_prs`, and
the design system exactly, and still surfaces weight+reps on screen. Ship BW rep-PRs (single-dimension,
rule-safe) as the one deliberate non-e1RM record. Revisit a load-PR badge post-v1 if Lewis wants it.

**2. Freeform tonnage comparison.** *Situation:* "tonnage vs last comparable session" is well-defined only
for templated sessions (same `template_id`). Freeform sessions share the name "Freeform" and differ in
exercises, so a Δ would be noise. *Recommendation:* templated → Δ vs same-template prior; freeform →
tonnage alone, no Δ. Confirm this is acceptable rather than forcing a misleading number.

**3. Duration definition.** Gross elapsed (`ended-started`) vs training time (`− pausedDuration`).
*Recommendation:* subtract paused ("time training") since the field exists and is the more honest number;
confirm.

**4. "Lighter day" vs omitting decline.** The brief both lists "lighter day" as a verdict and says "prefer
omitting decline verdicts entirely (for v1)." *Reading:* the omission targets *multi-week trend* decline
language (the "regression" kind), which v1 does not compute at all. A single lighter session still needs
*some* verdict, and "Lighter day" is the sanctioned neutral framing. *Recommendation:* **keep "Lighter
day"** as the session-over-session verdict; ship **no** trend-based decline logic. Confirm this reconciles
the two lines as intended.

**5. Summit cap when many PRs.** *Situation:* a big session could hit 4+ PRs, each wanting a sparkline →
a chart wall. *Recommendation:* cap sparklines at the top 3 PRs by e1RM gain; remaining PRs list as text
rows. Confirm the cap (3) and the ranking (gain vs alphabetical).
