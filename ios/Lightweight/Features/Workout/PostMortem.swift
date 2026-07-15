// The post-mortem's derived model: built ONCE from AppDatabase.sessionDetail(id:)
// plus a few small local queries (PostMortemQueries.swift). Everything is local
// and synchronous — the screen never waits on the network.
//
// PR/verdict semantics mirror the active screen and SessionDetailView exactly:
//   - a single e1RM PR, strict beat vs the PRE-session baseline, never vs nil
//     (first exposure is calibration);
//   - bodyweight lifts have no e1RM, so they carry a single-dimension rep-PR
//     (max reps at bodyweight beating the all-time BW rep baseline);
//   - the verdict vocabulary is closed — PR / Progressed / Held / Lighter day /
//     First time. No regression/decline framing anywhere.

import Foundation

struct PostMortem {
    /// Float noise floor on equal e1RM work — a tie is not progress.
    static let epsilon = 0.1

    enum Verdict {
        case pr, progressed, held, lighter, firstTime
        var label: String {
            switch self {
            case .pr: return "PR"
            case .progressed: return "Progressed"
            case .held: return "Held"
            case .lighter: return "Lighter day"
            case .firstTime: return "First time"
            }
        }
    }

    struct WeeklyPoint: Identifiable {
        let weekStart: Date
        let e1rm: Double
        var id: Date { weekStart }
    }

    struct ExerciseOutcome: Identifiable {
        let id: Int64                  // session_exercise id
        let name: String
        let sessionBestE1rm: Double?
        let prevBestE1rm: Double?
        let baselineE1rm: Double?
        let isPR: Bool
        let prSet: SetRecord?          // evidence set (its e1rm/reps == the session best)
        let verdict: Verdict
        let isBodyweight: Bool
        let bestReps: Int
        let prevBestReps: Int
        let prGain: Double             // e1RM gain over baseline (weighted PRs); 0 otherwise
        let weeklyBest: [WeeklyPoint]  // sparkline series (weighted PR only)
    }

    let title: String
    let isFreeform: Bool
    let dayLabel: String
    let durationLabel: String?
    let outcomes: [ExerciseOutcome]
    let prs: [ExerciseOutcome]         // PR-only summit, ranked by e1RM gain desc
    let slotsBeaten: Int
    let slotsComparable: Int
    let totalSets: Int
    let tonnageKg: Double
    let tonnageDelta: Double?          // nil for freeform / no comparable session
    let sessionsThisWeek: Int
    /// All sets bodyweight → tonnage is a misleading 0; render "—" instead.
    let isBodyweightSession: Bool

    // ── Build ──

