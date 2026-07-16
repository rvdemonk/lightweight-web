// Local-write side for template CREATE / EDIT + the push→adopt half of sync.
//
// Templates mirror the sessions write-safety model (see LocalWorkoutStore /
// AppDatabase.importSnapshot): locally-authored rows are flagged `synced=0` and
// survive a pull's wipe-and-replace. Two shapes:
//   • created locally → NEGATIVE id (can't collide with server positive ids)
//   • edited pulled template → keeps its POSITIVE server id, flagged synced=0
// The server matches on push by NAME, so a template's name is set once at
// creation and is IMMUTABLE thereafter (a renamed push would create a SECOND
// template server-side — the contract treats renames as new templates). Edit
// changes the exercise list / targets / notes only.

import Foundation
import GRDB

extension AppDatabase {

    /// One exercise line in the template editor. Identified by a UUID so SwiftUI
    /// reorder/remove is stable even with the same exercise repeated. `exerciseId`
    /// is a local catalog id (server-positive or local-negative from the picker).
    struct TemplateExerciseDraft: Identifiable, Sendable, Hashable {
        var id = UUID()
        var exerciseId: Int64
        var name: String
        var targetSets: Int?
        var targetRepsMin: Int?
        var targetRepsMax: Int?
        var restSeconds: Int?
        var notes: String?
    }

    // ── Create / edit ──

    /// Create a locally-authored template (negative id, synced=0). Positions are
    /// 1-based by array order. Caller pushes afterwards (AppState.pushLocalChanges)
    /// to adopt the server id/version; until then the row survives every pull.
    func createLocalTemplate(name: String, notes: String?, exercises: [TemplateExerciseDraft]) throws -> Int64 {
        try writer.write { db in
            let id = try nextLocalId(db, "templates")
            let now = ISO8601.now()
            try TemplateRecord(
                id: id, name: name, notes: notes, archived: false,
                createdAt: now, updatedAt: now, version: 1, synced: false
            ).insert(db)
            try insertDraftExercises(db, templateId: id, exercises: exercises)
            return id
        }
    }

    /// Replace a template's exercise list / notes and mark it unsynced. Keeps the
    /// existing id (positive for a pulled template, negative for a local one) so
    /// sessions already linked to it stay valid and the pull's replace-by-id
    /// reconciles. Name is NOT touched (immutable — see file header). Version is
    /// NOT bumped: versioning is server-authoritative and adopted on next push.
    func updateLocalTemplate(id: Int64, notes: String?, exercises: [TemplateExerciseDraft]) throws {
        try writer.write { db in
            try db.execute(
                sql: "UPDATE templates SET synced = 0, notes = ?, updated_at = ? WHERE id = ?",
                arguments: [notes, ISO8601.now(), id])
            try db.execute(sql: "DELETE FROM template_exercises WHERE template_id = ?", arguments: [id])
            try insertDraftExercises(db, templateId: id, exercises: exercises)
        }
    }

    private func insertDraftExercises(_ db: Database, templateId: Int64, exercises: [TemplateExerciseDraft]) throws {
        for (idx, ex) in exercises.enumerated() {
            let teId = try nextLocalId(db, "template_exercises")
            try TemplateExerciseRecord(
                id: teId, templateId: templateId, exerciseId: ex.exerciseId,
                position: idx + 1, targetSets: ex.targetSets,
                targetRepsMin: ex.targetRepsMin, targetRepsMax: ex.targetRepsMax,
                restSeconds: ex.restSeconds, notes: ex.notes
            ).insert(db)
        }
    }

    /// Prefill the editor from an existing template (name for display, exercises
    /// as drafts). Throws if the template is gone.
    func templateEditDrafts(templateId: Int64) throws -> (name: String, notes: String?, exercises: [TemplateExerciseDraft]) {
        try writer.read { db in
            guard let t = try TemplateRecord.fetchOne(db, key: templateId) else {
                throw DatabaseError(message: "template \(templateId) missing")
            }
            let tes = try TemplateExerciseRecord.fetchAll(db, sql: """
                SELECT * FROM template_exercises WHERE template_id = ? ORDER BY position
                """, arguments: [templateId])
            let drafts = try tes.map { te -> TemplateExerciseDraft in
                let name = try String.fetchOne(
                    db, sql: "SELECT name FROM exercises WHERE id = ?",
                    arguments: [te.exerciseId]) ?? "Exercise"
                return TemplateExerciseDraft(
                    exerciseId: te.exerciseId, name: name, targetSets: te.targetSets,
                    targetRepsMin: te.targetRepsMin, targetRepsMax: te.targetRepsMax,
                    restSeconds: te.restSeconds, notes: te.notes)
            }
            return (t.name, t.notes, drafts)
        }
    }

