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

---

## Later

- [ ] `#feature` Pull-ups exercise metadata — auto-created during import with no muscle group or equipment. Fill in (Back, Bodyweight) or merge with Chin-ups.

---

## Someday

- [ ] `#feature` Multi-user support — currently single-user by design. Revisit if others want to use it.
- [ ] `#feature` Progressive overload tracking — surface weight/rep trends per exercise over time.
- [ ] `#feature` REST timer — between-set countdown timer with haptic feedback.

---

## Completed

### v0.1.0
- [x] `#feature` Initial deployment to DO droplet with HTTPS at `lightweight.3rigby.xyz`
- [x] `#feature` CLI import of workout sessions from JSON
- [x] `#feature` Deploy script (`deploy.sh`) for one-command redeploy
- [x] `#feature` Cross-compilation setup (cargo-zigbuild, zig)
