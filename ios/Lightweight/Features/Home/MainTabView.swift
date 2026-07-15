import SwiftUI

struct MainTabView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        @Bindable var appState = appState
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
        .tabViewBottomAccessory {
            if appState.activeSession != nil {
                WorkoutBar()
            }
        }
        // The SOLE presentation of the active workout — Home's resume/start
        // and the bar both flip the same flag, so minimize/re-enter can never
        // produce two live instances over one session.
        .fullScreenCover(isPresented: $appState.workoutPresented) {
            NavigationStack { ActiveWorkoutView() }
        }
        .task { appState.refreshActiveSession() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { appState.refreshActiveSession() }
        }
        .onChange(of: appState.workoutPresented) { _, _ in
            appState.refreshActiveSession()
        }
    }
}
