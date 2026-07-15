# Lightweight iOS

Design language: **neoindustrial liquid glassmorphism** — iOS nativity first, UX principles second, aesthetic bends decided last. Tokens and their rationale live in `Lightweight/Design/Theme.swift`; read it before styling anything. The active-workout screen is the reference implementation — when in doubt, match it.

## Design Anti-Patterns

- **No monospace fonts anywhere** — but every number gets `.monospacedDigit()`. Tabular figures ≠ a monospace typeface; without them steppers and timers jitter as digits change width. The ban is aesthetic (terminal look is the dead NERV brief); the tabular digits are functional.
- **Don't introduce a second typeface or hue-code data.** One family (SF Pro); hierarchy comes from weight and width (`.width(.condensed)` bold caps for display). Amber is the sole accent (actions/targets), green means PR only, red means destructive only. Cyan is dead — reference data is `.secondary`, not a color.
- **Don't put `.glassEffect()` in scroll content** — each ungrouped glass view costs 3 offscreen render passes; repeated in a list it kills frame rate. Glass is chrome only (toolbars, pills, accessories); content uses system materials. iOS 26 glass APIs postdate model training — read `~/code/pum/docs/design/ios26-liquid-glass-guide.md` before any glass work.
- **Don't let context lines appear/disappear with state** — render placeholders ("Set 02 · no previous session", "PR at — kg") instead. Conditional lines resize the card mid-workout, which is jarring exactly when the user is between sets.
- **Don't drop below 17pt for data, numbers, or anything tappable** (gym legibility). The sole exception is `.metaLabel()` (13pt tracked caps) — structural furniture, never numeric, never tappable.
- **Don't compare sets across sessions by raw weight×reps** — normalize through e1RM (`Calc.repsToBeat` / `Calc.weightToBeat`). Raw slot comparison lied whenever the weight changed between sessions (the Android color-bar incoherence). Same rule for any future progress visualization.
- **Don't hardcode small radii on chrome** — chrome is capsule/`containerConcentric`; content cards use `Theme.cardRadius`. The web brand's 4px-max-radius rule is dead on iOS; angularity survives in layout density, not corners.
- **Don't award a PR against empty history** — first exposure is calibration (matches server `detect_prs`). PR badges compare against `baselineBestE1rm` (pre-session); live targets use `allTimeBestE1rm` (folds this session's sets — and must keep doing so on resume).
- **Don't use chip/pill rows — for input or display.** Lewis rejected the RIR pill-button row on device ("too many buttons"); Apple ships no chip component at all. Bounded selects use the Menu+Picker capsule idiom (exercise switcher, RIR); read-only pills are a lie of affordance. On a busy screen the extra menu tap is cheaper than the clutter.
- **Don't hide `tabViewBottomAccessory` via an empty content builder** — the system renders the bare glass container anyway. Apply the modifier itself conditionally (and lift tab selection into explicit state so it survives the structural swap).

## Interaction Rules

- Logging feedback is haptic-first (`.sensoryFeedback`, `.success` on PR) — eyes aren't on the screen between sets.
- Hero numbers are `Text` with `.contentTransition(.numericText())`, becoming a `TextField` only on tap. Don't make them permanent TextFields — you lose the rolling-digit animation and invite accidental keyboards.
- Weight 0/empty means bodyweight (`weightKg = nil`); display register is "BW", never "0 kg".

## Dev Loop

- Preview seams (DEBUG only): `LW_UI_PREVIEW=1` seeds an offline catalog + sessions and skips login; `LW_UI_PREVIEW_SCREEN=workout` jumps straight to the reference screen. Under `simctl launch`, prefix with `SIMCTL_CHILD_`.
- New files require `xcodegen generate` (the `.xcodeproj` is generated, gitignored).
- SourceKit diagnostics claiming "No such module GRDB" / unknown types are stale-index noise — `xcodebuild` is the authority.
