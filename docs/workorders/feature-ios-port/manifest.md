# iOS Port — Manifest

Running log for the iOS Swift client workorder. Status lives in `spec.md`. Newest entry = current state.

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
