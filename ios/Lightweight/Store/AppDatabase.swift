// GRDB database: schema mirrors the server's, import is wipe-and-replace
// (fine while the client is read-only; local writes arrive in Phase 3,
// at which point import becomes a proper merge behind this same seam).

import Foundation
import GRDB

struct AppDatabase: Sendable {
    let writer: DatabaseQueue

    init(path: String) throws {
        writer = try DatabaseQueue(path: path)
        try migrator.migrate(writer)
    }

    static func makeShared() throws -> AppDatabase {
        let dir = try FileManager.default.url(
            for: .applicationSupportDirectory, in: .userDomainMask,
            appropriateFor: nil, create: true)
        return try AppDatabase(path: dir.appendingPathComponent("lightweight.db").path)
    }

    private var migrator: DatabaseMigrator {
        var m = DatabaseMigrator()
        m.registerMigration("v1") { db in
            try db.create(table: "exercises") { t in
                t.column("id", .integer).primaryKey()
                t.column("name", .text).notNull()
                t.column("muscle_group", .text)
                t.column("equipment", .text)
                t.column("notes", .text)
                t.column("archived", .boolean).notNull().defaults(to: false)
                t.column("created_at", .text).notNull()
            }
            try db.create(table: "templates") { t in
                t.column("id", .integer).primaryKey()
                t.column("name", .text).notNull()
                t.column("notes", .text)
                t.column("archived", .boolean).notNull().defaults(to: false)
                t.column("created_at", .text).notNull()
                t.column("updated_at", .text).notNull()
                t.column("version", .integer).notNull().defaults(to: 1)
            }
            try db.create(table: "template_exercises") { t in
                t.column("id", .integer).primaryKey()
                t.column("template_id", .integer).notNull().references("templates", onDelete: .cascade)
                t.column("exercise_id", .integer).notNull().references("exercises")
                t.column("position", .integer).notNull()
                t.column("target_sets", .integer)
                t.column("target_reps_min", .integer)
                t.column("target_reps_max", .integer)
                t.column("rest_seconds", .integer)
                t.column("notes", .text)
            }
            try db.create(table: "sessions") { t in
                t.column("id", .integer).primaryKey()
                t.column("template_id", .integer)
                t.column("name", .text)
                t.column("started_at", .text).notNull()
                t.column("ended_at", .text)
                t.column("paused_duration", .integer).notNull().defaults(to: 0)
                t.column("notes", .text)
                t.column("status", .text).notNull()
                t.column("template_version", .integer)
            }
            try db.create(table: "session_exercises") { t in
                t.column("id", .integer).primaryKey()
                t.column("session_id", .integer).notNull().references("sessions", onDelete: .cascade)
                t.column("exercise_id", .integer).notNull().references("exercises")
                t.column("position", .integer).notNull()
                t.column("notes", .text)
            }
            try db.create(table: "sets") { t in
                t.column("id", .integer).primaryKey()
                t.column("session_exercise_id", .integer).notNull()
                    .references("session_exercises", onDelete: .cascade)
                t.column("set_number", .integer).notNull()
                t.column("weight_kg", .double)
                t.column("reps", .integer).notNull()
                t.column("set_type", .text).notNull().defaults(to: "working")
                t.column("rir", .integer)
                t.column("completed_at", .text)
            }
        }
        m.registerMigration("v2-local-sessions") { db in
            // synced=0 marks a locally-authored session (in-progress or awaiting
            // push) that a server pull must never delete. Existing rows are
            // server-origin → default 1.
            try db.alter(table: "sessions") { t in
                t.add(column: "synced", .boolean).notNull().defaults(to: true)
            }
        }
        return m
    }

    // ── Import (first-login pull) ──

