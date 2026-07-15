// The fullScreenCover root: content-swap coordinator between the active
// workout and its post-mortem. Ending a workout swaps this cover's content
// from logging to the summary — NOT a pushed child (which would give an
// interactive swipe-back to an already-completed workout) and NOT a second
// cover (AppState's one-cover invariant). Dismissal stays the single
// workoutPresented = false, fired by the summary's Done button.

import SwiftUI

enum WorkoutPhase: Equatable {
    case logging
    case review(sessionId: Int64)
}

struct WorkoutFlowView: View {
    @State private var phase: WorkoutPhase = .logging

    var body: some View {
        switch phase {
        case .logging:
            NavigationStack {
                ActiveWorkoutView(onFinished: { id in
                    withAnimation(.smooth) { phase = .review(sessionId: id) }
                })
            }
        case .review(let id):
            NavigationStack {
                PostMortemView(sessionId: id, mode: .review)
            }
        }
    }
}
