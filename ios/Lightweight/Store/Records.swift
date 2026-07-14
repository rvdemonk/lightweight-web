// Flat GRDB records. Table + column names deliberately mirror the server
// schema (snake_case) so the local DB stays a literal replica of the
// contract and can be diffed against server exports (sqlite3-diffable).

import Foundation
import GRDB

struct ExerciseRecord: Codable, FetchableRecord, PersistableRecord {
    static let databaseTableName = "exercises"
    static let databaseColumnEncodingStrategy = DatabaseColumnEncodingStrategy.convertToSnakeCase
    static let databaseColumnDecodingStrategy = DatabaseColumnDecodingStrategy.convertFromSnakeCase

    var id: Int64
    var name: String
    var muscleGroup: String?
    var equipment: String?
    var notes: String?
    var archived: Bool
    var createdAt: String
}

struct TemplateRecord: Codable, FetchableRecord, PersistableRecord {
    static let databaseTableName = "templates"
    static let databaseColumnEncodingStrategy = DatabaseColumnEncodingStrategy.convertToSnakeCase
    static let databaseColumnDecodingStrategy = DatabaseColumnDecodingStrategy.convertFromSnakeCase

    var id: Int64
    var name: String
    var notes: String?
    var archived: Bool
    var createdAt: String
    var updatedAt: String
    var version: Int
}

struct TemplateExerciseRecord: Codable, FetchableRecord, PersistableRecord {
    static let databaseTableName = "template_exercises"
    static let databaseColumnEncodingStrategy = DatabaseColumnEncodingStrategy.convertToSnakeCase
    static let databaseColumnDecodingStrategy = DatabaseColumnDecodingStrategy.convertFromSnakeCase

    var id: Int64
    var templateId: Int64
    var exerciseId: Int64
    var position: Int
    var targetSets: Int?
    var targetRepsMin: Int?
    var targetRepsMax: Int?
    var restSeconds: Int?
    var notes: String?
}

struct SessionRecord: Codable, FetchableRecord, PersistableRecord {
    static let databaseTableName = "sessions"
    static let databaseColumnEncodingStrategy = DatabaseColumnEncodingStrategy.convertToSnakeCase
    static let databaseColumnDecodingStrategy = DatabaseColumnDecodingStrategy.convertFromSnakeCase

    var id: Int64
    var templateId: Int64?
    var name: String?
    var startedAt: String
    var endedAt: String?
    var pausedDuration: Int64
    var notes: String?
    var status: String
    var templateVersion: Int?
    var synced: Bool          // false = locally authored, not yet confirmed on server
}

struct SessionExerciseRecord: Codable, FetchableRecord, PersistableRecord {
    static let databaseTableName = "session_exercises"
    static let databaseColumnEncodingStrategy = DatabaseColumnEncodingStrategy.convertToSnakeCase
    static let databaseColumnDecodingStrategy = DatabaseColumnDecodingStrategy.convertFromSnakeCase

    var id: Int64
    var sessionId: Int64
    var exerciseId: Int64
    var position: Int
    var notes: String?
}

struct SetRecord: Codable, FetchableRecord, PersistableRecord {
    static let databaseTableName = "sets"
    static let databaseColumnEncodingStrategy = DatabaseColumnEncodingStrategy.convertToSnakeCase
    static let databaseColumnDecodingStrategy = DatabaseColumnDecodingStrategy.convertFromSnakeCase

    var id: Int64
    var sessionExerciseId: Int64
    var setNumber: Int
    var weightKg: Double?
    var reps: Int
    var setType: String
    var rir: Int?
    var completedAt: String?
}
