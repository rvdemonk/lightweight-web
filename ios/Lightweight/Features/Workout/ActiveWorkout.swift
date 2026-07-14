// In-progress freeform workout, backed by GRDB so it survives app restart
// (the Home resume banner reads the persisted active session). Every mutation
// writes through to the local store immediately; the in-memory mirror drives
// the UI. Local rows use a negative id-space that can't collide with server ids.

import Foundation
import Observation

@MainActor
@Observable
final class ActiveWorkout {
    struct Exercise: Identifiable, Sendable {
        let sessionExerciseId: Int64
        let exerciseId: Int64
        let name: String
        var position: Int
        var sets: [LoggedSet]
        var previous: [SetRecord]      // most-recent prior session's sets (local + pulled)
        var previousLabel: String?     // day label of that prior session
        var allTimeBestE1rm: Double?   // context: current best for this lift
        var id: Int64 { sessionExerciseId }
    }

    struct LoggedSet: Identifiable, Sendable {
        let id: Int64
        let setNumber: Int
        let weightKg: Double?
        let reps: Int
        let rir: Int?
        var e1rm: Double? { Calc.e1rm(weightKg: weightKg, reps: reps) }
    }

    let sessionId: Int64
    let startedAt: String
    private(set) var exercises: [Exercise]

    private let db: AppDatabase

    init(sessionId: Int64, startedAt: String, exercises: [Exercise], db: AppDatabase) {
        self.sessionId = sessionId
        self.startedAt = startedAt
        self.exercises = exercises
        self.db = db
    }

    /// Start a fresh freeform session, or resume the one already persisted.
    static func startOrResume(db: AppDatabase) throws -> ActiveWorkout {
        if let existing = try db.activeLocalSession() {
            let blocks = try db.loadActiveExercises(sessionId: existing.id)
            return ActiveWorkout(sessionId: existing.id, startedAt: existing.startedAt,
                                 exercises: blocks, db: db)
        }
        let startedAt = ISO8601.now()
        let id = try db.startLocalSession(name: "Freeform", startedAt: startedAt)
        return ActiveWorkout(sessionId: id, startedAt: startedAt, exercises: [], db: db)
    }

    func addExercise(exerciseId: Int64, name: String) throws {
        // Don't add a duplicate block for the same exercise in one session.
        if exercises.contains(where: { $0.exerciseId == exerciseId }) { return }
        // Positions are 1-based — matches existing server/pulled session_exercises
        // rows in the same table (don't mix conventions).
        let position = exercises.count + 1
        let seId = try db.addSessionExercise(sessionId: sessionId, exerciseId: exerciseId, position: position)
        let prev = try db.previousPerformance(exerciseId: exerciseId, excludingSessionId: sessionId)
        let best = try db.allTimeBestE1rm(exerciseId: exerciseId, excludingSessionId: sessionId)
        exercises.append(Exercise(
            sessionExerciseId: seId, exerciseId: exerciseId, name: name, position: position,
            sets: [], previous: prev?.sets ?? [],
            previousLabel: prev.map { ServerDate.dayLabel($0.startedAt) },
            allTimeBestE1rm: best))
    }

    func logSet(exerciseIndex: Int, weightKg: Double?, reps: Int, rir: Int?) throws {
        guard exercises.indices.contains(exerciseIndex) else { return }
        var block = exercises[exerciseIndex]
        let setNumber = (block.sets.map(\.setNumber).max() ?? 0) + 1
        let id = try db.addLocalSet(
            sessionExerciseId: block.sessionExerciseId, setNumber: setNumber,
            weightKg: weightKg, reps: reps, rir: rir, completedAt: ISO8601.now())
        block.sets.append(LoggedSet(id: id, setNumber: setNumber, weightKg: weightKg, reps: reps, rir: rir))
        // Adding a set may set a new all-time best; recompute cheaply from memory.
        if let e = Calc.e1rm(weightKg: weightKg, reps: reps) {
            block.allTimeBestE1rm = max(block.allTimeBestE1rm ?? 0, e)
        }
        exercises[exerciseIndex] = block
    }

    func deleteSet(exerciseIndex: Int, setId: Int64) throws {
        guard exercises.indices.contains(exerciseIndex) else { return }
        try db.deleteLocalSet(id: setId)
        exercises[exerciseIndex].sets.removeAll { $0.id == setId }
    }

    var totalSets: Int { exercises.reduce(0) { $0 + $1.sets.count } }

    /// Mark the session completed (ended_at + status). Sets with no reps never
    /// get logged, so nothing to prune. Empty exercises are allowed but harmless.
    func finish() throws {
        try db.finishLocalSession(id: sessionId, endedAt: ISO8601.now())
    }
}
