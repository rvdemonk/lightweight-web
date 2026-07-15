# iOS Port — Manifest

Running log for the iOS Swift client workorder. Status lives in `spec.md`. Newest entry = current state.

## 2026-07-16 (morning) — RIR ruling banked; post-mortem + quick-wins fleet in flight

**RIR ruling (Lewis, 2026-07-16, revised same morning) — for the future log-form design session:** entry scale is `0 · 1 · 2 · 3+` (four pressables) — estimation is only reliable at RIR 0–2, so buttons exist only where the lifter can actually know the value; `3+` honestly means "not near failure" (e.g. a too-light 16-rep movement). **Hard set ≔ logged RIR ≤ 2** — this gates the Data page's sets-per-muscle-group volume counting; the bucket boundary IS the threshold, so every counted set is a high-confidence rating. Caveat banked: literature volume benchmarks (10–20 sets/wk) assume ~0–4 RIR sets, so our counts read slightly low vs reference bands — self-comparison over time is the real yardstick. Storage open question: `rir` is an integer column and storing "3+" as literal 3 is a lie (means *at least* 3) — needs an honest representation, decide at the log-form session. **RIR stays out of PR/target math permanently** (grinder lesson holds). Same-load RIR drift (8×100 @RIR1 → @RIR3) is real felt progression but subjective — display as soft context ("felt easier than last time"), trend it, never verdict it. Entry must be one-tap optional (segmented/pill row), skipping free — never a toll on logging speed. UI itself is a Lewis screenshot-loop, not conductable.

**RIR input design settled PROVISIONALLY (Lewis, same morning — implement AFTER pm-build lands, contends on ActiveWorkoutView):** Lewis generally despises pill rows as an antipattern but approved a TRIAL — and after the "Apple ships no chip component" discussion he leans heavily toward renovating to the Menu pill (his original instinct): on iOS 26 the extra tap is the cheaper commodity vs clutter on an already-busy screen, glass menus being fast/fluid. The pill row must WIN the on-device trial, not merely survive it. Trial criteria: (1) visual fit on the sacred screen, (2) actual RIR logging rate while dogfooding — the pill row's visibility is a logging nudge, a quiet `RIR —` capsule is easier to ignore, and the hard-set gate starves without logged RIR; (3) one-handed gassed-between-sets motor cost. The trial form: inline pill row `RIR ⓪①②③+` as a slim third row under the reps stepper — 44pt targets, ~17pt digits, no steppers/display font. One tap to rate, tap again to clear; **resets to nil after every log** (no carryover — RIR drifts with fatigue, carried ratings would be silently wrong; every stored RIR must be a deliberate tap or the hard-set gate can't be trusted). Selected pill amber fill; unselected hollow secondary. Rejected: Menu dropdown (two taps/set compounds), post-log annotation chip (inverts flow, gets skipped). **Storage ruled: no schema change** — `3+` stores literal 3; display layer renders any `rir ≥ 3` as `3+` (historic Android 0–5 collapses in display only; no arithmetic ever done on RIR so nothing analytic is lost). Cascade: logged-set rows + history set rows + previous-session context sets append `· RIR n` trailing when present, nothing when nil (no height change → no jitter violation).

