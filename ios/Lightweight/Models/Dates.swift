// Server timestamps are SQLite-style UTC strings ("2026-07-13 09:41:00")
// or occasionally ISO8601. Parse leniently, display locally.

import Foundation

/// Timestamps we WRITE. The sync server dedups on the exact `started_at`
/// string, and existing data uses ISO8601 with milliseconds + Z — so every
/// locally-authored timestamp must match that shape (spec decision 2026-07-13).
enum ISO8601 {
    // Thread-safe for formatting; the annotation satisfies Swift 6 strict concurrency.
    nonisolated(unsafe) private static let formatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        f.timeZone = TimeZone(identifier: "UTC")
        return f
    }()

    static func now() -> String { formatter.string(from: Date()) }
    static func string(from date: Date) -> String { formatter.string(from: date) }
}

enum ServerDate {
    private static let sqliteFormat: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd HH:mm:ss"
        f.timeZone = TimeZone(identifier: "UTC")
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    static func parse(_ s: String) -> Date? {
        sqliteFormat.date(from: s)
            ?? (try? Date(s, strategy: .iso8601))
            ?? (try? Date(s, strategy: .iso8601.year().month().day()
                .dateTimeSeparator(.standard).time(includingFractionalSeconds: true)))
    }

    static func dayLabel(_ s: String) -> String {
        guard let d = parse(s) else { return s }
        return d.formatted(.dateTime.weekday(.abbreviated).day().month(.abbreviated).year())
    }

    static func timeLabel(_ s: String) -> String {
        guard let d = parse(s) else { return "" }
        return d.formatted(.dateTime.hour().minute())
    }

    static func duration(from start: String, to end: String?) -> String? {
        guard let s = parse(start), let e = end.flatMap(parse) else { return nil }
        let mins = Int(e.timeIntervalSince(s) / 60)
        return mins >= 60 ? "\(mins / 60)h \(mins % 60)m" : "\(mins)m"
    }
}
