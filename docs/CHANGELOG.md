# Changelog

All notable changes to Lightweight.

---

## v0.7.0 — 2026-03-07

### Added
- Session frequency chart — weekly bars with 4-week rolling average trend line
- Muscle balance radar chart — spider graph with multi-span overlay (4W/8W/12W), normalised to sets/week, zero-volume groups highlighted in red
- Exercise editing — tap to expand, edit name/muscle group/equipment inline
- PR cards tap-to-expand — reveals record set detail and date with NERV accent divider
- Inline exercise creation from workout builder — search-based fullscreen picker with "Create & Add" when no match found
- Exercise selector chevron indicator (angular SVG, accent-coloured)
- Volume chart loading state
- What's New overlay — cumulative changelog shown on version updates, dismissable, opt-out via settings
- Settings page — toggle preferences, view changelog, export data, log out
- Session history CSV export — flat one-row-per-set format, weekly rate limit per user
- Generic user preferences API (`GET/PUT /api/v1/preferences/:key`)

### Fixed
- Native number input spinners hidden globally (redundant with +/- buttons)
- PR card date format: ambiguous dd/mm → unambiguous "3 Mar"
- PR cards: replaced fragile aspect-ratio constraint with minHeight
- Progress bar repositioned above action buttons on active workout
- Progress bar vertical spacing improved
- Muscle balance uses calendar weeks not data-weeks for accurate time spans

---

## v0.6.0 — 2026-03-06

### Added
- Activity heatmap — GitHub contribution-style calendar grid, auto-sizing, 16-week minimum window
- e1RM progression chart — per-exercise scatter dots with 21-day rolling-best line, RIR-adjusted
- Personal records — three cards: best e1RM (with 30-day delta), heaviest weight, most reps
- Weekly volume chart — stacked bars with three-way toggle: Total / Upper-Lower-Core / Muscle Group
- Analytics exercise selector — auto-selects exercise with most data

---

## v0.5.0 — 2026-03-06

### Added
- Analytics page placeholder (COMING SOON) — will host progress metrics, plots, infographics
- Analytics nav item in main navigation

### Fixed
- Font variables missing from light theme — fonts now defined on :root, shared by both themes
- Theme toggle broken by CSS specificity — :root was overriding dark theme; split into separate :root and [data-theme] blocks

### Changed
- Empty state text: "No workouts created" (workouts page), "No workouts recorded" (history page)
- Workout template editor layout refactored — improved exercise card structure

---

## v0.3.0 — 2026-03-06

### Added
- RIR (Reps In Reserve) optional field per set, with muted increment input
- Set count with color-coded target adherence on history page (green/amber/red/cyan)
- Progress bar visualisation on session detail page (shared SetBars component)
- Sticky workout header — title, timer, pause/end pinned on scroll
- Long-press to delete sets (replaces × button, no layout shift)
- Full-screen note editor optimised for mobile keyboards

### Changed
- Weight increments from 2.5kg to 1.25kg for microloading
- Removed redundant "Repeat Last" button from set logger
- LAST/TARGET merged into single row with MAGI-style formatting (× separator, double-space, all caps)
- Uppercase all program-generated display text (dates, labels, workout names)
- Progress bars: phosphor-style muted fills with glow, angled right edge, 2px radius
- Notes: removed italics, promoted to primary text color
- Session detail: stacked back button, full-width layout
- Global 2px border-radius on cards, buttons, inputs
- Disabled overscroll bounce

---

## v0.2.0 — 2026-03-06

### Added
- Multi-user support with invite-code-gated registration
- Per-user data isolation (exercises, templates, sessions)

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
