import SwiftUI

@main
struct LightweightApp: App {
    @State private var appState: AppState

    init() {
        #if DEBUG
        Calc.runInlineChecks()
        if ProcessInfo.processInfo.environment["LW_IMPORT_SELFTEST"] == "1" {
            ImportSafetySelfTest.run()
        }
        #endif
        let db = try! AppDatabase.makeShared()
        _appState = State(initialValue: AppState(db: db))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appState)
                .preferredColorScheme(.dark)
        }
    }
}

struct RootView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        switch appState.phase {
        case .loggedOut:
            LoginView()
        case .loggedIn:
            #if DEBUG
            switch ProcessInfo.processInfo.environment["LW_UI_PREVIEW_SCREEN"] {
            case "workout":
                NavigationStack { ActiveWorkoutView() }
            case "data":
                DataView()
            case "finish":
                MainTabView().task { await appState.previewFinishAndPush() }
            default:
                MainTabView()
            }
            #else
            MainTabView()
            #endif
        }
    }
}
