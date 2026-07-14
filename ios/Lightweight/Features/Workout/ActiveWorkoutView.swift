// The between-sets logging screen. Deliberately unstyled (Phase 4 does design);
// the priority is one-handed-fast entry: numeric keyboards, last-set prefill,
// e1RM (raw-reps policy) shown per logged set, previous performance + all-time
// best as context.

import SwiftUI

struct ActiveWorkoutView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var workout: ActiveWorkout?
    @State private var startError: String?
    @State private var showPicker = false
    @State private var finishing = false

    var body: some View {
        Group {
            if let workout {
                loggingList(workout)
            } else if let startError {
                ContentUnavailableView("Couldn't start workout",
                    systemImage: "exclamationmark.triangle", description: Text(startError))
            } else {
                ProgressView()
            }
        }
        .navigationTitle("WORKOUT")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if workout == nil {
                do { workout = try ActiveWorkout.startOrResume(db: appState.db) }
                catch { startError = error.localizedDescription }
            }
        }
        .sheet(isPresented: $showPicker) {
            ExercisePickerView { id, name in
                try? workout?.addExercise(exerciseId: id, name: name)
            }
        }
    }

    private func loggingList(_ workout: ActiveWorkout) -> some View {
        List {
            ForEach(Array(workout.exercises.enumerated()), id: \.element.id) { index, exercise in
                ExerciseLogCard(exercise: exercise) { weight, reps, rir in
                    try? workout.logSet(exerciseIndex: index, weightKg: weight, reps: reps, rir: rir)
                } onDeleteSet: { setId in
                    try? workout.deleteSet(exerciseIndex: index, setId: setId)
                } bestRepsAt: { w in
                    workout.bestRepsAt(weightKg: w, exerciseId: exercise.exerciseId)
                }
            }

            Section {
                Button {
                    showPicker = true
                } label: {
                    Label("Add Exercise", systemImage: "plus")
                        .frame(minHeight: 44)
                }
            }

            Section {
                Button {
                    Task { await finish(workout) }
                } label: {
                    if finishing {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        Text("Finish Workout \u{2022} \(workout.totalSets) sets")
                            .frame(maxWidth: .infinity)
                    }
                }
                .disabled(finishing || workout.totalSets == 0)
            }
        }
    }

    private func finish(_ workout: ActiveWorkout) async {
        finishing = true
        do {
            try workout.finish()
            await appState.pushCompletedSessions()   // visible result via appState.syncState
            dismiss()
        } catch {
            startError = error.localizedDescription
        }
        finishing = false
    }
}

/// One exercise's logged sets + the entry row. Holds its own input state,
/// prefilled from the last logged set (or previous performance) for fast reps.
private struct ExerciseLogCard: View {
    let exercise: ActiveWorkout.Exercise
    let onLog: (_ weightKg: Double?, _ reps: Int, _ rir: Int?) -> Void
    let onDeleteSet: (_ setId: Int64) -> Void
    let bestRepsAt: (_ weightKg: Double) -> Int?

    @State private var weight = ""
    @State private var reps = ""
    @State private var rir = ""

