// Home: resume/start, 30-day pulse (strength growth + session count),
// activity heatmap, recent workouts. Settings is the cog — not a tab.

import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) private var appState

    @State private var showSettings = false
    @State private var resumable: SessionRecord?
    @State private var templates: [AppDatabase.TemplateListItem] = []
    @State private var setsByDay: [String: Int] = [:]
    @State private var weekSessions = 0
    @State private var weekSets = 0
    @State private var prs30d = 0
    @State private var lastTrained: String?
    @State private var recents: [AppDatabase.HistoryItem] = []

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
                    lastTrainedLine
                    statsRow
                    heatmapCard
                    if !recents.isEmpty { recentWorkouts }
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
            .navigationDestination(for: Int64.self) { id in SessionDetailView(sessionId: id) }
            .sheet(isPresented: $showSettings) { SettingsView() }
            .task { reload() }
            .onChange(of: appState.workoutPresented) { _, isPresented in
                if !isPresented { reload() }   // returning from the workout
            }
        }
    }

    private func reload() {
        resumable = try? appState.db.activeLocalSession()
        templates = (try? appState.db.templateList()) ?? []
        setsByDay = (try? appState.db.activityByDay(days: 18 * 7)) ?? [:]
        if let weekStart = Calendar.current.dateInterval(of: .weekOfYear, for: Date())?.start {
            let stats = try? appState.db.statsSince(utc: ISO8601.string(from: weekStart))
            weekSessions = stats?.sessions ?? 0
            weekSets = stats?.sets ?? 0
        }
        prs30d = (try? appState.db.prCount(days: 30)) ?? 0
        lastTrained = try? appState.db.lastCompletedStartedAt()
        recents = Array(((try? appState.db.historyItems()) ?? [])
            .filter { $0.status == "completed" }
            .prefix(3))
    }

    // ── Start / resume ──

    private var resumeBanner: some View {
        Button { appState.workoutPresented = true } label: {
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
        appState.workoutPresented = true   // startOrResume creates (or resumes) on arrival
    }

    private func start(_ template: TemplateRecord) {
        if resumable == nil {
            _ = try? appState.db.startTemplateSession(template: template, startedAt: ISO8601.now())
            appState.refreshActiveSession()
        }
        appState.workoutPresented = true
    }

    // ── Pulse ──

    /// "Last trained 2d ago" — the single most behaviour-shaping number.
    /// Quiet when a workout is active (the resume banner owns that state).
    @ViewBuilder
    private var lastTrainedLine: some View {
        if resumable == nil, let lastTrained {
            Text("Last trained \(daysAgoLabel(lastTrained))")
                .font(Theme.data)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    /// Weekly tiles move day to day (30d numbers barely twitch); PRs·30d is
    /// the one scalar worth headlining — the list of WHICH lives on Data.
    private var statsRow: some View {
        HStack(spacing: Theme.grid * 2) {
            statTile(label: "Sessions · wk",
                     value: "\(weekSessions)",
                     valueColor: .primary)
            statTile(label: "Sets · wk",
                     value: "\(weekSets)",
                     valueColor: .primary)
            statTile(label: "PRs · 30d",
                     value: "\(prs30d)",
                     valueColor: prs30d > 0 ? Theme.green : .primary)
        }
    }

    private func statTile(label: String, value: String, valueColor: Color) -> some View {
        VStack(alignment: .leading, spacing: Theme.grid) {
            // Labels scale down rather than wrap — a wrapped label heightens
            // its card against its siblings ("SESSIONS · WK" was the culprit).
            Text(label).metaLabel()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
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

    // ── Recent workouts ──

    /// Vertical stack, last three completed sessions, tap-through to detail.
    /// (Horizontally scrolling pills are a rejected antipattern here.)
    private var recentWorkouts: some View {
        VStack(alignment: .leading, spacing: Theme.grid * 2) {
            Text("Recent workouts").metaLabel()
            VStack(spacing: Theme.grid * 2) {
                ForEach(recents) { item in
                    NavigationLink(value: item.id) {
                        recentWorkoutRow(item)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func recentWorkoutRow(_ item: AppDatabase.HistoryItem) -> some View {
        HStack(spacing: Theme.grid * 2) {
            VStack(alignment: .leading, spacing: Theme.grid) {
                Text((item.templateName ?? item.name ?? "Freeform").uppercased())
                    .font(.system(size: 17, weight: .semibold).width(.condensed))
                Text("\(item.exerciseCount) exercises · \(item.setCount) sets")
                    .font(Theme.data)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(daysAgo(item.startedAt))
                .font(Theme.data)
                .foregroundStyle(.secondary)
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

    private func daysAgo(_ startedAt: String) -> String {
        guard let d = ServerDate.parse(startedAt) else { return "" }
        let days = Int(Date().timeIntervalSince(d) / 86_400)
        switch days {
        case 0: return "today"
        case 1: return "1d"
        default: return "\(days)d"
        }
    }

    private func daysAgoLabel(_ startedAt: String) -> String {
        let short = daysAgo(startedAt)
        return short == "today" ? "today" : "\(short) ago"
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
