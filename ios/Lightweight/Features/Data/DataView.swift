// Analysis surface. Editorial chart style (settled on Android, carried over):
// EMA-smoothed monotone lines, near-invisible horizontal grid only, and
// right-edge end labels in series color instead of a legend. Charts are the
// one surface where the amber-only rule bends — see ChartTheme.swift.

import SwiftUI
import Charts

struct DataView: View {
    @Environment(AppState.self) private var appState

    @State private var series: [DisplaySeries] = []
    @State private var growth: Double?
    @State private var sessions30d = 0
    @State private var weeks: [WeekBucket] = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.grid * 3) {
                    headlineRow
                    strengthCard
                    volumeCard
                }
                .padding(.horizontal, Theme.margin)
                .padding(.vertical, Theme.grid * 2)
            }
            .background(Color(.systemBackground))
            .navigationTitle("DATA")
            .task { reload() }
        }
    }

    // ── Load ──

    private func reload() {
        growth = try? appState.db.strengthGrowth30d()
        sessions30d = (try? appState.db.completedSessionsCount(days: 30)) ?? 0
        let trends = (try? appState.db.topLiftTrends(limit: 5, days: 90)) ?? []
        series = trends.enumerated().compactMap { index, trend in
            guard index < ChartTheme.series.count,      // fixed palette, never cycled
                  trend.points.count >= 3 else { return nil }
            let smoothed = Self.ema(trend.points, alpha: ChartTheme.emaAlpha)
            guard let base = smoothed.first?.e1rm, base > 0,
                  let last = smoothed.last else { return nil }
            // Indexed to the window start: every lift shares one band, and
            // the chart reads as "who's growing fastest" — absolute kg would
            // squash light lifts under heavy ones. kg belongs on drill-down.
            let indexed = smoothed.map {
                AppDatabase.TrendPoint(date: $0.date, e1rm: ($0.e1rm / base - 1) * 100)
            }
            return DisplaySeries(
                id: trend.exerciseId,
                label: Self.abbreviate(trend.name),
                color: ChartTheme.series[index],
                points: indexed,
                changePct: (last.e1rm - base) / base * 100)
        }
        weeks = Self.weekBuckets(
            byDay: (try? appState.db.activityByDay(days: 12 * 7)) ?? [:])
    }

    // ── Headline ──

    private var headlineRow: some View {
        HStack(spacing: Theme.grid * 2) {
            statTile(label: "Strength · 30d",
                     value: growth.map { String(format: "%+.1f%%", $0) } ?? "—",
                     valueColor: growthColor)
            statTile(label: "Sessions · 30d",
                     value: "\(sessions30d)",
                     valueColor: .primary)
        }
    }

    private var growthColor: Color {
        guard let growth else { return Color(.tertiaryLabel) }
        return growth >= 0 ? Theme.green : Theme.red
    }

    private func statTile(label: String, value: String, valueColor: Color) -> some View {
        VStack(alignment: .leading, spacing: Theme.grid) {
            // Scale down, never wrap — wrapping heightens the card vs siblings.
            Text(label).metaLabel()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Text(value)
                .font(Theme.titleData)
                .foregroundStyle(value == "—" ? Color(.tertiaryLabel) : valueColor)
                .contentTransition(.numericText())
        }
        .padding(Theme.margin)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
    }

    // ── Strength comparison ──

    private var strengthCard: some View {
        VStack(alignment: .leading, spacing: Theme.grid * 2) {
            Text("e1RM growth · 90 days").metaLabel()
            if series.isEmpty {
                emptyChart("Three sessions per lift draws a line.")
            } else {
                strengthChart
                    .frame(height: ChartTheme.chartHeight)
                legend
            }
        }
        .padding(Theme.margin)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
    }

    private var strengthChart: some View {
        Chart {
            ForEach(series) { s in
                ForEach(Array(s.points.enumerated()), id: \.offset) { _, p in
                    LineMark(
                        x: .value("Date", p.date),
                        y: .value("e1RM", p.e1rm),
                        series: .value("Lift", s.label))
                    .foregroundStyle(s.color.opacity(ChartTheme.lineAlpha))
                    .interpolationMethod(.monotone)
                    .lineStyle(StrokeStyle(lineWidth: ChartTheme.lineWidth))
                }
                if let last = s.points.last {
                    PointMark(
                        x: .value("Date", last.date),
                        y: .value("e1RM", last.e1rm))
                    .foregroundStyle(s.color)
                    .symbolSize(36)
                }
            }
        }
        .chartLegend(.hidden)
        .chartYScale(domain: yDomain)
        .chartXAxis {
            AxisMarks(values: .stride(by: .month)) {
                AxisValueLabel(format: .dateTime.month(.abbreviated), anchor: .top)
                    .font(Theme.label)
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { value in
                AxisGridLine()
                    .foregroundStyle(Color.primary.opacity(ChartTheme.gridAlpha))
                AxisValueLabel {
                    if let pct = value.as(Double.self) {
                        Text("\(pct >= 0 ? "+" : "")\(Int(pct))%")
                            .font(Theme.label)
                    }
                }
            }
        }
    }

    /// Hug the data — automatic domains pad to "nice" ticks (a dead −20%
    /// band under lines that never go negative). Zero stays anchored.
    private var yDomain: ClosedRange<Double> {
        let values = series.flatMap { $0.points.map(\.e1rm) }
        let lo = min(0, values.min() ?? 0)
        let hi = max(1, (values.max() ?? 1)) * 1.08
        return lo...hi
    }

    /// Color-coded key below the plot, sorted by growth descending.
    private var legend: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 108), alignment: .leading)],
                  alignment: .leading, spacing: Theme.grid * 2) {
            ForEach(series.sorted { $0.changePct > $1.changePct }) { s in
                HStack(spacing: Theme.grid + 2) {
                    Circle()
                        .fill(s.color)
                        .frame(width: ChartTheme.legendDot, height: ChartTheme.legendDot)
                    Text("\(s.label) \(s.changePct >= 0 ? "+" : "")\(Int(s.changePct.rounded()))%")
                        .font(ChartTheme.legendFont)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
        }
    }

    // ── Weekly volume ──

    private var volumeCard: some View {
        VStack(alignment: .leading, spacing: Theme.grid * 2) {
            Text("Sets per week · 12 weeks").metaLabel()
            if weeks.allSatisfy({ $0.sets == 0 }) {
                emptyChart("Logged sets land here week by week.")
            } else {
                volumeChart
                    .frame(height: ChartTheme.barChartHeight)
            }
        }
        .padding(Theme.margin)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
    }

    private var volumeChart: some View {
        Chart(weeks) { week in
            BarMark(
                x: .value("Week", week.weekStart, unit: .weekOfYear),
                y: .value("Sets", week.sets))
            .foregroundStyle(week.isCurrent ? Theme.amber : Color(.systemGray3))
            .cornerRadius(ChartTheme.barCornerRadius)
        }
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 3)) {
                AxisValueLabel(format: .dateTime.day().month(.abbreviated))
                    .font(Theme.label)
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: .automatic(desiredCount: 3)) {
                AxisGridLine()
                    .foregroundStyle(Color.primary.opacity(ChartTheme.gridAlpha))
                AxisValueLabel()
                    .font(Theme.label)
            }
        }
    }

    private func emptyChart(_ hint: String) -> some View {
        Text(hint)
            .font(Theme.body)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, minHeight: 80, alignment: .center)
    }

    // ── Series prep ──

    struct DisplaySeries: Identifiable {
        let id: Int64
        let label: String
        let color: Color
        let points: [AppDatabase.TrendPoint]
        let changePct: Double
    }

    struct WeekBucket: Identifiable {
        let weekStart: Date
        let sets: Int
        let isCurrent: Bool
        var id: Date { weekStart }
    }

    /// Exponential moving average over per-session bests — genuinely smooth,
    /// unlike rolling-best (flat plateaus, then jumps).
    static func ema(_ points: [AppDatabase.TrendPoint], alpha: Double) -> [AppDatabase.TrendPoint] {
        guard var value = points.first?.e1rm else { return [] }
        return points.map { p in
            value = alpha * p.e1rm + (1 - alpha) * value
            return AppDatabase.TrendPoint(date: p.date, e1rm: value)
        }
    }

    /// The most distinctive word: skip position/equipment modifiers (SEATED,
    /// CABLE, …) and take what's left — "INCLINE BARBELL BENCH PRESS" → BENCH.
    /// The end label evokes the lift; color + tap-through disambiguate.
    private static let genericWords: Set<String> = [
        "BARBELL", "DUMBBELL", "CABLE", "MACHINE", "SMITH", "EZ",
        "SEATED", "STANDING", "LYING", "INCLINE", "DECLINE", "BENT", "OVER",
        "SINGLE", "ARM", "LEG", "CLOSE", "WIDE", "GRIP", "ASSISTED", "WEIGHTED",
    ]

    static func abbreviate(_ name: String) -> String {
        let words = name.uppercased().split(separator: " ").map(String.init)
        let word = words.first { !genericWords.contains($0) } ?? words.first ?? name
        return String(word.prefix(8))
    }

    /// Bucket per-day set counts (UTC day keys) into 12 local weeks, empty
    /// weeks included — a gap is data.
    static func weekBuckets(byDay: [String: Int]) -> [WeekBucket] {
        let cal = Calendar.current
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        df.timeZone = TimeZone(identifier: "UTC")
        guard let thisWeek = cal.dateInterval(of: .weekOfYear, for: Date())?.start
        else { return [] }
        var totals: [Date: Int] = [:]
        for (day, sets) in byDay {
            guard let d = df.date(from: day),
                  let ws = cal.dateInterval(of: .weekOfYear, for: d)?.start else { continue }
            totals[ws, default: 0] += sets
        }
        return (0..<12).reversed().compactMap { back in
            guard let ws = cal.date(byAdding: .weekOfYear, value: -back, to: thisWeek)
            else { return nil }
            return WeekBucket(weekStart: ws, sets: totals[ws] ?? 0, isCurrent: back == 0)
        }
    }
}
