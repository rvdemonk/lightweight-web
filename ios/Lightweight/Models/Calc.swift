// Single source of truth for strength math on iOS.
//
// e1RM policy (spec decision 2026-07-13): RAW REPS ONLY.
//   e1rm = weight × (1 + reps/30)   (Epley)
// RIR is logged as context but NEVER folded into reps — a subjective
// "one left in the tank" must not outrank an actual grinder in PR math.
// Cross-language test vectors (generated from crates/calc) join in Phase 1;
// the inline checks below are a cheap guard until then.

import Foundation

enum Calc {
    /// Estimated 1-rep max via Epley on raw reps. Bodyweight sets (nil weight)
    /// have no e1RM. Epley has no special case at 1 rep — it returns
    /// w × (1 + 1/30) ≈ 1.0333·w, matching the Rust ground truth in crates/calc.
    static func e1rm(weightKg: Double?, reps: Int) -> Double? {
        guard let w = weightKg, w > 0, reps > 0 else { return nil }
        return w * (1.0 + Double(reps) / 30.0)
    }

    /// Best (max) e1RM across a set of (weight, reps) pairs, ignoring bodyweight sets.
    static func bestE1rm(_ sets: [(weightKg: Double?, reps: Int)]) -> Double? {
        sets.compactMap { e1rm(weightKg: $0.weightKg, reps: $0.reps) }.max()
    }

    #if DEBUG
    /// Cheap self-check, run once at launch in debug builds. Not a substitute
    /// for the Phase-1 cross-language vectors — just catches gross regressions.
    static func runInlineChecks() {
        func approx(_ a: Double?, _ b: Double, _ tol: Double = 0.001) -> Bool {
            guard let a else { return false }
            return abs(a - b) < tol
        }
        assert(approx(e1rm(weightKg: 100, reps: 1), 103.3333), "1 rep Epley = w×(1+1/30)")
        assert(approx(e1rm(weightKg: 100, reps: 5), 116.6667), "5×100 Epley")
        assert(approx(e1rm(weightKg: 65, reps: 11), 88.8333), "11×65 grinder")
        assert(approx(e1rm(weightKg: 62.5, reps: 12), 87.5), "12×62.5 (RIR excluded)")
        // The grinder must win — raw-reps policy, RIR ignored.
        assert(e1rm(weightKg: 65, reps: 11)! > e1rm(weightKg: 62.5, reps: 12)!,
               "raw-reps: 11×65 must beat 12×62.5")
        assert(e1rm(weightKg: nil, reps: 10) == nil, "bodyweight has no e1RM")
        assert(e1rm(weightKg: 100, reps: 0) == nil, "zero reps has no e1RM")
    }
    #endif
}
