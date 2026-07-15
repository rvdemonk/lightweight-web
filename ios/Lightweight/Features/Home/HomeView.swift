// Home: resume/start, 30-day pulse (strength growth + session count),
// activity heatmap, recent exercises. Settings is the cog — not a tab.

import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) private var appState

    @State private var goToWorkout = false
    @State private var showSettings = false
    @State private var resumable: SessionRecord?
    @State private var templates: [AppDatabase.TemplateListItem] = []
    @State private var setsByDay: [String: Int] = [:]
    @State private var growth: Double?
    @State private var sessions30d = 0
    @State private var recents: [AppDatabase.RecentExercise] = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.grid * 3) {
                    // Wordmark lives in content, not the toolbar — iOS 26
                    // clips leading toolbar text into a circular glass pod.
                    Text("LIGHTWEIGHT")
                        .font(.system(size: 34, weight: .heavy).width(.condensed))
                        .frame(maxWidth: .infinity, alignment: .leading)
                    if resumable != nil { resumeBanner }
                    startButton
                    statsRow
                    heatmapCard
                    if !recents.isEmpty { recentPills }
                    syncFailureRow
                }
                .padding(.horizontal, Theme.margin)
                .padding(.vertical, Theme.grid * 2)
            }
            .background(Color(.systemBackground))
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showSettings = true } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("Settings")
                }
            }
            .navigationDestination(isPresented: $goToWorkout) { ActiveWorkoutView() }
            .sheet(isPresented: $showSettings) { SettingsView() }
            .task { reload() }
            .onChange(of: goToWorkout) { _, isPresented in
                if !isPresented { reload() }   // returning from the workout
            }
        }
    }

    private func reload() {
        resumable = try? appState.db.activeLocalSession()
        templates = (try? appState.db.templateList()) ?? []
        setsByDay = (try? appState.db.activityByDay(days: 18 * 7)) ?? [:]
        growth = try? appState.db.strengthGrowth30d()
        sessions30d = (try? appState.db.completedSessionsCount(days: 30)) ?? 0
        recents = (try? appState.db.recentExercises(limit: 8)) ?? []
    }

    // ── Start / resume ──

    private var resumeBanner: some View {
        Button { goToWorkout = true } label: {
            HStack(spacing: Theme.grid * 2) {
                Image(systemName: "arrow.uturn.forward")
                    .foregroundStyle(Theme.amber)
                VStack(alignment: .leading, spacing: Theme.grid) {
                    Text("Resume workout")
                        .font(.system(size: 17, weight: .semibold).width(.condensed))
                        .textCase(.uppercase)
                    Text("Started \(ServerDate.timeLabel(resumable?.startedAt ?? ""))")
                        .font(Theme.data)
                        .foregroundStyle(.secondary)
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
        .buttonStyle(.plain)
    }

    /// Freeform or template. If a workout is already active, any choice
    /// resumes it — never silently discard an active session.
    private var startButton: some View {
        Menu {
            Button("Freeform", systemImage: "bolt.fill") { startFreeform() }
            if !templates.isEmpty {
                Divider()
                ForEach(templates) { item in
                    Button(item.template.name.localizedCapitalized) { start(item.template) }
                }
            }
        } label: {
            Text(resumable == nil ? "START WORKOUT" : "WORKOUT ACTIVE")
                .font(.system(size: 17, weight: .semibold).width(.condensed))
                .tracking(1.0)
                .frame(maxWidth: .infinity, minHeight: 48)
        }
        .buttonStyle(.borderedProminent)
        .buttonBorderShape(.capsule)
        .tint(Theme.amber)
        .foregroundStyle(.black)
    }

    private func startFreeform() {
        goToWorkout = true   // startOrResume creates (or resumes) on arrival
    }

    private func start(_ template: TemplateRecord) {
        if resumable == nil {
            _ = try? appState.db.startTemplateSession(template: template, startedAt: ISO8601.now())
        }
        goToWorkout = true
    }

    // ── 30-day pulse ──

    private var statsRow: some View {
        HStack(spacing: Theme.grid * 2) {
            statTile(label: "Strength · 30d",
                     value: growth.map { String(format: "%+.1f%%", $0) } ?? "—",
                     valueColor: growthColor)
            statTile(label: "Sessions · 30d",
                     value: "\(sessions30d)",
                     valueColor: .primary)
        }
    }

    private var growthColor: Color {
        guard let growth else { return Color(.tertiaryLabel) }
        return growth >= 0 ? Theme.green : Theme.red
    }

    private func statTile(label: String, value: String, valueColor: Color) -> some View {
        VStack(alignment: .leading, spacing: Theme.grid) {
            Text(label).metaLabel()
            Text(value)
                .font(Theme.titleData)
                .foregroundStyle(value == "—" ? Color(.tertiaryLabel) : valueColor)
                .contentTransition(.numericText())
        }
        .padding(Theme.margin)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
    }

    // ── Activity ──

    private var heatmapCard: some View {
        VStack(alignment: .leading, spacing: Theme.grid * 2) {
            Text("Activity · 18 weeks").metaLabel()
            ActivityHeatmap(setsByDay: setsByDay)
        }
        .padding(Theme.margin)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: Theme.cardRadius))
    }

    // ── Recent exercises ──

    private var recentPills: some View {
        VStack(alignment: .leading, spacing: Theme.grid * 2) {
            Text("Recent").metaLabel()
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Theme.grid * 2) {
                    ForEach(recents) { recent in
                        HStack(spacing: Theme.grid) {
                            Text(recent.name.uppercased())
                                .font(.system(size: 17, weight: .semibold).width(.condensed))
                            Text(daysAgo(recent.lastDay))
                                .font(Theme.data)
                                .foregroundStyle(.tertiary)
                        }
                        .padding(.horizontal, Theme.grid * 3)
                        .frame(minHeight: Theme.minTouch)
                        .background(Color(.secondarySystemBackground))
                        .clipShape(Capsule())
                    }
                }
            }
        }
    }

    private func daysAgo(_ startedAt: String) -> String {
        guard let d = ServerDate.parse(startedAt) else { return "" }
        let days = Int(Date().timeIntervalSince(d) / 86_400)
        switch days {
        case 0: return "today"
        case 1: return "1d"
        default: return "\(days)d"
        }
    }

    // ── Sync ──

    /// Quiet by design: idle/success say nothing here (Settings has the
    /// detail). Failure is loud — never render failure as success.
    @ViewBuilder
    private var syncFailureRow: some View {
        if case .failed(let message) = appState.syncState {
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .font(Theme.body)
                .foregroundStyle(Theme.red)
        }
    }
}
