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

    /// Handoff to the flow coordinator when the workout is ended — it swaps the
    /// cover's content to the post-mortem. Defaulted so the DEBUG preview seam
    /// (which renders ActiveWorkoutView bare) still compiles.
    var onFinished: (Int64) -> Void = { _ in }

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
                    appState.refreshActiveSession()   // the bar reads this on minimize
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
            if (workout?.totalSets ?? 0) == 0 {
                // Nothing logged → nothing worth saving. Discard, no post-mortem.
                Button("Discard workout", role: .destructive) {
                    if let workout { discard(workout) }
                }
            } else {
                Button("End • \(workout?.totalSets ?? 0) sets") {
                    if let workout { finish(workout) }
                }
            }
            Button("Keep going", role: .cancel) {}
        } message: {
            if (workout?.totalSets ?? 0) == 0 {
                Text("No sets logged — this workout won't be saved.")
            }
        }
    }

    // ── Chrome (glass layer) ──

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        // End sits leading — it's the "way out", like back. + trailing, the
        // conventional side for add. Toolbar is the SOLE add-exercise entry.
        ToolbarItem(placement: .topBarLeading) {
            // Always enabled: ending with zero sets is a legitimate exit (false
            // alarm, testing) — it discards rather than saves.
            Button("End") { confirmEnd = true }
                .tint(Theme.amber)
                .disabled(finishing)
        }
        ToolbarItem(placement: .principal) { clockStack }
        ToolbarItem(placement: .topBarTrailing) {
            Button { showPicker = true } label: {
                Image(systemName: "plus")
            }
            .accessibilityLabel("Add exercise")
        }
        // Minimize — the workout stays active; the bar above the tab bar is
        // the way back in. Outermost trailing, mirroring now-playing sheets.
        ToolbarItem(placement: .topBarTrailing) {
            Button { dismiss() } label: {
                Image(systemName: "chevron.down")
            }
            .accessibilityLabel("Minimize workout")
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
                    Text(rest).metaLabel()
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
                        onLog: { weight, reps, rir in
                            withAnimation(.snappy) {
                                try? workout.logSet(exerciseIndex: index, weightKg: weight, reps: reps, rir: rir)
                            }
                            lastLogAt = .now
                        },
                        onDeleteSet: { setId in
                            try? workout.deleteSet(exerciseIndex: index, setId: setId)
                        })
                    .id(exercise.id)   // fresh entry state + prefill per exercise
                } else {
                    emptyState
                }
            }
            .padding(.horizontal, Theme.margin)
            .padding(.vertical, Theme.grid * 2)
        }
        .scrollDismissesKeyboard(.interactively)
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

    /// Zero-set exit: hard-delete the local session (it's local-only — negative
    /// id, never pushed) and dismiss the cover. No post-mortem: nothing to mourn.
    private func discard(_ workout: ActiveWorkout) {
        finishing = true
        do {
            try workout.discard()
            appState.refreshActiveSession()   // bar drops immediately
            dismiss()
        } catch {
            startError = error.localizedDescription
        }
        finishing = false
    }

    private func finish(_ workout: ActiveWorkout) {
        finishing = true
        do {
            try workout.finish()
            appState.refreshActiveSession()                    // bar drops immediately
            // Fire-and-forget: the post-mortem is local-only, so the push must
            // NOT gate the transition. Its result surfaces on Home/History via
            // appState.syncState, never on the summary.
            Task { await appState.pushCompletedSessions() }
            onFinished(workout.sessionId)                      // swap the cover to the summary
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
    let onLog: (_ weightKg: Double?, _ reps: Int, _ rir: Int?) -> Void
    let onDeleteSet: (_ setId: Int64) -> Void

    @State private var weightText = ""
    @State private var repsText = ""
    @State private var selectedRIR: Int?   // optional; resets to nil after every log (deliberate-tap-only)
    @State private var logCount = 0        // haptic trigger; also gates the PR flash to fresh logs
    @State private var lastWasPR = false
    @FocusState private var focused: Field?
    enum Field { case weight, reps }

    var body: some View {
        // Reference above, controls below: the last-session card is glance-only
        // so it lives at the top where reach doesn't matter, and splitting it
        // out pushes the input card down toward the thumb. LOG SET floats free
        // beneath — it's the verb, not part of the record.
        VStack(spacing: Theme.grid * 3) {
            lastSessionCard

            VStack(alignment: .leading, spacing: Theme.grid * 5) {
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
        // The thump IS the confirmation — eyes aren't always on screen
        // between sets. A PR gets the success pattern instead.
        .sensoryFeedback(trigger: logCount) { _, _ in
            lastWasPR ? .success : .impact(weight: .medium)
        }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("Done") { focused = nil }
            }
        }
    }

    /// Reference card: last session's sets in the dense register (`65×12 @0` —
    /// lifters' vernacular; the long `· RIR n` form wrapped this line into a
    /// two-line mangle on device) with best e1RM at the right. Always rendered:
    /// first exposure gets a placeholder at the same scaffolding, never a
    /// vanishing card.
    private var lastSessionCard: some View {
        let best = Calc.bestE1rm(exercise.previous.map { (weightKg: $0.weightKg, reps: $0.reps) })
        return VStack(alignment: .leading, spacing: Theme.grid) {
            HStack {
                Text("Last session\(exercise.previousLabel.map { " · \($0)" } ?? "")")
                    .metaLabel()
                Spacer()
                if !exercise.previous.isEmpty { Text("Best e1RM").metaLabel() }
            }
            HStack(alignment: .firstTextBaseline) {
                if exercise.previous.isEmpty {
                    Text("First exposure — no previous session")
                        .font(Theme.data)
                        .foregroundStyle(Color(.tertiaryLabel))
                } else {
                    Text(exercise.previous.map(contextSummary).joined(separator: "   "))
                        .font(Theme.data)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                Spacer()
                if let best {
                    Text(String(format: "%.1f", best))
                        .font(Theme.data)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(Theme.margin)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
    }

    /// Dense reference register: `65×12 @0`, `BW×12`. Records elsewhere keep
    /// the explicit `65 × 12 · RIR 0` form; reference compresses.
    private func contextSummary(_ set: SetRecord) -> String {
        let base = set.weightKg.map { "\(weightString($0))×\(set.reps)" } ?? "BW×\(set.reps)"
        guard let rir = set.rir else { return base }
        return base + (rir >= 3 ? " @3+" : " @\(rir)")
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
            rirRow
        }
    }

    /// Optional RIR (reps in reserve) — a Menu capsule, the same Menu+Picker
    /// idiom as the exercise switcher. The pill-row trial lost on device
    /// ("too many buttons" on an already-busy screen); the extra tap is the
    /// cheaper commodity on iOS 26 glass. Estimation is only reliable at 0–2,
    /// so `3+` is the honest "not near failure" ceiling (stored as literal 3).
    /// Always present (no appear/disappear jitter) and touches no math anywhere.
    /// Resets to nil after every log: RIR drifts with fatigue, so a carried
    /// rating would be silently wrong — every stored value must be a fresh tap.
    private var rirRow: some View {
        HStack {
            Text("RIR").metaLabel()
            Spacer()
            Menu {
                Picker("RIR", selection: animatedRIR) {
                    Text("—").tag(Int?.none)
                    ForEach(rirOptions, id: \.value) { opt in
                        Text(opt.label).tag(Optional(opt.value))
                    }
                }
            } label: {
                HStack(spacing: Theme.grid) {
                    Text(selectedRIR.map { $0 >= 3 ? "3+" : String($0) } ?? "—")
                        .font(.system(size: 17, weight: .semibold).monospacedDigit())
                        .foregroundStyle(selectedRIR == nil ? Color(.tertiaryLabel) : Theme.amber)
                        .contentTransition(.numericText())
                    Image(systemName: "chevron.down")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                .frame(minWidth: 88, minHeight: Theme.minTouch)
                .background(Color(.tertiarySystemFill))
                .clipShape(Capsule())
                .contentShape(Capsule())
            }
            .buttonStyle(.plain)
        }
    }

    private var animatedRIR: Binding<Int?> {
        Binding(get: { selectedRIR },
                set: { new in withAnimation(.snappy) { selectedRIR = new } })
    }

    private var rirOptions: [(label: String, value: Int)] {
        [("0", 0), ("1", 1), ("2", 2), ("3+", 3)]
    }

    private func stepperRow(label: String, text: Binding<String>, field: Field,
                            keyboard: UIKeyboardType, placeholder: String,
                            minus: @escaping () -> Void,
                            plus: @escaping () -> Void) -> some View {
        HStack(spacing: Theme.grid * 2) {
            stepButton("minus", action: minus)
            VStack(spacing: 0) {
                Text(label).metaLabel()
                // Text by default (so digits ROLL via numericText when the
                // steppers bump); becomes a TextField only once tapped.
                ZStack {
                    if focused == field {
                        TextField(placeholder, text: text)
                            .font(Theme.heroData)
                            .keyboardType(keyboard)
                            .multilineTextAlignment(.center)
                            .focused($focused, equals: field)
                    } else {
                        Text(text.wrappedValue.isEmpty ? placeholder : text.wrappedValue)
                            .font(Theme.heroData)
                            .foregroundStyle(text.wrappedValue.isEmpty ? Color(.tertiaryLabel) : .primary)
                            .contentTransition(.numericText())
                            .contentShape(Rectangle())
                            .onTapGesture { focused = field }
                    }
                }
                .frame(maxWidth: .infinity, minHeight: Theme.stepperTouch - 8)
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
        withAnimation(.snappy) { weightText = next == 0 ? "" : weightString(next) }
    }

    private func bumpReps(_ delta: Int) {
        focused = nil
        let next = max(0, (Int(repsText) ?? 0) + delta)
        withAnimation(.snappy) { repsText = next == 0 ? "" : String(next) }
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
                Text(slotLine)
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
                .contentTransition(.numericText())
        }
    }

    /// Slot goal: beat the same-numbered set from LAST session — the working
    /// goal for the ~80% of sets that aren't PR attempts (slot-wins compound
    /// into PRs wherever you usually peak). Expressed as reps at the CURRENT
    /// weight via e1RM inversion, so a weight change between sessions stays
    /// coherent (the Android color-bar lesson). Falls back to last session's
    /// final set when you're past its set count. Never disappears — geometry.
    private var slotLine: String {
        let n = exercise.sets.count + 1
        let slotLabel = "Set \(String(format: "%02d", n))"
        guard let slot = exercise.previous.first(where: { $0.setNumber == n })
                ?? exercise.previous.last else {
            return "\(slotLabel)  ·  no previous session"
        }
        let last = "last: \(setSummary(slot.weightKg, slot.reps))"
        // Bodyweight vs bodyweight: raw reps race.
        if slot.weightKg == nil, targetWeight == nil || targetWeight == 0 {
            return "\(slotLabel) ≥ \(slot.reps + 1)  ·  \(last)"
        }
        guard let slotE = Calc.e1rm(weightKg: slot.weightKg, reps: slot.reps),
              let w = targetWeight, w > 0,
              let r = Calc.repsToBeat(target: slotE, weightKg: w) else {
            return "\(slotLabel)  ·  \(last)"
        }
        return "\(slotLabel) ≥ \(r)  ·  \(last)"
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
                    (Text(setSummary(set.weightKg, set.reps))
                        + Text(rirSuffix(set.rir)).foregroundStyle(.secondary))
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
                .modifier(PRFlash(active: logCount > 0 && isPR(set) && set.id == exercise.sets.last?.id))
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
            // PR check BEFORE the model folds this set into the live best.
            let e = Calc.e1rm(weightKg: w, reps: r)
            lastWasPR = e.map { new in exercise.baselineBestE1rm.map { new > $0 } ?? false } ?? false
            logCount += 1
            onLog(w, r, selectedRIR)
            // Keep weight/reps for a fast next set; RIR does NOT carry over.
            withAnimation(.snappy) { selectedRIR = nil }
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

    private func setSummary(_ w: Double?, _ reps: Int) -> String {
        w.map { "\(weightString($0)) × \(reps)" } ?? "BW × \(reps)"
    }
    private func weightString(_ w: Double) -> String {
        w.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", w)
            : String(format: "%.2f", w).replacingOccurrences(of: "0$", with: "", options: .regularExpression)
    }
}

/// Trailing RIR suffix for a set summary — " · RIR n", or " · RIR 3+" for any
/// stored value ≥ 3 (historic Android data is 0–5; the collapse is display-only,
/// no arithmetic is ever done on RIR). Empty when nil. Appended to an existing
/// line — never a new line — so a rated set and an unrated one share row height.
/// Callers render it `.secondary` where the base is primary.
func rirSuffix(_ rir: Int?) -> String {
    guard let rir else { return "" }
    return rir >= 3 ? " · RIR 3+" : " · RIR \(rir)"
}

/// One green pulse behind a freshly-logged PR row, fading over ~1.5s.
/// `active` gates it to sets logged THIS screen visit — resumed history
/// must not flash on appear.
private struct PRFlash: ViewModifier {
    let active: Bool
    @State private var done = false

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(Theme.green.opacity(active && !done ? 0.22 : 0)))
            .onAppear {
                guard active else { return }
                withAnimation(.easeOut(duration: 1.5)) { done = true }
            }
    }
}
