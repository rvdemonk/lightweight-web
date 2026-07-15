// Analysis surface — deliberately a stub. The display language for lift
// data (trends, PRs, comparisons, the e1RM calculator utility) is its own
// design problem, likely a conducted build once the language is settled.

import SwiftUI

struct DataView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: Theme.grid * 3) {
                Text("Data").metaLabel()
                Text("Analysis surface under design.")
                    .font(Theme.body)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(.systemBackground))
        }
    }
}
