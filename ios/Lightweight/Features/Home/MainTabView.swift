import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("HOME", systemImage: "bolt.fill") }
            HistoryView()
                .tabItem { Label("HISTORY", systemImage: "list.bullet") }
            WorkoutsView()
                .tabItem { Label("WORKOUTS", systemImage: "square.grid.2x2") }
            DataView()
                .tabItem { Label("DATA", systemImage: "chart.xyaxis.line") }
        }
        .tint(Theme.amber)
    }
}