    /// True when a template name is already taken locally (case-insensitive) —
    /// guards create against silently folding into an existing same-name template.
    func templateNameExists(_ name: String) throws -> Bool {
        try writer.read { db in
            let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
            return try Bool.fetchOne(db, sql: """
                SELECT COUNT(*) > 0 FROM templates
                 WHERE archived = 0 AND LOWER(TRIM(name)) = LOWER(?)
                """, arguments: [trimmed]) ?? false
        }
    }

    // ── Push (sync) helpers ──

    /// Build the push payload for every locally-authored/edited template. Exercises
    /// go BY NAME (the server has no ids for locally-created movements — it resolves
    /// or auto-creates). Ordered by id so negative-id creations push deterministically.
    func localUnsyncedTemplates() throws -> [SyncTemplatePayload] {
        try writer.read { db in
            let templates = try TemplateRecord
                .filter(sql: "synced = 0 AND archived = 0")
                .order(sql: "id")
                .fetchAll(db)
            return try templates.map { t in
                let tes = try TemplateExerciseRecord.fetchAll(db, sql: """
                    SELECT * FROM template_exercises WHERE template_id = ? ORDER BY position
                    """, arguments: [t.id])
                let exercises = try tes.map { te -> SyncTemplateExercisePayload in
                    let name = try String.fetchOne(
                        db, sql: "SELECT name FROM exercises WHERE id = ?",
                        arguments: [te.exerciseId]) ?? ""
                    return SyncTemplateExercisePayload(
                        name: name, position: te.position, targetSets: te.targetSets,
                        targetRepsMin: te.targetRepsMin, targetRepsMax: te.targetRepsMax,
                        restSeconds: te.restSeconds, notes: te.notes)
                }
                return SyncTemplatePayload(
                    name: t.name, notes: t.notes, version: t.version, exercises: exercises)
            }
        }
    }

    /// Adopt the server's authoritative (id, version) after a successful push.
    /// ATOMIC (one transaction — hardening condition): a crash mid-way must not
    /// leave a session pointing at a server id while a stale local template lingers.
    /// Per returned template, matched to the local unsynced row by name:
    ///   1. restamp UNSYNCED sessions' template_id + template_version to the
    ///      server's (only unsynced — the ones about to push; synced sessions are
    ///      server-authoritative and must not have their historical version rewritten),
    ///   2. delete the local template rows. The terminating pull brings the
    ///      authoritative server copy down; sessions already point at the real id,
    ///      so even if that pull fails, state is consistent and no duplicate forms.
    func adoptPushedTemplates(_ server: [TemplateDTO]) throws {
        try writer.write { db in
            for st in server {
                guard let local = try TemplateRecord.fetchOne(db, sql: """
                    SELECT * FROM templates WHERE synced = 0 AND LOWER(name) = LOWER(?)
                    """, arguments: [st.name]) else { continue }
                try db.execute(sql: """
                    UPDATE sessions SET template_id = ?, template_version = ?
                     WHERE template_id = ? AND synced = 0
                    """, arguments: [st.id, st.version ?? 1, local.id])
                try db.execute(sql: "DELETE FROM template_exercises WHERE template_id = ?", arguments: [local.id])
                try db.execute(sql: "DELETE FROM templates WHERE id = ?", arguments: [local.id])
            }
        }
    }

    func templateRecord(id: Int64) throws -> TemplateRecord? {
        try writer.read { db in try TemplateRecord.fetchOne(db, key: id) }
    }

    func sessionRecord(id: Int64) throws -> SessionRecord? {
        try writer.read { db in try SessionRecord.fetchOne(db, key: id) }
    }
}