    func importSnapshot(
        exercises: [ExerciseDTO],
        templates: [TemplateDTO],
        sessions: [SessionDTO]
    ) throws {
        try writer.write { db in
            // Same-id delete+reinsert (server sessions reconciled after push)
            // is FK-safe with enforcement deferred to commit.
            try db.execute(sql: "PRAGMA defer_foreign_keys = ON")

            // Replace ONLY server-origin sessions. synced=0 rows (in-progress
            // active session, or completed-but-push-failed) are preserved —
            // this is the whole point of the write-safe import. Cascade clears
            // the replaced sessions' exercises + sets.
            try db.execute(sql: "DELETE FROM sessions WHERE synced = 1")
            // Templates are never locally authored today; sessions.template_id
            // carries no FK, so a wholesale replace is safe.
            try db.execute(sql: "DELETE FROM template_exercises")
            try db.execute(sql: "DELETE FROM templates")

            // Exercises are UPSERTed by id, NEVER bulk-deleted: an active local
            // session references server exercises, and session_exercises.exercise_id
            // has no delete cascade — a bulk delete would throw an FK violation.
            for e in exercises {
                try ExerciseRecord(
                    id: e.id, name: e.name, muscleGroup: e.muscleGroup,
                    equipment: e.equipment, notes: e.notes,
                    archived: e.archived ?? false, createdAt: e.createdAt
                ).upsert(db)
            }
            for t in templates {
                try TemplateRecord(
                    id: t.id, name: t.name, notes: t.notes,
                    archived: t.archived ?? false, createdAt: t.createdAt,
                    updatedAt: t.updatedAt, version: t.version ?? 1
                ).insert(db)
                for te in t.exercises ?? [] {
                    try TemplateExerciseRecord(
                        id: te.id, templateId: t.id, exerciseId: te.exerciseId,
                        position: te.position, targetSets: te.targetSets,
                        targetRepsMin: te.targetRepsMin, targetRepsMax: te.targetRepsMax,
                        restSeconds: te.restSeconds, notes: te.notes
                    ).insert(db)
                }
            }
            for s in sessions {
                try SessionRecord(
                    id: s.id, templateId: s.templateId, name: s.name,
                    startedAt: s.startedAt, endedAt: s.endedAt,
                    pausedDuration: s.pausedDuration ?? 0, notes: s.notes,
                    status: s.status, templateVersion: s.templateVersion,
                    synced: true
                ).insert(db)
                for se in s.exercises ?? [] {
                    try SessionExerciseRecord(
                        id: se.id, sessionId: s.id, exerciseId: se.exerciseId,
                        position: se.position, notes: se.notes
                    ).insert(db)
                    for set in se.sets ?? [] {
                        try SetRecord(
                            id: set.id, sessionExerciseId: se.id,
                            setNumber: set.setNumber, weightKg: set.weightKg,
                            reps: set.reps, setType: set.setType ?? "working",
                            rir: set.rir, completedAt: set.completedAt
                        ).insert(db)
                    }
                }
            }

            // Sweep local placeholder exercises (negative id) now that the
            // canonical server rows are in: drop any no longer referenced by a
            // session_exercise or template_exercise. Guarded by "unreferenced"
            // so a placeholder an active workout still needs is never deleted.
            try db.execute(sql: """
                DELETE FROM exercises WHERE id < 0
                  AND id NOT IN (SELECT exercise_id FROM session_exercises)
                  AND id NOT IN (SELECT exercise_id FROM template_exercises)
                """)
        }
    }

    // ── Queries (read side of the seam) ──

    struct HistoryItem: Codable, FetchableRecord, Identifiable, Sendable {
        var id: Int64
        var name: String?
        var templateName: String?
        var startedAt: String
        var endedAt: String?
        var status: String
        var exerciseCount: Int
        var setCount: Int

        static let databaseColumnDecodingStrategy = DatabaseColumnDecodingStrategy.convertFromSnakeCase
    }

    func historyItems() throws -> [HistoryItem] {
        try writer.read { db in
            try HistoryItem.fetchAll(db, sql: """
                SELECT s.id, s.name, t.name AS template_name,
                       s.started_at, s.ended_at, s.status,
                       (SELECT COUNT(*) FROM session_exercises se
                         WHERE se.session_id = s.id) AS exercise_count,
                       (SELECT COUNT(*) FROM sets st
                         JOIN session_exercises se ON st.session_exercise_id = se.id
                        WHERE se.session_id = s.id) AS set_count
                  FROM sessions s
                  LEFT JOIN templates t ON t.id = s.template_id
                 ORDER BY s.started_at DESC
                """)
        }
    }

