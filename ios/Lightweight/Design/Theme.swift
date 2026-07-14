import SwiftUI

/// Design tokens — neoindustrial liquid glassmorphism.
///
/// Principles (settled 2026-07-15 with Lewis):
/// - One typeface: SF Pro. Hierarchy via weight + width, not color or font-switching.
///   Condensed bold caps for exercise names/headers (the neoindustrial survival route);
///   NO monospace fonts anywhere — but `.monospacedDigit()` (tabular figures) on every
///   number so steppers/timers don't jitter. Tabular digits ≠ monospace font.
/// - Mostly monochrome. Amber is the single brand accent (primary actions, active
///   states, glass tint). Green = PR achieved. Red = destructive. Used like punctuation.
///   Cyan is dead. Reference data (last session) is `.secondary`, not a hue.
/// - Both color modes, dark-first dogfooding. System backgrounds so glass lensing adapts.
/// - Glass is chrome-only (timer, toolbar, end-workout, tab accessory). Content layer
///   (exercise list, set rows) uses standard materials — never glass in scroll rows.
/// - 17pt floor on data, numbers, and anything tappable. 13pt tracked uppercase labels
///   are the one exception: metadata furniture, never numeric, never tappable.
/// - 4px-max-radius (web brand) is dead on iOS: chrome is capsule/containerConcentric,
///   content cards 12pt. Angularity survives in layout (hard grid, dense ordered rows).
enum Theme {

    // MARK: - Color

    /// #e8a832 — the single brand accent. Primary actions, active states, glass tints.
    static let amber = Color(red: 0xE8 / 255, green: 0xA8 / 255, blue: 0x32 / 255)
    /// PR / success only.
    static let green = Color(red: 0x32 / 255, green: 0xE8 / 255, blue: 0x68 / 255)
    /// Destructive only.
    static let red = Color(red: 0xE8 / 255, green: 0x32 / 255, blue: 0x32 / 255)

    // MARK: - Type scale

    /// 40pt — current set's weight & reps (the steppers). The biggest thing on screen.
    static let heroData = Font.system(size: 40, weight: .semibold).monospacedDigit()
    /// 28pt — PR targets, e1RM figures.
    static let titleData = Font.system(size: 28, weight: .semibold).monospacedDigit()
    /// 22pt condensed — exercise names (render uppercase), section headers.
    static let exerciseTitle = Font.system(size: 22, weight: .semibold).width(.condensed)
    /// 17pt — the floor. All readable text.
    static let body = Font.system(size: 17)
    /// 17pt medium tabular — set rows, last-session rows, timers.
    static let data = Font.system(size: 17, weight: .medium).monospacedDigit()
    /// 13pt — metadata labels ONLY ("LAST SESSION", "PR TARGET"). Apply via .metaLabel().
    static let label = Font.system(size: 13, weight: .semibold)

    // MARK: - Metrics

    /// 4pt spacing grid.
    static let grid: CGFloat = 4
    /// Screen margins.
    static let margin: CGFloat = 16
    /// Content-layer card corner radius (chrome uses capsule/concentric, not this).
    static let cardRadius: CGFloat = 12
    /// Minimum touch target (Apple HIG).
    static let minTouch: CGFloat = 44
    /// Stepper buttons exceed the minimum — they're hit between sets with shaky hands.
    static let stepperTouch: CGFloat = 56

    // MARK: - Domain increments

    static let weightIncrement: Double = 1.25 // kg
}

// MARK: - Modifiers

extension View {
    /// Tracked uppercase metadata label — the sole sub-17pt style.
    func metaLabel() -> some View {
        self.font(Theme.label)
            .tracking(0.6)
            .textCase(.uppercase)
            .foregroundStyle(.secondary)
    }
}