    var body: some View {
        Section {
            if !exercise.previous.isEmpty {
                previousRow
            }
            ForEach(exercise.sets) { set in
                loggedSetRow(set)
            }
            entryRow
            if let line = targetsLine {
                Text(line)
                    .font(.body.monospaced())
                    .foregroundStyle(.secondary)
            }
        } header: {
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(exercise.name).font(.headline)
                    Spacer()
                    if let best = exercise.allTimeBestE1rm {
                        Text("BEST e1RM \(fmt(best))")
                            .font(.body.monospaced())
                            .foregroundStyle(.secondary)
                    }
                }
                if let line = prTargetHeaderLine {
                    Text(line)
                        .font(.body.monospaced())
                        .foregroundStyle(.orange)
                }
            }
        }
        .onAppear(perform: prefill)
    }

    // ── PR / SPR targets ──

    /// Weight the targets are computed against: the live entry field, falling
    /// back to the prefill sources (last logged set, then previous session).
    private var targetWeight: Double? {
        Double(weight.replacingOccurrences(of: ",", with: "."))
            ?? exercise.sets.last?.weightKg
            ?? exercise.previous.last?.weightKg
    }

    /// Header: concrete combos that strictly beat the all-time e1RM, at the
    /// current weight and one plate-step up. Hidden with no weighted history —
    /// first exposure is calibration, not a fake target.
    private var prTargetHeaderLine: String? {
        guard let best = exercise.allTimeBestE1rm, let w = targetWeight else { return nil }
        var combos: [String] = []
        if let r = Calc.repsToBeat(target: best, weightKg: w) {
            combos.append("\(weightString(w)) × \(r)")
        }
        if let r = Calc.repsToBeat(target: best, weightKg: w + 2.5) {
            combos.append("\(weightString(w + 2.5)) × \(r)")
        }
        guard !combos.isEmpty else { return nil }
        return "PR TARGET  " + combos.joined(separator: "  ·  ")
    }

    /// Entry row: live targets at the weight being typed. SPR = rep record at
    /// exactly this weight (includes this session — PRs are live); PR = reps
    /// needed here to beat the all-time e1RM.
    private var targetsLine: String? {
        guard let w = targetWeight else { return nil }
        var parts: [String] = []
        if let bestReps = bestRepsAt(w) {
            parts.append("SPR ≥ \(bestReps + 1) (best @\(weightString(w)): \(bestReps))")
        }
        if let best = exercise.allTimeBestE1rm,
           let r = Calc.repsToBeat(target: best, weightKg: w) {
            parts.append("PR ≥ \(r)")
        }
        guard !parts.isEmpty else { return nil }
        return parts.joined(separator: "  ·  ")
    }

    private var previousRow: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("PREVIOUS\(exercise.previousLabel.map { " \u{2022} \($0)" } ?? "")")
                .font(.body.monospaced())
                .foregroundStyle(.secondary)
            Text(exercise.previous.map { setSummary($0.weightKg, $0.reps) }.joined(separator: "   "))
                .font(.body.monospaced())
                .foregroundStyle(.secondary)
        }
    }

    private func loggedSetRow(_ set: ActiveWorkout.LoggedSet) -> some View {
        HStack {
            Text(String(format: "%02d", set.setNumber)).foregroundStyle(.secondary)
            Spacer()
            Text(setSummary(set.weightKg, set.reps))
            if let r = set.rir {
                Text("@\(r)").font(.body.monospaced()).foregroundStyle(.secondary)
            }
            if let e = set.e1rm {
                Text(fmt(e))
                    .frame(minWidth: 54, alignment: .trailing)
                    .foregroundStyle(.orange)
            } else {
                Text("—").frame(minWidth: 54, alignment: .trailing).foregroundStyle(.secondary)
            }
        }
        .font(.body.monospaced())
        .swipeActions {
            Button("Delete", role: .destructive) { onDeleteSet(set.id) }
        }
    }

    private var entryRow: some View {
        HStack(spacing: 8) {
            TextField("kg", text: $weight)
                .keyboardType(.decimalPad)
                .frame(width: 64)
            Text("×").foregroundStyle(.secondary)
            TextField("reps", text: $reps)
                .keyboardType(.numberPad)
                .frame(width: 52)
            TextField("RIR", text: $rir)
                .keyboardType(.numberPad)
                .frame(width: 48)
                .foregroundStyle(.secondary)
            Spacer()
            Button {
                log()
            } label: {
                Image(systemName: "plus.circle.fill").font(.title2)
            }
            .buttonStyle(.borderless)
            .disabled(Int(reps) == nil || Int(reps)! <= 0)
        }
        .font(.body.monospaced())
        .frame(minHeight: 44)
    }

    private func prefill() {
        guard weight.isEmpty, reps.isEmpty else { return }
        if let last = exercise.sets.last {
            weight = last.weightKg.map(weightString) ?? ""
            reps = String(last.reps)
        } else if let prev = exercise.previous.last {
            weight = prev.weightKg.map(weightString) ?? ""
            reps = String(prev.reps)
        }
    }

    private func log() {
        guard let r = Int(reps), r > 0 else { return }
        let w = Double(weight.replacingOccurrences(of: ",", with: "."))
        let rirVal = Int(rir)
        onLog(w, r, rirVal)
        // Keep weight/reps for a fast next set; caller re-renders with the new set.
    }

    // ── formatting ──
    private func setSummary(_ w: Double?, _ reps: Int) -> String {
        guard let w else { return "BW × \(reps)" }
        return "\(weightString(w)) × \(reps)"
    }
    private func weightString(_ w: Double) -> String {
        w.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", w) : String(format: "%.1f", w)
    }
    private func fmt(_ e: Double) -> String { String(format: "%.1f", e) }
}
