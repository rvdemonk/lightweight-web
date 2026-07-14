// Searchable exercise picker for in-workout logging.
// Case/whitespace-insensitive match over the local exercise catalog, with a
// create-new-by-name fallback (mirrors the server's resolve-by-name so the
// pushed session lands on the right lineage). Deliberately unstyled.

import SwiftUI

struct ExercisePickerView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    /// Called with the chosen exercise (existing or freshly created local row).
    let onPick: (_ exerciseId: Int64, _ name: String) -> Void

    @State private var query = ""
    @State private var matches: [ExercisePick] = []
    @State private var loadError: String?

    struct ExercisePick: Identifiable, Sendable {
        var id: Int64
        var name: String
    }

    /// True when the trimmed query doesn't exactly (case-insensitively) match
    /// any existing exercise — offer to create it.
    private var canCreate: Bool {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !q.isEmpty else { return false }
        return !matches.contains { $0.name.caseInsensitiveCompare(q) == .orderedSame }
    }

    var body: some View {
        NavigationStack {
            List {
                if let loadError {
                    Text(loadError).foregroundStyle(.red).font(.body)
                }
                if canCreate {
                    Section {
                        Button {
                            create()
                        } label: {
                            Label("Create \u{201C}\(query.trimmingCharacters(in: .whitespacesAndNewlines))\u{201D}",
                                  systemImage: "plus.circle")
                        }
                    }
                }
                Section {
                    ForEach(matches) { m in
                        Button {
                            onPick(m.id, m.name)
                            dismiss()
                        } label: {
                            Text(m.name)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .frame(minHeight: 44, alignment: .leading)
                        }
                        .foregroundStyle(.primary)
                    }
                }
            }
            .navigationTitle("ADD EXERCISE")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $query, prompt: "Search or create")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task(id: query) { reload() }
        }
    }

    private func reload() {
        do {
            matches = try appState.db.searchLocalExercises(query).map {
                ExercisePick(id: $0.id, name: $0.name)
            }
            loadError = nil
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func create() {
        let name = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        do {
            let ex = try appState.db.findOrCreateLocalExercise(named: name)
            onPick(ex.id, ex.name)
            dismiss()
        } catch {
            loadError = error.localizedDescription
        }
    }
}
