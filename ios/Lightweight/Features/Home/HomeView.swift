// Start-workout surface. Freeform start today (template start is out of scope
// for the today-slice). If a local active session is already persisted, offer
// to resume it. Deliberately unstyled.

import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) private var appState

    @State private var goToWorkout = false
    @State private var resumable: SessionRecord?

    var body: some View {
        NavigationStack {
            List {
                if let resumable {
                    Section {
                        Button {
                            goToWorkout = true
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Label("Resume Workout", systemImage: "arrow.uturn.forward")
                                    .font(.headline)
                                Text("Started \(ServerDate.timeLabel(resumable.startedAt))")
                                    .font(.caption.monospaced())
                                    .foregroundStyle(.secondary)
                            }
                            .frame(minHeight: 44)
                        }
                    }
                }

                Section {
                    Button {
                        goToWorkout = true
                    } label: {
                        Label("Start Freeform Workout", systemImage: "bolt.fill")
                            .font(.headline)
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                }

                syncStatusRow
            }
            .navigationTitle("LIGHTWEIGHT")
            .navigationDestination(isPresented: $goToWorkout) {
                ActiveWorkoutView()
            }
            .task { reloadResumable() }
            .onChange(of: goToWorkout) { _, isPresented in
                if !isPresented { reloadResumable() }   // returning from the workout
            }
        }
    }

    private func reloadResumable() {
        resumable = try? appState.db.activeLocalSession()
    }

    @ViewBuilder
    private var syncStatusRow: some View {
        switch appState.syncState {
        case .idle:
            EmptyView()
        case .syncing(let label):
            Label(label, systemImage: "arrow.triangle.2.circlepath")
                .font(.footnote.monospaced()).foregroundStyle(.secondary)
        case .synced(let summary):
            Label(summary, systemImage: "checkmark.circle")
                .font(.footnote.monospaced()).foregroundStyle(.green)
        case .failed(let message):
            // Never render failure as success (banked sync lesson).
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .font(.footnote).foregroundStyle(.red)
        }
    }
}
