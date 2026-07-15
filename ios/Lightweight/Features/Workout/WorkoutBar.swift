// "Now playing" bar for an active workout — iOS 26 tabViewBottomAccessory.
// Appears above the tab bar whenever a workout is active and its screen is
// minimized; tap to re-enter. The system accessory container provides the
// glass; this is content only.

import SwiftUI

struct WorkoutBar: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        if let session = appState.activeSession {
            Button { appState.workoutPresented = true } label: {
                HStack(spacing: Theme.grid * 2) {
                    Image(systemName: "bolt.fill")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Theme.amber)
                    Text((session.name ?? "Workout").uppercased())
                        .font(.system(size: 17, weight: .semibold).width(.condensed))
                        .lineLimit(1)
                    Spacer()
                    TimelineView(.periodic(from: .now, by: 1)) { timeline in
                        Text(elapsed(at: timeline.date, since: session.startedAt))
                            .font(Theme.data)
                            .foregroundStyle(.secondary)
                            .contentTransition(.numericText())
                    }
                    Image(systemName: "chevron.up")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(.tertiary)
                }
                .padding(.horizontal, Theme.margin)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Resume workout")
        }
    }

    private func elapsed(at now: Date, since startedAt: String) -> String {
        guard let start = ServerDate.parse(startedAt) else { return "0:00" }
        let s = max(0, Int(now.timeIntervalSince(start)))
        return s >= 3600
            ? String(format: "%d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60)
            : String(format: "%d:%02d", s / 60, s % 60)
    }
}
