// Templates: list → detail → start. Read-only for now — template
// creation/editing is deliberately deferred until template PUSH sync
// exists: local edits to pulled templates would be silently lost on the
// next wipe-and-replace import, and locally-created templates (negative
// ids) can't link sessions the server will accept. UI and push ship
// together as one unit.

import SwiftUI

struct WorkoutsView: View {
    @Environment(AppState.self) private var appState
    @State private var items: [AppDatabase.TemplateListItem] = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.grid * 2) {
                    ForEach(items) { item in
                        NavigationLink {
                            TemplateDetailView(item: item)
                        } label: {
                            templateRow(item)
                        }
                        .buttonStyle(.plain)
                    }
                    if items.isEmpty {
                        VStack(spacing: Theme.grid * 3) {
                            Text("No templates").metaLabel()
                            Text("Templates arrive with a server pull.")
                                .font(Theme.body)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.top, 80)
                    }
                }
                .padding(.horizontal, Theme.margin)
                .padding(.vertical, Theme.grid * 2)
            }
            .background(Color(.systemBackground))
            .navigationTitle("Workouts")
            .task { reload() }
        }
    }

    private func reload() {
        items = (try? appState.db.templateList()) ?? []
    }

    private func templateRow(_ item: AppDatabase.TemplateListItem) -> some View {
        HStack(spacing: Theme.grid * 2) {
            VStack(alignment: .leading, spacing: Theme.grid) {
                Text(item.template.name.uppercased())
                    .font(.system(size: 17, weight: .semibold).width(.condensed))
                    .lineLimit(1)
                Text("\(item.exerciseCount) exercises\(lastUsedSuffix(item))")
                    .metaLabel()
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(Theme.margin)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
        .contentShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
    }

    private func lastUsedSuffix(_ item: AppDatabase.TemplateListItem) -> String {
        item.lastUsed.map { " · last \(ServerDate.dayLabel($0))" } ?? ""
    }
}

// ── Detail ──

struct TemplateDetailView: View {
    let item: AppDatabase.TemplateListItem
    @Environment(AppState.self) private var appState
    @State private var exercises: [AppDatabase.TemplateExerciseItem] = []
    @State private var goToWorkout = false
    @State private var startError: String?

    var body: some View {
        ScrollView {
            VStack(spacing: Theme.grid * 3) {
                VStack(spacing: 0) {
                    ForEach(exercises) { ex in
                        HStack(spacing: Theme.grid * 2) {
                            Text(String(format: "%02d", ex.record.position))
                                .font(Theme.data)
                                .foregroundStyle(.tertiary)
                            Text(ex.name.uppercased())
                                .font(.system(size: 17, weight: .semibold).width(.condensed))
                                .lineLimit(1)
                            Spacer()
                            Text(targetLabel(ex.record))
                                .font(Theme.data)
                                .foregroundStyle(.secondary)
                        }
                        .frame(minHeight: Theme.minTouch)
                    }
                }
                .padding(Theme.margin)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))

                Button {
                    start()
                } label: {
                    Text("START WORKOUT")
                        .font(.system(size: 17, weight: .semibold).width(.condensed))
                        .tracking(1.0)
                        .frame(maxWidth: .infinity, minHeight: 48)
                }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.capsule)
                .tint(Theme.amber)
                .foregroundStyle(.black)

                if let startError {
                    Text(startError)
                        .font(Theme.body)
                        .foregroundStyle(Theme.red)
                }
            }
            .padding(.horizontal, Theme.margin)
            .padding(.vertical, Theme.grid * 2)
        }
        .background(Color(.systemBackground))
        .navigationTitle(item.template.name.uppercased())
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $goToWorkout) { ActiveWorkoutView() }
        .task {
            exercises = (try? appState.db.templateExercises(templateId: item.template.id)) ?? []
        }
    }

    /// If a workout is already active, navigating resumes it (never silently
    /// discard an active session); otherwise start fresh from this template.
    private func start() {
        do {
            if try appState.db.activeLocalSession() == nil {
                _ = try appState.db.startTemplateSession(
                    template: item.template, startedAt: ISO8601.now())
            }
            goToWorkout = true
        } catch {
            startError = error.localizedDescription
        }
    }

    private func targetLabel(_ te: TemplateExerciseRecord) -> String {
        guard let sets = te.targetSets else { return "—" }
        switch (te.targetRepsMin, te.targetRepsMax) {
        case let (min?, max?) where min != max: return "\(sets) × \(min)–\(max)"
        case let (min?, _): return "\(sets) × \(min)"
        case let (nil, max?): return "\(sets) × \(max)"
        default: return "\(sets) sets"
        }
    }
}
