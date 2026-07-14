import SwiftUI

struct LoginView: View {
    @Environment(AppState.self) private var appState

    @State private var username = ""
    @State private var password = ""
    @State private var error: String?
    @State private var busy = false
    @State private var showServerField = false

    var body: some View {
        @Bindable var appState = appState
        NavigationStack {
            Form {
                Section {
                    TextField("USERNAME", text: $username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SecureField("PASSWORD", text: $password)
                }
                if showServerField {
                    Section("SERVER") {
                        TextField("Server URL", text: $appState.serverURL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .keyboardType(.URL)
                            .font(.system(.footnote, design: .monospaced))
                    }
                }
                if let error {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.footnote)
                    }
                }
                Section {
                    Button {
                        Task { await submit() }
                    } label: {
                        if busy {
                            ProgressView()
                        } else {
                            Text("Login")
                        }
                    }
                    .disabled(busy || username.isEmpty || password.isEmpty)
                }
            }
            .navigationTitle("LIGHTWEIGHT")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Server", systemImage: "server.rack") {
                        showServerField.toggle()
                    }
                }
            }
        }
    }

    private func submit() async {
        busy = true
        error = nil
        do {
            try await appState.login(username: username, password: password)
        } catch {
            self.error = error.localizedDescription
        }
        busy = false
    }
}
