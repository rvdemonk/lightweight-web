// Encodable DTOs for the sync PUSH (POST /api/v1/sessions/sync).
// Wire shape mirrors Android's SyncSessionDto (DataDtos.kt) and the server's
// SyncSession/SyncExercise/SyncSet (crates/core/src/models.rs).
//
// The endpoint takes a BARE JSON ARRAY of sessions. The server dedups by exact
// `started_at` string and resolves exercises case-insensitively BY NAME
// (auto-creating missing ones uppercased) — so we push exercises by name, not id.
//
// snake_case on the wire: APIClient's encoder uses .convertToSnakeCase.

import Foundation

struct SyncSessionPayload: Encodable, Sendable {
    let name: String?
    let templateId: Int64?
    let templateVersion: Int?
    let startedAt: String        // ISO8601 w/ milliseconds + Z — server dedups on this string
    let endedAt: String?
    let pausedDuration: Int64?
    let status: String?          // "completed"
    let notes: String?
    let exercises: [SyncExercisePayload]
}

struct SyncExercisePayload: Encodable, Sendable {
    let name: String
    let position: Int
    let notes: String?
    let sets: [SyncSetPayload]
}

struct SyncSetPayload: Encodable, Sendable {
    let weightKg: Double?
    let reps: Int
    let setType: String?
    let rir: Int?
    let completedAt: String?
}

// Response. `pushed` is the full server Session objects (with real ids);
// `skipped` counts sessions already on the server (dedup by started_at).
struct SyncResultResponse: Decodable, Sendable {
    let pushed: [SessionDTO]
    let skipped: Int64
    let exercisesCreated: [String]
}
