//! Cross-language test vectors.
//!
//! `crates/calc` is the ground truth for strength math; every other
//! implementation (TS `frontend/src/utils/e1rm.ts`, Swift
//! `ios/Lightweight/Models/Calc.swift`) proves conformance by running the
//! checked-in JSON at `crates/calc/vectors/calc_vectors.json`.
//!
//! The `vectors_match_checked_in_file` test verifies the file matches what
//! the current code computes. To regenerate after an intentional policy
//! change:
//!
//! ```sh
//! GEN_VECTORS=1 cargo test -p lightweight-calc vectors_match
//! ```
//!
//! Vector domain is deliberately restricted to weight > 0 and reps >= 1 for
//! `e1rm` cases — outside that domain the implementations legitimately
//! diverge (Rust returns the raw formula value; Swift returns nil for
//! bodyweight/zero-rep sets). Each language covers its own out-of-domain
//! behaviour in local tests.

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct E1rmCase {
    pub weight_kg: f64,
    pub reps: i64,
    pub expected: f64,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct BestCase {
    /// (weight_kg, reps) pairs
    pub sets: Vec<(f64, i64)>,
    pub expected: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct RepsToBeatCase {
    pub target: f64,
    pub weight_kg: f64,
    /// None = no achievable target (invalid input or > 30 reps)
    pub expected: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct RoundCase {
    pub value: f64,
    pub expected: f64,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct PctChangeCase {
    pub current: f64,
    pub previous: f64,
    pub expected: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
pub struct Vectors {
    pub policy: String,
    pub tolerance: f64,
    pub e1rm: Vec<E1rmCase>,
    pub best: Vec<BestCase>,
    pub reps_to_beat: Vec<RepsToBeatCase>,
    pub round: Vec<RoundCase>,
    pub pct_change: Vec<PctChangeCase>,
}

/// Build the canonical vector set from the live implementation.
pub fn generate() -> Vectors {
    use crate::e1rm::{best, e1rm, pct_change, reps_to_beat, round, SetData};

    // -- e1rm: valid-domain grid + named regression cases ------------------
    let mut e1rm_cases: Vec<E1rmCase> = Vec::new();
    let grid: &[(f64, i64)] = &[
        // named regression pair: the grinder must beat the RIR-flattered set
        (65.0, 11),   // 88.833… — actual grinder (was losing under RIR folding)
        (62.5, 12),   // 87.5    — RIR1 set, raw reps only
        // Lewis's live PR case (2026-07-14): incline DB curl
        (12.5, 11),   // 17.083… → rounds to 17.1
        (12.5, 14),   // 18.333…
        // references
        (100.0, 1),
        (100.0, 5),
        (100.0, 10),
        (60.0, 5),    // exactly 70.0
        (150.0, 3),   // exactly 165.0
        (200.0, 1),
        (2.5, 30),    // light-dumbbell extreme, max meaningful reps
        (142.5, 8),
        (0.5, 1),     // sub-kg plate math
        (50.0, 100),  // beyond-Epley-validity reps (formula still total)
    ];
    for &(w, r) in grid {
        e1rm_cases.push(E1rmCase { weight_kg: w, reps: r, expected: e1rm(w, r) });
    }

    // -- best ---------------------------------------------------------------
    let best_inputs: Vec<Vec<(f64, i64)>> = vec![
        vec![(80.0, 10), (100.0, 5), (90.0, 8)],
        vec![(65.0, 11), (62.5, 12)], // grinder wins
        vec![(100.0, 5)],
        vec![],                        // empty → None
        vec![(80.0, 8), (80.0, 8)],   // ties
    ];
    let best_cases = best_inputs
        .into_iter()
        .map(|sets| {
            let data: Vec<SetData> = sets
                .iter()
                .map(|&(w, r)| SetData { weight_kg: w, reps: r })
                .collect();
            BestCase { expected: best(&data), sets }
        })
        .collect();

    // -- reps_to_beat --------------------------------------------------------
    let rtb_inputs: &[(f64, f64)] = &[
        (e1rm(12.5, 14), 12.5),  // same weight → one more rep (15)
        (e1rm(12.5, 14), 15.0),  // heavier → 7
        (e1rm(12.5, 14), 5.0),   // > 30 reps → None
        (e1rm(12.5, 11), 12.5),  // live PR case, same weight → 12
        (e1rm(12.5, 11), 15.0),  // live PR case, +2.5kg
        (e1rm(100.0, 10), 100.0),// exact integer edge: tie is not a beat → 11
        (50.0, 100.0),           // weight alone beats target → 1
        (0.0, 100.0),            // invalid target → None
        (100.0, 0.0),            // invalid weight → None
        (e1rm(50.0, 30) - 0.5, 50.0), // lands exactly on 30 → allowed
        (e1rm(50.0, 30) + 0.5, 50.0), // needs 31 → None
    ];
    let reps_to_beat_cases = rtb_inputs
        .iter()
        .map(|&(t, w)| RepsToBeatCase { target: t, weight_kg: w, expected: reps_to_beat(t, w) })
        .collect();

    // -- round ----------------------------------------------------------------
    let round_inputs: &[f64] = &[133.333, 133.35, 100.0, 0.0, 10.05, 10.15, 9999.99, 88.83333333333333, 17.083333333333332];
    let round_cases = round_inputs
        .iter()
        .map(|&v| RoundCase { value: v, expected: round(v) })
        .collect();

    // -- pct_change -------------------------------------------------------------
    let pct_inputs: &[(f64, f64)] = &[
        (110.0, 100.0),
        (90.0, 100.0),
        (100.0, 100.0),
        (0.0, 100.0),
        (100.0, 0.0), // None
    ];
    let pct_change_cases = pct_inputs
        .iter()
        .map(|&(c, p)| PctChangeCase { current: c, previous: p, expected: pct_change(c, p) })
        .collect();

    Vectors {
        policy: "e1rm = weight_kg * (1 + reps/30); RAW REPS ONLY — RIR is context, never folded into PR/nudge/target math (decision 2026-07-13). reps_to_beat: smallest reps at weight whose e1RM STRICTLY beats target; null when invalid or > 30 reps.".to_string(),
        tolerance: 1e-9,
        e1rm: e1rm_cases,
        best: best_cases,
        reps_to_beat: reps_to_beat_cases,
        round: round_cases,
        pct_change: pct_change_cases,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn vectors_path() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("vectors/calc_vectors.json")
    }

    #[test]
    fn vectors_match_checked_in_file() {
        let computed = generate();
        let json = serde_json::to_string_pretty(&computed).expect("serialize vectors");

        if std::env::var("GEN_VECTORS").as_deref() == Ok("1") {
            std::fs::create_dir_all(vectors_path().parent().unwrap()).unwrap();
            std::fs::write(vectors_path(), json + "\n").expect("write vectors file");
            return;
        }

        let on_disk = std::fs::read_to_string(vectors_path()).expect(
            "vectors/calc_vectors.json missing — regenerate with GEN_VECTORS=1 cargo test -p lightweight-calc vectors_match",
        );
        let parsed: Vectors = serde_json::from_str(&on_disk).expect("parse checked-in vectors");
        assert_eq!(
            parsed, computed,
            "checked-in vectors drifted from crates/calc — if the policy change is intentional, regenerate with GEN_VECTORS=1 and update TS/Swift consumers"
        );
    }
}
