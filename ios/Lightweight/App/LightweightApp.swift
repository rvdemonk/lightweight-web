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
            case "postmortem":
                NavigationStack { PostMortemView(sessionId: 500, mode: .review) }
            case "postmortem-history":
                NavigationStack { PostMortemView(sessionId: 500, mode: .history) }
            case "history-detail":
                NavigationStack { SessionDetailView(sessionId: 500) }
            case "postmortem-nopr":
                NavigationStack { PostMortemView(sessionId: 501, mode: .review) }
            case "briefing":
                NavigationStack { BriefingPreview(templateName: "PUSH DAY") }
            case "briefing-first":
                NavigationStack { BriefingPreview(templateName: "FRESH START") }
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

#if DEBUG
/// Screenshot seam: jump straight into a seeded template's briefing by name.
private struct BriefingPreview: View {
    @Environment(AppState.self) private var appState
    let templateName: String

    var body: some View {
        if let item = (try? appState.db.templateList())?
            .first(where: { $0.template.name == templateName }) {
            TemplateDetailView(item: item)
        } else {
            ProgressView()
        }
    }
}
#endif
