// App-level state: auth phase + sync.
//
// Spec requirements carried here (banked from the Android sync bug):
//   - sync failure is ALWAYS surfaced, never rendered as success
//   - 401 → drop to login (re-auth), never silence

import Foundation
import Observation

@MainActor
@Observable
final class AppState {
    enum Phase {
        case loggedOut
        case loggedIn
    }

    enum SyncState: Equatable {
        case idle
        case syncing(String)          // progress label
        case synced(String)           // e.g. "80 sessions · 42 exercises"
        case failed(String)           // visible error, always
    }

    var phase: Phase = .loggedOut
    var syncState: SyncState = .idle
    /// The active-workout screen is presented app-wide (fullScreenCover on
    /// MainTabView) — the SOLE presentation path, so the workout bar, Home's
    /// resume/start, and minimize all share one state.
    var workoutPresented = false
    /// Observable mirror of the DB's active session — drives the workout bar.
    /// Refresh at the transitions (start, minimize, finish); DB isn't observable.
    var activeSession: SessionRecord?
    var serverURL: String {
        didSet { UserDefaults.standard.set(serverURL, forKey: "serverURL") }
    }

    let db: AppDatabase
    private var token: String?

    init(db: AppDatabase) {
        self.db = db
        self.serverURL = UserDefaults.standard.string(forKey: "serverURL")
            ?? "https://lightweight.3rigby.xyz"
        if let saved = Keychain.loadToken() {
            token = saved
            phase = .loggedIn
        }
        #if DEBUG
        // Screenshot-only seam: skip auth into the tabs with a seeded offline
        // catalog. Never active without the LW_UI_PREVIEW env var.
        // MUST neutralize credentials: the keychain token survives app
        // reinstalls, and a preview session that Ends would otherwise push
        // junk to prod with a real token (happened 2026-07-15; session 100
        // surgically removed). Unroutable URL = any push fails visibly.
        if ProcessInfo.processInfo.environment["LW_UI_PREVIEW"] == "1" {
            try? db.seedPreviewData()
            try? db.seedActiveWorkoutPreview()
            token = nil
            // Safe ONLY because didSet doesn't fire inside init — this must
            // not persist to UserDefaults or it would sabotage real launches.
            serverURL = "http://preview.invalid"
            phase = .loggedIn
        }
        #endif
    }

    func refreshActiveSession() {
        activeSession = try? db.activeLocalSession()
    }

    /// Delete a workout everywhere. Server first for server-backed rows
    /// (positive ids) — local-only delete would resurrect on the next pull.
    /// A 404 counts as already-deleted, not failure.
    func deleteSession(id: Int64) async throws {
        if id > 0 {
            guard let client else { throw APIError.invalidURL }
            do {
                try await client.deleteSession(id: id)
            } catch APIError.http(let code, _) where code == 404 {
                // Gone on the server already — proceed to local cleanup.
            }
        }
        try db.deleteLocalSession(id: id)
    }

    private var client: APIClient? {
        guard let url = URL(string: serverURL) else { return nil }
        return APIClient(baseURL: url, token: token)
    }

    // ── Auth ──

    func login(username: String, password: String) async throws {
        guard let url = URL(string: serverURL) else { throw APIError.invalidURL }
        let client = APIClient(baseURL: url, token: nil)
        let auth = try await client.login(username: username, password: password)
        Keychain.saveToken(auth.token)
        token = auth.token
        phase = .loggedIn
        await refresh()
    }

    func logout() {
        Keychain.deleteToken()
        token = nil
        phase = .loggedOut
        syncState = .idle
    }

    // ── Push then pull (finish-workout sync) ──

    /// Push unsynced completed sessions, then pull to reconcile local rows to
    /// their real server ids. Result is always visible; a 401 drops to login;
    /// no failure is ever rendered as success (the banked sync lesson).
    func pushCompletedSessions() async {
        guard let client else {
            syncState = .failed("Invalid server URL")
            return
        }
        do {
            let ids = try db.unsyncedCompletedSessionIds()
            if !ids.isEmpty {
                syncState = .syncing("Pushing \(ids.count) workout(s)…")
                let payloads = try ids.map { try db.syncPayload(sessionId: $0) }
                let result = try await client.syncSessions(payloads)
                // Both pushed and skipped are reconciled — the server has them.
                try db.markSessionsSynced(ids)
                syncState = .synced("Pushed \(result.pushed.count) · skipped \(result.skipped)")
            }
            // Pull reconciles: synced negative-id rows are replaced by server rows.
            await refresh()
        } catch APIError.unauthorized {
            syncState = .failed("Session expired — log in again")
            logout()
        } catch {
            syncState = .failed(error.localizedDescription)
        }
    }

    #if DEBUG
    /// Screenshot-only: finish the seeded active session and push against an
    /// UNREACHABLE local URL so the visible-failure path renders WITHOUT any
    /// contact with the production server. Never runs outside LW_UI_PREVIEW_SCREEN.
    func previewFinishAndPush() async {
        serverURL = "http://127.0.0.1:1"
        if let active = try? db.activeLocalSession() {
            try? db.finishLocalSession(id: active.id, endedAt: ISO8601.now())
        }
        await pushCompletedSessions()
    }
    #endif

    // ── Pull (read-only sync, MVP) ──

    func refresh() async {
        guard let client else {
            syncState = .failed("Invalid server URL")
            return
        }
        syncState = .syncing("Pulling catalog…")
        do {
            async let exercises = client.exercises()
            async let templates = client.templates()
            async let summaries = client.sessionSummaries()
            let (ex, tp, sm) = try await (exercises, templates, summaries)

            syncState = .syncing("Pulling \(sm.count) sessions…")
            var sessions: [SessionDTO] = []
            sessions.reserveCapacity(sm.count)
            try await withThrowingTaskGroup(of: SessionDTO.self) { group in
                var iterator = sm.makeIterator()
                var inFlight = 0
                while inFlight < 6, let s = iterator.next() {
                    group.addTask { try await client.session(id: s.id) }
                    inFlight += 1
                }
                while let done = try await group.next() {
                    sessions.append(done)
                    if let s = iterator.next() {
                        group.addTask { try await client.session(id: s.id) }
                    }
                }
            }

            let db = self.db
            let toImport = sessions
            try await Task.detached(priority: .userInitiated) {
                try db.importSnapshot(exercises: ex, templates: tp, sessions: toImport)
            }.value

            let c = try db.counts()
            syncState = .synced("\(c.sessions) sessions · \(c.sets) sets · \(c.templates) templates")
        } catch APIError.unauthorized {
            // The banked lesson: 401 is re-auth, not silence.
            syncState = .failed("Session expired — log in again")
            logout()
        } catch {
            syncState = .failed(error.localizedDescription)
        }
    }
}
