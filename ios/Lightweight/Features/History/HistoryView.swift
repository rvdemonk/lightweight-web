import SwiftUI

struct HistoryView: View {
    @Environment(AppState.self) private var appState

    @State private var items: [AppDatabase.HistoryItem] = []
    @State private var loadError: String?

    var body: some View {
        NavigationStack {
            List {
                syncStatusRow
                ForEach(items) { item in
                    NavigationLink(value: item.id) {
                        HistoryRow(item: item)
                    }
                }
            }
            .navigationTitle("HISTORY")
            .navigationDestination(for: Int64.self) { id in
                SessionDetailView(sessionId: id)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Refresh", systemImage: "arrow.clockwise") {
                        Task {
                            await appState.refresh()
                            loadItems()
                        }
                    }
                    .disabled(isSyncing)
                }
            }
            .refreshable {
                await appState.refresh()
                loadItems()
            }
            .task {
                loadItems()
                if items.isEmpty {
                    await appState.refresh()
                    loadItems()
                }
            }
        }
    }

    private var isSyncing: Bool {
        if case .syncing = appState.syncState { return true }
        return false
    }

    @ViewBuilder
    private var syncStatusRow: some View {
        switch appState.syncState {
        case .idle:
            EmptyView()
        case .syncing(let label):
            Label(label, systemImage: "arrow.triangle.2.circlepath")
                .font(Theme.body)
                .foregroundStyle(.secondary)
        case .synced(let summary):
            Label(summary, systemImage: "checkmark.circle")
                .font(Theme.body)
                .foregroundStyle(Theme.green)
        case .failed(let message):
            // Sync failure is always visible — never rendered as success.
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .font(Theme.body)
                .foregroundStyle(Theme.red)
        }
    }

    private func loadItems() {
        do {
            items = try appState.db.historyItems()
            loadError = nil
        } catch {
            loadError = error.localizedDescription
        }
    }
}

struct HistoryRow: View {
    let item: AppDatabase.HistoryItem

    private var title: String {
        item.templateName ?? item.name ?? "Freeform"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.grid) {
            // Name and date carry equal weight — a workout is identified as
            // much by WHEN as by WHAT.
            HStack(alignment: .firstTextBaseline) {
                Text(title.uppercased())
                    .font(.system(size: 17, weight: .semibold).width(.condensed))
                Spacer()
                Text(ServerDate.shortDayLabel(item.startedAt))
                    .font(.system(size: 17, weight: .semibold).monospacedDigit())
            }
            HStack(spacing: Theme.grid) {
                Text(summary)
                    .font(Theme.data)
                    .foregroundStyle(.secondary)
                if item.status != "completed" {
                    Text(item.status.uppercased())
                        .font(Theme.label)
                        .tracking(0.6)
                        .foregroundStyle(Theme.amber)
                }
            }
        }
        .padding(.vertical, Theme.grid)
    }

    private var summary: String {
        var parts = ["\(item.exerciseCount) exercises", "\(item.setCount) sets"]
        if let dur = ServerDate.duration(from: item.startedAt, to: item.endedAt) {
            parts.append(dur)
        }
        return parts.joined(separator: " · ")
    }
}
