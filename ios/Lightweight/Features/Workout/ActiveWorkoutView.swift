// The between-sets logging screen — the app's soul, and the design-system
// reference screen (Phase 4, neoindustrial liquid glassmorphism).
//
// Layer rules (see Theme.swift): the nav bar / toolbar are glass (automatic);
// everything in the scroll body is CONTENT — standard materials, never
// .glassEffect() in scroll rows (N backdrop layers kill frame rate).
//
// Interaction model: accordion. One exercise expanded = the one being worked;
// collapsed exercises are dense single rows; expanding a second one is how a
// superset looks. Steppers (±1.25 kg / ±1 rep) plus tap-to-type on the numbers.

import SwiftUI

struct ActiveWorkoutView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var workout: ActiveWorkout?
    @State private var startError: String?
    @State private var showPicker = false
    @State private var finishing = false
    @State private var selectedId: Int64?        // the exercise on screen — switched via the pill
    @State private var lastLogAt: Date?          // drives the rest timer
    @State private var showRestTimer = true      // Lewis: reference only — tap clock stack to toggle
    @State private var confirmEnd = false

    var body: some View {
        Group {
            if let workout {
                content(workout)
            } else if let startError {
                ContentUnavailableView("Couldn't start workout",
                    systemImage: "exclamationmark.triangle", description: Text(startError))
            } else {
                ProgressView()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbarContent }
        .task {
            if workout == nil {
                do {
                    let w = try ActiveWorkout.startOrResume(db: appState.db)
                    workout = w
                    // Default focus: the exercise being worked — the last one
                    // with logged sets, else the first untouched one.
                    selectedId = (w.exercises.last(where: { !$0.sets.isEmpty }) ?? w.exercises.first)?.id
                } catch { startError = error.localizedDescription }
            }
        }
        .sheet(isPresented: $showPicker) {
            ExercisePickerView { id, name in
                try? workout?.addExercise(exerciseId: id, name: name)
                // A freshly added exercise is the one you're about to work.
                if let newId = workout?.exercises.last?.id {
                    withAnimation(.snappy) { selectedId = newId }
                }
            }
        }
        .confirmationDialog("End workout?", isPresented: $confirmEnd, titleVisibility: .visible) {
            Button("End • \(workout?.totalSets ?? 0) sets") {
                if let workout { Task { await finish(workout) } }
            }
            Button("Keep going", role: .cancel) {}
        }
    }

    // ── Chrome (glass layer) ──

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        // End sits leading — it's the "way out", like back. + trailing, the
        // conventional side for add. Toolbar is the SOLE add-exercise entry.
        ToolbarItem(placement: .topBarLeading) {
            Button("End") { confirmEnd = true }
                .tint(Theme.amber)
                .disabled(finishing || (workout?.totalSets ?? 0) == 0)
        }
        ToolbarItem(placement: .principal) { clockStack }
        ToolbarItem(placement: .topBarTrailing) {
            Button { showPicker = true } label: {
                Image(systemName: "plus")
            }
            .accessibilityLabel("Add exercise")
        }
    }

    /// Workout clock with the rest timer beneath — reference only, not a
    /// prescription (train by feel; the number is context). Tap to toggle rest.
    private var clockStack: some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            VStack(spacing: 0) {
                Text(elapsedString(at: timeline.date))
                    .font(Theme.data)
                if showRestTimer, let rest = restString(at: timeline.date) {
                    Text("REST \(rest)")
                        .metaLabel()
                }
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { withAnimation(.snappy) { showRestTimer.toggle() } }
    }

    private func elapsedString(at now: Date) -> String {
        guard let start = workout.flatMap({ ServerDate.parse($0.startedAt) }) else { return "0:00" }
        let s = max(0, Int(now.timeIntervalSince(start)))
        return s >= 3600
            ? String(format: "%d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
            : String(format: "%d:%02d", s / 60, s % 60)
    }

    private func restString(at now: Date) -> String? {
        guard let last = lastLogAt else { return nil }
        let s = max(0, Int(now.timeIntervalSince(last)))
        return String(format: "%d:%02d", s / 60, s % 60)
    }

    // ── Content layer ──

    /// One exercise owns the page (progressive disclosure — the others exist
    /// only inside the switcher pill). The pill is the room's door plate;
    /// everything below it belongs to that exercise alone.
    private func content(_ workout: ActiveWorkout) -> some View {
        ScrollView {
            VStack(spacing: Theme.grid * 3) {
                exercisePill(workout)
                if let index = workout.exercises.firstIndex(where: { $0.id == selectedId }) {
                    let exercise = workout.exercises[index]
                    ExercisePanel(
                        exercise: exercise,
                        onLog: { weight, reps in
                            try? workout.logSet(exerciseIndex: index, weightKg: weight, reps: reps, rir: nil)
                            lastLogAt = .now
                        },
                        onDeleteSet: { setId in
                            try? workout.deleteSet(exerciseIndex: index, setId: setId)
                        },
                        bestRepsAt: { w in
                            workout.bestRepsAt(weightKg: w, exerciseId: exercise.exerciseId)
                        })
                    .id(exercise.id)   // fresh entry state + prefill per exercise
                } else {
                    emptyState
                }
            }
            .padding(.horizontal, Theme.margin)
            .padding(.vertical, Theme.grid * 2)
        }
        .background(Color(.systemBackground))
    }

    /// Dropdown pill: switch between the workout's exercises. The pill title
    /// keeps the condensed-caps register; the menu drops to title case with a
    /// set-count subtitle (caps + counts on one menu line wrapped and
    /// truncated). Picker gives the checkmark natively. Adding exercises
    /// lives in the toolbar +, not here.
    private func exercisePill(_ workout: ActiveWorkout) -> some View {
        Menu {
            Picker("Exercise", selection: animatedSelection) {
                ForEach(workout.exercises) { exercise in
                    VStack {
                        Text(exercise.name.localizedCapitalized)
                        if !exercise.sets.isEmpty {
                            Text("\(exercise.sets.count) sets")
                        }
                    }
                    .tag(Optional(exercise.id))
                }
            }
        } label: {
            HStack(spacing: Theme.grid * 2) {
                Text(workout.exercises.first(where: { $0.id == selectedId })?.name.uppercased()
                     ?? "ADD EXERCISE")
                    .font(Theme.exerciseTitle)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Image(systemName: "chevron.down")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, minHeight: Theme.minTouch + 8)
            .background(Color(.secondarySystemBackground))
            .clipShape(Capsule())
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .tint(.primary)
    }

    private var animatedSelection: Binding<Int64?> {
        Binding(get: { selectedId },
                set: { new in withAnimation(.snappy) { selectedId = new } })
    }

    private var emptyState: some View {
        VStack(spacing: Theme.grid * 3) {
            Text("EMPTY SESSION").metaLabel()
            Text("Add an exercise with +")
                .font(Theme.body)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 80)
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

// ── Expanded exercise panel ──

/// The working exercise: last session context, weight/reps steppers,
/// bidirectional PR goals, logged sets, LOG SET. Holds its own entry state,
/// prefilled from the last logged set (or previous session).
private struct ExercisePanel: View {
    let exercise: ActiveWorkout.Exercise
    let onLog: (_ weightKg: Double?, _ reps: Int) -> Void
    let onDeleteSet: (_ setId: Int64) -> Void
    let bestRepsAt: (_ weightKg: Double) -> Int?

    @State private var weightText = ""
    @State private var repsText = ""
    @FocusState private var focused: Field?
    enum Field { case weight, reps }

    var body: some View {
        // The card holds the exercise's state; LOG SET floats free beneath it —
        // it's the verb, not part of the record.
        VStack(spacing: Theme.grid * 3) {
            VStack(alignment: .leading, spacing: Theme.grid * 5) {
                if !exercise.previous.isEmpty { lastSession }
                steppers
                goals
                if !exercise.sets.isEmpty { loggedSets }
            }
            .padding(Theme.margin)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))

            logButton
        }
        .onAppear(perform: prefill)
    }

    private var lastSession: some View {
        VStack(alignment: .leading, spacing: Theme.grid) {
            Text("Last session\(exercise.previousLabel.map { " · \($0)" } ?? "")")
                .metaLabel()
            Text(exercise.previous.map { setSummary($0.weightKg, $0.reps, rir: $0.rir) }
                .joined(separator: "   "))
                .font(Theme.data)
                .foregroundStyle(.secondary)
        }
    }

    // ── Steppers ──

    /// Stacked full-width rows: −/＋ at the edges (thumb-reachable one-handed),
    /// the number huge in the middle, tap it to type. Side-by-side was tried
    /// and truncated 4-char weights at hero size.
    private var steppers: some View {
        VStack(spacing: Theme.grid * 3) {
            stepperRow(label: "Weight kg", text: $weightText, field: .weight,
                       keyboard: .decimalPad, placeholder: "BW",
                       minus: { bumpWeight(-Theme.weightIncrement) },
                       plus: { bumpWeight(Theme.weightIncrement) })
            stepperRow(label: "Reps", text: $repsText, field: .reps,
                       keyboard: .numberPad, placeholder: "0",
                       minus: { bumpReps(-1) },
                       plus: { bumpReps(1) })
        }
    }

    private func stepperRow(label: String, text: Binding<String>, field: Field,
                            keyboard: UIKeyboardType, placeholder: String,
                            minus: @escaping () -> Void,
                            plus: @escaping () -> Void) -> some View {
        HStack(spacing: Theme.grid * 2) {
            stepButton("minus", action: minus)
            VStack(spacing: 0) {
                Text(label).metaLabel()
                TextField(placeholder, text: text)
                    .font(Theme.heroData)
                    .keyboardType(keyboard)
                    .multilineTextAlignment(.center)
                    .focused($focused, equals: field)
                    .frame(minHeight: Theme.stepperTouch - 8)
            }
            .frame(maxWidth: .infinity)
            stepButton("plus", action: plus)
        }
    }

    private func stepButton(_ symbol: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 20, weight: .semibold))
                .frame(width: Theme.stepperTouch, height: Theme.stepperTouch)
                .background(Color(.tertiarySystemFill))
                .clipShape(Circle())
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
    }

    private func bumpWeight(_ delta: Double) {
        focused = nil
        let current = parsedWeight ?? exercise.sets.last?.weightKg ?? exercise.previous.last?.weightKg ?? 0
        let next = max(0, current + delta)
        weightText = next == 0 ? "" : weightString(next)
    }

    private func bumpReps(_ delta: Int) {
        focused = nil
        let next = max(0, (Int(repsText) ?? 0) + delta)
        repsText = next == 0 ? "" : String(next)
    }

    // ── Bidirectional goals ──

    private var parsedWeight: Double? {
        Double(weightText.replacingOccurrences(of: ",", with: "."))
    }
    private var targetWeight: Double? {
        parsedWeight ?? exercise.sets.last?.weightKg ?? exercise.previous.last?.weightKg
    }
    private var parsedReps: Int? { Int(repsText) }

    /// Weight → reps and reps → weight — two separate statements of the same
    /// PR, so they get separate tiles with a hairline rule between. Strictly
    /// beats the live best. Hidden with no history — first exposure is
    /// calibration, not a fake target. Every sub-line renders a placeholder
    /// rather than vanishing: the card must never resize as weight changes.
    private var goals: some View {
        Group {
            if let best = exercise.allTimeBestE1rm {
                HStack(alignment: .top, spacing: 0) {
                    goalTile(label: weightGoalLabel, value: weightGoalValue)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Rectangle()
                        .fill(Color(.separator))
                        .frame(width: 1, height: 44)
                        .padding(.horizontal, Theme.grid * 3)
                    goalTile(label: repsGoalLabel(best), value: repsGoalValue(best))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                Text(sprLine)
                    .font(Theme.data)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var weightGoalLabel: String {
        (targetWeight?.isFinite == true && targetWeight! > 0)
            ? "PR at \(weightString(targetWeight!)) kg" : "PR at — kg"
    }
    private var weightGoalValue: String {
        guard let best = exercise.allTimeBestE1rm, let w = targetWeight, w > 0,
              let r = Calc.repsToBeat(target: best, weightKg: w) else { return "—" }
        return "\(r) reps"
    }
    private func repsGoalLabel(_ best: Double) -> String {
        parsedReps.map { "PR for \($0) reps" } ?? "PR for — reps"
    }
    private func repsGoalValue(_ best: Double) -> String {
        guard let r = parsedReps, r > 0,
              let w = Calc.weightToBeat(target: best, reps: r) else { return "—" }
        return "\(weightString(w)) kg"
    }

    private func goalTile(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: Theme.grid) {
            Text(label).metaLabel()
            Text(value)
                .font(Theme.titleData)
                .foregroundStyle(value == "—" ? Color(.tertiaryLabel) : Theme.amber)
        }
    }

    /// SPR: rep record at exactly this weight (live — includes this session).
    /// Placeholder when there's no record at this weight — never disappears.
    private var sprLine: String {
        guard let w = targetWeight, w > 0, let bestReps = bestRepsAt(w) else {
            return "SPR —  ·  no sets at this weight"
        }
        return "SPR ≥ \(bestReps + 1)  ·  best @\(weightString(w)): \(bestReps)"
    }

    // ── Logged sets ──

    private var loggedSets: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Logged sets").metaLabel()
                Spacer()
                Text("e1RM").metaLabel()
            }
            .padding(.bottom, Theme.grid)
            ForEach(exercise.sets) { set in
                HStack(spacing: Theme.grid * 2) {
                    Text(String(format: "%02d", set.setNumber))
                        .font(Theme.data)
                        .foregroundStyle(.tertiary)
                    Text(setSummary(set.weightKg, set.reps, rir: set.rir))
                        .font(Theme.data)
                    Spacer()
                    if isPR(set) {
                        Text("PR")
                            .font(Theme.label)
                            .foregroundStyle(Theme.green)
                    }
                    Text(set.e1rm.map { String(format: "%.1f", $0) } ?? "—")
                        .font(Theme.data)
                        .foregroundStyle(isPR(set) ? Theme.green : .secondary)
                        .frame(minWidth: 54, alignment: .trailing)
                }
                .frame(minHeight: Theme.minTouch)
                .contentShape(Rectangle())
                .contextMenu {
                    Button("Delete set", systemImage: "trash", role: .destructive) {
                        onDeleteSet(set.id)
                    }
                }
            }
        }
    }

    /// A set is a PR when its e1RM strictly beats the pre-session best.
    /// Several sets can hold it at once ("held 4 sets") — all get the badge.
    private func isPR(_ set: ActiveWorkout.LoggedSet) -> Bool {
        guard let e = set.e1rm else { return false }
        guard let baseline = exercise.baselineBestE1rm else { return false }
        return e > baseline
    }

    // ── Log ──

    private var logButton: some View {
        Button {
            guard let r = parsedReps, r > 0 else { return }
            focused = nil
            let w = parsedWeight.flatMap { $0 > 0 ? $0 : nil }
            onLog(w, r)
            // Keep weight/reps for a fast next set.
        } label: {
            Text("LOG SET")
                .font(.system(size: 17, weight: .semibold).width(.condensed))
                .tracking(1.0)
                .frame(maxWidth: .infinity, minHeight: 48)
        }
        .buttonStyle(.borderedProminent)
        .buttonBorderShape(.capsule)
        .tint(Theme.amber)
        .foregroundStyle(.black)
        .disabled((parsedReps ?? 0) <= 0)
    }

    private func prefill() {
        guard weightText.isEmpty, repsText.isEmpty else { return }
        let source = exercise.sets.last.map { ($0.weightKg, $0.reps) }
            ?? exercise.previous.last.map { ($0.weightKg, $0.reps) }
        if let (w, r) = source {
            weightText = w.map(weightString) ?? ""
            repsText = String(r)
        }
    }

    // ── formatting ──

    private func setSummary(_ w: Double?, _ reps: Int, rir: Int?) -> String {
        let base = w.map { "\(weightString($0)) × \(reps)" } ?? "BW × \(reps)"
        return rir.map { "\(base) @\($0)" } ?? base
    }
    private func weightString(_ w: Double) -> String {
        w.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", w)
            : String(format: "%.2f", w).replacingOccurrences(of: "0$", with: "", options: .regularExpression)
    }
}
