// Thin async HTTP client for the Lightweight API.
// All routes live under /api/v1/ (see server app.rs).
//
// Spec requirement (banked from the Android sync bug): 401 is a distinct,
// visible error — the caller must treat it as "re-auth required", never
// swallow it or render it as success.

import Foundation

enum APIError: Error, LocalizedError {
    case unauthorized
    case http(Int, String)
    case invalidURL

    var errorDescription: String? {
        switch self {
        case .unauthorized: "Session expired — please log in again"
        case .http(let code, let body): "Server error \(code): \(body.prefix(200))"
        case .invalidURL: "Invalid server URL"
        }
    }
}

struct APIClient: Sendable {
    let baseURL: URL
    var token: String?

    private static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    // ── Endpoints ──

    func login(username: String, password: String) async throws -> AuthResponse {
        try await post("auth/login", body: ["username": username, "password": password])
    }

    func exercises() async throws -> [ExerciseDTO] {
        try await get("exercises")
    }

    func templates() async throws -> [TemplateDTO] {
        try await get("templates")
    }

    func sessionSummaries(limit: Int = 1000) async throws -> [SessionSummaryDTO] {
        try await get("sessions?limit=\(limit)")
    }

    func session(id: Int64) async throws -> SessionDTO {
        try await get("sessions/\(id)")
    }

    /// Push completed sessions. Bare JSON array; server dedups by started_at,
    /// resolves exercises by name. 401 surfaces as APIError.unauthorized.
    func syncSessions(_ sessions: [SyncSessionPayload]) async throws -> SyncResultResponse {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return try await request("sessions/sync", method: "POST", body: try encoder.encode(sessions))
    }

    // ── Plumbing ──

    private func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: "GET", body: nil)
    }

    private func post<T: Decodable>(_ path: String, body: [String: String]) async throws -> T {
        try await request(path, method: "POST", body: try JSONEncoder().encode(body))
    }

    private func request<T: Decodable>(_ path: String, method: String, body: Data?) async throws -> T {
        guard let url = URL(string: "api/v1/" + path, relativeTo: baseURL) else {
            throw APIError.invalidURL
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.httpBody = body
        if body != nil {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        if let token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await URLSession.shared.data(for: req)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        switch status {
        case 200..<300:
            return try Self.decoder.decode(T.self, from: data)
        case 401:
            throw APIError.unauthorized
        default:
            throw APIError.http(status, String(data: data, encoding: .utf8) ?? "")
        }
    }
}
