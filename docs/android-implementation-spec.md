---
Document Context:
  Created: 2026-04-13
  Status: BINDING SPEC
  Purpose: Complete implementation spec for Android app screens and components, designed for parallel agent execution
---

# Android Implementation Spec

Spec for building out the Lightweight Android app from the current scaffold (placeholder screens, theme, Room DB, navigation). Each work package is self-contained for parallel implementation.

---

## Architecture

### Local-first data flow
- **Room** is the source of truth for all workout data (exercises, templates, sessions, sets)
- **Retrofit** is used only for auth (login, register, join, logout) and invites
- **lightweight-calc** (future UniFFI) provides e1RM, PR detection, trend analysis — for now, reimplement the math in Kotlin (it's simple: Epley formula + running max tracking)
- All user_id values use `TokenStore.LOCAL_USER_ID` (constant `1L`)

### ViewModel pattern
- Each screen gets a `@HiltViewModel` with `@Inject constructor`
- ViewModels expose `StateFlow<ScreenState>` to Compose
- Compose collects via `collectAsStateWithLifecycle()`
- Mutations go: UI event → ViewModel method → Repository → Room DAO
- No network calls for workout data

### State pattern
Each screen defines a sealed interface or data class for its UI state:
```kotlin
data class ScreenState(
    val isLoading: Boolean = true,
    val data: T? = null,
    val error: String? = null,
)
```

### Navigation
- Routes defined in `ui/navigation/Routes.kt` (already exists)
- Navigation callbacks passed as lambdas from NavGraph to screens
- ViewModels do NOT hold NavController references

### Theme access
All composables use `LightweightTheme.colors` and `LightweightTheme.typography`. Never hardcode colors, fonts, or dimensions. Key tokens:
- Colors: `bgPrimary`, `bgSurface`, `bgElevated`, `textPrimary`, `textSecondary`, `accentPrimary`, `accentCyan`, `accentGreen`, `accentRed`, `borderSubtle`, `borderActive`
- Typography: `label` (display font), `cardTitle` (display), `pageTitle` (display), `button` (body), `body` (body), `data` (mono), `dataLarge` (mono)
- Dimensions: `CardRadius` (2dp), `MinTouchTarget` (44dp), `CardPadding` (16dp), `PagePadding` (16dp)

---

## Domain Models

These Kotlin data classes live in a new `domain/` package. They are what ViewModels work with — mapped from Room entities in the repository layer. Keep them simple, no Room annotations.

```kotlin
// domain/model/Exercise.kt
data class Exercise(
    val id: Long,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
)

// domain/model/Template.kt
data class Template(
    val id: Long,
    val name: String,
    val notes: String?,
    val version: Int,
    val exercises: List<TemplateExercise>,
)

data class TemplateExercise(
    val id: Long,
    val exerciseId: Long,
    val exerciseName: String,
    val position: Int,
    val targetSets: Int?,
    val targetRepsMin: Int?,
    val targetRepsMax: Int?,
    val restSeconds: Int?,
    val notes: String?,
)

// domain/model/Session.kt
data class Session(
    val id: Long,
    val templateId: Long?,
    val templateName: String?,
    val name: String,
    val startedAt: String,
    val endedAt: String?,
    val pausedDuration: Int,
    val notes: String?,
    val status: String, // "active", "paused", "completed", "abandoned"
    val templateVersion: Int?,
    val exercises: List<SessionExercise>,
)

data class SessionExercise(
    val id: Long,
    val exerciseId: Long,
    val exerciseName: String,
    val position: Int,
    val notes: String?,
    val sets: List<WorkoutSet>,
)

data class WorkoutSet(
    val id: Long,
    val setNumber: Int,
    val weightKg: Double?,
    val reps: Int?,
    val setType: String,
    val rir: Int?,
    val completedAt: String?,
)

// domain/model/SessionSummary.kt (for history list)
data class SessionSummary(
    val id: Long,
    val templateName: String?,
    val name: String,
    val startedAt: String,
    val endedAt: String?,
    val status: String,
    val exerciseCount: Int,
    val setCount: Int,
    val targetSetCount: Int?, // from template, for color coding
)

// domain/model/DayActivity.kt (for heatmap)
data class DayActivity(
    val date: String, // "YYYY-MM-DD"
    val setCount: Int,
)
```

---

## Additional Room Queries

These DAO methods must be added to support the screens. Add them to the existing DAO files.

### SessionDao additions
```kotlin
// Full session with exercises and sets — returns raw rows, repository maps to domain model
@Query("""
    SELECT se.id as se_id, se.exercise_id, e.name as exercise_name, se.position, se.notes as se_notes,
           st.id as set_id, st.set_number, st.weight_kg, st.reps, st.set_type, st.rir, st.completed_at
    FROM session_exercises se
    JOIN exercises e ON e.id = se.exercise_id
    LEFT JOIN sets st ON st.session_exercise_id = se.id
    WHERE se.session_id = :sessionId
    ORDER BY se.position, st.set_number
""")
suspend fun getSessionExercisesWithSets(sessionId: Long): List<SessionExerciseSetRow>

// Session summaries for history list
@Query("""
    SELECT s.id, s.template_id, s.name, s.started_at, s.ended_at, s.status,
           (SELECT COUNT(*) FROM session_exercises WHERE session_id = s.id) as exercise_count,
           (SELECT COUNT(*) FROM sets st JOIN session_exercises se ON se.id = st.session_exercise_id WHERE se.session_id = s.id) as set_count
    FROM sessions s
    WHERE s.user_id = :userId
    ORDER BY s.started_at DESC
    LIMIT :limit OFFSET :offset
""")
suspend fun getSummaries(userId: Long, limit: Int, offset: Int = 0): List<SessionSummaryRow>

// Update session status
@Query("UPDATE sessions SET status = :status, ended_at = CASE WHEN :status IN ('completed', 'abandoned') THEN datetime('now') ELSE ended_at END WHERE id = :id")
suspend fun updateStatus(id: Long, status: String)

// Update paused duration
@Query("UPDATE sessions SET paused_duration = :pausedDuration WHERE id = :id")
suspend fun updatePausedDuration(id: Long, pausedDuration: Int)

// Update exercise notes
@Query("UPDATE session_exercises SET notes = :notes WHERE id = :id")
suspend fun updateExerciseNotes(id: Long, notes: String?)

// Delete empty sessions (no sets logged)
@Query("""
    DELETE FROM sessions WHERE id = :id
    AND (SELECT COUNT(*) FROM sets st JOIN session_exercises se ON se.id = st.session_exercise_id WHERE se.session_id = :id) = 0
""")
suspend fun deleteIfEmpty(id: Long)
```

### ExerciseDao additions
```kotlin
// Search exercises by name (for picker)
@Query("SELECT * FROM exercises WHERE user_id = :userId AND archived = 0 AND name LIKE '%' || :query || '%' ORDER BY name")
suspend fun search(userId: Long, query: String): List<ExerciseEntity>
```

### New: AnalyticsDao
```kotlin
@Dao
interface AnalyticsDao {
    // Heatmap: set counts per day
    @Query("""
        SELECT date(s.started_at) as date, COUNT(st.id) as set_count
        FROM sessions s
        JOIN session_exercises se ON se.session_id = s.id
        JOIN sets st ON st.session_exercise_id = se.id
        WHERE s.user_id = :userId AND s.status = 'completed'
          AND s.started_at >= date('now', '-' || :days || ' days')
        GROUP BY date(s.started_at)
        ORDER BY date(s.started_at)
    """)
    suspend fun getActivityHeatmap(userId: Long, days: Int): List<DayActivityRow>

    // Previous sets for an exercise (most recent completed session before current)
    @Query("""
        SELECT st.weight_kg, st.reps, st.rir, st.set_number
        FROM sets st
        JOIN session_exercises se ON se.id = st.session_exercise_id
        JOIN sessions s ON s.id = se.session_id
        WHERE se.exercise_id = :exerciseId AND s.user_id = :userId
          AND s.status = 'completed' AND s.id != :excludeSessionId
        ORDER BY s.started_at DESC, st.set_number
        LIMIT 20
    """)
    suspend fun getPreviousSets(userId: Long, exerciseId: Long, excludeSessionId: Long): List<PreviousSetRow>

    // All sets for an exercise (for PR detection) — chronological
    @Query("""
        SELECT st.set_number, st.weight_kg, st.reps, st.rir, date(s.started_at) as date
        FROM sets st
        JOIN session_exercises se ON se.id = st.session_exercise_id
        JOIN sessions s ON s.id = se.session_id
        WHERE se.exercise_id = :exerciseId AND s.user_id = :userId
          AND s.status = 'completed' AND st.weight_kg IS NOT NULL AND st.reps IS NOT NULL
        ORDER BY s.started_at, st.set_number
    """)
    suspend fun getAllSetsForExercise(userId: Long, exerciseId: Long): List<ExerciseSetHistoryRow>
}
```

Add `AnalyticsDao` to `LightweightDatabase` and `DatabaseModule`.

### Row types
Create `data/local/row/` package for the intermediate row types that Room maps from join queries. These are simple data classes with `@ColumnInfo` annotations matching the query aliases. Repositories map them to domain models.

---

## Shared Components — Package P1

These composables live in `ui/components/`. They are the building blocks used across multiple screens. **Must be built first.**

### IncrementButton

**File:** `ui/components/IncrementButton.kt`

**Signature:**
```kotlin
@Composable
fun IncrementButton(
    value: Double?,
    onValueChange: (Double?) -> Unit,
    step: Double = 1.0,
    min: Double = 0.0,
    decimal: Boolean = false,
    nullable: Boolean = false,
    muted: Boolean = false,
    label: String,
    modifier: Modifier = Modifier,
)
```

**Layout:** Three-column Row: `[−]  value  [+]`
- `−` and `+` buttons: 44×44dp, secondary style, font `dataLarge`
- Center value: `data` typography, tappable to enter edit mode
- Null value shows "—"
- Label below value in `label` typography, `textSecondary`

**Behaviors:**
- `−` button: subtract step. If nullable and result < min, set to null.
- `+` button: add step. If null, set to min.
- Tap center value: switch to `BasicTextField` (auto-select all text, 16sp to prevent iOS/Android zoom)
- Blur/Enter commits. Escape cancels. Invalid input reverts.
- `decimal = true`: show 1 decimal place, parse as Double
- `decimal = false`: show as Int, parse as Int
- `muted = true`: reduce value opacity (used for RIR)

### SetBars

**File:** `ui/components/SetBars.kt`

**Signature:**
```kotlin
@Composable
fun SetBars(
    sets: List<WorkoutSet>,
    templateExercise: TemplateExercise? = null,
    prData: SetPRData? = null,
    onDeleteSet: ((Long) -> Unit)? = null, // null = read-only (history view)
    modifier: Modifier = Modifier,
)

data class SetPRData(
    val absolutePRSetIds: Set<Long>,
    val setPRSetIds: Set<Long>,
)
```

**Per-set row layout:** `[badge]  [bar]  [data]`
- Badge (28dp width): "PR" (amber glow) / "SPR" (cyan glow) / "01" (secondary)
- Bar (flex): 10dp height, 2dp radius. Fill width = `reps / maxReps` capped at 100%. Color by rep status:
  - In-range (reps within min..max): green
  - One-below (reps == min - 1): amber
  - Under (reps < min - 1): red
  - Over (reps > max): cyan
  - No template: green (all sets treated as in-range)
- Data: `"75kg | 8 R2"` in `data` typography. "BW" if weight null. RIR shown if non-null.
- `maxReps` = template `targetRepsMax` or `max(12, highest reps in sets)`

**Delete interaction (when `onDeleteSet` is non-null):**
- Long-press (500ms) on set row shows overlay
- Overlay: "DELETE SET 01?" text + DELETE (red) + CANCEL buttons
- Cancel or tap outside dismisses

### SetLogger

**File:** `ui/components/SetLogger.kt`

**Signature:**
```kotlin
@Composable
fun SetLogger(
    defaultWeight: Double?,
    defaultReps: Int,
    onLog: (weightKg: Double?, reps: Int, rir: Int?) -> Unit,
    onWeightChange: (Double?) -> Unit = {},
    modifier: Modifier = Modifier,
)
```

**Layout:** Vertical column of three `IncrementButton`s + LOG SET button:
1. Weight: step=1.25, decimal=true, label="WEIGHT (KG)", initial=defaultWeight
2. Reps: step=1.0, min=1.0, label="REPS", initial=defaultReps
3. RIR: step=1.0, min=0.0, nullable=true, muted=true, label="RIR", initial=null
4. `LwButton("LOG SET", style=Primary, fullWidth=true)`

**Behaviors:**
- Weight changes fire `onWeightChange` (for progression targets, Phase 2)
- LOG SET calls `onLog(weight, reps, rir)`. If weight==0 and defaultWeight==null, pass null (bodyweight).
- After logging, reps and RIR reset; weight persists (last logged weight carries forward)

### ExercisePicker

**File:** `ui/components/ExercisePicker.kt`

**Signature:**
```kotlin
@Composable
fun ExercisePicker(
    onSelect: (Exercise) -> Unit,
    onClose: () -> Unit,
    excludeIds: Set<Long> = emptySet(),
)
```

**Layout:** Full-screen overlay (`bgPrimary` background):
- Header: Search `LwTextField` + Close icon button
- Body: Scrollable list of exercise cards (filtered by search, excluding `excludeIds`)
  - Each card: exercise name (bold) + muscle_group · equipment (secondary)
  - 44dp min touch target
- Create option: When search query matches no exercise, show "CREATE: [QUERY]" button
  - Tap expands inline form: muscle group dropdown + equipment dropdown + "CREATE & ADD" button
  - Creates exercise via `ExerciseRepository.save()` then calls `onSelect()`

**Muscle group options:** Back, Biceps, Calves, Chest, Core, Forearms, Glutes, Hamstrings, Neck, Quads, Shoulders, Triceps, Other

**Equipment options:** Barbell, Bodyweight, Cable, Dumbbells, Kettlebell, Machine, Band, Other

ExercisePicker needs its own ViewModel (or use the parent's) to query exercises from Room.

### NoteInput

**File:** `ui/components/NoteInput.kt`

**Signature:**
```kotlin
@Composable
fun NoteInput(
    note: String?,
    exerciseName: String,
    onSave: (String?) -> Unit,
    modifier: Modifier = Modifier,
)
```

**Collapsed:** Button — "NOTE" if empty, "EDIT NOTE" if note exists. `LwButton` secondary style, fullWidth.

**Expanded:** Full-screen overlay:
- Header: exercise name label (uppercase, `label` style, `accentPrimary`)
- Body: `BasicTextField`, flex fill, `body` typography, 16sp, placeholder "Add a note..."
- Footer: SAVE (`LwButton` primary) + CANCEL (`LwButton` secondary), side by side

### Timer

**File:** `ui/components/Timer.kt`

**Signature:**
```kotlin
@Composable
fun Timer(
    startedAt: String, // ISO 8601
    pausedDuration: Int, // seconds
    isPaused: Boolean,
)
```

**Display:** `dataLarge` typography. Color: `textPrimary` normally, `accentPrimary` when paused.
- Format: `"1:23"` (under 1 hour) or `"1:23:45"` (1+ hour)
- Updates every 1 second via `LaunchedEffect` + `delay(1000)`
- Elapsed = `(now - startedAt) / 1000 - pausedDuration`
- Stops incrementing when `isPaused == true`

### PreviousData

**File:** `ui/components/PreviousData.kt`

**Signature:**
```kotlin
@Composable
fun PreviousData(
    previousSets: List<WorkoutSet>,
    templateExercise: TemplateExercise?,
    modifier: Modifier = Modifier,
)
```

**Layout:** Row, space-between:
- Left: "LAST {weight}KG × {reps}" — `data` style, `textPrimary`. Reps comma-separated from previous sets.
- Right: "TARGET {sets}S {min}–{max}R" — `data` style, `textSecondary`
- Hidden if no previous sets AND no template exercise

---

## P2: Home Screen

**File:** `ui/screens/home/HomeScreen.kt`, `ui/screens/home/HomeViewModel.kt`

### HomeViewModel

**Injected:** `SessionRepository`, `TemplateRepository`, `AnalyticsDao` (via repository)

**State:**
```kotlin
data class HomeState(
    val heatmapData: List<DayActivity> = emptyList(),
    val templates: List<Template> = emptyList(),
    val isCreatingSession: Boolean = false,
)
```

**Actions:**
- `loadHeatmap()`: query last 84 days (12 weeks) of activity
- `loadTemplates()`: for template selection
- `startFromTemplate(templateId)`: create session in Room with template exercises pre-populated, return session ID
- `startFreeform()`: create empty session in Room, return session ID

### UI Layout

```
┌─────────────────────────┐
│ [Mini Heatmap - 12 weeks]│
│                          │
│                          │
│ ┌──────────────────────┐ │
│ │   START FROM         │ │
│ │   TEMPLATE      →    │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │   FREEFORM           │ │
│ └──────────────────────┘ │
└─────────────────────────┘
```

**Mini Heatmap:**
- Compact grid: 7 rows (Mon–Sun) × 12 columns (weeks)
- Cell size: ~12dp with 2dp gap
- Color: `bgElevated` (no activity) → `accentPrimary` (has activity), opacity scaled by set count
- No labels, no interactivity (just visual context)
- Centered horizontally with generous vertical margins

**Start Buttons:**
- "START FROM TEMPLATE" — `LwButton` primary, fullWidth. On tap: navigate to a template picker bottom sheet or inline list. On template select: create session, navigate to WorkoutRoute.
- "FREEFORM" — `LwButton` secondary, fullWidth. On tap: create empty session, navigate to WorkoutRoute.

**Template selection flow:** Tap "START FROM TEMPLATE" → shows template list below (or expands inline). Each template is an `LwCard` showing name + exercise count. Tap a template → creates session → navigates to `/workout`. Keep it simple — no separate screen, just expand a list inline.

---

## P3: Active Workout Screen

**File:** `ui/screens/workout/WorkoutScreen.kt`, `ui/screens/workout/WorkoutViewModel.kt`

This is the richest screen. The web app's ActiveWorkoutPage, ExerciseCard, SetLogger, SetBars, PreviousData, NoteInput, ExercisePicker, and Timer all come together here.

### WorkoutViewModel

**Injected:** `SessionRepository`, `ExerciseRepository`, `AnalyticsDao` (via repository)

**State:**
```kotlin
data class WorkoutState(
    val session: Session? = null,
    val expandedExerciseIndex: Int = 0,
    val previousSets: Map<Long, List<WorkoutSet>> = emptyMap(), // exerciseId → previous sets
    val showExercisePicker: Boolean = false,
    val isLoading: Boolean = true,
)
```

**Actions:**
- `loadSession()`: get active session from Room with exercises and sets. Also load previous sets for each exercise.
- `logSet(sessionExerciseId, weightKg, reps, rir)`: insert set in Room, set_number = current count + 1, completed_at = now. Reload session.
- `deleteSet(setId)`: delete from Room. Reload session.
- `updateExerciseNotes(sessionExerciseId, notes)`: update in Room.
- `addExercise(exerciseId)`: insert session_exercise, position = current count + 1. Reload session. Load previous sets for new exercise.
- `togglePause()`: flip status between "active" and "paused". Track paused duration by saving a `pausedAt` timestamp in ViewModel; on resume, add elapsed pause time to `pausedDuration`.
- `endWorkout()`: set status = "completed", ended_at = now. If no sets logged, delete the session. Navigate back to home.
- `expandExercise(index)`: set `expandedExerciseIndex`. Set to -1 to collapse all.

### UI Layout

**Sticky header (top of screen):**
```
┌─────────────────────────┐
│ PUSH DAY          1:23  │  ← session name + Timer
│ ████████░░░░  12/18     │  ← progress bar + set count (Phase 1: simple bar)
│ [PAUSE]    [END WORKOUT]│  ← action buttons
└─────────────────────────┘
```

- Session name: template name, custom name, or "FREEFORM". `cardTitle` typography.
- Timer: `Timer` composable, right-aligned
- Progress bar: simple `Box` with `bgElevated` track and `accentGreen` fill. Width = completedSets / targetSets. Hidden if no template. "12/18" in `data` style beside it.
- Buttons: "PAUSE"/"RESUME" secondary, "END WORKOUT" danger. Side by side.
- End workout shows confirmation dialog (AlertDialog or custom overlay).

**Exercise cards (scrollable LazyColumn):**

Each exercise in session.exercises renders as an expandable card.

**Collapsed state:**
```
┌─────────────────────────────────┐
│ BENCH PRESS  75|8, 80|10  2/4  │
└─────────────────────────────────┘
```
- Exercise name: `cardTitle`, uppercase
- Inline set summary: comma-separated `"weight|reps"` per set, colored by rep status. `data` typography, 11sp.
- Set counter: `"2/4"` (logged/target) or `"2"` (no target). `data` typography. Glow if > 0.
- Tap → expand (set expandedExerciseIndex)

**Expanded state:**
```
┌─────────────────────────────────┐
│ BENCH PRESS                     │
│                                 │
│ LAST 75KG × 8, 10  TARGET 3S 6-10R │  ← PreviousData
│                                 │
│ [SET X TO BEAT section — Phase 2]│
│                                 │
│ 01 ████████████ 75kg | 8        │  ← SetBars
│ PR ████████████ 80kg | 10 R1    │
│                                 │
│ [WEIGHT (KG)]  [REPS]  [RIR]   │  ← SetLogger
│ [        LOG SET              ] │
│                                 │
│ [        NOTE                 ] │  ← NoteInput
└─────────────────────────────────┘
```

- Background: `bgSurface`, border: `borderActive`
- Sections rendered in order: PreviousData → (Phase 2: ProgressionTargets) → SetBars → SetLogger → NoteInput
- Only one card expanded at a time

**Bottom: Add Exercise button**
- `LwButton("+ ADD EXERCISE", secondary, fullWidth)`
- Opens ExercisePicker as full-screen overlay

**Previous sets loading:**
For each exercise in the session, query the most recent completed session that included that exercise (excluding current session). Use the sets from that session as `previousSets`. This drives the PreviousData display and SetLogger defaults.

Default weight = last set in this session for this exercise → or previous session's first set weight → or null.
Default reps = last set's reps → or previous session's first set reps → or 8.

---

## P3 Phase 2: Progression Targets

**This can be built in a second pass after the core workout screen ships.**

### Concept
For the next set to be logged, calculate what weight/reps would beat the historical best e1RM at that set position. Shows the user exactly what they need to do to progress.

### Data needed
- All historical sets for this exercise (from AnalyticsDao.getAllSetsForExercise)
- Grouped by set_number, find the best e1RM at each position
- For the next set_number (e.g., if 2 sets logged, next is set 3): find the best e1RM ever at position 3

### Calculation
```
bestE1rmAtPosition = max(e1rm(weight, reps, rir)) for all historical sets at this set_number
targetReps = find lowest reps within template rep range where e1rm(weight, targetReps, 0) > bestE1rmAtPosition
```

Solve for weight: `weight = bestE1rm / (1 + targetReps / 30)`

### Display
Between PreviousData and SetBars:
```
SET 3 TO BEAT
  IN RANGE: 8R × 82.5KG     ← green text
  AT WEIGHT: 6R × 85KG       ← amber text (reactive to logger weight, debounced 2s)
```

- Only show if historical data exists for this set position
- "IN RANGE" = first weight where needed reps fall within template rep range
- "AT WEIGHT" = reps needed at the current logger weight to beat PR
- Colors: green (in-range), amber (one-below), red (under), cyan (over)

### Architecture preparation
- WorkoutViewModel should have a `loggerWeights: Map<Long, Double?>` state field (keyed by sessionExerciseId)
- SetLogger fires `onWeightChange` which updates this map
- A `derivedStateOf` or `combine` flow computes targets from loggerWeights + PR history
- The composable slot for progression targets exists but shows nothing until Phase 2 is implemented

---

## P4: Template Management

**Files:** `ui/screens/templates/TemplatesScreen.kt`, `ui/screens/templates/TemplateDetailScreen.kt`, `ui/screens/templates/TemplateEditScreen.kt` (new), plus ViewModels

### TemplatesScreen (list)

**ViewModel State:**
```kotlin
data class TemplatesState(
    val templates: List<Template> = emptyList(),
    val expandedIndex: Int = -1,
    val isLoading: Boolean = true,
)
```

**Layout:** LazyColumn of expandable `LwCard`s.

**Collapsed:** Template name (`cardTitle`, uppercase) + `"{N} EXERCISES"` (`data`, `textSecondary`)

**Expanded:** Exercise list showing each exercise's name and programming summary:
```
1  BENCH PRESS           4s | 5-8r
2  INCLINE DB PRESS      3s | 8-12r
3  CABLE FLY             3s | 12-15r
```
- Position number in `data` style, `textSecondary`
- Exercise name in `body` style
- Programming in `data` style, right-aligned

Two buttons at bottom of expanded card:
- "START WORKOUT" (primary) — creates session from template, navigates to WorkoutRoute
- "EDIT" (secondary) — navigates to TemplateDetailRoute(id)

**Bottom of screen:** "+ NEW TEMPLATE" button (secondary, fullWidth) → navigates to new template edit screen

### TemplateDetailScreen (view/edit)

Single screen that handles both viewing and editing. Opens in view mode, has an "EDIT" button to switch to edit mode. Or: always in edit mode for simplicity (the web app goes directly to edit).

**Recommendation:** Go directly to edit mode (matches web behavior, simpler).

**ViewModel State:**
```kotlin
data class TemplateEditState(
    val isNew: Boolean = false,
    val name: String = "",
    val notes: String? = null,
    val exercises: List<EditableTemplateExercise> = emptyList(),
    val showExercisePicker: Boolean = false,
    val isSaving: Boolean = false,
)

data class EditableTemplateExercise(
    val exerciseId: Long,
    val exerciseName: String,
    val targetSets: Int = 3,
    val targetRepsMin: Int = 8,
    val targetRepsMax: Int = 12,
)
```

**Layout:**
```
┌─────────────────────────────────┐
│ [Template name input]           │
│                                 │
│ ┌─ Exercise 1 ────────── [×] ─┐│
│ │ BENCH PRESS                  ││
│ │ SETS [−] 4 [+]              ││
│ │ MIN  [−] 5 [+]              ││
│ │ MAX  [−] 8 [+]              ││
│ └──────────────────────────────┘│
│                                 │
│ ┌─ Exercise 2 ────────── [×] ─┐│
│ │ ...                          ││
│ └──────────────────────────────┘│
│                                 │
│ [+ ADD EXERCISE]                │
│                                 │
│ [    SAVE TEMPLATE    ]         │  ← primary
│ [    ARCHIVE          ]         │  ← danger (only if editing existing)
└─────────────────────────────────┘
```

- Template name: `LwTextField`, placeholder "Template name"
- Each exercise: `LwCard` with exercise name + three `IncrementButton` rows (sets, min reps, max reps) + remove button (red ×, top-right)
- IncrementButtons: min=1, step=1, no decimals
- "ADD EXERCISE" opens ExercisePicker (excluding already-added exerciseIds)
- "SAVE TEMPLATE": if new, create in Room. If existing, snapshot current state then update. Navigate back.
- "ARCHIVE": confirmation dialog, then soft-delete. Navigate back.

**Defaults for newly added exercises:** targetSets=3, targetRepsMin=8, targetRepsMax=12

**Versioning on save (existing templates):**
1. Read current template state from Room
2. Serialize to JSON string
3. Insert into template_snapshots with current version
4. Increment template version
5. Delete old template_exercises, insert new ones
6. Update template name/notes/updated_at

This should be a Room `@Transaction` in the repository.

---

## P5: History

**Files:** `ui/screens/history/HistoryScreen.kt`, `ui/screens/history/HistoryViewModel.kt`, `ui/screens/session/SessionScreen.kt`, `ui/screens/session/SessionViewModel.kt`

### HistoryScreen (list)

**ViewModel State:**
```kotlin
data class HistoryState(
    val sessions: List<SessionSummary> = emptyList(),
    val isLoading: Boolean = true,
)
```

**Layout:** LazyColumn of session cards. Each card:
```
┌─────────────────────────────────┐
│ PUSH DAY              3E · 12S │
│ MON 13 APR 2026               │
└─────────────────────────────────┘
```

- Title: template name or "FREEFORM". `cardTitle` typography.
- Stats badge: `"{N}E · {N}S"` (exercises · sets). `data` typography. Color by completion:
  - Green: met or exceeded target sets
  - Amber: 1-2 sets short
  - Red: 3+ sets short or abandoned
  - Cyan: exceeded target
  - No template (freeform): green
- Date: `"MON 13 APR 2026"`. `label` typography, `textSecondary`.
- Active/paused sessions: badge shows "ACTIVE" / "PAUSED" in amber instead of stats.

**Tap navigation:**
- Active/paused → WorkoutRoute (resume active workout)
- Completed/abandoned → SessionRoute(id) (detail view)

### SessionScreen (detail, read-only)

**ViewModel loads:** full session with exercises and sets from Room.

**Layout:** Mirrors the active workout expanded view, but read-only:
- Header: session name, date formatted as "MONDAY, 13 APRIL 2026", duration
- Exercise cards (all expanded, not accordion — it's a review screen):
  - Exercise name
  - SetBars (read-only: `onDeleteSet = null`)
  - Exercise notes (if any)
- "DELETE SESSION" button at bottom (danger, with confirmation dialog)

Duration calculation: `(endedAt - startedAt) - pausedDuration`, formatted as "1h 32m" or "45m".

---

## P6: Settings

**File:** `ui/screens/settings/SettingsScreen.kt`, `ui/screens/settings/SettingsViewModel.kt`

### SettingsViewModel

**Injected:** `AuthRepository`, `TokenStore`, `ExerciseRepository`, `SessionRepository`

**State:**
```kotlin
data class SettingsState(
    val username: String? = null,
    val isDarkTheme: Boolean = true,
    val sessionCount: Int = 0,
    val setCount: Int = 0,
)
```

### Layout

Vertical list of setting sections using `LwCard`:

**APPEARANCE**
- Theme toggle: "NIGHT MODE" with custom toggle switch. Uses `LightweightTheme` dark/light.

**INVITES**
- Card showing "MANAGE INVITES" → navigates to InvitesRoute (new route, new screen)
- Invites screen: generate invite button, pending invites with QR/copy-link, joined users list
- This calls the server API (Retrofit) for invite operations

**DATA**
- "EXPORT SESSIONS" card
- Shows session count and set count
- Exports all sessions as CSV from Room (no server, no rate limit)
- Uses Android's share sheet or file save dialog

**ACCOUNT**
- Shows username from TokenStore
- "LOGOUT" button (danger) — calls `AuthRepository.logout()`, clears TokenStore, navigates to LoginRoute

---

## Parallelization Plan

```
P1 (Shared Components) ──must complete first──┐
                                               │
         ┌─────────────┬──────────┬────────────┼──────────┐
         ▼             ▼          ▼            ▼          ▼
     P2: Home    P3: Workout  P4: Templates  P5: History  P6: Settings
```

**P1** is the critical path — 7 composables that P2-P5 depend on. Assign to the strongest agent.

**P3** is the heaviest screen. It consumes all shared components and has the most complex ViewModel. Can run in parallel with P2/P4/P5 once P1 ships.

**P6** has no shared component dependencies — can start immediately in parallel with P1.

**P4** and **P5** are moderate complexity and share the SetBars component.

### Agent assignment recommendation
- Agent 1: P1 (shared components) + Room query additions (DAO methods, row types, domain models)
- Agent 2: P6 (settings) — can start immediately, no P1 dependency
- Agent 3: P2 (home) — starts after P1
- Agent 4: P3 (workout) — starts after P1
- Agent 5: P4 (templates) — starts after P1
- Agent 6: P5 (history) — starts after P1

Or with 4 agents: P1 goes first solo, then P3 gets its own agent, and P2+P4 and P5+P6 pair up.
