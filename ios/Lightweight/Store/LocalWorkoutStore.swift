// Local-write side of the store seam: create/log/finish a freeform session,
// read previous-performance + all-time-best for the logging screen, and build
// the sync push payload. Locally-authored rows live in a NEGATIVE id-space that
// can't collide with the server's positive autoincrement ids; sessions carry a
// `synced` flag (0 until confirmed on the server). See AppDatabase.importSnapshot
// for how these survive a pull.

import Foundation
import GRDB

extension AppDatabase {
    struct ExerciseRow: Codable, FetchableRecord, Sendable, Identifiable {
        var id: Int64
        var name: String
    }

    struct PreviousPerformance: Sendable {
        var startedAt: String
        var sets: [SetRecord]
    }

    /// Next id for a locally-authored row: strictly negative, below any existing
    /// row. `min(0, …)` guards a table whose current MIN(id) is positive (server
    /// rows only) so we never hand back a positive id or 0.
    private func nextLocalId(_ db: Database, _ table: String) throws -> Int64 {
        let minId = try Int64.fetchOne(db, sql: "SELECT COALESCE(MIN(id), 0) FROM \(table)") ?? 0
        return min(0, minId) - 1
    }

    // ── Active session lifecycle ──

    func activeLocalSession() throws -> SessionRecord? {
        try writer.read { db in
            try SessionRecord.fetchOne(db, sql: """
                SELECT * FROM sessions
                 WHERE synced = 0 AND status = 'active'
                 ORDER BY started_at DESC LIMIT 1
                """)
        }
    }

    func startLocalSession(name: String, startedAt: String) throws -> Int64 {
        try writer.write { db in
            let id = try nextLocalId(db, "sessions")
            try SessionRecord(
                id: id, templateId: nil, name: name, startedAt: startedAt,
                endedAt: nil, pausedDuration: 0, notes: nil, status: "active",
                templateVersion: nil, synced: false
            ).insert(db)
            return id
        }
    }

    func finishLocalSession(id: Int64, endedAt: String) throws {
        try writer.write { db in
            try db.execute(
                sql: "UPDATE sessions SET status = 'completed', ended_at = ? WHERE id = ?",
                arguments: [endedAt, id])
        }
    }

    // ── Exercise catalog (picker) ──

