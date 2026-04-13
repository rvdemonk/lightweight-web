---
Document Context:
  Created: 2026-04-12
  Source: Branding exploration session — NGE typography analysis, animise logomark adoption, font system design
  Status: BINDING PLAN
  Purpose: Universal style and branding decisions for Lightweight across all surfaces
---

# Lightweight Brand Guide

Canonical reference for branding, typography, colour, and visual identity. These decisions cascade to web app, Android app, Play Store listing, marketing, and all product communications.

---

## Name

**Lightweight** — double entendre. The product is frictionless (lightweight to use). The domain is resistance training (lightweight, buddy). Directly inspired by Ronnie Coleman. Unpretentious, memorable, no explanation required.

Abbreviation: **LW** (used in nav, compact contexts, app icon candidates).

## Logomark

Adopted from the animise project. A square containing a triangle, where the triangle's vertices touch the top-left corner, the right edge (~30% down), and the bottom edge (~30% across). All stroke, no fill. Pure geometry.

```svg
<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
  <rect x="1.5" y="1.5" width="25" height="25" rx="1"
        stroke="[accent]" stroke-width="1.5"/>
  <polygon points="1.5,1.5 26.5,8.2 8.2,26.5"
           stroke="[accent]" stroke-width="1.5"
           stroke-linejoin="round" fill="none"/>
</svg>
```

- Stroke weight: **1.5** (default), **2.0** for hot/hero contexts
- Glow: `drop-shadow(0 0 4px rgba(212,118,44,0.4)) drop-shadow(0 0 12px rgba(212,118,44,0.1))` on dark theme
- Scales cleanly from 16px (sidebar) to 512px (splash)
- In lockups, the wordmark cap-height matches the mark height

## Typography

Three-tier font system. Same family for display and body (Barlow) — cohesive but each width serves its purpose.

| Token | Font | Use | Rationale |
|-------|------|-----|-----------|
| `--font-display` | Barlow Condensed | Wordmarks, nav labels, headings, page titles | NGE-accurate condensed sans. Information-dense, system-display feel. |
| `--font-body` | Barlow | Exercise names, labels, body text, buttons, inputs | Regular width for readability at body sizes. Same family as display. |
| `--font-data` | JetBrains Mono | Weights, reps, e1RM, timers, set counts, all numeric data | Monospace alignment matters for scanning columns of numbers. |

**Display weights**: 500 (standard), 600 (emphasis/branding). Letter-spacing 0.04–0.08em.
**Body weights**: 400 (standard), 500 (emphasis), 600 (headings).
**Data weights**: 400 (standard), 500 (emphasis), 700 (hero numbers).

All caps for: wordmarks, nav labels, page titles, section headers, button text.
Mixed case for: exercise names (all caps currently, but driven by data — not a branding rule).

## Colour

Dark theme is primary. Light theme exists but is secondary.

### Dark Theme

| Token | Value | Use |
|-------|-------|-----|
| `--bg-primary` | `#07070d` | Page background |
| `--bg-surface` | `#0c0c14` | Cards, nav |
| `--bg-elevated` | `#14141f` | Active states, modals |
| `--accent-primary` / `--accent-amber` | `#d4762c` | Primary actions, branding, wordmarks |
| `--accent-cyan` | `#32c8e8` | Data, secondary information |
| `--accent-green` | `#32e868` | Success, completion |
| `--accent-red` | `#e83232` | Danger, errors |
| `--text-primary` | `#d4d4e0` | Body text |
| `--text-secondary` | `#6a6a82` | Labels, secondary text |

### Glow

Amber glow on branding elements and primary actions (dark theme only):
- Text: `0 0 10px rgba(212, 118, 44, 0.6)`
- Elements: `0 0 8px rgba(212, 118, 44, 0.5), 0 0 24px rgba(212, 118, 44, 0.12)`
- Soft: `0 0 4px rgba(212, 118, 44, 0.2)`

No glow on light theme.

## Visual Language

- **Max 4px border-radius** — angular, not rounded
- **44px minimum touch targets** — accessible, one-handed
- **Dark backgrounds only** for marketing materials
- **CRT scanline overlay** — subtle, cosmetic (dark theme)
- **Grid pattern background** — faint amber grid lines
- **No side borders for active states** — use background elevation instead

## Aesthetic Reference

MAGI/NERV scientific program. Manhattan Project researchers at a classified terminal, not Pentagon. Clinical, functional labels. Computer science and research lab language, not military jargon or gamification.

Key reference: NGE system displays use **condensed proportional sans-serif** (not monospace), bold weight, tight tracking, mixed all-caps/title-case hierarchy. Information density without aggression.

## App Icon

Mark only on `#07070d` background with amber glow. Reads at all sizes from 48dp to 512px. No text in the icon — the geometric mark is sufficient.

## Lockup

For splash screens, about pages, marketing:
```
[mark] LIGHTWEIGHT
```
Mark and wordmark same height. Barlow Condensed 600, letter-spacing 0.06em, amber with glow.

## What This Guide Does NOT Cover

- Component-level design patterns (see code)
- Responsive breakpoints (see CSS)
- Animation/transition specs (see code)
- Content/copy guidelines (future)
