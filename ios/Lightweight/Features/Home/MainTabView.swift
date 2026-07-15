import SwiftUI

struct MainTabView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.scenePhase) private var scenePhase
    // Selection lives here so it survives the accessory branch below
    // (swapping the modifier changes the TabView's structural identity).
    @State private var selectedTab = 0

    var body: some View {
        @Bindable var appState = appState
        Group {
            // The accessory MODIFIER is conditional, not just its content —
            // an empty builder still renders a bare glass pill.
            if appState.activeSession != nil {
                tabs.tabViewBottomAccessory { WorkoutBar() }
            } else {
                tabs
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

    private var tabs: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem { Label("HOME", systemImage: "bolt.fill") }
                .tag(0)
            HistoryView()
                .tabItem { Label("HISTORY", systemImage: "list.bullet") }
                .tag(1)
            WorkoutsView()
                .tabItem { Label("WORKOUTS", systemImage: "square.grid.2x2") }
                .tag(2)
            DataView()
                .tabItem { Label("DATA", systemImage: "chart.xyaxis.line") }
                .tag(3)
        }
        .tint(Theme.amber)
    }
}