    /// Search the local catalog. Dedupes by normalized name preferring the
    /// server row (MAX(id) picks the positive/server id over a negative
    /// placeholder) so a transient local placeholder doesn't double up.
    func searchLocalExercises(_ query: String) throws -> [ExerciseRow] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return try writer.read { db in
            if q.isEmpty {
                return try ExerciseRow.fetchAll(db, sql: """
                    SELECT MAX(id) AS id, name FROM exercises
                     WHERE archived = 0
                     GROUP BY LOWER(TRIM(name)) ORDER BY name LIMIT 200
                    """)
            }
            return try ExerciseRow.fetchAll(db, sql: """
                SELECT MAX(id) AS id, name FROM exercises
                 WHERE archived = 0 AND name LIKE ?
                 GROUP BY LOWER(TRIM(name)) ORDER BY name LIMIT 200
                """, arguments: ["%\(q)%"])
        }
    }

    /// Resolve an existing exercise by normalized name, else create a local
    /// placeholder (negative id). Mirrors the server's resolve-by-name so the
    /// pushed session lands on the right lineage.
    func findOrCreateLocalExercise(named name: String) throws -> ExerciseRow {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        return try writer.write { db in
            if let existing = try ExerciseRow.fetchOne(db, sql: """
                SELECT id, name FROM exercises
                 WHERE LOWER(TRIM(name)) = LOWER(?) AND archived = 0
                 ORDER BY id DESC LIMIT 1
                """, arguments: [trimmed]) {
                return existing
            }
            let id = try nextLocalId(db, "exercises")
            try ExerciseRecord(
                id: id, name: trimmed, muscleGroup: nil, equipment: nil,
                notes: nil, archived: false, createdAt: ISO8601.now()
            ).insert(db)
            return ExerciseRow(id: id, name: trimmed)
        }
    }

    // ── Logging ──

    func addSessionExercise(sessionId: Int64, exerciseId: Int64, position: Int) throws -> Int64 {
        try writer.write { db in
            let id = try nextLocalId(db, "session_exercises")
            try SessionExerciseRecord(
                id: id, sessionId: sessionId, exerciseId: exerciseId,
                position: position, notes: nil
            ).insert(db)
            return id
        }
    }

    func addLocalSet(sessionExerciseId: Int64, setNumber: Int, weightKg: Double?,
                     reps: Int, rir: Int?, completedAt: String) throws -> Int64 {
        try writer.write { db in
            let id = try nextLocalId(db, "sets")
            try SetRecord(
                id: id, sessionExerciseId: sessionExerciseId, setNumber: setNumber,
                weightKg: weightKg, reps: reps, setType: "working", rir: rir,
                completedAt: completedAt
            ).insert(db)
            return id
        }
    }

    func deleteLocalSet(id: Int64) throws {
        _ = try writer.write { db in try SetRecord.deleteOne(db, key: id) }
    }

    // ── Context for the logging screen (reads across local + pulled history) ──

    /// Most-recent prior COMPLETED session (any origin) that logged this exercise.
    func previousPerformance(exerciseId: Int64, excludingSessionId: Int64) throws -> PreviousPerformance? {
        try writer.read { db in
            guard let row = try Row.fetchOne(db, sql: """
                SELECT s.id AS sid, s.started_at AS started_at
                  FROM sessions s
                  JOIN session_exercises se ON se.session_id = s.id
                 WHERE se.exercise_id = ? AND s.id <> ? AND s.status = 'completed'
                 ORDER BY s.started_at DESC LIMIT 1
                """, arguments: [exerciseId, excludingSessionId]) else { return nil }
            let sid: Int64 = row["sid"]
            let startedAt: String = row["started_at"]
            let sets = try SetRecord.fetchAll(db, sql: """
                SELECT st.* FROM sets st
                  JOIN session_exercises se ON st.session_exercise_id = se.id
                 WHERE se.session_id = ? AND se.exercise_id = ?
                 ORDER BY st.set_number
                """, arguments: [sid, exerciseId])
            return PreviousPerformance(startedAt: startedAt, sets: sets)
        }
    }

    /// All-time best e1RM for this exercise (raw-reps policy, via Calc).
    func allTimeBestE1rm(exerciseId: Int64, excludingSessionId: Int64) throws -> Double? {
        try writer.read { db in
            let rows = try Row.fetchAll(db, sql: """
                SELECT st.weight_kg AS w, st.reps AS r FROM sets st
                  JOIN session_exercises se ON st.session_exercise_id = se.id
                  JOIN sessions s ON se.session_id = s.id
                 WHERE se.exercise_id = ? AND s.id <> ? AND s.status = 'completed'
                """, arguments: [exerciseId, excludingSessionId])
            return Calc.bestE1rm(rows.map { (weightKg: $0["w"], reps: $0["r"]) })
        }
    }

    /// Rebuild the in-memory exercise blocks for a resumed active session.
    func loadActiveExercises(sessionId: Int64) throws -> [ActiveWorkout.Exercise] {
        let blocks: [(se: SessionExerciseRecord, name: String, sets: [SetRecord])] =
            try writer.read { db in
                let ses = try SessionExerciseRecord.fetchAll(db, sql: """
                    SELECT * FROM session_exercises WHERE session_id = ? ORDER BY position
                    """, arguments: [sessionId])
                return try ses.map { se in
                    let name = try String.fetchOne(
                        db, sql: "SELECT name FROM exercises WHERE id = ?",
                        arguments: [se.exerciseId]) ?? "Exercise"
                    let sets = try SetRecord.fetchAll(db, sql: """
                        SELECT * FROM sets WHERE session_exercise_id = ? ORDER BY set_number
                        """, arguments: [se.id])
                    return (se, name, sets)
                }
            }
        return try blocks.map { block in
            let prev = try previousPerformance(exerciseId: block.se.exerciseId, excludingSessionId: sessionId)
            let best = try allTimeBestE1rm(exerciseId: block.se.exerciseId, excludingSessionId: sessionId)
            return ActiveWorkout.Exercise(
                sessionExerciseId: block.se.id, exerciseId: block.se.exerciseId,
                name: block.name, position: block.se.position,
                sets: block.sets.map {
                    .init(id: $0.id, setNumber: $0.setNumber, weightKg: $0.weightKg,
                          reps: $0.reps, rir: $0.rir)
                },
                previous: prev?.sets ?? [],
                previousLabel: prev.map { ServerDate.dayLabel($0.startedAt) },
                allTimeBestE1rm: best)
        }
    }

    // ── Push (sync) helpers ──

    func unsyncedCompletedSessionIds() throws -> [Int64] {
        try writer.read { db in
            try Int64.fetchAll(db, sql: """
                SELECT id FROM sessions WHERE synced = 0 AND status = 'completed'
                 ORDER BY started_at
                """)
        }
    }

    func syncPayload(sessionId: Int64) throws -> SyncSessionPayload {
        try writer.read { db in
            guard let s = try SessionRecord.fetchOne(db, key: sessionId) else {
                throw DatabaseError(message: "session \(sessionId) missing")
            }
            let ses = try SessionExerciseRecord.fetchAll(db, sql: """
                SELECT * FROM session_exercises WHERE session_id = ? ORDER BY position
                """, arguments: [sessionId])
            let exercises = try ses.map { se -> SyncExercisePayload in
                let name = try String.fetchOne(
                    db, sql: "SELECT name FROM exercises WHERE id = ?",
                    arguments: [se.exerciseId]) ?? ""
                let sets = try SetRecord.fetchAll(db, sql: """
                    SELECT * FROM sets WHERE session_exercise_id = ? ORDER BY set_number
                    """, arguments: [se.id])
                return SyncExercisePayload(
                    name: name, position: se.position, notes: se.notes,
                    sets: sets.map {
                        .init(weightKg: $0.weightKg, reps: $0.reps, setType: $0.setType,
                              rir: $0.rir, completedAt: $0.completedAt)
                    })
            }
            return SyncSessionPayload(
                name: s.name, templateId: s.templateId, templateVersion: s.templateVersion,
                startedAt: s.startedAt, endedAt: s.endedAt, pausedDuration: s.pausedDuration,
                status: s.status, notes: s.notes, exercises: exercises)
        }
    }

    #if DEBUG
    /// Seed a tiny offline catalog + one prior completed session so the logging
    /// screen has real previous-performance / all-time-best context WITHOUT a
    /// server login. Env-gated (LW_UI_PREVIEW) and idempotent — never runs in
    /// normal use; exists only to make the auth-gated UI screenshottable.
    func seedPreviewData() throws {
        try writer.write { db in
            let existing = try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM exercises") ?? 0
            guard existing == 0 else { return }
            let now = Date()
            func iso(_ daysAgo: Int) -> String {
                ISO8601.string(from: Calendar.current.date(byAdding: .day, value: -daysAgo, to: now)!)
            }
            try ExerciseRecord(id: 1, name: "INCLINE BARBELL BENCH PRESS", muscleGroup: "Chest",
                equipment: "Barbell", notes: nil, archived: false, createdAt: iso(90)).insert(db)
            try ExerciseRecord(id: 2, name: "PULL UP", muscleGroup: "Back",
                equipment: "Bodyweight", notes: nil, archived: false, createdAt: iso(90)).insert(db)
            // Prior completed session (server-origin) with sets on exercise 1.
            try SessionRecord(id: 1, templateId: nil, name: "Freeform", startedAt: iso(4),
                endedAt: iso(4), pausedDuration: 0, notes: nil, status: "completed",
                templateVersion: nil, synced: true).insert(db)
            try SessionExerciseRecord(id: 1, sessionId: 1, exerciseId: 1, position: 1, notes: nil).insert(db)
            try SetRecord(id: 1, sessionExerciseId: 1, setNumber: 1, weightKg: 62.5, reps: 8,
                setType: "working", rir: 1, completedAt: iso(4)).insert(db)
            try SetRecord(id: 2, sessionExerciseId: 1, setNumber: 2, weightKg: 62.5, reps: 7,
                setType: "working", rir: 0, completedAt: iso(4)).insert(db)
        }
    }

    /// Seed an in-progress active session with two logged sets (via the real
    /// local-write paths) so ActiveWorkoutView resumes into a populated screen.
    func seedActiveWorkoutPreview() throws {
        if try activeLocalSession() != nil { return }
        let sid = try startLocalSession(name: "Freeform", startedAt: ISO8601.now())
        let seId = try addSessionExercise(sessionId: sid, exerciseId: 1, position: 1)
        _ = try addLocalSet(sessionExerciseId: seId, setNumber: 1, weightKg: 65, reps: 8,
            rir: 1, completedAt: ISO8601.now())
        _ = try addLocalSet(sessionExerciseId: seId, setNumber: 2, weightKg: 65, reps: 7,
            rir: 0, completedAt: ISO8601.now())
    }
    #endif

    /// Flip pushed sessions to synced=1. Both server-"pushed" and server-"skipped"
    /// (started_at dedup hit) count as reconciled — the server has them either way.
    func markSessionsSynced(_ ids: [Int64]) throws {
        guard !ids.isEmpty else { return }
        try writer.write { db in
            let placeholders = ids.map { _ in "?" }.joined(separator: ",")
            try db.execute(
                sql: "UPDATE sessions SET synced = 1 WHERE id IN (\(placeholders))",
                arguments: StatementArguments(ids))
        }
    }
}
