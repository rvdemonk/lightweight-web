---
status: active
type: feature
created: 2026-07-13
summary: Native iOS (Swift/SwiftUI) client for Lightweight against the existing Rust/Axum API, replacing Android as Lewis's primary client
verifier: On the incoming iPhone — full workout history pulls from the server, a new workout logs locally, syncs to the server, and appears in the browser dashboard
---

# iOS Port — Native Swift Client

> **Status of this spec:** planning session ran 2026-07-13 (see manifest). Phases fixed, calc policy decided, data-repair scope extended. **Local store decided 2026-07-14: GRDB** — schema fidelity with the server contract, diffable against the golden backup. Project scaffolded in `ios/` (xcodegen; see `ios/README.md`).

## Intent — what & why

Lewis is buying an iPhone this week and switching to it as his daily device. Android was the dogfood client; iOS becomes the **primary** client. Build a native SwiftUI app that reproduces the core Lightweight loop (frictionless between-sets logging, progressive-overload tracking) against the **already-built, already-hardened** Rust/Axum API + SQLite backend.

This is **not a rewrite** — it's a *second client against a proven contract*. The backend, HTTP API, data model, sync protocol, auth, and NGE design tokens all exist. The net-new surface is Swift models, a local store, SwiftUI screens, and Keychain auth.

## Done-condition (single checkable end state)

On Lewis's iPhone: the app pulls his **complete** history from the server on first login, he can **log a full workout offline**, it **syncs to the server**, and the new session shows in the browser dashboard — with template linkage intact.

## Verifier

- **Measurable:** first-login import row-counts match the server (`GET /sessions|/exercises|/templates`); a posted session round-trips through `POST /api/v1/sessions/sync` and re-appears via `GET /sessions`.
- **Eyeball:** the logging flow feels one-handed/between-sets fast; NGE aesthetic holds (see design tokens in `CLAUDE.md`).
- Ground-truth safety net: the complete phone DB is backed up at `backups/android/2026-07-13/` — any iOS import can be diffed against it.

## Scope bounds — non-goals (initial)

- **No App Store release** initially — dogfood build on Lewis's device first.
- **No backend redesign** — the API is the contract; extend it only where the port forces it (see "templates don't sync" below).
- **No full Android feature parity** up front — the core logging + overload loop first; analytics/admin/export later.
- Android client is **not** maintained forward for Lewis (one possibly-inactive friend remains on it).

## The invisible — context that code can't carry

