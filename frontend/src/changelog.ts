export interface ChangelogVersion {
  version: string;
  date: string;
  highlights: string[];
}

// Add new versions at the top. Each highlight is a single user-facing line.
// This is the source of truth for the What's New overlay.
export const CHANGELOG: ChangelogVersion[] = [
  {
    version: "1.0.0",
    date: "2026-04-12",
    highlights: [
      "Invite links — share Lightweight with friends via QR code or link from the Invites page",
      "EST. TARGET WEIGHT in template editor — shows your estimated working weight for the rep range",
      "Tap-to-type on increment buttons — tap the number to type directly",
      "Template version history — see previous versions of your workout templates",
      "Freeform workouts now show previous session data and PR targets",
      "Stale workouts auto-close after 2 hours of inactivity",
    ],
  },
  {
    version: "0.9.0",
    date: "2026-03-11",
    highlights: [
      "PR badges: hazard stripes on set bars — amber for absolute PR, cyan for set-position PR",
      "Progression targets: shows reps needed to beat your set PR at current and next weight",
      "Active workout nav: menu shows template name and live timer instead of HOME",
      "Tap exercise title to collapse card without opening another",
      "Spontaneous exercises marked with ADDED tag in session history",
    ],
  },
  {
    version: "0.8.1",
    date: "2026-03-08",
    highlights: [
      "Tap heatmap days to view workout history for that date",
      "Collapsed exercise cards show set progress (e.g. 2/4)",
      "RIR defaults to unset — no more accidental zero",
      "Active workouts in history link to live session",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-03-08",
    highlights: [
      "Activity heatmap: toggle between intensity and workout view with per-template colours",
      "Activity heatmap: desktop hover tooltips showing date and set details",
      "Muscle balance: volume donut chart showing proportional muscle group distribution",
      "Analytics page reordered: e1RM → spider → dormant exercises → movers",
      "Config buttons hoisted above chart frames for consistency",
      "Start Workout button on templates page",
      "Session history shows exercise and set counts",
      "Dormant exercises and e1RM movers analytics",
    ],
  },
  {
    version: "0.7.1",
    date: "2026-03-07",
    highlights: [
      "Skeleton loading states for analytics",
      "Theme toggle on settings page for desktop",
    ],
  },
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
