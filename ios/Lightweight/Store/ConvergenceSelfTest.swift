// DEBUG-only end-to-end proof of the template-push CONVERGENCE RULE against a
// REAL server, exercising the production code paths (APIClient.syncTemplates,
// adoptPushedTemplates, syncSessions) — not a mock. Gated by
// LW_CONVERGENCE_SELFTEST=1 and REQUIRES an explicit LW_TEST_SERVER +
// LW_TEST_TOKEN (never defaults to production — a scratch local server only).
//
// The scenario is the spec's hard case: a session started from a still-LOCAL
// (negative-id, unpushed) template must reach the server carrying the ADOPTED
// server template_id — proving the "push templates first → adopt → restamp
// sessions → push sessions" ordering keeps template linkage intact.

#if DEBUG
import Foundation

enum ConvergenceSelfTest {
    static func runIfRequested() {
        guard ProcessInfo.processInfo.environment["LW_CONVERGENCE_SELFTEST"] == "1",
              let server = ProcessInfo.processInfo.environment["LW_TEST_SERVER"],
              let token = ProcessInfo.processInfo.environment["LW_TEST_TOKEN"],
              let url = URL(string: server) else { return }
        Task { await run(baseURL: url, token: token) }
    }

    private static func run(baseURL: URL, token: String) async {
        do {
            let path = NSTemporaryDirectory() + "lw-convergence-\(UUID().uuidString).sqlite"
            defer { try? FileManager.default.removeItem(atPath: path) }
            let db = try AppDatabase(path: path)
            let client = APIClient(baseURL: baseURL, token: token)

            // Unique name per run so re-runs against the same server don't collide
            // (the server dedups by name — a re-run would UPDATE, not fail, but a
            // unique name keeps each run's assertions clean).
            let tplName = "CONV \(Int(Date().timeIntervalSince1970))"

            // 1. Build a template locally referencing a local-only exercise, then
            //    START A SESSION FROM IT before any push — the session now carries
            //    a NEGATIVE template_id (the case the convergence rule must fix).
            let ex = try db.findOrCreateLocalExercise(named: "CONV BENCH")
            let localTplId = try db.createLocalTemplate(
                name: tplName, notes: nil,
                exercises: [.init(exerciseId: ex.id, name: ex.name, targetSets: 4,
                                  targetRepsMin: 6, targetRepsMax: 10, restSeconds: 120, notes: nil)])
            guard let localTpl = try db.templateRecord(id: localTplId) else {
                print("❌ CONVERGENCE SELFTEST ERROR — local template vanished after create"); return
            }
            let sessionId = try db.startTemplateSession(template: localTpl, startedAt: ISO8601.now())
            // startTemplateSession pre-adds the template's exercises — log against
            // that existing session_exercise, don't add a duplicate at position 1.
            guard let seId = try db.loadActiveExercises(sessionId: sessionId).first?.sessionExerciseId else {
                print("❌ CONVERGENCE SELFTEST ERROR — template session had no exercises"); return
            }
            _ = try db.addLocalSet(sessionExerciseId: seId, setNumber: 1, weightKg: 80, reps: 5,
                                   rir: nil, completedAt: ISO8601.now())
            try db.finishLocalSession(id: sessionId, endedAt: ISO8601.now())

            var failures: [String] = []

            // 2. CONVERGENCE: templates FIRST → adopt → restamp → sessions.
            let templates = try db.localUnsyncedTemplates()
            let tplResult = try await client.syncTemplates(templates)
            try db.adoptPushedTemplates(tplResult.templates)

            guard let serverTpl = tplResult.templates.first(where: {
                $0.name.caseInsensitiveCompare(tplName) == .orderedSame
            }) else {
                print("❌ CONVERGENCE SELFTEST FAIL — server did not return the pushed template")
                return
            }

            // The session must now be restamped to the SERVER id + version.
            guard let stamped = try db.sessionRecord(id: sessionId) else {
                print("❌ CONVERGENCE SELFTEST ERROR — session vanished"); return
            }
            if stamped.templateId != serverTpl.id {
                failures.append("session template_id not adopted (local \(stamped.templateId ?? -999) vs server \(serverTpl.id))")
            }
            if stamped.templateVersion != Int(serverTpl.version ?? -1) {
                failures.append("session template_version not adopted")
            }

            // 3. Push the session — carries the adopted server template_id.
            let ids = try db.unsyncedCompletedSessionIds()
            let payloads = try ids.map { try db.syncPayload(sessionId: $0) }
            let sessionResult = try await client.syncSessions(payloads)
            if sessionResult.pushed.first?.templateId != serverTpl.id {
                failures.append("pushed session lost its template_id server-side")
            }

            // 4. Independent server-side read: GET the template back, confirm it
            //    exists with a positive id and the pushed targets.
            let serverTemplates = try await client.templates()
            guard let fetched = serverTemplates.first(where: {
                $0.name.caseInsensitiveCompare(tplName) == .orderedSame
            }) else {
                failures.append("template absent from server GET /templates")
                print("❌ CONVERGENCE SELFTEST FAIL — \(failures.joined(separator: "; "))")
                return
            }
            if fetched.id <= 0 { failures.append("server template id not positive") }
            if fetched.exercises?.first?.targetSets != 4 { failures.append("server template lost targets") }

            if failures.isEmpty {
                print("""
                ✅ CONVERGENCE SELFTEST PASS — local template pushed → server id \(serverTpl.id) v\(serverTpl.version ?? -1) adopted; \
                session restamped local→server template_id; pushed session \(sessionResult.pushed.first?.id ?? -1) links template_id \(sessionResult.pushed.first?.templateId ?? -1); \
                GET confirms template id \(fetched.id) with targets intact
                """)
            } else {
                print("❌ CONVERGENCE SELFTEST FAIL — \(failures.joined(separator: "; "))")
            }
        } catch {
            print("❌ CONVERGENCE SELFTEST ERROR — \(error)")
        }
    }
}
#endif
