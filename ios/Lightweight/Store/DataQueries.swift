// Read-models for the Data (analysis) surface.

import Foundation
import GRDB

extension AppDatabase {

    struct TrendPoint: Sendable {
        let date: Date
        let e1rm: Double
    }

    struct LiftTrend: Identifiable, Sendable {
        let exerciseId: Int64
        let name: String
        /// Per-session best e1RM, chronological.
        let points: [TrendPoint]
        var id: Int64 { exerciseId }
    }

    /// Top lifts by working-set volume in the trailing window, each with its
    /// per-session best e1RM series. Requires ≥3 sessions — fewer points draw
    /// a line that claims a trend the data doesn't hold.
    func topLiftTrends(limit: Int, days: Int) throws -> [LiftTrend] {
        try writer.read { db in
            let tops = try Row.fetchAll(db, sql: """
                SELECT se.exercise_id AS eid, e.name AS name
                FROM sessions s
                JOIN session_exercises se ON se.session_id = s.id
                JOIN sets st ON st.session_exercise_id = se.id
                JOIN exercises e ON e.id = se.exercise_id
                WHERE s.status = 'completed'
                  AND s.started_at >= datetime('now', ?)
                  AND st.weight_kg IS NOT NULL AND st.weight_kg > 0 AND st.reps > 0
                GROUP BY se.exercise_id
                HAVING COUNT(DISTINCT s.id) >= 3
                ORDER BY COUNT(st.id) DESC
                LIMIT ?
                """, arguments: ["-\(days) days", limit])
            return try tops.map { top in
                let eid: Int64 = top["eid"]
                let rows = try Row.fetchAll(db, sql: """
                    SELECT s.started_at AS at,
                           MAX(st.weight_kg * (1.0 + st.reps / 30.0)) AS best
                    FROM sessions s
                    JOIN session_exercises se ON se.session_id = s.id
                    JOIN sets st ON st.session_exercise_id = se.id
                    WHERE se.exercise_id = ? AND s.status = 'completed'
                      AND s.started_at >= datetime('now', ?)
                      AND st.weight_kg IS NOT NULL AND st.weight_kg > 0 AND st.reps > 0
                    GROUP BY s.id
                    ORDER BY s.started_at
                    """, arguments: [eid, "-\(days) days"])
                let points = rows.compactMap { row -> TrendPoint? in
                    guard let d = ServerDate.parse(row["at"]) else { return nil }
                    return TrendPoint(date: d, e1rm: row["best"])
                }
                return LiftTrend(exerciseId: eid, name: top["name"], points: points)
            }
        }
    }
}
