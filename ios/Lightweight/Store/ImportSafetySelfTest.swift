// DEBUG-only in-process check of the write-safe import invariant — the
// load-bearing store change. Runs against a throwaway temp DB when the
// LW_IMPORT_SELFTEST env var is set; prints PASS/FAIL to the console. Exists
// because importSnapshot only executes on an authed server pull, which can't
// be exercised in the unauthenticated build.

#if DEBUG
import Foundation

enum ImportSafetySelfTest {
    static func run() {
        do {
            let path = NSTemporaryDirectory() + "lw-selftest-\(UUID().uuidString).sqlite"
            defer { try? FileManager.default.removeItem(atPath: path) }
            let db = try AppDatabase(path: path)

            let ex = ExerciseDTO(id: 1, name: "BENCH", muscleGroup: nil, equipment: nil,
                notes: nil, archived: false, createdAt: "2026-01-01T00:00:00.000Z")
            let ex2 = ExerciseDTO(id: 2, name: "ROW", muscleGroup: nil, equipment: nil,
                notes: nil, archived: false, createdAt: "2026-01-01T00:00:00.000Z")
            func serverTemplate(_ id: Int64, _ name: String, exerciseIds: [Int64], sets: Int?) -> TemplateDTO {
                let tes = exerciseIds.enumerated().map { (i, eid) in
                    TemplateExerciseDTO(id: id * 100 + Int64(i), exerciseId: eid,
                        exerciseName: eid == 1 ? "BENCH" : "ROW", position: i + 1,
                        targetSets: sets, targetRepsMin: 8, targetRepsMax: 12,
                        restSeconds: 90, notes: nil)
                }
                return TemplateDTO(id: id, name: name, notes: nil, archived: false,
                    createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
                    version: 1, exercises: tes)
            }
            func serverSession(_ id: Int64, _ name: String) -> SessionDTO {
                SessionDTO(id: id, templateId: nil, templateName: nil, name: name,
                    startedAt: "2026-07-1\(id)T00:00:00.000Z", endedAt: nil, pausedDuration: 0,
                    notes: nil, status: "completed", templateVersion: nil,
                    exercises: [SessionExerciseDTO(id: id * 10, exerciseId: 1, exerciseName: "BENCH",
                        position: 1, notes: nil, sets: [SetDTO(id: id * 100, sessionExerciseId: id * 10,
                            setNumber: 1, weightKg: 60, reps: 5, setType: "working", rir: nil,
                            completedAt: "2026-07-1\(id)T00:00:00.000Z")])])
            }

            // First pull: one server session + two server templates (synced=1):
            //   100 PULLED — will be edited locally before the next pull
            //   102 STABLE — untouched; must wipe-and-replace cleanly next pull
            try db.importSnapshot(
                exercises: [ex, ex2], templates: [
                    serverTemplate(100, "PULLED", exerciseIds: [1, 2], sets: 3),
                    serverTemplate(102, "STABLE", exerciseIds: [1], sets: 3),
                ],
                sessions: [serverSession(1, "Server A")])

            // User builds a template locally (negative id, synced=0) and EDITS the
            // pulled one (100 keeps its positive id, flips to synced=0) — its target
            // sets 3 → 5 so we can prove the local edit isn't clobbered.
            let localTplId = try db.createLocalTemplate(
                name: "LOCAL PUSH", notes: nil,
                exercises: [.init(exerciseId: 1, name: "BENCH", targetSets: 4)])
            try db.updateLocalTemplate(
                id: 100, notes: nil,
                exercises: [.init(exerciseId: 1, name: "BENCH", targetSets: 5)])

            // User starts a local workout referencing the SERVER exercise, and
            // separately a completed-but-unsynced session (failed push).
            let activeId = try db.startLocalSession(name: "Local Active", startedAt: ISO8601.now())
            let seId = try db.addSessionExercise(sessionId: activeId, exerciseId: 1, position: 1)
            _ = try db.addLocalSet(sessionExerciseId: seId, setNumber: 1, weightKg: 70, reps: 3,
                rir: nil, completedAt: ISO8601.now())
            let doneId = try db.startLocalSession(name: "Local Done", startedAt: ISO8601.now())
            let seId2 = try db.addSessionExercise(sessionId: doneId, exerciseId: 1, position: 1)
            _ = try db.addLocalSet(sessionExerciseId: seId2, setNumber: 1, weightKg: 72, reps: 2,
                rir: nil, completedAt: ISO8601.now())
            try db.finishLocalSession(id: doneId, endedAt: ISO8601.now())

            // Second pull. Sessions: Server A replaced by Server B; local sessions
            // absent from the payload. Templates: the server re-sends its STALE
            // copy of 100 (sets 3 — must be SKIPPED, the local edit wins), a NEW
            // template 101, and a replaced 102. This is the moment the old
            // wipe-and-replace would eat local template work.
            try db.importSnapshot(
                exercises: [ex, ex2], templates: [
                    serverTemplate(100, "PULLED", exerciseIds: [1], sets: 3),   // stale — skip
                    serverTemplate(101, "NEW", exerciseIds: [2], sets: 4),
                    serverTemplate(102, "STABLE", exerciseIds: [1, 2], sets: 4), // replaced
                ],
                sessions: [serverSession(2, "Server B")])

            let c = try db.counts()
            let active = try db.activeLocalSession()
            let unsyncedDone = try db.unsyncedCompletedSessionIds()

            var failures: [String] = []
            if active?.id != activeId { failures.append("active local session was eaten") }
            if !unsyncedDone.contains(doneId) { failures.append("completed-unsynced session was eaten") }
            // Server A (id 1) gone, Server B (id 2) present, plus 2 local = 3 sessions.
            if c.sessions != 3 { failures.append("expected 3 sessions, got \(c.sessions)") }
            // Exercise upserted, not duplicated (local reused server ids 1, 2).
            if c.exercises != 2 { failures.append("expected 2 exercises, got \(c.exercises)") }

            // ── Template write-safety ──
            // Locally-created template (negative id) survived the pull.
            let localDrafts = try? db.templateEditDrafts(templateId: localTplId)
            if localDrafts == nil { failures.append("locally-created template was eaten") }
            else if localDrafts?.exercises.first?.targetSets != 4 {
                failures.append("locally-created template content wrong")
            }
            // Edited positive-id template survived AND the server's stale copy was
            // skipped — target sets is the LOCAL 5, not the server's 3.
            let edited = try? db.templateEditDrafts(templateId: 100)
            if edited?.exercises.count != 1 || edited?.exercises.first?.targetSets != 5 {
                failures.append("edited template was clobbered by the server's stale copy")
            }
            // synced=1 templates wipe-and-replace cleanly: 102 now carries the
            // replaced 2-exercise version, 101 arrived new, no duplicates by name.
            let replaced = try? db.templateEditDrafts(templateId: 102)
            if replaced?.exercises.count != 2 { failures.append("synced template did not replace cleanly") }
            // 4 templates total: LOCAL PUSH, 100 (edited), 101 (new), 102 (replaced).
            if c.templates != 4 { failures.append("expected 4 templates, got \(c.templates)") }
            let names = (try? db.templateList().map { $0.template.name }) ?? []
            if Set(names).count != names.count { failures.append("duplicate template rows after import") }

            if failures.isEmpty {
                print("✅ IMPORT-SAFETY SELFTEST PASS — local sessions + templates survived pull; server rows replaced; edited template's stale server copy skipped (sessions=\(c.sessions), exercises=\(c.exercises), templates=\(c.templates), sets=\(c.sets))")
            } else {
                print("❌ IMPORT-SAFETY SELFTEST FAIL — \(failures.joined(separator: "; "))")
            }
        } catch {
            print("❌ IMPORT-SAFETY SELFTEST ERROR — \(error)")
        }
    }
}
#endif
