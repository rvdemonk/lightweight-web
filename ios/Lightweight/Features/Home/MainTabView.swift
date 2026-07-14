import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("HOME", systemImage: "bolt.fill") }
            HistoryView()
                .tabItem { Label("HISTORY", systemImage: "list.bullet") }
        }
    }
}
