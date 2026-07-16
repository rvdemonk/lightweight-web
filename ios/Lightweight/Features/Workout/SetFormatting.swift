// Shared set-formatting helpers. The dense reference register (`65×12 @0`,
// `BW×12`, `@3+` collapse) is lifters' vernacular used wherever a prior set is
// shown for glance-only context (active-workout last-session card, pre-workout
// briefing). Records elsewhere keep the explicit `65 × 12 · RIR 0` form; these
// compress. Kept free-function + global so any surface can reach them without
// pulling in a view.

import Foundation

/// Weight as a lifter writes it: whole numbers bare (`65`), fractions trimmed
/// to their significant plate step (`66.25`, `1.25`), never trailing zeros.
func weightString(_ w: Double) -> String {
    w.truncatingRemainder(dividingBy: 1) == 0
        ? String(format: "%.0f", w)
        : String(format: "%.2f", w).replacingOccurrences(of: "0$", with: "", options: .regularExpression)
}

/// Dense reference register for a single set: `65×12 @0`, `BW×12`. RIR collapses
/// to `@3+` for any stored value ≥ 3 (display-only; no arithmetic is ever done
/// on RIR), and is omitted entirely when nil.
func denseSetRegister(_ set: SetRecord) -> String {
    let base = set.weightKg.map { "\(weightString($0))×\(set.reps)" } ?? "BW×\(set.reps)"
    guard let rir = set.rir else { return base }
    return base + (rir >= 3 ? " @3+" : " @\(rir)")
}
