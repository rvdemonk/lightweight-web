// Read-model queries for Home / Workouts / Data surfaces, plus the
// template-start write path. Kept apart from LocalWorkoutStore.swift
// (active-workout write paths) so the sync-critical code stays small.

import Foundation
import GRDB

extension AppDatabase {

    // ── Template start (spec hard requirement: sessions stay linked) ──

    /// Start a session FROM a template: linked via template_id + version
    /// (the sync payload carries both), with the template's exercises
    /// pre-added in position order.
    func startTemplateSession(template: TemplateRecord, startedAt: String) throws -> Int64 {
        try writer.write { db in
            let id = try nextLocalId(db, "sessions")
            try SessionRecord(
                id: id, templateId: template.id, name: template.name,
                startedAt: startedAt, endedAt: nil, pausedDuration: 0, notes: nil,
                status: "active", templateVersion: template.version, synced: false
            ).insert(db)
            let tes = try TemplateExerciseRecord.fetchAll(db, sql: """
                SELECT * FROM template_exercises WHERE template_id = ? ORDER BY position
                """, arguments: [template.id])
            for te in tes {
                let seId = try nextLocalId(db, "session_exercises")
                try SessionExerciseRecord(
                    id: seId, sessionId: id, exerciseId: te.exerciseId,
                    position: te.position, notes: nil
                ).insert(db)
            }
            return id
        }
    }

    // ── Workouts (templates) ──

    struct TemplateListItem: Identifiable, Sendable {
        let template: TemplateRecord
        let exerciseCount: Int
        let lastUsed: String?    // started_at of most recent linked session
        var id: Int64 { template.id }
    }

    func templateList() throws -> [TemplateListItem] {
        try writer.read { db in
            let templates = try TemplateRecord
                .filter(sql: "archived = 0")
                .order(sql: "name")
                .fetchAll(db)
            return try templates.map { t in
                let count = try Int.fetchOne(db, sql:
                    "SELECT COUNT(*) FROM template_exercises WHERE template_id = ?",
                    arguments: [t.id]) ?? 0
                let lastUsed = try String.fetchOne(db, sql: """
                    SELECT MAX(started_at) FROM sessions
                    WHERE template_id = ? AND status = 'completed'
                    """, arguments: [t.id])
                return TemplateListItem(template: t, exerciseCount: count, lastUsed: lastUsed)
            }
        }
    }

    struct TemplateExerciseItem: Identifiable, Sendable {
        let record: TemplateExerciseRecord
        let name: String
        var id: Int64 { record.id }
    }

    func templateExercises(templateId: Int64) throws -> [TemplateExerciseItem] {
        try writer.read { db in
            let tes = try TemplateExerciseRecord.fetchAll(db, sql: """
                SELECT * FROM template_exercises WHERE template_id = ? ORDER BY position
                """, arguments: [templateId])
            return try tes.map { te in
                let name = try String.fetchOne(
                    db, sql: "SELECT name FROM exercises WHERE id = ?",
                    arguments: [te.exerciseId]) ?? "Exercise"
                return TemplateExerciseItem(record: te, name: name)
            }
        }
    }

    // ── Home read-models ──

    /// Sets logged per calendar day (UTC date of started_at) for the trailing
    /// `days` window. Keys are "YYYY-MM-DD". Drives the activity heatmap.
    func activityByDay(days: Int) throws -> [String: Int] {
        try writer.read { db in
            let rows = try Row.fetchAll(db, sql: """
                SELECT substr(s.started_at, 1, 10) AS day, COUNT(st.id) AS sets
                FROM sessions s
                JOIN session_exercises se ON se.session_id = s.id
                JOIN sets st ON st.session_exercise_id = se.id
                WHERE s.status = 'completed'
                  AND s.started_at >= datetime('now', ?)
                GROUP BY day
                """, arguments: ["-\(days) days"])
            return Dictionary(uniqueKeysWithValues: rows.map {
                ($0["day"] as String, $0["sets"] as Int)
            })
        }
    }

    struct RecentExercise: Identifiable, Sendable {
        let exerciseId: Int64
        let name: String
        let lastDay: String     // started_at of most recent session containing it
        var id: Int64 { exerciseId }
    }

    /// Most recently trained exercises, deduped, newest first.
    func recentExercises(limit: Int) throws -> [RecentExercise] {
        try writer.read { db in
            let rows = try Row.fetchAll(db, sql: """
                SELECT e.id AS eid, e.name AS name, MAX(s.started_at) AS last_day
                FROM sessions s
                JOIN session_exercises se ON se.session_id = s.id
                JOIN exercises e ON e.id = se.exercise_id
                WHERE s.status = 'completed'
                GROUP BY e.id
                ORDER BY last_day DESC
                LIMIT ?
                """, arguments: [limit])
            return rows.map {
                RecentExercise(exerciseId: $0["eid"], name: $0["name"], lastDay: $0["last_day"])
            }
        }
    }

    func completedSessionsCount(days: Int) throws -> Int {
        try writer.read { db in
            try Int.fetchOne(db, sql: """
                SELECT COUNT(*) FROM sessions
                WHERE status = 'completed' AND started_at >= datetime('now', ?)
                """, arguments: ["-\(days) days"]) ?? 0
        }
    }

    /// Aggregate strength growth: mean % change in best e1RM, trailing 30 days
    /// vs the 30 before, across exercises with weighted sets in BOTH windows
    /// (an exercise absent from either window says nothing about growth).
    /// nil when fewer than 2 exercises qualify — too thin to headline.
    func strengthGrowth30d() throws -> Double? {
        try writer.read { db in
            let rows = try Row.fetchAll(db, sql: """
                WITH windowed AS (
                    SELECT se.exercise_id AS eid,
                           CASE WHEN s.started_at >= datetime('now', '-30 days')
                                THEN 'cur' ELSE 'prev' END AS win,
                           MAX(st.weight_kg * (1.0 + st.reps / 30.0)) AS best
                    FROM sessions s
                    JOIN session_exercises se ON se.session_id = s.id
                    JOIN sets st ON st.session_exercise_id = se.id
                    WHERE s.status = 'completed'
                      AND s.started_at >= datetime('now', '-60 days')
                      AND st.weight_kg IS NOT NULL AND st.weight_kg > 0 AND st.reps > 0
                    GROUP BY eid, win
                )
                SELECT cur.eid, cur.best AS cur_best, prev.best AS prev_best
                FROM windowed cur
                JOIN windowed prev ON prev.eid = cur.eid AND prev.win = 'prev'
                WHERE cur.win = 'cur' AND prev.best > 0
                """)
            let changes = rows.map { row -> Double in
                let cur: Double = row["cur_best"]
                let prev: Double = row["prev_best"]
                return (cur - prev) / prev * 100.0
            }
            guard changes.count >= 2 else { return nil }
            return changes.reduce(0, +) / Double(changes.count)
        }
    }
}