    static func build(sessionId: Int64, db: AppDatabase) throws -> PostMortem? {
        guard let detail = try db.sessionDetail(id: sessionId) else { return nil }
        let session = detail.session

        var outcomes: [ExerciseOutcome] = []
        for ex in detail.exercises {
            let sessionBest = Calc.bestE1rm(ex.sets.map { (weightKg: $0.weightKg, reps: $0.reps) })
            let prevBest = Calc.bestE1rm(ex.previousSets.map { (weightKg: $0.weightKg, reps: $0.reps) })
            let baseline = ex.baselineBestE1rm
            let isBodyweight = !ex.sets.isEmpty && ex.sets.allSatisfy { $0.weightKg == nil }
            let bestReps = ex.sets.map(\.reps).max() ?? 0
            let prevBestReps = ex.previousSets.map(\.reps).max() ?? 0

            let isPR: Bool
            let verdict: Verdict
            let prSet: SetRecord?
            let prGain: Double
            var weekly: [WeeklyPoint] = []

            if isBodyweight {
                let bwBaseline = try db.bestBodyweightRepsBefore(
                    exerciseId: ex.exerciseId, startedAt: session.startedAt)
                isPR = bwBaseline > 0 && bestReps > bwBaseline
                prSet = isPR ? ex.sets.first(where: { $0.reps == bestReps }) : nil
                prGain = 0
                if bwBaseline == 0 {
                    verdict = .firstTime
                } else if isPR {
                    verdict = .pr
                } else if prevBestReps == 0 {
                    verdict = .held
                } else if bestReps > prevBestReps {
                    verdict = .progressed
                } else if bestReps < prevBestReps {
                    verdict = .lighter
                } else {
                    verdict = .held
                }
            } else {
                isPR = sessionBest != nil && baseline != nil && sessionBest! > baseline!
                prSet = isPR ? ex.sets.first(where: {
                    guard let e = Calc.e1rm(weightKg: $0.weightKg, reps: $0.reps),
                          let best = sessionBest else { return false }
                    return abs(e - best) < 1e-6
                }) : nil
                prGain = isPR ? (sessionBest! - baseline!) : 0
                if baseline == nil {
                    verdict = .firstTime
                } else if isPR {
                    verdict = .pr
                } else if let best = sessionBest {
                    let ref = prevBest ?? baseline!
                    let d = best - ref
                    verdict = d > epsilon ? .progressed : (d < -epsilon ? .lighter : .held)
                } else {
                    verdict = .held
                }
                if isPR {
                    weekly = try db.weeklyBestE1rm(exerciseId: ex.exerciseId).map {
                        WeeklyPoint(weekStart: $0.weekStart, e1rm: $0.e1rm)
                    }
                }
            }

            outcomes.append(ExerciseOutcome(
                id: ex.id, name: ex.name, sessionBestE1rm: sessionBest, prevBestE1rm: prevBest,
                baselineE1rm: baseline, isPR: isPR, prSet: prSet, verdict: verdict,
                isBodyweight: isBodyweight, bestReps: bestReps, prevBestReps: prevBestReps,
                prGain: prGain, weeklyBest: weekly))
        }

        // Slots: same rule as SessionDetailView.badge — e1RM-normalized, or a
        // raw reps race for BW-vs-BW. Denominator = every set whose exercise has
        // a previous session.
        var slotsBeaten = 0, slotsComparable = 0
        for ex in detail.exercises where !ex.previousSets.isEmpty {
            for set in ex.sets {
                slotsComparable += 1
                guard let slot = ex.previousSets.first(where: { $0.setNumber == set.setNumber })
                        ?? ex.previousSets.last else { continue }
                if set.weightKg == nil, slot.weightKg == nil {
                    if set.reps > slot.reps { slotsBeaten += 1 }
                } else if let e = Calc.e1rm(weightKg: set.weightKg, reps: set.reps),
                          let se = Calc.e1rm(weightKg: slot.weightKg, reps: slot.reps),
                          e > se {
                    slotsBeaten += 1
                }
            }
        }

        let totalSets = detail.exercises.reduce(0) { $0 + $1.sets.count }
        let tonnage = detail.exercises.flatMap(\.sets).reduce(0.0) {
            $0 + (($1.weightKg ?? 0) * Double($1.reps))
        }

        var tonnageDelta: Double?
        if let templateId = session.templateId,
           let prevId = try db.previousComparableSessionId(templateId: templateId, before: session.startedAt) {
            tonnageDelta = tonnage - (try db.sessionTonnage(sessionId: prevId))
        }

        var sessionsThisWeek = 0
        if let weekStart = Calendar.current.dateInterval(of: .weekOfYear, for: Date())?.start {
            sessionsThisWeek = (try? db.statsSince(utc: ISO8601.string(from: weekStart)))?.sessions ?? 0
        }

        let prs = outcomes.filter(\.isPR).sorted { $0.prGain > $1.prGain }
        let title = detail.templateName ?? session.name ?? "Freeform"

        return PostMortem(
            title: title,
            isFreeform: session.templateId == nil,
            dayLabel: ServerDate.dayLabel(session.startedAt),
            durationLabel: ServerDate.duration(
                from: session.startedAt, to: session.endedAt, minusPaused: session.pausedDuration),
            outcomes: outcomes,
            prs: prs,
            slotsBeaten: slotsBeaten,
            slotsComparable: slotsComparable,
            totalSets: totalSets,
            tonnageKg: tonnage,
            tonnageDelta: tonnageDelta,
            sessionsThisWeek: sessionsThisWeek,
            isBodyweightSession: totalSets > 0 && tonnage == 0)
    }
}
