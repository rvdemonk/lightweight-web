# Lightweight

Workout tracker for one person. Frictionless mobile logging, progressive overload tracking. Rust/Axum + React/TS + SQLite, single binary.

## Product Essence

- Optimised for one-handed phone use between sets
- Progressive disclosure everywhere — show names first, details on demand
- NGE-influenced dark aesthetic: angular, monospace data, amber/cyan accents
- Single-user, single-binary, no cloud dependencies

## Memory Principles

- **Don't document "what to do"** — code demonstrates patterns. Document what NOT to do. Anti-patterns prevent specific identified mistakes and allow implementation flexibility.
- **Don't repeat locally-discoverable information** — directory structures and conventions visible from reading nearby code waste tokens. Memory captures cross-cutting context requiring exploration beyond the local directory.
- **Don't omit rationale** — constraints without "why" are arbitrary. Reasoning makes them durable across refactors and evaluable in edge cases.

## Anti-Patterns

- Don't use `{id}` in Axum routes — axum 0.7 uses `:id` syntax. Using braces silently breaks routing.
- Don't apply auth middleware per-route — it's applied once at the app level in `app.rs` via `from_fn_with_state`. Duplicating it per-route creates dummy state issues.
- Don't call `window.location.href = '/login'` unconditionally on 401 — causes redirect loops when already on `/login`.
- Don't show exercise detail by default on list cards — use expandable cards with tap-to-reveal. Information density overwhelms on mobile.
- Don't use side borders for active/selected states — they look generic and unbalanced. Use background elevation (`--bg-elevated`) instead.
- Don't change card padding between expanded/collapsed states — causes visible content shift. Keep padding constant.

## Design Tokens

```
--bg-primary: #0a0a0f    --bg-surface: #12121a    --bg-elevated: #1a1a25
--accent-amber: #e8a832 (primary actions)    --accent-cyan: #32c8e8 (data)
--accent-green: #32e868 (success)            --accent-red: #e83232 (danger)
--font-body: Inter    --font-data: JetBrains Mono
```

Max 4px border-radius. Monospace for all numbers. 44px minimum touch targets. Dark backgrounds only.

## Dev

- Backend: `cargo run -p lightweight-server` (port 3000, env: LW_DB_PATH, LW_PORT)
- Frontend: `cd frontend && npm run dev` (port 5173, proxies /api)
- Check: `cargo check` then `cd frontend && npx tsc --noEmit`
- Build frontend before Rust release — `rust-embed` embeds `frontend/dist/`
- A placeholder `frontend/dist/index.html` must exist or rust-embed won't compile
