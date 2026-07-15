// Chart constants — values, not behaviors (the Android chart-library lesson:
// an LLM doesn't drift on APIs, it drifts on aesthetics; encode the aesthetic).
//
// Charts are the ONE place the amber-only rule bends (settled 2026-07-15):
// multi-series identity needs hue. Green and red stay reserved (PR /
// destructive) and never appear as series colors.

import SwiftUI

enum ChartTheme {

    /// Categorical series palette. Fixed assignment order, never cycled —
    /// more series than colors means fold into "other", not invent a hue.
    /// Amber leads (the hero lift is a brand statement); the rest sit in the
    /// same lightness band so no series shouts.
    static let series: [Color] = [
        Theme.amber,                                                    // amber
        Color(red: 0x5F / 255, green: 0xA8 / 255, blue: 0xE8 / 255),    // blue
        Color(red: 0xA7 / 255, green: 0x8B / 255, blue: 0xE8 / 255),    // violet
        Color(red: 0x4E / 255, green: 0xC9 / 255, blue: 0xB0 / 255),    // teal
        Color(red: 0xE8 / 255, green: 0x7A / 255, blue: 0xB0 / 255),    // pink
        Color(red: 0x8E / 255, green: 0x99 / 255, blue: 0xA8 / 255),    // slate
    ]

    /// Editorial minimalism: horizontal grid barely-there, no vertical grid.
    static let gridAlpha: Double = 0.12
    /// Lines recede slightly; end dots are full-opacity.
    static let lineAlpha: Double = 0.7
    static let lineWidth: CGFloat = 2
    /// EMA smoothing factor — smooth trend, not rolling-best staircases.
    static let emaAlpha: Double = 0.3
    /// Legend sits BELOW the plot (in-plot end labels stole width and
    /// couldn't fit real names). Dot = the color code; text stays secondary.
    static let legendFont = Font.system(size: 13, weight: .semibold).monospacedDigit()
    static let legendDot: CGFloat = 8
    static let chartHeight: CGFloat = 240
    static let barChartHeight: CGFloat = 140
    static let barCornerRadius: CGFloat = 2
}
