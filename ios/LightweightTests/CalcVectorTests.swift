// Cross-language conformance: run the shared vectors generated from
// crates/calc (the ground truth) against the Swift implementation.
// Regenerate vectors: GEN_VECTORS=1 cargo test -p lightweight-calc vectors_match
//
// Vector domain is weight > 0, reps >= 1 — Swift's nil-returning behaviour for
// bodyweight/zero-rep sets is covered by the local tests below, not vectors.

import XCTest
@testable import Lightweight

private struct Vectors: Decodable {
    struct E1rmCase: Decodable {
        let weight_kg: Double
        let reps: Int
        let expected: Double
    }
    struct BestCase: Decodable {
        let sets: [[Double]] // [weight_kg, reps] pairs
        let expected: Double?
    }
    struct RepsToBeatCase: Decodable {
        let target: Double
        let weight_kg: Double
        let expected: Int?
    }

    let policy: String
    let tolerance: Double
    let e1rm: [E1rmCase]
    let best: [BestCase]
    let reps_to_beat: [RepsToBeatCase]
}

final class CalcVectorTests: XCTestCase {

    private static let vectors: Vectors = {
        guard let url = Bundle(for: CalcVectorTests.self)
            .url(forResource: "calc_vectors", withExtension: "json") else {
            fatalError("calc_vectors.json missing from test bundle — check project.yml resources")
        }
        do {
            return try JSONDecoder().decode(Vectors.self, from: Data(contentsOf: url))
        } catch {
            fatalError("calc_vectors.json failed to decode: \(error)")
        }
    }()

    func testE1rmMatchesGroundTruth() {
        for v in Self.vectors.e1rm {
            guard let computed = Calc.e1rm(weightKg: v.weight_kg, reps: v.reps) else {
                XCTFail("e1rm(\(v.weight_kg), \(v.reps)) returned nil for a valid-domain vector")
                continue
            }
            XCTAssertEqual(computed, v.expected, accuracy: Self.vectors.tolerance,
                           "e1rm(\(v.weight_kg), \(v.reps))")
        }
    }

    func testBestE1rmMatchesGroundTruth() {
        for v in Self.vectors.best {
            let sets = v.sets.map { (weightKg: Optional($0[0]), reps: Int($0[1])) }
            let computed = Calc.bestE1rm(sets)
            switch (computed, v.expected) {
            case (nil, nil):
                continue
            case let (c?, e?):
                XCTAssertEqual(c, e, accuracy: Self.vectors.tolerance, "bestE1rm(\(v.sets))")
            default:
                XCTFail("bestE1rm(\(v.sets)): computed \(String(describing: computed)), expected \(String(describing: v.expected))")
            }
        }
    }

    func testRepsToBeatMatchesGroundTruth() {
        for v in Self.vectors.reps_to_beat {
            XCTAssertEqual(Calc.repsToBeat(target: v.target, weightKg: v.weight_kg), v.expected,
                           "repsToBeat(target: \(v.target), weightKg: \(v.weight_kg))")
        }
    }

    // MARK: - Swift-specific out-of-domain behaviour (not in shared vectors)

    func testBodyweightAndZeroRepsHaveNoE1rm() {
        XCTAssertNil(Calc.e1rm(weightKg: nil, reps: 10), "bodyweight has no e1RM")
        XCTAssertNil(Calc.e1rm(weightKg: 0, reps: 10), "zero weight has no e1RM")
        XCTAssertNil(Calc.e1rm(weightKg: 100, reps: 0), "zero reps has no e1RM")
    }

    func testRawRepsPolicyGrinderWins() {
        // THE policy regression case: 11×65 (actual grinder) must beat 12×62.5
        // (which only won under the old RIR-folding policy).
        let grinder = Calc.e1rm(weightKg: 65, reps: 11)!
        let rirSet = Calc.e1rm(weightKg: 62.5, reps: 12)!
        XCTAssertGreaterThan(grinder, rirSet)
    }
}
