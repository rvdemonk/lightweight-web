# Changelog

All notable changes to Lightweight.

<!--
RELEASE PIPELINE — tracks what's shipped where.
  Device: installed on Lewis's phone (release APK via adb)
  Console: uploaded to Play Store (bundle version)
When a new bundle ships to console, mark rows with the version.
When all rows are shipped, move them into a versioned section below and clear the table.
-->

## Unreleased

| Change | Device | Console | Commit |
|--------|:------:|:-------:|--------|
| Triangle grid sync animation, dev tools preview | yes | — | dcb60fa |
| Beta signup flow and admin dashboard | yes | — | 9c39028 |
| Fix beta page flicker (web) | n/a | — | d8565cf |
| Fade-in content on all tab screens | yes | — | fbe74ed |
| Baseline profile for AOT startup | yes | — | 6a19e29 |
| Branded splash held until dashboard ready | yes | — | 7b20e6c |
| Eliminate welcome screen flash (loading gate) | yes | — | 52c9dc9 |
| New-user experience polish (PRs, picker, analytics) | yes | 1.0.0 | 2645f4e |

**Console 1.0.0** = internal + closed testing (2026-04-15, versionCode 1)

---

## v1.1.0 — 2026-04-15

### Added
- Home screen dashboard redesign — mini heatmap, recent sessions, quick-start workout
- Exercise library — 92 exercises with short names, muscle groups, equipment categories
- Multi-user auth with invite code registration and real user IDs
- Bidirectional sync — push-only client with atomic session sync endpoint, manual and auto-sync
- Geometric sync animation on first-login data import
- Android release signing config (keystore, R8/minification)
- WAL-safe backup protocol — server checkpoints WAL on graceful shutdown

### Changed
- Sync button copy refined, removed unused DataImportRepository dependency
- Android app now ahead of web app in features

---

## v1.0.0 — 2026-04-12

### Added
- Per-user invite link system — generate one-time invite links (5 per user), share via QR code or URL, track pending/joined status
- `/join/:code` registration flow — validates invite, shows inviter attribution, username + password only
- Auth sessions with 30-day expiry — multi-device support, server-side logout revokes individual tokens
- Rate limiting on auth endpoints — 10 requests per IP per 60-second window
- EST. TARGET WEIGHT in template editor — e1RM-derived weight range for configured reps, updates live
- Invites page at `/settings/invites` — expandable pending invites with QR + copy link, joined user list
- SYSTEM section in mobile menu — Settings and Invites grouped below DISPLAY; BETA status label
- `backup.sh` for manual database backups; auto-backup integrated into `deploy.sh`
- Template version history — snapshots before every edit, expandable version list in editor
- Tap-to-type on increment buttons — direct number input via keyboard
- Freeform workouts show previous session data and PR targets
- Stale sessions auto-close after 2 hours of inactivity
- CLI analytics: `lw analytics` with e1rm, volume, summary, report subcommands
- Exercise watch list and analytics report endpoint for AI health-analysis workflows

### Fixed
- Session ownership checks on `session_prs` and `session_exercise_previous` endpoints
- Login no longer invalidates other active sessions
- Frequency chart current-week bar shown at reduced opacity instead of hidden

### Changed
- Registration gated by invite links — shared `LW_INVITE_CODE` kept as admin backdoor via `/login?code=`
- Password minimum 8 characters enforced server-side
- BriefingPage CTA context-aware — "Continue"/"SKIP" for logged-in, "Login"/"ACCESS" for guests
- CORS lockable via `LW_CORS_ORIGIN` env var; server binds to 127.0.0.1 by default
- Invite registration wrapped in transaction to prevent orphaned users on race conditions

---

## v0.9.1 — 2026-03-11

### Added
- PR badges on activity heatmap — toggle overlay showing dates where e1RM personal records were set
- Two tiers: cyan dot for absolute e1RM PR, green dot for set-position PR
- PRs button in heatmap toolbar, works with both intensity and workouts views
- Tooltip shows PR type on hover when overlay is active

---

## v0.9.0 — 2026-03-11

### Added
- PR hazard stripes on set bars — amber diagonal stripes for absolute PRs, cyan for set-position PRs
- Progression targets on exercise cards — shows reps needed to beat set PR at current and next weight, colour-coded to rep range
- Active workout nav — menu shows template name (e.g. "UPPER A") with live timer instead of HOME
- Collapse exercise card by tapping its own title
- Spontaneous exercises in session history marked with ADDED tag
- Progression target calculator utility (e1RM-based, weight-increment-aware, rep-range-aware)

---

## v0.8.1 — 2026-03-08

### Added
- Heatmap day click navigates to filtered history — tap a workout day to see sessions from that date
- Collapsed exercise cards show completed/target set count (e.g. "2/4") during active workouts
- History date filter with header banner and "ALL HISTORY" clear button

### Fixed
- RIR defaults to null instead of zero — prevents false failure signals from accidental 0
- Active/paused workouts in history list now link to live workout page instead of premature history view

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
