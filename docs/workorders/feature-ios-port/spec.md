---
status: active
type: feature
created: 2026-07-13
summary: Native iOS (Swift/SwiftUI) client for Lightweight against the existing Rust/Axum API, replacing Android as Lewis's primary client
verifier: On the incoming iPhone — full workout history pulls from the server, a new workout logs locally, syncs to the server, and appears in the browser dashboard
---

# iOS Port — Native Swift Client

> **Status of this spec:** intent + constraints are sharp; the **technical plan (local store, model layer, sync layer, screen inventory) is deliberately deferred to a fresh session** — this file is the compass so that session starts hot. Do the discussion loop there before scaffolding Swift.

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

## Approach — sequence (refine in the planning session)

0. **Server-data repair (first cleanup task, folded in per Lewis):**
   - Push the two missing template definitions (Upper X, Lower X + their exercises) to the server.
   - Backfill `template_id` on the 2 affected sessions by exact `started_at` match (deterministic — the links exist verbatim on the phone; no inference/LLM needed).
   - Outcome: server becomes a faithful mirror, so the iOS first-login pull is clean.
1. Decide local store: **SwiftData vs GRDB (SQLite)** — mirror the Room schema (sessions, session_exercises, sets, exercises, templates, template_snapshots).
2. Swift `Codable` models mirroring the server DTOs (snake_case JSON; the Android `data/remote/dto/DataDtos.kt` is the reference spec).
3. Sync layer: first-login pull (`GET /sessions|/exercises|/templates`) then push — **sessions AND templates** — with visible error surfacing + 401→re-auth (the banked design lesson). Android `SyncRepository.kt` is the reference contract.
4. Auth: `POST /api/v1/auth/login`, token in Keychain, 30-day expiry.
5. SwiftUI screens mirroring the Compose UX; NGE design tokens from `CLAUDE.md`.

## Key references (from the 2026-07-07→13 session)

- API routes nested under `/api/v1/` (see backend `app.rs`); sync endpoint `POST /api/v1/sessions/sync`, dedups by `started_at`, resolves exercises by name.
- Server DTOs: `crates/core/src/models.rs` (`SyncSession/SyncExercise/SyncSet`). `reps` is required non-null both sides.
- Android DTOs / sync contract: `android/.../data/remote/dto/DataDtos.kt`, `android/.../data/repository/SyncRepository.kt`, `DataImportRepository.kt` (first-login pull).
- Golden data backup: `backups/android/2026-07-13/lightweight.db` (80 sessions, complete template linkage).
