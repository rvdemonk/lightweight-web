// Historical workout detail. Set rows mirror the active screen's logged-set
// rows (number · weight × reps @rir · badge · e1RM) so the two read as the
// same surface at different points in time.

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
                        Section {
                            Text(notes).font(Theme.body)
                        } header: {
                            Text("Notes").metaLabel()
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
        .navigationTitle(title.uppercased())
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
            VStack(alignment: .leading, spacing: Theme.grid) {
                Text(ServerDate.dayLabel(detail.session.startedAt))
                    .font(.system(size: 17, weight: .semibold).monospacedDigit())
                HStack(spacing: Theme.grid * 3) {
                    Label(ServerDate.timeLabel(detail.session.startedAt), systemImage: "clock")
                    if let dur = ServerDate.duration(
                        from: detail.session.startedAt, to: detail.session.endedAt) {
                        Label(dur, systemImage: "timer")
                    }
                }
                .font(Theme.data)
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
                SetRow(set: set, badge: badge(for: set))
            }
        } header: {
            Text(exercise.name.uppercased())
                .font(.system(size: 17, weight: .semibold).width(.condensed))
                .foregroundStyle(.primary)
        }
    }

    /// PR: strictly beats the pre-session all-time best (never against empty
    /// history — first exposure is calibration). Slot: strictly beats the
    /// same-numbered set from the previous session, e1RM-normalized; falls
    /// back to that session's final set past its count. PR outranks slot.
    private func badge(for set: SetRecord) -> SetBadge? {
        let e = Calc.e1rm(weightKg: set.weightKg, reps: set.reps)
        if let e, let baseline = exercise.baselineBestE1rm, e > baseline {
            return .pr
        }
        guard let slot = exercise.previousSets.first(where: { $0.setNumber == set.setNumber })
                ?? exercise.previousSets.last else { return nil }
        // Bodyweight vs bodyweight: raw reps race (no e1RM exists).
        if set.weightKg == nil, slot.weightKg == nil {
            return set.reps > slot.reps ? .slot : nil
        }
        guard let e, let slotE = Calc.e1rm(weightKg: slot.weightKg, reps: slot.reps)
        else { return nil }
        return e > slotE ? .slot : nil
    }
}

enum SetBadge {
    case pr    // all-time best beaten (green — PR only)
    case slot  // slot goal beaten (amber — the workday win)
}

struct SetRow: View {
    let set: SetRecord
    let badge: SetBadge?

    private var weightLabel: String {
        guard let w = set.weightKg else { return "BW" }
        return w.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", w)
            : String(format: "%.1f", w)
    }

    /// "80 × 8 @2" — RIR appends on the right so weight × reps holds the
    /// same position with or without it.
    private var summary: String {
        var s = "\(weightLabel) × \(set.reps)"
        if let rir = set.rir { s += " @\(rir)" }
        return s
    }

    var body: some View {
        HStack(spacing: Theme.grid * 2) {
            Text(String(format: "%02d", set.setNumber))
                .font(Theme.data)
                .foregroundStyle(.tertiary)
            Text(summary)
                .font(Theme.data)
            if set.setType != "working" {
                Text(set.setType.uppercased())
                    .font(Theme.label)
                    .tracking(0.6)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            switch badge {
            case .pr:
                Text("PR")
                    .font(Theme.label)
                    .foregroundStyle(Theme.green)
            case .slot:
                Image(systemName: "arrowtriangle.up.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Theme.amber)
            case nil:
                EmptyView()
            }
            Text(Calc.e1rm(weightKg: set.weightKg, reps: set.reps)
                .map { String(format: "%.1f", $0) } ?? "—")
                .font(Theme.data)
                .foregroundStyle(badge == .pr ? Theme.green : .secondary)
                .frame(minWidth: 54, alignment: .trailing)
        }
    }
}