**Session-over-session drops are programming, not regression (Lewis):** he alternates primary lifts across leg days (heavy-RDL day ⇒ deliberately lighter squat). Rule: no "regression" language anywhere; trends use **weekly-best e1RM** (light days can't dent the curve); decline may only ever be flagged from multi-week weekly-best trends, and v1 omits decline verdicts entirely.

**Post-mortem SHIPPED (pm-build worker, supervisor-verified):** `PostMortemView` + derived `PostMortem` model + `PostMortemQueries` + `WorkoutFlowView` content-swap coordinator (cover root replaced in MainTabView; End → summary → Done, no back-to-corpse, one-cover invariant intact). `finish()` now fire-and-forgets the push — summary is local-only/offline-safe. History entry: chart icon on SessionDetailView (standard push). Paused-aware `ServerDate.duration(minusPaused:)`. `ExerciseDetail` gained `exerciseId`. DEBUG seeds: sessions 500 (PR day) / 501 (steady day) + preview routes postmortem/postmortem-nopr/postmortem-history/history-detail. Evidence: docs/screenshots/2026-07-16-postmortem-{review,no-prs,history}.png; xcodebuild green (supervisor-run). Worker note: both fleet workers went idle without final reports — disk evidence was complete both times; adjudicated from disk.

**In flight (conducted):** worker A = home de-cramp (recent-workouts stack removed — duplicates History one tap away) + native large-title headings on History/Workouts/Data (LIGHTWEIGHT branding Home-only). Worker B = `design-post-mortem.md` (end-of-workout summary: PRs top, slot-goals-beaten, per-exercise verdicts, weekly-best PR sparkline, vitals, frequency; also reachable from history detail). Data-page redesign parked pending muscle-group tagging (server + curation) + RIR entry; Live Activity rest-timer noted as a strong future workorder.

## 2026-07-15 (late morning) — Reference screen settled (6 iterations) + 4-tab scaffold; prod junk incident

**Reference screen final form (Lewis-approved):** single-exercise page — dropdown pill switcher (Menu+Picker, title-case menu w/ set-count subtitles; caps stay on the pill), stacked edge-reach steppers (Text w/ numericText rolling digits, TextField only on tap), bidirectional PR tiles (hairline-separated), **slot goal replaced SPR** (beat same-numbered set from last session, e1RM-normalized at current weight — raw comparison was the Android color-bar lie), labeled e1RM column w/ baseline PR badges + green log-flash, floating LOG SET, haptic log confirm (.success on PR), keyboard Done + interactive dismiss, End leading / + trailing. Rules enshrined in **ios/CLAUDE.md**; tokens in Design/Theme.swift.

**Scaffold shipped:** 4 tabs (HOME/HISTORY/WORKOUTS/DATA, amber). Home: wordmark (content, not toolbar — iOS 26 clips leading toolbar text to a circle), resume banner, start menu, 30d strength/session tiles, activity heatmap, recent pills. Workouts: template list→detail→**start (spec hard req: sessions carry template_id+version into sync)**. Template create/edit deferred — ships as one unit with template PUSH or import destroys edits. Settings = cog sheet. Data = stub.

**PROD INCIDENT (caught & cleaned):** keychain token survives app reinstall; the preview seam kept real creds → Ended test workout pushed junk to prod (session 100, 7 sets, incl. 1.25kg set into real PULL-UPS; junk exercise 265). Surgically removed after online backup (backups/2026-07-15/lightweight.db.pre-junk-clean); verified 82 sessions, FK clean. Fix: preview seam nils token + unroutable URL (safe only because didSet doesn't fire in init). Incidental: bench duplicate 1 vs 221 → curation list.

**Commits:** 1cfe85a, a149a7d, 5a62d93, 19c1df3 (all pushed). **Next:** wireless install to Lewis's phone (sizing check) · template PUSH unit · tabViewBottomAccessory active bar · template progress bar · Data page design. Parked: RIR entry, weighted-BW e1RM semantics, pill pinning, weightToBeat backport to crates/calc.

## 2026-07-15 (morning) — Phase 4 opened: tokens + type scale settled with Lewis

Interactive design session, decisions banked (all four Lewis-confirmed):
- **Typeface: SF Pro only.** Condensed bold caps (`Font.width(.condensed)`) for exercise names/headers — the neoindustrial survival route, native Barlow-Condensed flavor with Dynamic Type intact. `.monospacedDigit()` (tabular figures) on every number so steppers/timers don't jitter — this is NOT a monospace font and doesn't violate the ban.
- **Accent: amber stays** (#e8a832), the single brand color. Green = PR only, red = destructive only. **Cyan is dead** — reference data is `.secondary`, data hierarchy comes from weight/size not hue.
- **Both color modes, dark-first** dogfooding. System backgrounds so glass adapts.
- **17pt floor holds for data/numbers/tappables; 13pt tracked-uppercase metadata labels are the sole exception** ("LAST SESSION", "PR TARGET" furniture).
- Web brand's 4px-max-radius is dead on iOS: chrome = capsule/containerConcentric, content cards 12pt; angularity survives in layout, not corners.

**Shipped:** `ios/Lightweight/Design/Theme.swift` — all tokens + rationale + `.metaLabel()` modifier; xcodegen re-run, builds clean.

**Active-workout imperatives inventoried (Lewis's list + session additions):** steppers (±1 rep, ±1.25kg, tap-to-type, auto-prefill from previous set), last-session sets (w/ RIR display TBD), bidirectional PR goals (weight→reps-to-beat AND reps→weight, same Epley inverted), logged sets per exercise, accordion exercise list (one expanded = working; collapsed rows dense; multi-expand for supersets; content layer, NEVER glass in scroll rows), toolbar `+` add-exercise, workout timer + **rest timer** (time since last set), template progress bar, end vs discard w/ confirmation, PR-confirmed celebration at log moment, edit/delete logged set, `.tabViewBottomAccessory` for the Spotify-style active-workout bar (native iOS 26 API — Android nav-hack dies). Parked: rep-target color bar (incoherence across weight changes), plate math, warm-up marking, notes. Standalone e1RM calculator wanted as a utility sheet off the dashboard, not the active screen.

**Next:** rebuild ActiveWorkoutView as the reference screen against Theme.swift — build → screenshot → Lewis reacts (he runs the sim). Only after the reference screen is settled does the rollout to remaining screens get conducted.

## 2026-07-14 (night, session 2) — Phase 1 COMPLETE: calc truth, one policy across four languages

**Design pivot recorded first (Lewis):** NERV aesthetic doesn't fit Liquid Glass — "we cannot fight the material." New Phase-4 brief: **neoindustrial liquid glassmorphism**; iOS nativity + UX principles first, aesthetic bends decided last; **no monospace fonts** (the MVP's monospace set rows get replaced in Phase 4). Spec amended in two places.

**Raw-reps e1RM is now the policy everywhere** (was: iOS only):
- `crates/calc`: RIR removed from `e1rm()`/`SetData`/`TimedSet`; `reps_to_beat` added (ported from iOS `Calc.repsToBeat`, strict-beat + float-edge guard + >30 suppression) so Rust is the ground truth for the full shared surface.
- `crates/core/analytics.rs`: both inline SQL e1RM expressions dropped `COALESCE(st.rir,0)`; all `e1rm()` call sites updated; `rir` kept ONLY as display context (E1rmDataPoint → chart tooltip).
- `frontend/utils/e1rm.ts`: raw-reps `calcE1rm`; new `repsToBeat` (progressionTargets refactored onto it); **getPRBadge drift fixed** — no PR on empty history (calibration semantics, matching `detect_prs`); RIR dropped from badge math.
- MCP/CLI inherit via the HTTP API — no inline math there (verified).

**Cross-language vectors live:** `crates/calc/vectors/calc_vectors.json` (e1rm/best/reps_to_beat/round/pct_change; includes the 11×65-beats-12×62.5 grinder case and Lewis's live 12.5×11 PR). Generated from Rust (`GEN_VECTORS=1 cargo test -p lightweight-calc vectors_match`), verified by a drift-detecting Rust test, run by TS (new vitest setup, `npm test`) and Swift (**new `LightweightTests` target**, vectors bundled as a resource; `xcodebuild test` green on sim). Gotcha banked: serde_json needs the `float_roundtrip` feature or parsed vectors drift 1 ULP.

**Name-resolution: read before changing, as the spec warned — no change needed.** `resolve_exercise` was already case-insensitive + fuzzy-all-words + ambiguity-refusing (that's how "Pull Up"→"PULL-UPS" unified). Pinned with 6 regression tests in `sessions.rs` (case-insensitive exact, the Pull-Up fuzzy case, ambiguity→error, user scoping, archived exclusion) instead of touching working logic.

**Provenance check:** PR displays already carry date + "kg × reps" detail server→AnalyticsPage; requirement was already satisfied. Verified rather than built.

**Verified:** `cargo test --workspace` 8/8 suites (119 calc, 6 core) · frontend `npm run build` + 6 vitest tests · iOS 5 XCTests on sim. Zero grep hits for RIR-folding math outside `android/` (retiring by intent).

**Next:** template start flow + template PUSH on iOS (spec hard requirement) · dashboard/home content · Phase 4 design under the new brief.

## 2026-07-14 (night) — FIRST REAL WORKOUT LOGGED ON iOS. Done-condition substantially met.

Lewis trained arms/shoulders/core (3:31–5:00pm) logging live on the iPhone. Session 98 synced to prod: 4 exercises, 11 sets, 1-based positions, ISO ms+Z timestamps, bodyweight sets null-weighted, RIR optional — **zero new exercise rows created** (all four movements resolved onto existing lineages, incl. the formerly-split HANGING LEG RAISE). Server now 81 sessions. Fresh backup: `backups/2026-07-14/lightweight.db.post-first-ios-sync`. **First e1RM PR computed by the iOS app: INCLINE DUMBBELL CURL 12.5×11 → 17.1 (prev 16.7), held 4 sets.**

**Done-condition scorecard: MET IN FULL (confirmed 5:30pm).** Full-history pull ✓ (80/80) · offline log ✓ · sync to server ✓ · **browser dashboard ✓ (Lewis eyeballed)** · template-linkage intact ✓. Bonus unplanned robustness test: Lewis synced the old Android phone (yesterday's forgotten session) AFTER the iOS sync — server dedup'd/accepted it, and it flowed down into the iPhone's local mirror through the write-safe import. Two clients, out-of-order pushes, interleaved history: all reconciled.

**Also shipped late-day (commit 978e61b, supervisor-built after worker takeover — worker went dark post-release; lesson: a "released" worker may not resume on a new task, verify disk activity within minutes):** PR/SPR targets in the active workout — header shows combos strictly beating the all-time e1RM at current weight and +2.5kg; entry row shows live SPR (rep record at that exact weight, current session included) and PR rep targets. `Calc.repsToBeat` with strict-beat float guard, >30-rep targets suppressed. Font floor: all text ≥17pt (gym legibility). Verified on-sim against real data, math hand-checked.

**Ops notes:** Mac disk hit 100% (9.8GB iOS 26 DeviceSupport symbol cache) — DerivedData + SPM caches purged to recover; GRDB re-resolved. Debugger attach on the new iPhone is unreliable (watchdog SIGKILL) — scheme now recommended to run with "Debug executable" OFF for dogfooding. Sim container wiped post-testing (junk-session prod-push hazard with a live keychain token).

**Next session:** Phase 1 (calc truth: raw-reps in crates/calc + SQL + frontend, cross-language vectors — iOS currently the only policy-correct client) · template start flow + template PUSH (spec hard requirement, unblocked) · dashboard/home content · then Phase 4 design (NGE × Liquid Glass; guide at ~/code/pum/docs/design/ios26-liquid-glass-guide.md). Watch-item: an exercise add may have silently failed at 3:33pm (try? on addExercise path) — unreproduced, keep an eye out.

## 2026-07-14 (evening) — Today-slice SHIPPED: freeform logging + write-safe sync, conducted

First conducted build (1 Opus worker, 2 checkpoints + 1 refinement, supervisor-verified). Delivered inside the ~75-min window so Lewis could train on iOS same-day.

**What shipped:** tab nav (HOME/HISTORY) · freeform start + resume banner · active-workout screen (searchable exercise picker w/ create-new, set logging weight×reps + optional RIR, previous-performance inline, per-set e1RM vs all-time best) · Swift Calc (raw-reps e1RM, launch-time asserts incl. the real 11×65-beats-12×62.5 regression case) · sync push (`POST /sessions/sync`, Checkpoint-B payload, 1-based positions, visible results, 401→login).

**Store rulings (the load-bearing part):** local rows use negative ids; `synced` flag on sessions only; refresh = push-then-pull; import replaces only `synced=1` rows, **UPSERTs exercises by id (never bulk-deletes — immediate FK enforcement + no cascade on session_exercises.exercise_id would violate mid-import)**, defers FK checks, sweeps unreferenced negative-id placeholders; pushed AND skipped both reconcile to synced=1. Worker and supervisor found the FK landmine independently — convergent finding, high confidence. Write-safety proven at runtime by an in-process self-test (local active + unsynced-completed sessions survive import; server rows replaced; exercises upserted).

**Evidence:** docs/screenshots/2026-07-14-today-slice-{home,active-workout,sync-result}.png. Active-workout shot runs against Lewis's real pulled history (v2 migration proven over real data); sync-result shows the visible-failure branch against an unreachable URL (zero prod contact).

**Kept:** DEBUG-only env-gated preview seams (LW_UI_PREVIEW, LW_UI_PREVIEW_SCREEN, LW_IMPORT_SELFTEST) — inert in release, cheap UI iteration for Phase 4.

**Unverified (Lewis, on device):** real push success, first-login pull round-trip, genuine-401 re-auth.

**Incidental:** crates/calc still folds RIR into e1RM — iOS is currently the only policy-correct client; Phase 1 aligns Rust/SQL/TS. Also noted SEATED INCLINE DB CURLS (8) vs INCLINE DUMBBELL CURL (262) — semantic near-duplicate, needs human curation, not automation.

## 2026-07-14 (later) — Phase 0 COMPLETE: server repaired, and smaller than specced

MVP verified on simulator first: Lewis logged in, full pull succeeded — 80 sessions · 856 sets · green tick.

**Major finding that shrank Phase 0:** the server never had the duplicate lineages. Its resolve-by-name sync unified all of them on arrival — including a **6th split the manifest missed** (phone "Pull Up" 236 vs "PULL-UPS" 18; server holds only PULL-UPS with the combined 7 sessions / 20 sets). Verified empirically: per-exercise set counts match the golden backup exactly for every formerly-split name. The duplicate merge was a phone-DB problem, and the phone is retiring. **Server-side merge: not needed.**

**What was done** (rehearsed on a copy, then applied to prod — `scripts/phase0-repair.sql`):
- `backup.sh phase0-ios-port` → `backups/2026-07-14/` (WAL checkpointed, server restarted clean)
- Inserted templates: Upper X → server id **14** (v1), Lower X → server id **15** (v2 — phone edited it; session 104 logged against v2), timestamps from golden backup; exercises mapped by name to server ids (1, 4, 18, 219, 16, 40 / 11, 14, 16, 40)
- Backfilled sessions **94** (→14, v1) and **96** (→15, v2), guarded by exact `started_at` match
- Verified: 0 orphans, `PRAGMA foreign_key_check` clean, totals still 80/856

**Server is now a faithful mirror of the golden backup.** Safe to treat any iOS pull as the baptism.

**Remaining from Phase 1 (unblocked, not urgent for today):** raw-reps e1RM in `crates/calc`/SQL/frontend + test vectors; name-resolution hardening (note: server resolution is apparently already lenient — it matched "Pull Up"→"PULL-UPS"; read the actual implementation before changing anything).

**Next:** the "today slice" — freeform in-workout logging + sync push, so Lewis trains on iOS today (~4pm deadline).

## 2026-07-14 — GRDB decided; project scaffolded; MVP slice built and booting

**Decision (Lewis):** local store = **GRDB** — server-pulled data lands in a literal replica of the server schema, diffable against the golden backup.

**Scaffold:** `ios/` — xcodegen project (`project.yml` checked in, `.xcodeproj` gitignored/regenerable), iOS 26 min, Swift 6 strict concurrency, GRDB 7 via SPM. Builds clean; boots on the iPhone 17 Pro simulator.

**MVP slice (Phase-2/3 vertical spike, deliberately unstyled):** login (Keychain token, editable server URL, prod default) → full pull (exercises/templates/session list + each detail, 6-way concurrent) → GRDB import (wipe-and-replace while read-only) → history list → session detail laid out like an active workout (exercise blocks, monospace set rows) so it doubles as the Phase-3 layout prototype. Banked sync lessons wired in from day one: 401 is a typed error → drop to login; sync state is an explicit enum rendered in the UI — failure can't render as success.

**Sequencing note:** Phase 0 (server-data repair: template push, backfill, duplicate merges) has NOT landed yet. Fine while the client is read-only wipe-and-replace — but Phase 0 must land before the import is treated as the real baptism.

**Liquid Glass reference for Phase 4 / conduction:** `~/code/pum/docs/design/ios26-liquid-glass-guide.md` — models won't have iOS 26 glass APIs in training data; feed this guide to workers.

**Next step:** Lewis eyeballs the MVP on simulator/device with real data (login with his creds), then: Phase 0 repair, Phase 1 calc truth, and conduct the remaining build.

## 2026-07-13 (later) — Planning session: phases fixed, calc bugs diagnosed, two decisions banked

The fresh planning session the spec called for. Reviewed the WO (sound; gaps folded in), diagnosed Lewis's reported e1RM/PR bugs against the golden backup, fixed the phase structure in the spec.

**Bug diagnosis (all confirmed empirically against `backups/android/2026-07-13/lightweight.db`)**
- *"12×62.5 beats 11×65" (incline barbell bench, exercise id 1):* not a formula error — the RIR adjustment. 2026-04-03 set was 12×62.5 **@RIR1** → e1RM 89.6; 2026-07-07 was 11×65 @RIR0 → 88.8. A subjective "one left in the tank" outranked an actual grinder, invisibly (display omits RIR).
- *Template/freeform split:* real, but via a different mechanism than suspected. The PR queries don't filter by template — instead, freeform logging **re-created 5 exercises by name** (Romanian Deadlift 14/283, Hanging Leg Raise 16/301, Standing Calf Raise 17/297, Ab Rollout 218/303, Dumbbell Chest Fly 219/226), splitting their PR lineages.
- *Calculator drift:* e1RM implemented in 4 places (Rust crate, Kotlin, TS, inline SQL in `AnalyticsDao.getStrengthTrend`) and already divergent — the SQL ignores RIR; frontend `getPRBadge` awards a PR on empty history where Kotlin treats first sessions as calibration.

**Decisions (Lewis, 2026-07-13)**
- **e1RM policy: raw reps only** — RIR dropped from PR/nudge/target math, kept as logged context.
- **Calc sharing: Swift port + cross-language test vectors** — uniffi rejected for now (toolchain weight vs ~200 lines of pure functions); revisit if analytics deepen (animise fusion).
- **Local store: OPEN** — GRDB vs SwiftData discussed in depth. Leaning GRDB (phone DB = literal replica of the server schema contract; sqlite3-diffable against the golden backup — the exact method that found these bugs). SwiftData viable at this data volume if Apple-API purity wins. Decides at the top of Phase 2, behind a repository seam either way.

**Spec updated:** 5 phases (0 repair · 1 calc truth · 2 skeleton · 3 core screens · 4 design), extended Phase 0 (duplicate merges), platform baseline pinned (iOS 26 min, `@Observable`/`NavigationStack`, Swift 6 strict concurrency, Liquid Glass functional-layer-only per Apple guidance).

**Next step:** Phase 0 — server-data repair (templates + backfill + duplicate merges), verified against the golden backup.

## 2026-07-13 — Birthed; findings that set the direction

Born out of a sync-bug investigation (2026-07-07 → 13) that turned into a platform-migration decision. Compass captured while it's hot; **actual planning + build deferred to a fresh session** at Lewis's direction.

**How we got here**
- Investigated why the Android app's data stopped reaching the server after 2026-05-04. Root cause: the app's auth token expired (2026-05-17, 30-day TTL), Lewis stayed logged in, and the manual Sync path *swallowed the 401 and rendered it as "Synced — all up to date"* — a silent false success. Weekly taps did nothing for ~2 months.
- Recovered cleanly: re-login in the Android app → tap Sync → **30 backlog sessions pushed** (May 5 → Jul 12), browser stats now current. Verified end-to-end.
- Proved the backlog was fully syncable by replaying the exact payload against a throwaway instance of the **prod binary** on a `/tmp` copy of the prod DB (droplet, port 3900): `pushed: 26, skipped: 0` at the time, HTTP 200, no poison. Prod untouched.

**Data-continuity findings (these drive the port)**
- **Phone is the golden source.** Fresh phone DB backup at `backups/android/2026-07-13/` — 80 sessions, complete: every templated session linked; the 38 null-`template_id` rows are legitimately "Freeform"/"Workout".
- **Server is *nearly* faithful — gap is exactly 2 sessions.** Templates Upper X (id 9) and Lower X (id 10), created on the phone Jul 7/9, never reached the server (templates stop at id 8 there), so those 2 sessions' `template_id` got nulled on arrival. Everything else links 1:1 (template ids 1–4, 8 match by name and id across phone/server).
- **Structural root cause:** Android sync pushes **sessions only, not template definitions.** → folded into the spec as a hard requirement for the iOS sync layer.
- Correcting an earlier over-alarm: the server is NOT broadly lossy. My first read sampled only freeform sessions (correctly null) and generalised wrongly.

**Design lesson banked**
- Never render sync failure as success; 401 → re-auth, not silence. Now a spec requirement for the iOS client.

**Sync-fix patch (Android) — parked, low priority**
- A 3-file fix (surface sync failures + handle 401→login) is written, compiles (`./gradlew compileDebugKotlin` green), but sits **uncommitted** in the working tree, entangled with pre-existing WIP (join-date feature in `SettingsViewModel.kt`, Play-publisher setup, frontend redesign). It will never run on Lewis's phone (Android being retired for him) and his token is fresh for ~30 days, so it's near-zero value for his path. Left uncommitted deliberately; drop or cheap-bank later. Files touched: `SyncRepository.kt`, `SettingsViewModel.kt`, `SettingsScreen.kt`.

**Next step (for the fresh planning session)**
1. Server-data repair (task 0 in spec): push Upper X/Lower X template defs + backfill 2 session `template_id`s by `started_at`.
2. Run the SdDD discussion: local store (SwiftData vs GRDB), model layer, sync layer (incl. template push + visible errors), screens.
3. Then scaffold the iOS project.
