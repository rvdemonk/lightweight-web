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
            func serverSession(_ id: Int64, _ name: String) -> SessionDTO {
                SessionDTO(id: id, templateId: nil, templateName: nil, name: name,
                    startedAt: "2026-07-1\(id)T00:00:00.000Z", endedAt: nil, pausedDuration: 0,
                    notes: nil, status: "completed", templateVersion: nil,
                    exercises: [SessionExerciseDTO(id: id * 10, exerciseId: 1, exerciseName: "BENCH",
                        position: 1, notes: nil, sets: [SetDTO(id: id * 100, sessionExerciseId: id * 10,
                            setNumber: 1, weightKg: 60, reps: 5, setType: "working", rir: nil,
                            completedAt: "2026-07-1\(id)T00:00:00.000Z")])])
            }

            // First pull: one server session (synced=1).
            try db.importSnapshot(exercises: [ex], templates: [], sessions: [serverSession(1, "Server A")])

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

            // Second pull: Server A replaced by Server B; local sessions absent.
            // This is the moment the old wipe-and-replace would eat local data.
            try db.importSnapshot(exercises: [ex], templates: [], sessions: [serverSession(2, "Server B")])

            let c = try db.counts()
            let active = try db.activeLocalSession()
            let unsyncedDone = try db.unsyncedCompletedSessionIds()

            var failures: [String] = []
            if active?.id != activeId { failures.append("active local session was eaten") }
            if !unsyncedDone.contains(doneId) { failures.append("completed-unsynced session was eaten") }
            // Server A (id 1) gone, Server B (id 2) present, plus 2 local = 3 sessions.
            if c.sessions != 3 { failures.append("expected 3 sessions, got \(c.sessions)") }
            // Exercise upserted, not duplicated (local reused server id 1).
            if c.exercises != 1 { failures.append("expected 1 exercise, got \(c.exercises)") }

            if failures.isEmpty {
                print("✅ IMPORT-SAFETY SELFTEST PASS — local sessions survived pull; server rows replaced; exercise upserted (sessions=\(c.sessions), exercises=\(c.exercises), sets=\(c.sets))")
            } else {
                print("❌ IMPORT-SAFETY SELFTEST FAIL — \(failures.joined(separator: "; "))")
            }
        } catch {
            print("❌ IMPORT-SAFETY SELFTEST ERROR — \(error)")
        }
    }
}
#endif
