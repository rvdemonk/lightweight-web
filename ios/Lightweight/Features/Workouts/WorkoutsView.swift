// Templates: list → detail → start, plus create (toolbar +) and edit (from
// detail). Locally-created/edited templates are written synced=0 and pushed
// via the convergence flow (templates first, adopt id/version, then sessions);
// the write-safe import preserves them across pulls. See TemplateEditorView and
// AppState.pushLocalChanges.

import SwiftUI

struct WorkoutsView: View {
    @Environment(AppState.self) private var appState
    @State private var items: [AppDatabase.TemplateListItem] = []
    @State private var showCreate = false

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
                            Text("Pull from the server, or tap + to build one.")
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
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showCreate = true } label: { Image(systemName: "plus") }
                        .accessibilityLabel("New template")
                }
            }
            .sheet(isPresented: $showCreate) {
                TemplateEditorView(mode: .create, onSaved: reload)
            }
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

/// Pre-workout briefing. Read hours before training (a coffee-break psych-up):
/// per template exercise, the record to beat, a bidirectional target to aim at,
/// and last session's sets — so the day's goals arrive pre-formed, per lift.
struct TemplateDetailView: View {
    let item: AppDatabase.TemplateListItem
    @Environment(AppState.self) private var appState
    @State private var briefings: [AppDatabase.ExerciseBriefing] = []
    @State private var goToWorkout = false
    @State private var startError: String?
    @State private var showEdit = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.grid * 3) {
                Text("Briefing").metaLabel()

                ForEach(briefings) { briefing in
                    BriefingCard(briefing: briefing)
                }

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
                .padding(.top, Theme.grid * 2)

                if let startError {
                    Text(startError)
                        .font(Theme.body)
                        .foregroundStyle(Theme.red)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, Theme.margin)
            .padding(.vertical, Theme.grid * 2)
        }
        .background(Color(.systemBackground))
        .navigationTitle(item.template.name.uppercased())
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $goToWorkout) { ActiveWorkoutView() }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Edit") { showEdit = true }
            }
        }
        .sheet(isPresented: $showEdit) {
            TemplateEditorView(
                mode: .edit(templateId: item.template.id, name: item.template.name),
                onSaved: reload)
        }
        .task { reload() }
    }

    private func reload() {
        briefings = (try? appState.db.templateBriefings(templateId: item.template.id)) ?? []
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
}

// ── Briefing card ──

/// One exercise's pre-workout briefing:
///
///     INCLINE BARBELL BENCH PRESS
///     INCUMBENT   e1RM 91.0 · 65×12 · Thu 3 Jul
///     TO BEAT     ≥13 at 65 kg  ·  or 66.25 × 12
///     LAST        65×12 @0   65×10 @0   60×8 @1
///
/// Amber only on the targets (the thing to reach for); everything else is
/// reference, secondary. First exposure gets a calibration placeholder — no
/// fake record, no fake target against empty history.
private struct BriefingCard: View {
    let briefing: AppDatabase.ExerciseBriefing

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.grid * 3) {
            Text(briefing.name.uppercased())
                .font(Theme.exerciseTitle)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            if let incumbent = briefing.incumbent {
                VStack(alignment: .leading, spacing: Theme.grid * 2) {
                    row("Incumbent", incumbentValue(incumbent), color: .secondary)
                    if let toBeat = toBeatValue(incumbent) {
                        row("To beat", toBeat, color: Theme.amber)
                    }
                    if !briefing.lastSets.isEmpty {
                        row("Last", lastValue, color: .secondary)
                    }
                }
            } else {
                Text("First exposure — calibration")
                    .font(Theme.data)
                    .foregroundStyle(Color(.tertiaryLabel))
            }
        }
        .padding(Theme.margin)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
    }

    private func row(_ tag: String, _ value: String, color: Color) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Theme.grid * 2) {
            Text(tag).metaLabel()
                .lineLimit(1)
                .fixedSize()
                .frame(width: 96, alignment: .leading)
            Text(value)
                .font(Theme.data)
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            Spacer(minLength: 0)
        }
    }

    // ── Value strings ──

    private func incumbentValue(_ inc: AppDatabase.IncumbentSet) -> String {
        let when = ServerDate.shortDayLabel(inc.startedAt)
        if let e = inc.e1rm, let w = inc.weightKg {
            return "e1RM \(String(format: "%.1f", e)) · \(weightString(w))×\(inc.reps) · \(when)"
        }
        // Bodyweight rep record.
        return "\(inc.reps) reps · bodyweight · \(when)"
    }

    /// Bidirectional target, anchored at the INCUMBENT's own coordinates — the
    /// record is attacked where it lives: one more rep at the record's weight,
    /// or the reps that beat it at the next increment up. Anchoring at last
    /// session's top set was tried and ballooned after a light day (a 106.7
    /// e1RM read "≥24 at 60 kg" — honest math, useless psychology; the active
    /// screen recalculates live at whatever weight is actually loaded anyway).
    /// Bodyweight-only lifts get a single honest rep target.
    private func toBeatValue(_ inc: AppDatabase.IncumbentSet) -> String? {
        guard let target = inc.e1rm else {
            // Bodyweight incumbent → one more rep than the record.
            return "≥\(inc.reps + 1) reps · bodyweight"
        }
        var parts: [String] = []
        if let w = inc.weightKg, w > 0,
           let reps = Calc.repsToBeat(target: target, weightKg: w) {
            parts.append("\(weightString(w)) × \(reps)")
            let up = w + Theme.weightIncrement * 2   // next plate-realistic jump
            if let repsUp = Calc.repsToBeat(target: target, weightKg: up) {
                parts.append("\(weightString(up)) × \(repsUp)")
            }
        }
        return parts.isEmpty ? nil : parts.joined(separator: "  ·  or ")
    }

    private var lastValue: String {
        briefing.lastSets.map(denseSetRegister).joined(separator: "   ")
    }
}
