# Changelog

All notable changes to Lightweight.

---

## v0.1.0 — 2026-02-15

Initial production deployment.

### Added
- Rust/Axum backend with embedded React frontend (rust-embed), single binary
- Auth (password + bearer token), exercise CRUD, template CRUD, session logging with sets
- Bulk session import endpoint (`POST /api/v1/sessions/import`)
- CLI (`lw`) for login, exercise/template/session management, and JSON import
- NGE-inspired dark UI with amber/cyan accents, mobile-optimised
- Production deployment to DO droplet at `https://lightweight.3rigby.xyz`
- Deploy script for cross-compiled one-command redeploy
- systemd service, nginx reverse proxy, Let's Encrypt TLS
