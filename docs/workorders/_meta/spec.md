---
status: standing
type: infra
created: 2026-07-13
summary: Constitution for the workorders system — format, lifecycle, conventions
verifier: self-describing; every workorder in this tree conforms to the format below
---

# Workorders — Constitution

A **workorder** is a bounded unit of build/ops work with a single checkable done-condition and a running manifest (the compass). It exists to survive interruption: its *status*, not its location, marks progress. Code becomes the source of truth on ship; the workorder freezes as the archaeology of *why*.

## When to birth one

- **Surgical edit** (self-evident AND one sitting) → just do it, no workorder.
- **Workorder** (uncertain intent OR spans sessions) → `spec.md` + `manifest.md` here.
- One-line test: *"Could I lose the thread?"* If interruption would cost, birth one.

## Structure

Each lives in `docs/workorders/{feature}-{work}/` — named for the **work**, not the feature, so no versioning/dates in the dir name. Two files:

- **`spec.md`** — frontmatter is the **single source of truth for status**. Body: Intent, Done-condition, Verifier, Scope bounds, The invisible (rejected alternatives, failure avoided, aesthetic intent), optional Approach.
- **`manifest.md`** — reverse-chronological dated entries (`## YYYY-MM-DD — …`): decisions, deviations, current state, next step. Carries **no** status field (status lives only in `spec.md`). Newest entry = current state + last-activity date.

## Lifecycle

`status`: `active | watching | shipped | paused | abandoned` (`standing` for this constitution).

- **Freeze on ship, never move**: flip `status: shipped` + add `shipped:` date in place; regenerate/update INDEX. Nothing migrates to an archive.
- **`watching`** — build done, only real-world evidence remains (device, telemetry, weeks of use). Manifest's newest entry names the observables. On evidence → `shipped` or back to `active`.
- **Iteration** = a new small workorder scoped to the changed corner, not a living per-feature spec.
- **Status change = edit the spec**, then update the INDEX (a derived view).

## INDEX

`docs/workorders/INDEX.md` is the browse surface (columns: Workorder · Type · Status · Created · Shipped · Last activity · What it is). No generator exists in this repo yet, so it is hand-maintained — update the row when a spec's frontmatter changes.
