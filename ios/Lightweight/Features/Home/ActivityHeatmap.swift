// GitHub-style activity heatmap: columns are weeks (oldest left), rows are
// Sun–Sat. Intensity = sets logged that day, in amber steps. Content layer —
// plain fills, no glass.

import SwiftUI

struct ActivityHeatmap: View {
    /// "yyyy-MM-dd" (UTC, matching started_at) → sets logged that day.
    let setsByDay: [String: Int]
    var weeks: Int = 18

    private static let dayKey: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    var body: some View {
        GeometryReader { geo in
            let gap: CGFloat = 3
            let cell = (geo.size.width - gap * CGFloat(weeks - 1)) / CGFloat(weeks)
            HStack(alignment: .top, spacing: gap) {
                ForEach(weekStarts(), id: \.self) { weekStart in
                    VStack(spacing: gap) {
                        ForEach(0..<7, id: \.self) { dayOffset in
                            let day = weekStart.addingTimeInterval(Double(dayOffset) * 86_400)
                            if day <= Date() {
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(color(for: day))
                                    .frame(width: cell, height: cell)
                            } else {
                                Color.clear.frame(width: cell, height: cell)
                            }
                        }
                    }
                }
            }
        }
        .aspectRatio(CGFloat(weeks) / 7.0, contentMode: .fit)
    }

    /// Sundays of the trailing `weeks` weeks, oldest first (UTC).
    private func weekStarts() -> [Date] {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let today = cal.startOfDay(for: Date())
        let weekday = cal.component(.weekday, from: today)   // 1 = Sunday
        let lastSunday = cal.date(byAdding: .day, value: -(weekday - 1), to: today)!
        return (0..<weeks).reversed().map {
            cal.date(byAdding: .day, value: -7 * $0, to: lastSunday)!
        }
    }

    private func color(for day: Date) -> Color {
        let sets = setsByDay[Self.dayKey.string(from: day)] ?? 0
        switch sets {
        case 0: return Color(.tertiarySystemFill)
        case 1...10: return Theme.amber.opacity(0.35)
        case 11...20: return Theme.amber.opacity(0.65)
        default: return Theme.amber
        }
    }
}
