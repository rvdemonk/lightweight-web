# Backlog

Prioritized work items for Lightweight. Tags: `#bug`, `#tech-debt`, `#feature`, `#ux`

**How to use this document:**
- Items live in priority sections (Blocking → Next Up → Later → Someday)
- When completed, remove from original section and add to Completed under the version shipped
- Keep descriptions concise

---

## Blocking

*None currently.*

---

## Next Up

- [ ] `#bug` **`sessions list` CLI parse error** — `lw sessions list` fails with "error decoding response body". Likely a field mismatch between the API response shape and what the CLI expects to deserialize.

- [ ] `#ux` **Dial in EVA aesthetic** — some elements are overcooked. Review glow effects, angular borders, and monospace styling for places where the theme is more corny than cool.

- [ ] `#feature` **Training phase tracking** — user sets phase (cutting/maintaining/bulking). Adjust progressive overload feedback so weight decreases during a cut aren't flagged negatively. Use phases to segment training history.

- [ ] `#feature` **User-selectable UI themes** — theme preference stored in DB so it syncs across devices (mobile and desktop browser match).

- [ ] `#feature` **History: convert freeflow workout to template** — option on a completed freeflow session to save it as a reusable workout template.

- [ ] `#feature` **Post-workout report** — shown after ending a session: e1RM gains for movements with PRs, how far off the others were, anomalies, comparison to last session of the same template.

- [ ] `#feature` **Muscle group dimension pages** — per-muscle-group views showing template progress reports, shifting from the current "all exercises" page to group-specific analysis.

- [ ] `#feature` **Weekly training report** — aggregated weekly insights. Possibly LLM-generated summaries of training trends, volume, PRs, and recommendations.

- [ ] `#feature` **Email integration** — password reset, account recovery. Required before full public launch. Not needed for invite-gated beta.

---

## Later

- [ ] `#tech-debt` **Harden deploy.sh** — add health check (curl after restart, confirm 200), auto-tag git on successful deploy.

- [ ] `#tech-debt` **Expired auth_sessions cleanup** — rows accumulate indefinitely. Add periodic sweep or lazy cleanup in verify_token.

- [ ] `#tech-debt` **CSP header** — add Content-Security-Policy via nginx or meta tag for XSS defense-in-depth.

- [ ] `#feature` Pull-ups exercise metadata — auto-created during import with no muscle group or equipment. Fill in (Back, Bodyweight) or merge with Chin-ups.

---

## Someday

- [ ] `#feature` Progressive overload tracking — surface weight/rep trends per exercise over time.
- [ ] `#feature` REST timer — between-set countdown timer with haptic feedback.

---

## Completed

### v1.1.0 (Android)
- [x] `#feature` Home screen dashboard redesign — mini heatmap, recent sessions, quick-start
- [x] `#feature` Exercise library — 92 exercises with short names, muscle groups, equipment
- [x] `#feature` Multi-user auth — invite code registration, real user IDs
- [x] `#feature` Bidirectional sync — push-only client, atomic session sync endpoint
- [x] `#feature` Geometric sync animation on first-login data import
- [x] `#feature` Android release signing and Play Store submission readiness

### v1.0.0
- [x] `#feature` Per-user invite link system — generate, share via QR/URL, one-time use, quota tracking
- [x] `#feature` Auth sessions with 30-day expiry — multi-device, server-side logout
- [x] `#feature` EST. TARGET WEIGHT in template editor — e1RM-derived weight for rep range
- [x] `#feature` Template version history — snapshots before edits, expandable in editor
- [x] `#feature` Freeform workouts show previous data and PR targets
- [x] `#feature` Tap-to-type on increment buttons
- [x] `#feature` Stale sessions auto-close after 2 hours of inactivity
- [x] `#feature` CLI analytics subcommand with report endpoint
- [x] `#feature` Data export GET endpoint (JSON via analytics report)
- [x] `#feature` PR heatmap overlay on activity heatmap
- [x] `#ux` New user onboarding — template button always active, + New Template in selector
- [x] `#ux` Menu reorganisation — SYSTEM section with Settings + Invites, BETA status
- [x] `#ux` BriefingPage context-aware CTA (Continue/SKIP vs Login/ACCESS)
- [x] `#security` Rate limiting on auth endpoints (10/min per IP)
- [x] `#security` CORS locked to production origin
- [x] `#security` Password minimum 8 characters
- [x] `#security` Session ownership checks on analytics endpoints
- [x] `#security` Invite registration wrapped in transaction
- [x] `#tech-debt` Backup protocol — backup.sh + auto-backup in deploy.sh
- [x] `#tech-debt` Server binds 127.0.0.1 by default (behind nginx)

### v0.9.0
- [x] `#feature` PR hazard stripes on set bars (absolute + set-position)
- [x] `#feature` Progression targets on exercise cards (e1RM-based, rep-range-aware)
- [x] `#ux` Active workout nav — template name + live timer replaces HOME
- [x] `#ux` Tap exercise title to collapse card
- [x] `#ux` Spontaneous exercises marked ADDED in session history

### v0.8.1
- [x] `#feature` Heatmap day → filtered history navigation
- [x] `#ux` Collapsed exercise cards show set progress (2/4)
- [x] `#ux` History date filter with banner and clear button
- [x] `#bug` RIR defaults to null not zero
- [x] `#bug` Active workouts in history link to live session
- [x] `#bug` Timer clock drift on mobile (server clock calibration)
- [x] `#ux` Auto-delete empty sessions on workout end

### v0.4.0
- [x] `#feature` Day/night theme toggle — off-white + teal light theme, NERV-style selector in burger menu
- [x] `#feature` S-curve workout progress bar with red→green gradient reveal
- [x] `#ux` Hoisted version to single source (`version.ts`), removed from header, enlarged in burger menu
- [x] `#ux` Cleaner increment buttons — symbols only, transparent backgrounds, stronger borders
- [x] `#ux` Collapsed exercise cards transparent, active card highlighted with border
- [x] `#ux` Login page: text wordmark, prominent Register button, OR divider
- [x] `#ux` Light theme as default for new users
- [x] `#ux` Exercise list: equipment as expanded detail only, uppercase labels, archive as btn-danger
- [x] `#ux` Exercise form: muscle group + equipment as select dropdowns with enums
- [x] `#ux` Reduced glow intensity on history page

### v0.3.0
- [x] `#feature` RIR field per set
- [x] `#ux` Uppercase all program-generated display text
- [x] `#ux` Remove "Repeat Last" button
- [x] `#ux` 1.25kg weight increments
- [x] `#ux` History: set count with color-coded target adherence
- [x] `#ux` Progress bars on session detail page
- [x] `#ux` Phosphor-style bar visuals, angled edges, 2px radius
- [x] `#ux` Sticky workout header, full-screen note editor, long-press delete
- [x] `#feature` Log timestamp per set (already existed at data layer)

### v0.2.0
- [x] `#feature` Multi-user support — invite-code-gated registration, per-user data isolation

### v0.1.0
- [x] `#feature` Initial deployment to DO droplet with HTTPS at `lightweight.3rigby.xyz`
- [x] `#feature` CLI import of workout sessions from JSON
- [x] `#feature` Deploy script (`deploy.sh`) for one-command redeploy
- [x] `#feature` Cross-compilation setup (cargo-zigbuild, zig)
