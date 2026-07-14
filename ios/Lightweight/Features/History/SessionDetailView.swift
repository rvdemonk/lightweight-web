// Historical workout detail. Deliberately laid out like an active workout
// (exercise blocks, set rows) so this screen doubles as the layout
// prototype for the Phase-3 logging screen.

import SwiftUI

struct SessionDetailView: View {
    @Environment(AppState.self) private var appState
    let sessionId: Int64

    @State private var detail: AppDatabase.SessionDetail?
    @State private var loadError: String?

    var body: some View {
        Group {
            if let detail {
                List {
                    headerSection(detail)
                    ForEach(detail.exercises) { exercise in
                        ExerciseSection(exercise: exercise)
                    }
                    if let notes = detail.session.notes, !notes.isEmpty {
                        Section("NOTES") {
                            Text(notes).font(.footnote)
                        }
                    }
                }
            } else if let loadError {
                ContentUnavailableView(
                    "Failed to load", systemImage: "exclamationmark.triangle",
                    description: Text(loadError))
            } else {
                ProgressView()
            }
        }
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            do {
                detail = try appState.db.sessionDetail(id: sessionId)
            } catch {
                loadError = error.localizedDescription
            }
        }
    }

    private var title: String {
        detail?.templateName ?? detail?.session.name ?? "Workout"
    }

    private func headerSection(_ detail: AppDatabase.SessionDetail) -> some View {
        Section {
            VStack(alignment: .leading, spacing: 6) {
                Text(ServerDate.dayLabel(detail.session.startedAt))
                    .font(.subheadline.monospaced())
                HStack(spacing: 12) {
                    Label(ServerDate.timeLabel(detail.session.startedAt), systemImage: "clock")
                    if let dur = ServerDate.duration(
                        from: detail.session.startedAt, to: detail.session.endedAt) {
                        Label(dur, systemImage: "timer")
                    }
                }
                .font(.caption.monospaced())
                .foregroundStyle(.secondary)
            }
        }
    }
}

struct ExerciseSection: View {
    let exercise: AppDatabase.SessionDetail.ExerciseDetail

    var body: some View {
        Section {
            ForEach(exercise.sets, id: \.id) { set in
                SetRow(set: set)
            }
        } header: {
            Text(exercise.name)
        }
    }
}

struct SetRow: View {
    let set: SetRecord

    private var weightLabel: String {
        guard let w = set.weightKg else { return "BW" }
        return w.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", w)
            : String(format: "%.1f", w)
    }

    var body: some View {
        HStack {
            Text(String(format: "%02d", set.setNumber))
                .foregroundStyle(.secondary)
            if set.setType != "working" {
                Text(set.setType.uppercased())
                    .font(.caption2.monospaced())
                    .foregroundStyle(.orange)
            }
            Spacer()
            Text("\(weightLabel) kg")
            Text("×")
                .foregroundStyle(.secondary)
            Text("\(set.reps)")
                .frame(minWidth: 28, alignment: .trailing)
            if let rir = set.rir {
                Text("@\(rir)")
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
            }
        }
        .font(.body.monospaced())
    }
}
