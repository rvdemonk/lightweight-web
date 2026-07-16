// Template create / edit. One editor, two modes:
//   • create — from the Workouts toolbar +; name is entered once here.
//   • edit   — from the briefing (template detail) toolbar; name is shown but
//              IMMUTABLE. The server dedups templates by name, so a renamed push
//              would create a SECOND template server-side — the ratified contract
//              treats renames as new templates. v1 makes name set-once; editing
//              changes the exercise list / targets / notes only.
//
// Saving writes a synced=0 row locally (survives every pull) and fires a push so
// the server (id, version) is adopted — but a failed push is non-fatal: the local
// row persists and reconciles on the next sync. Targets use steppers / a Menu
// capsule (rest), never chip/pill rows (banked anti-pattern).

import SwiftUI

struct TemplateEditorView: View {
    enum Mode: Equatable {
        case create
        case edit(templateId: Int64, name: String)
    }

    let mode: Mode
    /// Called after a successful local write so the presenter can reload.
    var onSaved: () -> Void = {}

    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var notes = ""
    @State private var drafts: [AppDatabase.TemplateExerciseDraft] = []
    @State private var showPicker = false
    @State private var editingDraftID: AppDatabase.TemplateExerciseDraft.ID?
    @State private var error: String?
    @State private var loaded = false

    private var isEdit: Bool { if case .edit = mode { return true }; return false }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var canSave: Bool {
        !trimmedName.isEmpty && !drafts.isEmpty
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if isEdit {
                        // Immutable — see file header (rename = new server template).
                        Text(name)
                            .font(Theme.data)
                            .foregroundStyle(.secondary)
                            .frame(minHeight: 44, alignment: .leading)
                    } else {
                        TextField("Template name", text: $name)
                            .font(Theme.data)
                            .frame(minHeight: 44)
                            .textInputAutocapitalization(.characters)
                    }
                } header: {
                    Text("Name").metaLabel()
                }

                Section {
                    ForEach(drafts) { draft in
                        Button { editingDraftID = draft.id } label: { draftRow(draft) }
                            .foregroundStyle(.primary)
                    }
                    .onMove { drafts.move(fromOffsets: $0, toOffset: $1) }
                    .onDelete { drafts.remove(atOffsets: $0) }

                    Button { showPicker = true } label: {
                        Label("Add exercise", systemImage: "plus.circle")
                            .font(Theme.data)
                            .frame(minHeight: 44)
                    }
                } header: {
                    HStack {
                        Text("Exercises").metaLabel()
                        Spacer()
                        if !drafts.isEmpty { EditButton().font(Theme.body) }
                    }
                }

                if let error {
                    Section { Text(error).font(Theme.body).foregroundStyle(Theme.red) }
                }
            }
            .navigationTitle(isEdit ? "EDIT TEMPLATE" : "NEW TEMPLATE")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") { save() }.disabled(!canSave)
                }
            }
            .sheet(isPresented: $showPicker) {
                ExercisePickerView { exerciseId, exName in
                    drafts.append(.init(exerciseId: exerciseId, name: exName))
                }
            }
            .sheet(item: editingDraftBinding) { draft in
                TemplateTargetSheet(draft: draft) { updated in
                    if let idx = drafts.firstIndex(where: { $0.id == updated.id }) {
                        drafts[idx] = updated
                    }
                }
            }
            .task { load() }
        }
        .tint(Theme.amber)
    }

    /// Bridges the selected-id to the `sheet(item:)` API without holding a copy
    /// that would go stale as `drafts` mutates.
    private var editingDraftBinding: Binding<AppDatabase.TemplateExerciseDraft?> {
        Binding(
            get: { drafts.first { $0.id == editingDraftID } },
            set: { editingDraftID = $0?.id })
    }

    private func draftRow(_ draft: AppDatabase.TemplateExerciseDraft) -> some View {
        VStack(alignment: .leading, spacing: Theme.grid) {
            Text(draft.name.uppercased())
                .font(.system(size: 17, weight: .semibold).width(.condensed))
                .lineLimit(1)
            Text(targetSummary(draft)).metaLabel()
        }
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
    }

    private func targetSummary(_ d: AppDatabase.TemplateExerciseDraft) -> String {
        var parts: [String] = []
        if let sets = d.targetSets { parts.append("\(sets) sets") }
        switch (d.targetRepsMin, d.targetRepsMax) {
        case let (lo?, hi?): parts.append(lo == hi ? "\(lo) reps" : "\(lo)–\(hi) reps")
        case let (lo?, nil): parts.append("\(lo)+ reps")
        case let (nil, hi?): parts.append("≤\(hi) reps")
        case (nil, nil): break
        }
        if let rest = d.restSeconds { parts.append("\(rest)s rest") }
        return parts.isEmpty ? "No targets" : parts.joined(separator: " · ")
    }

    private func load() {
        guard !loaded else { return }
        loaded = true
        if case let .edit(templateId, _) = mode {
            do {
                let d = try appState.db.templateEditDrafts(templateId: templateId)
                name = d.name
                notes = d.notes ?? ""
                drafts = d.exercises
            } catch {
                self.error = error.localizedDescription
            }
        }
    }

    private func save() {
        let notesValue = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        let notesArg = notesValue.isEmpty ? nil : notesValue
        do {
            switch mode {
            case .create:
                // Block a duplicate name locally — the server would fold a same-name
                // push into the existing template (surprising for a "new" one).
                if try appState.db.templateNameExists(trimmedName) {
                    error = "A template named “\(trimmedName)” already exists."
                    return
                }
                _ = try appState.db.createLocalTemplate(
                    name: trimmedName, notes: notesArg, exercises: drafts)
            case let .edit(templateId, _):
                try appState.db.updateLocalTemplate(
                    id: templateId, notes: notesArg, exercises: drafts)
            }
            onSaved()
            dismiss()
            // Fire-and-forget push: adopts the server (id, version). A failure is
            // non-fatal — the synced=0 row persists and reconciles next sync.
            Task { await appState.pushLocalChanges() }
        } catch {
            self.error = error.localizedDescription
        }
    }
}

