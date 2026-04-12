# Lightweight

Multi-user workout tracker. Frictionless mobile logging, progressive overload tracking. Rust/Axum + React/TS + SQLite, single binary.

## Product Essence

- Optimised for one-handed phone use between sets
- Progressive disclosure everywhere — show names first, details on demand
- NGE-influenced dark aesthetic: angular, monospace data, amber/cyan accents
- Multi-user with invite-link-gated registration, single binary, no cloud dependencies

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
- Don't use military jargon in UI copy (callsign, access code, operator, authenticate) — the aesthetic is MAGI/NERV scientific program, not modern military. Think Manhattan Project researchers at a classified terminal, not Pentagon. Labels should be clinical and functional: "USERNAME", "PASSWORD", "Login". Computer science and research lab language, not combat ops.
- Don't modify production DB sessions belonging to other users — Lewis is user_id 1. We accidentally closed another user's active session when fixing Lewis's. Always filter by `user_id = 1` (or confirm the user) before UPDATE/DELETE on sessions.
- Don't deploy without backing up the production DB first — `deploy.sh` does this automatically (stops server, SCPs the DB, then deploys). For manual backups: `./backup.sh [label]`. Always check for active workout sessions before stopping the server (`SELECT ... FROM sessions WHERE status IN ('active', 'paused')`). Backups live in `backups/YYYY-MM-DD/`.

## Design Tokens

```
--bg-primary: #0a0a0f    --bg-surface: #12121a    --bg-elevated: #1a1a25
--accent-amber: #e8a832 (primary actions)    --accent-cyan: #32c8e8 (data)
--accent-green: #32e868 (success)            --accent-red: #e83232 (danger)
--font-body: Inter    --font-data: JetBrains Mono
```

Max 4px border-radius. Monospace for all numbers. 44px minimum touch targets. Dark backgrounds only.

## Product Direction

Web app is a prototype — mid-term goal is Android native. The Rust/Axum API server stays as the backend, serving a read-only web interface for desktop viewing of lift metrics, progressions, and account data. Keep the server simple accordingly.

## Dev

- Backend: `cargo run -p lightweight-server` (port 3000, env: LW_DB_PATH, LW_PORT)
- Frontend: `cd frontend && npm run dev` (port 5173, proxies /api)
- Check: `cargo check` then `cd frontend && npx tsc --noEmit`
- Build frontend before Rust release — `rust-embed` embeds `frontend/dist/`
- A placeholder `frontend/dist/index.html` must exist or rust-embed won't compile
- Deploy: `./deploy.sh` — builds frontend, cross-compiles via cargo-zigbuild, auto-backups prod DB, SCPs to droplet, restarts service
- Backup: `./backup.sh [label]` — stops server (WAL checkpoint), SCPs DB, restarts. Backups in `backups/YYYY-MM-DD/`
- Production: `https://lightweight.3rigby.xyz` (DO droplet 170.64.189.221, systemd + nginx + Let's Encrypt)
- Env vars in prod systemd: `LW_DB_PATH`, `LW_PORT`, `LW_INVITE_CODE` (admin backdoor), `LW_CORS_ORIGIN` (locked to production URL)
- Server binds 127.0.0.1 by default (behind nginx). Set `LW_HOST=0.0.0.0` for direct access in dev.
