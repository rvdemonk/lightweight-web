export interface ChangelogVersion {
  version: string;
  date: string;
  highlights: string[];
}

// Add new versions at the top. Each highlight is a single user-facing line.
// This is the source of truth for the What's New overlay.
export const CHANGELOG: ChangelogVersion[] = [
  {
    version: "0.7.0",
    date: "2026-03-07",
    highlights: [
      "Session frequency chart with rolling average",
      "Muscle balance radar chart with multi-period overlay",
      "e1RM spider chart for cross-exercise progression comparison",
      "Inline exercise editing",
      "What's New notifications on version updates",
      "Settings page with preferences",
      "Export all session history to CSV",
      "Skeleton loading states for analytics",
      "Theme toggle on settings page for desktop",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-03-06",
    highlights: [
      "Activity heatmap",
      "e1RM progression chart with RIR adjustment",
      "Personal records with 30-day delta",
      "Weekly volume chart with muscle group breakdown",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-03-06",
    highlights: [
      "Analytics page",
      "Theme toggle (night/day)",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-03-06",
    highlights: [
      "RIR tracking per set",
      "Long-press to delete sets",
      "Sticky workout header with timer",
      "Full-screen note editor",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-03-06",
    highlights: [
      "Multi-user support with invite codes",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-02-15",
    highlights: [
      "Initial release",
    ],
  },
];
