// Read-model for the pre-workout briefing (template detail). Everything is
// answerable from the local mirror: per exercise we want the record to beat
// (the "incumbent" — all-time best, with the achieving set and its date), a
// bidirectional target anchored at the most recent session's top set, and that
// session's sets for the dense reference register. Completed sessions only —
// an in-progress/abandoned session is never a record.
//
// e1RM normalization goes through Calc (raw-reps policy), never inline SQL, so
// the incumbent and the anchor pick can't drift from the rest of the app.

import Foundation
import GRDB

extension AppDatabase {

    /// The record to beat for one exercise. Two flavors, distinguished by
    /// `e1rm`: a weighted lift carries an e1RM record (`e1rm` non-nil, with the
    /// achieving weight × reps); a bodyweight-only lift carries a rep record
    /// (`e1rm` nil, `weightKg` nil, `reps` = most reps at bodyweight). Both
    /// name the session date that holds the record (provenance — the man to beat).
    struct IncumbentSet: Sendable {
        let e1rm: Double?
        let weightKg: Double?
        let reps: Int
        let startedAt: String
    }

    /// One card's worth of briefing for an exercise.
    struct ExerciseBriefing: Identifiable, Sendable {
        let exerciseId: Int64
        let name: String
        let position: Int
        /// nil = first exposure (no completed history) — calibration, never a
        /// fake target (matches the app-wide empty-history rule).
        let incumbent: IncumbentSet?
        /// Top set (by e1RM, else reps) of the most recent session — the anchor
        /// the bidirectional TO BEAT targets are stated against.
        let lastTop: SetRecord?
        /// That session's sets in order, for the dense LAST register.
        let lastSets: [SetRecord]
        let lastLabel: String?
        var id: Int64 { exerciseId }
    }

    /// The record set for an exercise: the highest-e1RM weighted set ever
    /// (raw-reps via Calc), or — for a lift only ever trained at bodyweight —
    /// the most reps at bodyweight. nil = no completed history (first exposure).
    func incumbentSet(exerciseId: Int64) throws -> IncumbentSet? {
        try writer.read { db in
            // Weighted incumbent: fetch candidate sets, pick the max e1RM in
            // Swift so the comparison shares Calc's exact formula.
            let rows = try Row.fetchAll(db, sql: """
                SELECT st.weight_kg AS w, st.reps AS r, s.started_at AS at
                  FROM sets st
                  JOIN session_exercises se ON st.session_exercise_id = se.id
                  JOIN sessions s ON se.session_id = s.id
                 WHERE se.exercise_id = ? AND s.status = 'completed'
                   AND st.weight_kg IS NOT NULL AND st.weight_kg > 0 AND st.reps > 0
                """, arguments: [exerciseId])
            let weighted = rows.compactMap { row -> IncumbentSet? in
                let w: Double = row["w"], r: Int = row["r"]
                guard let e = Calc.e1rm(weightKg: w, reps: r) else { return nil }
                return IncumbentSet(e1rm: e, weightKg: w, reps: r, startedAt: row["at"])
            }
            if let best = weighted.max(by: { ($0.e1rm ?? 0) < ($1.e1rm ?? 0) }) {
                return best
            }
            // No weighted history → bodyweight rep record.
            guard let row = try Row.fetchOne(db, sql: """
                SELECT st.reps AS r, s.started_at AS at
                  FROM sets st
                  JOIN session_exercises se ON st.session_exercise_id = se.id
                  JOIN sessions s ON se.session_id = s.id
                 WHERE se.exercise_id = ? AND s.status = 'completed'
                   AND st.weight_kg IS NULL AND st.reps > 0
                 ORDER BY st.reps DESC LIMIT 1
                """, arguments: [exerciseId]) else { return nil }
            return IncumbentSet(e1rm: nil, weightKg: nil, reps: row["r"], startedAt: row["at"])
        }
    }

    /// Assemble a briefing card per template exercise, in template order.
    func templateBriefings(templateId: Int64) throws -> [ExerciseBriefing] {
        let items = try templateExercises(templateId: templateId)
        return try items.map { item in
            let eid = item.record.exerciseId
            let incumbent = try incumbentSet(exerciseId: eid)
            // No active session here, so exclude nothing real (ids are never 0).
            let prev = try previousPerformance(exerciseId: eid, excludingSessionId: 0)
            let lastSets = prev?.sets ?? []
            return ExerciseBriefing(
                exerciseId: eid, name: item.name, position: item.record.position,
                incumbent: incumbent, lastTop: topSet(lastSets), lastSets: lastSets,
                lastLabel: prev.map { ServerDate.shortDayLabel($0.startedAt) })
        }
    }

    /// The heaviest-pulling set of a group (max e1RM among weighted sets, else
    /// max reps for a bodyweight-only group) — the anchor for TO BEAT targets.
    private func topSet(_ sets: [SetRecord]) -> SetRecord? {
        let weighted = sets.filter { ($0.weightKg ?? 0) > 0 && $0.reps > 0 }
        if let best = weighted.max(by: {
            (Calc.e1rm(weightKg: $0.weightKg, reps: $0.reps) ?? 0)
                < (Calc.e1rm(weightKg: $1.weightKg, reps: $1.reps) ?? 0)
        }) {
            return best
        }
        return sets.max(by: { $0.reps < $1.reps })
    }
}
