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

// ── Template push (POST /api/v1/templates/sync) ──
// The missing half of sync (the Android structural failure the port must not
// reinherit). Bare JSON array of templates; the server dedups by case-insensitive
// NAME, resolves exercises BY NAME (auto-creating missing ones uppercased), and
// returns the full server Template for every input — the id-mapping channel the
// client adopts (id, version) from. Contract: crates/core/src/templates.rs.

struct SyncTemplatePayload: Encodable, Sendable {
    let name: String
    let notes: String?
    let version: Int?            // advisory only — the server owns version numbers
    let exercises: [SyncTemplateExercisePayload]
}

struct SyncTemplateExercisePayload: Encodable, Sendable {
    let name: String
    let position: Int
    let targetSets: Int?
    let targetRepsMin: Int?
    let targetRepsMax: Int?
    let restSeconds: Int?
    let notes: String?
}

// Full server Templates keyed by name, plus any exercises auto-created on arrival.
struct TemplateSyncResultResponse: Decodable, Sendable {
    let templates: [TemplateDTO]
    let exercisesCreated: [String]
}
