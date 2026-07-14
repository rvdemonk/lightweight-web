// Codable DTOs mirroring the server contract.
// JSON is snake_case; APIClient's decoder uses .convertFromSnakeCase,
// so property names here are the camelCase twins of the wire fields.
// Reference spec: crates/core/src/models.rs, android/.../DataDtos.kt

import Foundation

// ── Auth ──

struct AuthResponse: Codable, Sendable {
    let token: String
    let userId: Int64
}

// ── Catalog ──

struct ExerciseDTO: Codable, Sendable {
    let id: Int64
    let name: String
    let muscleGroup: String?
    let equipment: String?
    let notes: String?
    let archived: Bool?
    let createdAt: String
}

struct TemplateDTO: Codable, Sendable {
    let id: Int64
    let name: String
    let notes: String?
    let archived: Bool?
    let createdAt: String
    let updatedAt: String
    let version: Int?
    let exercises: [TemplateExerciseDTO]?
}

struct TemplateExerciseDTO: Codable, Sendable {
    let id: Int64
    let exerciseId: Int64
    let exerciseName: String
    let position: Int
    let targetSets: Int?
    let targetRepsMin: Int?
    let targetRepsMax: Int?
    let restSeconds: Int?
    let notes: String?
}

// ── Sessions ──

struct SessionSummaryDTO: Codable, Sendable {
    let id: Int64
    let templateId: Int64?
    let templateName: String?
    let name: String?
    let startedAt: String
    let endedAt: String?
    let status: String
    let setCount: Int64?
    let exerciseCount: Int64?
    let targetSetCount: Int64?
    let templateVersion: Int?
}

struct SessionDTO: Codable, Sendable {
    let id: Int64
    let templateId: Int64?
    let templateName: String?
    let name: String?
    let startedAt: String
    let endedAt: String?
    let pausedDuration: Int64?
    let notes: String?
    let status: String
    let templateVersion: Int?
    let exercises: [SessionExerciseDTO]?
}

struct SessionExerciseDTO: Codable, Sendable {
    let id: Int64
    let exerciseId: Int64
    let exerciseName: String
    let position: Int
    let notes: String?
    let sets: [SetDTO]?
}

struct SetDTO: Codable, Sendable {
    let id: Int64
    let sessionExerciseId: Int64
    let setNumber: Int
    let weightKg: Double?
    let reps: Int
    let setType: String?
    let rir: Int?
    let completedAt: String?
}
