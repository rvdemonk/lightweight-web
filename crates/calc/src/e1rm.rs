use serde::Serialize;

/// A single working set's data — the minimal input for e1RM calculation.
#[derive(Debug, Clone, Serialize)]
pub struct SetData {
    pub weight_kg: f64,
    pub reps: i64,
}

/// Epley formula e1RM on RAW REPS ONLY (policy decision 2026-07-13).
///
/// RIR is deliberately NOT folded into reps: a subjective "one left in the
/// tank" must never outrank an actual grinder in PR math (the 12×62.5@RIR1
/// vs 11×65@RIR0 incline-bench bug). RIR stays logged as context only.
pub fn e1rm(weight_kg: f64, reps: i64) -> f64 {
    weight_kg * (1.0 + reps as f64 / 30.0)
}

/// Round to 1 decimal place (standard display precision for e1RM values).
pub fn round(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
}

/// Find the best e1RM from a collection of sets. Returns None if empty.
pub fn best(sets: &[SetData]) -> Option<f64> {
    sets.iter()
        .map(|s| e1rm(s.weight_kg, s.reps))
        .fold(None, |best, val| match best {
            Some(b) if b >= val => Some(b),
            _ => Some(val),
        })
}

/// Smallest rep count at `weight_kg` whose e1RM STRICTLY beats `target`
/// (a tie is not a PR). None when inputs are invalid or the answer exceeds
/// 30 reps — Epley is meaningless out there; pick a heavier weight.
///
/// Semantics match iOS `Calc.repsToBeat` (the reference implementation,
/// shipped 2026-07-14) including the float-edge guard: when the target sits
/// exactly on an integer rep count, strictness demands one more.
pub fn reps_to_beat(target: f64, weight_kg: f64) -> Option<i64> {
    if weight_kg <= 0.0 || target <= 0.0 {
        return None;
    }
    let mut reps = std::cmp::max(1, (30.0 * (target / weight_kg - 1.0)).floor() as i64 + 1);
    // Float-edge guard: land ON the target → one more rep.
    if e1rm(weight_kg, reps) <= target {
        reps += 1;
    }
    if reps <= 30 { Some(reps) } else { None }
}