    struct SessionDetail: Sendable {
        var session: SessionRecord
        var templateName: String?
        var exercises: [ExerciseDetail]

        struct ExerciseDetail: Sendable, Identifiable {
            var id: Int64
            var name: String
            var notes: String?
            var sets: [SetRecord]
            /// Best e1RM BEFORE this session — retrospective PR badges compare
            /// against this (same semantics as the active screen's baseline).
            var baselineBestE1rm: Double?
            /// Sets of the most recent EARLIER session containing this exercise,
            /// ordered by set_number. Drives slot-goal-beaten badges.
            var previousSets: [SetRecord]
        }
    }

    func sessionDetail(id: Int64) throws -> SessionDetail? {
        try writer.read { db in
            guard let session = try SessionRecord.fetchOne(db, key: id) else { return nil }
            let templateName = try session.templateId.flatMap {
                try String.fetchOne(db, sql: "SELECT name FROM templates WHERE id = ?", arguments: [$0])
            }
            let sessionExercises = try SessionExerciseRecord
                .filter(sql: "session_id = ?", arguments: [id])
                .order(sql: "position")
                .fetchAll(db)
            let exercises = try sessionExercises.map { se in
                let name = try String.fetchOne(
                    db, sql: "SELECT name FROM exercises WHERE id = ?",
                    arguments: [se.exerciseId]) ?? "Exercise \(se.exerciseId)"
                let sets = try SetRecord
                    .filter(sql: "session_exercise_id = ?", arguments: [se.id])
                    .order(sql: "set_number")
                    .fetchAll(db)
                // Baseline: best e1RM across all sets logged BEFORE this session.
                let priorRows = try Row.fetchAll(db, sql: """
                    SELECT st.weight_kg AS w, st.reps AS r
                    FROM sets st
                    JOIN session_exercises pse ON st.session_exercise_id = pse.id
                    JOIN sessions ps ON pse.session_id = ps.id
                    WHERE pse.exercise_id = ? AND ps.id != ?
                      AND ps.status = 'completed' AND ps.started_at < ?
                    """, arguments: [se.exerciseId, id, session.startedAt])
                let baseline = Calc.bestE1rm(priorRows.map { (weightKg: $0["w"], reps: $0["r"]) })
                // Previous session's sets for this exercise (slot comparison).
                let prevSeId = try Int64.fetchOne(db, sql: """
                    SELECT pse.id
                    FROM session_exercises pse
                    JOIN sessions ps ON pse.session_id = ps.id
                    WHERE pse.exercise_id = ? AND ps.id != ?
                      AND ps.status = 'completed' AND ps.started_at < ?
                    ORDER BY ps.started_at DESC LIMIT 1
                    """, arguments: [se.exerciseId, id, session.startedAt])
                let previous = try prevSeId.map {
                    try SetRecord
                        .filter(sql: "session_exercise_id = ?", arguments: [$0])
                        .order(sql: "set_number")
                        .fetchAll(db)
                } ?? []
                return SessionDetail.ExerciseDetail(
                    id: se.id, name: name, notes: se.notes, sets: sets,
                    baselineBestE1rm: baseline, previousSets: previous)
            }
            return SessionDetail(session: session, templateName: templateName, exercises: exercises)
        }
    }

    /// Hard-delete a session and its children. Caller is responsible for the
    /// server side first (a server-backed row deleted only locally would be
    /// resurrected by the next pull).
    func deleteLocalSession(id: Int64) throws {
        try writer.write { db in
            try db.execute(sql: """
                DELETE FROM sets WHERE session_exercise_id IN
                    (SELECT id FROM session_exercises WHERE session_id = ?)
                """, arguments: [id])
            try db.execute(sql: "DELETE FROM session_exercises WHERE session_id = ?",
                           arguments: [id])
            try db.execute(sql: "DELETE FROM sessions WHERE id = ?", arguments: [id])
        }
    }

    func counts() throws -> (sessions: Int, exercises: Int, templates: Int, sets: Int) {
        try writer.read { db in
            (
                try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM sessions") ?? 0,
                try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM exercises") ?? 0,
                try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM templates") ?? 0,
                try Int.fetchOne(db, sql: "SELECT COUNT(*) FROM sets") ?? 0
            )
        }
    }
}