// ── Per-exercise target editor ──

/// Compact optional targets for one template exercise. Numeric fields are
/// steppers (0 ⇒ no target); rest is a Menu capsule (bounded select — the
/// design-system idiom, never a pill row).
private struct TemplateTargetSheet: View {
    let draft: AppDatabase.TemplateExerciseDraft
    let onDone: (AppDatabase.TemplateExerciseDraft) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var sets: Int
    @State private var repsMin: Int
    @State private var repsMax: Int
    @State private var rest: Int?     // seconds; nil = no target
    @State private var notes: String

    private static let restOptions = [30, 45, 60, 90, 120, 150, 180, 240, 300]

    init(draft: AppDatabase.TemplateExerciseDraft,
         onDone: @escaping (AppDatabase.TemplateExerciseDraft) -> Void) {
        self.draft = draft
        self.onDone = onDone
        _sets = State(initialValue: draft.targetSets ?? 0)
        _repsMin = State(initialValue: draft.targetRepsMin ?? 0)
        _repsMax = State(initialValue: draft.targetRepsMax ?? 0)
        _rest = State(initialValue: draft.restSeconds)
        _notes = State(initialValue: draft.notes ?? "")
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    stepperRow("Target sets", value: $sets, range: 0...12, zeroLabel: "—")
                    stepperRow("Reps min", value: $repsMin, range: 0...50, zeroLabel: "—")
                    stepperRow("Reps max", value: $repsMax, range: 0...50, zeroLabel: "—")
                    restRow
                } header: {
                    Text("Targets · optional").metaLabel()
                }
                Section {
                    TextField("Notes", text: $notes, axis: .vertical)
                        .font(Theme.body)
                } header: {
                    Text("Notes").metaLabel()
                }
            }
            .navigationTitle(draft.name.uppercased())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .topBarTrailing) { Button("Done") { commit() } }
            }
        }
        .tint(Theme.amber)
    }

    private func stepperRow(_ label: String, value: Binding<Int>, range: ClosedRange<Int>, zeroLabel: String) -> some View {
        Stepper(value: value, in: range) {
            HStack {
                Text(label).font(Theme.body)
                Spacer()
                Text(value.wrappedValue == 0 ? zeroLabel : "\(value.wrappedValue)")
                    .font(Theme.data)
                    .monospacedDigit()
                    .foregroundStyle(value.wrappedValue == 0 ? Color(.tertiaryLabel) : Theme.amber)
            }
        }
        .frame(minHeight: 44)
    }

    private var restRow: some View {
        HStack {
            Text("Rest").font(Theme.body)
            Spacer()
            Menu {
                Picker("Rest", selection: $rest) {
                    Text("—").tag(Int?.none)
                    ForEach(Self.restOptions, id: \.self) { s in
                        Text("\(s)s").tag(Int?.some(s))
                    }
                }
            } label: {
                Text(rest.map { "\($0)s" } ?? "—")
                    .font(Theme.data)
                    .monospacedDigit()
                    .foregroundStyle(rest == nil ? Color(.tertiaryLabel) : Theme.amber)
            }
        }
        .frame(minHeight: 44)
    }

    private func commit() {
        var updated = draft
        updated.targetSets = sets == 0 ? nil : sets
        updated.targetRepsMin = repsMin == 0 ? nil : repsMin
        updated.targetRepsMax = repsMax == 0 ? nil : repsMax
        updated.restSeconds = rest
        let n = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        updated.notes = n.isEmpty ? nil : n
        onDone(updated)
        dismiss()
    }
}
