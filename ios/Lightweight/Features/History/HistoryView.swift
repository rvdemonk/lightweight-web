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
                ToolbarItem(placement: .topBarLeading) {
                    Button("Logout", systemImage: "rectangle.portrait.and.arrow.right") {
                        appState.logout()
                    }
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
                .font(.footnote.monospaced())
                .foregroundStyle(.secondary)
        case .synced(let summary):
            Label(summary, systemImage: "checkmark.circle")
                .font(.footnote.monospaced())
                .foregroundStyle(.green)
        case .failed(let message):
            // Sync failure is always visible — never rendered as success.
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .font(.footnote)
                .foregroundStyle(.red)
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
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(title)
                    .font(.headline)
                Spacer()
                if item.status != "completed" {
                    Text(item.status.uppercased())
                        .font(.caption2.monospaced())
                        .foregroundStyle(.orange)
                }
            }
            HStack(spacing: 12) {
                Text(ServerDate.dayLabel(item.startedAt))
                Text("\(item.exerciseCount) EX · \(item.setCount) SETS")
            }
            .font(.caption.monospaced())
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}
