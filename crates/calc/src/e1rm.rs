use serde::Serialize;

/// A single working set's data — the minimal input for e1RM calculation.
#[derive(Debug, Clone, Serialize)]
pub struct SetData {
    pub weight_kg: f64,
    pub reps: i64,
    pub rir: Option<i64>,
}

/// Epley formula e1RM with optional RIR adjustment.
/// When RIR is known, effective reps = reps + rir for a more accurate estimate.
pub fn e1rm(weight_kg: f64, reps: i64, rir: Option<i64>) -> f64 {
    let effective_reps = reps + rir.unwrap_or(0);
    weight_kg * (1.0 + effective_reps as f64 / 30.0)
}

/// Round to 1 decimal place (standard display precision for e1RM values).
pub fn round(value: f64) -> f64 {
    (value * 10.0).round() / 10.0
}

/// Find the best e1RM from a collection of sets. Returns None if empty.
pub fn best(sets: &[SetData]) -> Option<f64> {
    sets.iter()
        .map(|s| e1rm(s.weight_kg, s.reps, s.rir))
        .fold(None, |best, val| match best {
            Some(b) if b >= val => Some(b),
            _ => Some(val),
        })
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
    // e1rm formula
    // ---------------------------------------------------------------

    #[test]
    fn epley_basic() {
        // 100kg x 10 reps => 100 * (1 + 10/30) = 133.33...
        let result = e1rm(100.0, 10, None);
        assert!((result - 133.333).abs() < 0.01);
    }

    #[test]
    fn epley_with_rir() {
        // 100kg x 8 reps, 2 RIR => effective 10 reps => same as above
        let result = e1rm(100.0, 8, Some(2));
        assert!((result - 133.333).abs() < 0.01);
    }

    #[test]
    fn epley_single_rep() {
        // 1RM: weight * (1 + 1/30) = weight * 1.0333
        let result = e1rm(100.0, 1, None);
        assert!((result - 103.333).abs() < 0.01);
    }

    #[test]
    fn epley_rir_zero_equivalent_to_none() {
        // RIR of 0 should produce the same result as None
        let with_none = e1rm(100.0, 5, None);
        let with_zero = e1rm(100.0, 5, Some(0));
        assert_eq!(with_none, with_zero);
    }

    #[test]
    fn epley_zero_weight() {
        // 0kg x 10 reps => 0 * (1 + 10/30) = 0
        assert_eq!(e1rm(0.0, 10, None), 0.0);
    }

    #[test]
    fn epley_zero_reps() {
        // weight * (1 + 0/30) = weight * 1.0 = weight
        assert_eq!(e1rm(100.0, 0, None), 100.0);
    }

    #[test]
    fn epley_zero_weight_and_zero_reps() {
        assert_eq!(e1rm(0.0, 0, None), 0.0);
    }

    #[test]
    fn epley_very_high_weight() {
        // 500kg x 1 rep => 500 * (1 + 1/30) = 516.667
        let result = e1rm(500.0, 1, None);
        assert!((result - 516.667).abs() < 0.01);
    }

    #[test]
    fn epley_very_high_reps() {
        // 50kg x 100 reps => 50 * (1 + 100/30) = 50 * 4.333 = 216.667
        let result = e1rm(50.0, 100, None);
        assert!((result - 216.667).abs() < 0.01);
    }

    #[test]
    fn epley_known_reference_values() {
        // Standard Epley reference: weight * (1 + reps/30)
        // 60kg x 5 => 60 * (1 + 5/30) = 60 * 7/6 = 70.0
        assert!((e1rm(60.0, 5, None) - 70.0).abs() < 0.001);

        // 150kg x 3 => 150 * (1 + 3/30) = 150 * 1.1 = 165.0
        assert!((e1rm(150.0, 3, None) - 165.0).abs() < 0.001);

        // 200kg x 1 => 200 * (1 + 1/30) = 206.667
        assert!((e1rm(200.0, 1, None) - 206.667).abs() < 0.01);
    }

    #[test]
    fn epley_rir_adds_to_reps() {
        // 80kg x 5 reps, 3 RIR => effective 8 reps
        // 80 * (1 + 8/30) = 80 * 38/30 = 101.333
        let result = e1rm(80.0, 5, Some(3));
        assert!((result - 101.333).abs() < 0.01);

        // Same result as doing 8 reps with no RIR
        let equivalent = e1rm(80.0, 8, None);
        assert_eq!(result, equivalent);
    }

    #[test]
    fn epley_negative_weight() {
        // Not physically meaningful but the formula handles it mathematically
        let result = e1rm(-50.0, 5, None);
        // -50 * (1 + 5/30) = -50 * 7/6 = -58.333
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
        // Rust's f64::round() rounds half away from zero: -55.5 => -56
        assert_eq!(round(-5.55), -5.6);
        assert_eq!(round(-5.56), -5.6);
        assert_eq!(round(-5.54), -5.5);
    }

    #[test]
    fn round_already_one_decimal() {
        assert_eq!(round(99.9), 99.9);
        assert_eq!(round(0.1), 0.1);
    }

    #[test]
    fn round_half_up_boundary() {
        // .x50 should round up (banker's rounding not used here; f64 round uses "round half to even"
        // but for .x5 the result depends on float representation)
        assert_eq!(round(10.05), 10.1); // 10.05 * 10 = 100.5, rounds to 100 or 101 depending on float
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
            SetData { weight_kg: 80.0, reps: 10, rir: None },
            SetData { weight_kg: 100.0, reps: 5, rir: None },
            SetData { weight_kg: 90.0, reps: 8, rir: Some(2) },
        ];
        // 80*(1+10/30) = 106.67
        // 100*(1+5/30) = 116.67
        // 90*(1+10/30) = 120.0
        let result = best(&sets).unwrap();
        assert!((result - 120.0).abs() < 0.01);
    }

    #[test]
    fn best_empty() {
        assert!(best(&[]).is_none());
    }

    #[test]
    fn best_single_set() {
        let sets = vec![SetData { weight_kg: 100.0, reps: 5, rir: None }];
        let result = best(&sets).unwrap();
        // 100 * (1 + 5/30) = 116.667
        assert!((result - 116.667).abs() < 0.01);
    }

    #[test]
    fn best_all_identical() {
        let sets = vec![
            SetData { weight_kg: 80.0, reps: 8, rir: None },
            SetData { weight_kg: 80.0, reps: 8, rir: None },
            SetData { weight_kg: 80.0, reps: 8, rir: None },
        ];
        // All produce 80*(1+8/30) = 101.333
        let result = best(&sets).unwrap();
        assert!((result - 101.333).abs() < 0.01);
    }

    #[test]
    fn best_with_zero_weight_sets() {
        let sets = vec![
            SetData { weight_kg: 0.0, reps: 10, rir: None },
            SetData { weight_kg: 50.0, reps: 5, rir: None },
        ];
        // 0 vs 50*(1+5/30) = 58.333
        let result = best(&sets).unwrap();
        assert!((result - 58.333).abs() < 0.01);
    }

    #[test]
    fn best_all_zero_weight() {
        let sets = vec![
            SetData { weight_kg: 0.0, reps: 10, rir: None },
            SetData { weight_kg: 0.0, reps: 5, rir: None },
        ];
        let result = best(&sets).unwrap();
        assert_eq!(result, 0.0);
    }

    #[test]
    fn best_rir_makes_winner() {
        // Without RIR: 80 * (1 + 5/30) = 93.333
        // With RIR 5:  80 * (1 + 10/30) = 106.667
        let sets = vec![
            SetData { weight_kg: 80.0, reps: 5, rir: None },
            SetData { weight_kg: 80.0, reps: 5, rir: Some(5) },
        ];
        let result = best(&sets).unwrap();
        assert!((result - 106.667).abs() < 0.01);
    }

    #[test]
    fn best_last_set_is_winner() {
        let sets = vec![
            SetData { weight_kg: 60.0, reps: 5, rir: None },
            SetData { weight_kg: 70.0, reps: 5, rir: None },
            SetData { weight_kg: 100.0, reps: 10, rir: None },
        ];
        // Last: 100*(1+10/30) = 133.333
        let result = best(&sets).unwrap();
        assert!((result - 133.333).abs() < 0.01);
    }

    #[test]
    fn best_first_set_is_winner() {
        let sets = vec![
            SetData { weight_kg: 100.0, reps: 10, rir: None },
            SetData { weight_kg: 70.0, reps: 5, rir: None },
            SetData { weight_kg: 60.0, reps: 5, rir: None },
        ];
        let result = best(&sets).unwrap();
        assert!((result - 133.333).abs() < 0.01);
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
    fn pct_change_doubling() {
        assert_eq!(pct_change(200.0, 100.0), Some(100.0));
    }

    #[test]
    fn pct_change_halving() {
        assert_eq!(pct_change(50.0, 100.0), Some(-50.0));
    }

    #[test]
    fn pct_change_current_zero() {
        // current is 0 but previous is non-zero => -100%
        assert_eq!(pct_change(0.0, 100.0), Some(-100.0));
    }

    #[test]
    fn pct_change_both_zero() {
        // previous is 0 => None (division by zero)
        assert_eq!(pct_change(0.0, 0.0), None);
    }

    #[test]
    fn pct_change_negative_previous() {
        // Negative previous is not physically meaningful, but mathematically:
        // (50 - (-100)) / (-100) * 100 = 150 / -100 * 100 = -150
        let result = pct_change(50.0, -100.0).unwrap();
        assert!((result - (-150.0)).abs() < 0.001);
    }

    #[test]
    fn pct_change_small_improvement() {
        // 101 vs 100 => 1%
        let result = pct_change(101.0, 100.0).unwrap();
        assert!((result - 1.0).abs() < 0.001);
    }

    #[test]
    fn pct_change_very_large_improvement() {
        // 1000 vs 1 => 99900%
        let result = pct_change(1000.0, 1.0).unwrap();
        assert!((result - 99900.0).abs() < 0.001);
    }
}
