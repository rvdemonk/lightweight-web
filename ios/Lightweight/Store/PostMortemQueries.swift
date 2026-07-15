// Read-model queries for the workout post-mortem. Everything is answerable
// locally (the session is fully written at finish() before the screen appears);
// these fill the few gaps sessionDetail(id:) doesn't already carry — a
// bodyweight rep baseline, the comparable-session tonnage delta, and the
// weekly-best e1RM series behind a PR sparkline.

import Foundation
import GRDB

extension AppDatabase {

    /// Best (max) reps ever logged at BODYWEIGHT for this exercise strictly
    /// BEFORE `startedAt`. 0 = no prior bodyweight history (calibration — a
    /// first exposure is never a PR). BW rep-PRs are single-dimension records
    /// (reps at bodyweight), so they don't cross the e1RM-normalization rule.
    func bestBodyweightRepsBefore(exerciseId: Int64, startedAt: String) throws -> Int {
        try writer.read { db in
            try Int.fetchOne(db, sql: """
                SELECT COALESCE(MAX(st.reps), 0) FROM sets st
                  JOIN session_exercises se ON st.session_exercise_id = se.id
                  JOIN sessions s ON se.session_id = s.id
                 WHERE se.exercise_id = ? AND st.weight_kg IS NULL
                   AND s.status = 'completed' AND s.started_at < ?
                """, arguments: [exerciseId, startedAt]) ?? 0
        }
    }

    /// Most recent earlier COMPLETED session sharing this template — the only
    /// well-defined tonnage comparison (freeform sessions differ in exercises,
    /// so a delta would be noise). The current session shares `before` as its
    /// own started_at, so the strict `<` excludes it.
    func previousComparableSessionId(templateId: Int64, before: String) throws -> Int64? {
        try writer.read { db in
            try Int64.fetchOne(db, sql: """
                SELECT id FROM sessions
                 WHERE template_id = ? AND status = 'completed' AND started_at < ?
                 ORDER BY started_at DESC LIMIT 1
                """, arguments: [templateId, before])
        }
    }

    /// Total weighted tonnage (Σ weight × reps) for a session. Bodyweight sets
    /// (nil weight) contribute nothing — a known undercount for BW-heavy days,
    /// deliberately not modelled in v1.
    func sessionTonnage(sessionId: Int64) throws -> Double {
        try writer.read { db in
            try Double.fetchOne(db, sql: """
                SELECT COALESCE(SUM(st.weight_kg * st.reps), 0) FROM sets st
                  JOIN session_exercises se ON st.session_exercise_id = se.id
                 WHERE se.session_id = ? AND st.weight_kg IS NOT NULL
                """, arguments: [sessionId]) ?? 0
        }
    }

    /// Weekly-BEST e1RM over the trailing `sinceWeeks` weeks — a weekly max,
    /// not per-session and not EMA-smoothed, so a light day never dents the
    /// curve (the whole point of the PR sparkline). Only weeks with data are
    /// returned, ascending; gaps close naturally as a sparkline.
    func weeklyBestE1rm(exerciseId: Int64, sinceWeeks: Int = 12) throws -> [(weekStart: Date, e1rm: Double)] {
        let perSession: [(date: Date, e1rm: Double)] = try writer.read { db in
            let rows = try Row.fetchAll(db, sql: """
                SELECT s.started_at AS at, MAX(st.weight_kg * (1.0 + st.reps / 30.0)) AS best
                  FROM sessions s
                  JOIN session_exercises se ON se.session_id = s.id
                  JOIN sets st ON st.session_exercise_id = se.id
                 WHERE se.exercise_id = ? AND s.status = 'completed'
                   AND s.started_at >= datetime('now', ?)
                   AND st.weight_kg IS NOT NULL AND st.weight_kg > 0 AND st.reps > 0
                 GROUP BY s.id ORDER BY s.started_at
                """, arguments: [exerciseId, "-\(sinceWeeks * 7) days"])
            return rows.compactMap { row in
                guard let d = ServerDate.parse(row["at"]) else { return nil }
                return (d, row["best"] as Double)
            }
        }
        // Bucket into calendar weeks, MAX per week (mirrors DataView.weekBuckets
        // with MAX instead of SUM). Only weeks with data, ascending.
        let cal = Calendar.current
        var byWeek: [Date: Double] = [:]
        for point in perSession {
            guard let ws = cal.dateInterval(of: .weekOfYear, for: point.date)?.start else { continue }
            byWeek[ws] = max(byWeek[ws] ?? 0, point.e1rm)
        }
        return byWeek.keys.sorted().map { (weekStart: $0, e1rm: byWeek[$0]!) }
    }
}
