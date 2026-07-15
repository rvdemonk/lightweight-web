// Settings sheet, reached via the cog on Home — not a fifth tab.

import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss
    @State private var refreshing = false

    var body: some View {
        NavigationStack {
            List {
                Section("Server") {
                    Text(appState.serverURL)
                        .font(Theme.body)
                        .foregroundStyle(.secondary)
                    Button {
                        Task {
                            refreshing = true
                            await appState.refresh()
                            refreshing = false
                        }
                    } label: {
                        if refreshing {
                            ProgressView().frame(maxWidth: .infinity)
                        } else {
                            Label("Pull from server", systemImage: "arrow.down.circle")
                        }
                    }
                    .disabled(refreshing)
                    syncStatusRow
                }

                Section("Account") {
                    Button(role: .destructive) {
                        appState.logout()
                        dismiss()
                    } label: {
                        Label("Log out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("SETTINGS")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    @ViewBuilder
    private var syncStatusRow: some View {
        switch appState.syncState {
        case .idle:
            EmptyView()
        case .syncing(let label):
            Label(label, systemImage: "arrow.triangle.2.circlepath")
                .foregroundStyle(.secondary)
        case .synced(let summary):
            Label(summary, systemImage: "checkmark.circle")
                .foregroundStyle(Theme.green)
        case .failed(let message):
            // Never render failure as success (banked sync lesson).
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .foregroundStyle(Theme.red)
        }
    }
}