- **Why iOS now:** phone switch, not dissatisfaction with the stack. The server is the durable asset; clients are swappable.
- **The migration is Android → server → iOS, and the server half is already done.** iOS bootstraps via the ordinary first-login pull — no device-to-device transfer, no bespoke export tooling.
- **The phone is the golden source, not the server.** (See manifest 2026-07-13.) Phone DB is complete and backed up; the server is *nearly* faithful but has a known small gap.
- **Structural finding — templates don't sync.** The Android sync protocol pushes *sessions only*, not template definitions. Templates created on the phone (Upper X id 9, Lower X id 10) never reached the server, so their sessions' `template_id` got nulled server-side. **The iOS client MUST push template definitions, not just sessions**, or this gap reappears on iOS. This is a real requirement, not a nice-to-have.
- **Design lesson banked from the sync-bug investigation (2026-07-07→13):** never render a sync *failure* as success; treat 401 as "re-auth", not silence. The Android bug (expired token → silent false "Synced — all up to date" for two months) is a **spec requirement** for the iOS sync layer.
- **The quadruplicate-calculator problem (found 2026-07-13):** e1RM logic exists in `crates/calc` (Rust), `android/domain/calc` (Kotlin), `frontend/utils/e1rm.ts` (TS), and inline SQL in `AnalyticsDao.getStrengthTrend` — and they had already drifted (SQL ignores RIR; frontend awards PR on empty history, Kotlin treats it as calibration). The iOS port must not naively add a fifth. **Decision: Swift port validated by cross-language test vectors** (JSON cases generated from `crates/calc`, run by every implementation's test suite). uniffi rejected *for now* — toolchain weight isn't justified by ~200 lines of pure functions; revisit only if analytics deepen (animise fusion).
- **e1RM policy decision (2026-07-13): raw reps only.** `effective_reps = reps + RIR` let a subjective RIR guess outrank an actual grinder (12×62.5 @RIR1 = 89.6 beat 11×65 @RIR0 = 88.8 on incline bench). PRs, nudges, and progression targets use `weight × (1 + reps/30)`; RIR stays logged as context only.
- **Duplicate exercise lineages (found 2026-07-13):** freeform logging re-created 5 exercises by name — Romanian Deadlift (14/283), Hanging Leg Raise (16/301), Standing Calf Raise (17/297), Ab Rollout (218/303), Dumbbell Chest Fly (219/226) — splitting their PR history in two. Merge is part of data repair; name-resolution must be hardened (case/whitespace-insensitive) so it can't recur.
- **iOS platform baseline:** iOS 26 minimum deployment, SwiftUI (`@Observable`, `NavigationStack`), Swift 6 strict concurrency. Liquid Glass per Apple guidance: functional layer only (controls/nav/transient UI, never content), `GlassEffectContainer` for multiple glass elements, tint = semantic meaning not decoration. Design intent for Phase 4: dark angular NGE content plane, glass instrument plane above it.

## Approach — phases (fixed in the 2026-07-13 planning session)

**Phase 0 — Server-data repair** ✅ **DONE 2026-07-14** (see manifest — merge step proved unnecessary: server's resolve-by-name had already unified all split lineages, including a 6th the diagnosis missed):
   - Push the two missing template definitions (Upper X, Lower X + their exercises) to the server.
   - Backfill `template_id` on the 2 affected sessions by exact `started_at` match (deterministic — the links exist verbatim on the phone; no inference/LLM needed).
   - **Merge the 5 duplicate exercise lineages** (see "The invisible") — repoint `session_exercises`/`template_exercises` rows to the canonical id, delete the orphan. Must land before iOS's first pull or the split baptises into the new client.
   - Outcome: server becomes a faithful mirror; verify row-counts against `backups/android/2026-07-13/`.

**Phase 1 — Calc truth** (before any Swift, so the port reproduces the *fixed* policy):
   - Switch e1RM for PRs/nudges/targets to raw reps (drop RIR from `effective_reps`) in `crates/calc`, server SQL, and frontend. **Skip Android** — it's retiring.
   - Generate cross-language test vectors (JSON) from `crates/calc`; wire into Rust + TS test suites (Swift joins in Phase 2).
   - PR displays show provenance (date + set) so a surprising PR source is inspectable.
   - Harden server exercise name-resolution (case/whitespace-insensitive) against lineage splits.

**Phase 2 — iOS skeleton** (wiring only, deliberately ugly):
   - ~~First task: decide local store~~ **Decided: GRDB** (2026-07-14) — schema fidelity + sqlite3-diffable verifiability. Built behind a repository seam (`ios/Lightweight/Store/`) so the store stays swappable.
   - Swift `Codable` models mirroring the server DTOs (snake_case JSON; Android `data/remote/dto/DataDtos.kt` is the reference spec).
   - Swift calc port passing the Phase-1 test vectors.
   - Auth: `POST /api/v1/auth/login`, token in Keychain, 30-day expiry.
   - Sync layer: first-login pull (`GET /sessions|/exercises|/templates`) then push — **sessions AND templates** — visible error surfacing, 401→re-auth (the banked design lesson). Android `SyncRepository.kt` is the reference contract.
   - Verifier: full round-trip against prod matches the done-condition's measurable slice.

**Phase 3 — Core loop screens** (functional, unstyled): home, template start, between-sets logging with PR nudges from the fixed calc.

**Phase 4 — Design**: NGE × Liquid Glass reinterpretation (see platform baseline in "The invisible"). Android styling does not survive the transition by intent — this is the fun part, done against a working prototype.

## Key references (from the 2026-07-07→13 session)

- API routes nested under `/api/v1/` (see backend `app.rs`); sync endpoint `POST /api/v1/sessions/sync`, dedups by `started_at`, resolves exercises by name.
- Server DTOs: `crates/core/src/models.rs` (`SyncSession/SyncExercise/SyncSet`). `reps` is required non-null both sides.
- Android DTOs / sync contract: `android/.../data/remote/dto/DataDtos.kt`, `android/.../data/repository/SyncRepository.kt`, `DataImportRepository.kt` (first-login pull).
- Golden data backup: `backups/android/2026-07-13/lightweight.db` (80 sessions, complete template linkage).