/// Compute percentage change between two values. Returns None if previous is zero.
pub fn pct_change(current: f64, previous: f64) -> Option<f64> {
    if previous == 0.0 {
        return None;
    }
    Some(((current - previous) / previous) * 100.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------------------------------------------------------------
    // e1rm formula — raw reps only
    // ---------------------------------------------------------------

    #[test]
    fn epley_basic() {
        // 100kg x 10 reps => 100 * (1 + 10/30) = 133.33...
        let result = e1rm(100.0, 10);
        assert!((result - 133.333).abs() < 0.01);
    }

    #[test]
    fn epley_single_rep() {
        // 1RM: weight * (1 + 1/30) = weight * 1.0333
        let result = e1rm(100.0, 1);
        assert!((result - 103.333).abs() < 0.01);
    }

    #[test]
    fn epley_zero_weight() {
        assert_eq!(e1rm(0.0, 10), 0.0);
    }

    #[test]
    fn epley_zero_reps() {
        // weight * (1 + 0/30) = weight
        assert_eq!(e1rm(100.0, 0), 100.0);
    }

    #[test]
    fn epley_very_high_reps() {
        // 50kg x 100 reps => 50 * (1 + 100/30) = 216.667
        let result = e1rm(50.0, 100);
        assert!((result - 216.667).abs() < 0.01);
    }

    #[test]
    fn epley_known_reference_values() {
        // 60kg x 5 => 60 * 7/6 = 70.0
        assert!((e1rm(60.0, 5) - 70.0).abs() < 0.001);
        // 150kg x 3 => 150 * 1.1 = 165.0
        assert!((e1rm(150.0, 3) - 165.0).abs() < 0.001);
        // 200kg x 1 => 206.667
        assert!((e1rm(200.0, 1) - 206.667).abs() < 0.01);
    }

    #[test]
    fn raw_reps_policy_grinder_beats_rir_guess() {
        // THE policy regression case (found 2026-07-13, incline barbell bench):
        // under the old RIR-folding policy, 12×62.5@RIR1 (e1RM 89.6) invisibly
        // outranked an actual grinder 11×65@RIR0 (88.8). Raw reps: the grinder wins.
        let grinder = e1rm(65.0, 11); // 88.833
        let rir_set = e1rm(62.5, 12); // 87.5 — RIR ignored
        assert!(grinder > rir_set, "raw-reps: 11×65 must beat 12×62.5");
        assert!((grinder - 88.833).abs() < 0.01);
        assert!((rir_set - 87.5).abs() < 0.001);
    }

    #[test]
    fn epley_negative_weight() {
        // Not physically meaningful but the formula handles it mathematically
        let result = e1rm(-50.0, 5);
        assert!((result - (-58.333)).abs() < 0.01);
    }

    // ---------------------------------------------------------------
    // round
    // ---------------------------------------------------------------

    #[test]
    fn round_one_decimal() {
        assert_eq!(round(133.333), 133.3);
        assert_eq!(round(133.35), 133.4);
        assert_eq!(round(100.0), 100.0);
    }

    #[test]
    fn round_zero() {
        assert_eq!(round(0.0), 0.0);
    }

    #[test]
    fn round_negative_values() {
        assert_eq!(round(-5.55), -5.6);
        assert_eq!(round(-5.56), -5.6);
        assert_eq!(round(-5.54), -5.5);
    }

    #[test]
    fn round_half_up_boundary() {
        assert_eq!(round(10.05), 10.1);
        assert_eq!(round(10.15), 10.2);
    }

    #[test]
    fn round_large_value() {
        assert_eq!(round(9999.99), 10000.0);
        assert_eq!(round(1234.56), 1234.6);
    }

    // ---------------------------------------------------------------
    // best
    // ---------------------------------------------------------------

    #[test]
    fn best_from_sets() {
        let sets = vec![
            SetData { weight_kg: 80.0, reps: 10 },  // 106.67
            SetData { weight_kg: 100.0, reps: 5 },  // 116.67
            SetData { weight_kg: 90.0, reps: 8 },   // 114.0
        ];
        let result = best(&sets).unwrap();
        assert!((result - 116.667).abs() < 0.01);
    }

    #[test]
    fn best_empty() {
        assert!(best(&[]).is_none());
    }

    #[test]
    fn best_single_set() {
        let sets = vec![SetData { weight_kg: 100.0, reps: 5 }];
        let result = best(&sets).unwrap();
        assert!((result - 116.667).abs() < 0.01);
    }

    #[test]
    fn best_all_identical() {
        let sets = vec![
            SetData { weight_kg: 80.0, reps: 8 },
            SetData { weight_kg: 80.0, reps: 8 },
        ];
        let result = best(&sets).unwrap();
        assert!((result - 101.333).abs() < 0.01);
    }

    #[test]
    fn best_all_zero_weight() {
        let sets = vec![
            SetData { weight_kg: 0.0, reps: 10 },
            SetData { weight_kg: 0.0, reps: 5 },
        ];
        assert_eq!(best(&sets).unwrap(), 0.0);
    }

    #[test]
    fn best_first_set_is_winner() {
        let sets = vec![
            SetData { weight_kg: 100.0, reps: 10 },
            SetData { weight_kg: 70.0, reps: 5 },
        ];
        let result = best(&sets).unwrap();
        assert!((result - 133.333).abs() < 0.01);
    }

    // ---------------------------------------------------------------
    // reps_to_beat — semantics pinned to iOS Calc.repsToBeat
    // ---------------------------------------------------------------

    #[test]
    fn reps_to_beat_same_weight_one_more_rep() {
        // Seated-incline-curl case: best 12.5×14 → e1RM 18.333
        let target = e1rm(12.5, 14);
        assert_eq!(reps_to_beat(target, 12.5), Some(15));
    }

    #[test]
    fn reps_to_beat_heavier_weight() {
        // 15kg: 7 reps = 18.5 > 18.333
        let target = e1rm(12.5, 14);
        assert_eq!(reps_to_beat(target, 15.0), Some(7));
    }

    #[test]
    fn reps_to_beat_over_30_suppressed() {
        let target = e1rm(12.5, 14);
        assert_eq!(reps_to_beat(target, 5.0), None);
    }

    #[test]
    fn reps_to_beat_weight_above_target() {
        // Weight alone beats the target e1RM: 1 rep suffices
        assert_eq!(reps_to_beat(50.0, 100.0), Some(1));
    }

    #[test]
    fn reps_to_beat_exact_integer_edge_needs_strict() {
        // target = e1rm(100, 10) = 133.333...; at 100kg, 10 reps only TIES → 11
        let target = e1rm(100.0, 10);
        assert_eq!(reps_to_beat(target, 100.0), Some(11));
    }

    #[test]
    fn reps_to_beat_invalid_inputs() {
        assert_eq!(reps_to_beat(0.0, 100.0), None);
        assert_eq!(reps_to_beat(-5.0, 100.0), None);
        assert_eq!(reps_to_beat(100.0, 0.0), None);
        assert_eq!(reps_to_beat(100.0, -5.0), None);
    }

    #[test]
    fn reps_to_beat_exactly_30_allowed() {
        // target just under e1rm(w, 30) → answer 30, allowed
        let target = e1rm(50.0, 30) - 0.5; // 99.5
        assert_eq!(reps_to_beat(target, 50.0), Some(30));
    }

    #[test]
    fn reps_to_beat_result_actually_beats() {
        // Property check over a grid: result e1RM strictly exceeds target,
        // and result-1 does not.
        for &w in &[2.5_f64, 12.5, 20.0, 60.0, 62.5, 100.0, 142.5] {
            for &tw in &[10.0_f64, 17.1, 88.8, 116.7, 150.0] {
                if let Some(r) = reps_to_beat(tw, w) {
                    assert!(e1rm(w, r) > tw, "e1rm({w},{r}) must beat {tw}");
                    if r > 1 {
                        assert!(e1rm(w, r - 1) <= tw, "e1rm({w},{}) must not beat {tw}", r - 1);
                    }
                }
            }
        }
    }

    // ---------------------------------------------------------------
    // pct_change
    // ---------------------------------------------------------------

    #[test]
    fn pct_change_basic() {
        assert_eq!(pct_change(110.0, 100.0), Some(10.0));
        assert_eq!(pct_change(90.0, 100.0), Some(-10.0));
        assert_eq!(pct_change(100.0, 0.0), None);
    }

    #[test]
    fn pct_change_equal_values() {
        assert_eq!(pct_change(100.0, 100.0), Some(0.0));
    }

    #[test]
    fn pct_change_current_zero() {
        assert_eq!(pct_change(0.0, 100.0), Some(-100.0));
    }

    #[test]
    fn pct_change_both_zero() {
        assert_eq!(pct_change(0.0, 0.0), None);
    }
}
