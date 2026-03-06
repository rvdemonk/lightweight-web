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

- [ ] `#bug` **Rest timer starts at ~0:50 instead of 0:00** — timer should begin counting from zero after completing a set.

- [ ] `#feature` **Show LAST and BEST per exercise** — display previous session performance and all-time best for each exercise during a workout. Include the date on LAST.

- [ ] `#feature` **PR indicators on set log** — show an indicator next to a set if it's a PR for the exercise overall or for that specific set position (e.g. best-ever 2nd set). Track both rep and weight PRs.

- [ ] `#feature` **Training phase tracking** — user sets phase (cutting/maintaining/bulking). Adjust progressive overload feedback so weight decreases during a cut aren't flagged negatively. Use phases to segment training history.

- [ ] `#feature` **User-selectable UI themes** — theme preference stored in DB so it syncs across devices (mobile and desktop browser match).

- [ ] `#feature` **History: convert freeflow workout to template** — option on a completed freeflow session to save it as a reusable workout template.

---

## Later

- [ ] `#tech-debt` **Harden deploy.sh** — add health check (curl after restart, confirm 200), backup previous binary as `lightweight-server.prev` for quick rollback, auto-tag git on successful deploy.

- [ ] `#feature` Pull-ups exercise metadata — auto-created during import with no muscle group or equipment. Fill in (Back, Bodyweight) or merge with Chin-ups.

---

## Someday

- [ ] `#feature` Progressive overload tracking — surface weight/rep trends per exercise over time.
- [ ] `#feature` REST timer — between-set countdown timer with haptic feedback.

---

## Completed

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
