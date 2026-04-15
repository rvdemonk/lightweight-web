---
Document Context:
  Created: 2026-04-13
  Status: LIVING DOCUMENT
  Purpose: Deferred features and future work for Android app
---

# Android App Backlog

Items deferred from v1 implementation. Ordered roughly by value.

---

## Deferred from v1

### Template version history viewer
View previous template snapshots from the edit screen. Snapshots are already stored in Room (`template_snapshots` table) — just needs UI. Show version list with expandable cards revealing the exercise programming at that version.

### Full analytics suite
All charts from web app: activity heatmap (full version with template colors, PR overlay), e1RM progression line chart, weekly volume stacked bars, session frequency with rolling average, muscle balance radar/pie, e1RM spider chart, e1RM movers, stale exercises. Requires charting decisions (library vs custom Canvas). The home screen mini-heatmap is in v1; the rest lives here.

### Exercise reordering in templates
Drag-to-reorder exercises within a template. Currently position is set on add and exercises can only be removed/re-added to change order.

### Session notes
The web app supports session-level notes (not just per-exercise). Include in session create/update flow.

### Rest timer
Configurable rest timer between sets. Auto-starts on LOG SET, shows countdown, optional vibration alert.

---

## Future (post-launch)

### Deep links for invite codes
Android intent filters for `lightweight.3rigby.xyz/join/:code` URLs. Opens app directly to join flow.

### Backup/restore
Local DB backup to device storage or cloud (Google Drive). Restore from backup file.

### Widgets
Android home screen widget showing: days since last workout, current streak, next scheduled template.
