use std::collections::HashMap;

use crate::e1rm;

/// A set with enough context for PR detection — must be ordered chronologically.
#[derive(Debug, Clone)]
pub struct TimedSet {
    pub exercise_id: i64,
    pub set_number: i32,
    pub weight_kg: f64,
    pub reps: i64,
    pub rir: Option<i64>,
    pub date: String,
}

/// PR flags for a single date.
#[derive(Debug, Clone)]
pub struct DayPR {
    pub date: String,
    pub has_absolute_pr: bool,
    pub has_set_pr: bool,
}

/// Scan chronologically-ordered sets and detect PR dates.
/// Only reports PRs on or after `cutoff_date`, but processes all sets for running bests.
/// Single-pass O(n) over all sets, maintaining running maximums per exercise.
pub fn detect_prs(sets: &[TimedSet], cutoff_date: &str) -> Vec<DayPR> {
    let mut best_absolute: HashMap<i64, f64> = HashMap::new();
    let mut best_by_pos: HashMap<i64, HashMap<i32, f64>> = HashMap::new();
    let mut day_prs: HashMap<String, (bool, bool)> = HashMap::new();

    for s in sets {
        let e = e1rm::e1rm(s.weight_kg, s.reps, s.rir);

        let abs_best = best_absolute.entry(s.exercise_id).or_insert(0.0);
        let pos_map = best_by_pos.entry(s.exercise_id).or_default();
        let pos_best = pos_map.entry(s.set_number).or_insert(0.0);

        if s.date.as_str() >= cutoff_date {
            if e > *abs_best && *abs_best > 0.0 {
                let entry = day_prs.entry(s.date.clone()).or_insert((false, false));
                entry.0 = true;
            } else if e > *pos_best && *pos_best > 0.0 {
                let entry = day_prs.entry(s.date.clone()).or_insert((false, false));
                entry.1 = true;
            }
        }

        if e > *abs_best {
            *abs_best = e;
        }
        if e > *pos_best {
            *pos_best = e;
        }
    }

    let mut result: Vec<DayPR> = day_prs
        .into_iter()
        .map(|(date, (abs, set))| DayPR {
            date,
            has_absolute_pr: abs,
            has_set_pr: set,
        })
        .collect();
    result.sort_by(|a, b| a.date.cmp(&b.date));
    result
}

/// Given historical sets for a single exercise (excluding the current session),
/// compute the all-time best e1RM and best e1RM per set_number position.
pub fn historical_bests(sets: &[TimedSet]) -> (Option<f64>, HashMap<i32, f64>) {
    let mut best_ever: Option<f64> = None;
    let mut best_by_position: HashMap<i32, f64> = HashMap::new();

    for s in sets {
        let e = e1rm::e1rm(s.weight_kg, s.reps, s.rir);

        if best_ever.is_none() || e > best_ever.unwrap() {
            best_ever = Some(e);
        }

        let pos_entry = best_by_position.entry(s.set_number).or_insert(0.0);
        if e > *pos_entry {
            *pos_entry = e;
        }
    }

    let best_ever = best_ever.map(e1rm::round);
    let best_by_position = best_by_position
        .into_iter()
        .map(|(k, v)| (k, e1rm::round(v)))
        .collect();

    (best_ever, best_by_position)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_set(exercise_id: i64, set_number: i32, weight: f64, reps: i64, date: &str) -> TimedSet {
        TimedSet {
            exercise_id,
            set_number,
            weight_kg: weight,
            reps,
            rir: None,
            date: date.to_string(),
        }
    }

    fn make_set_with_rir(
        exercise_id: i64,
        set_number: i32,
        weight: f64,
        reps: i64,
        rir: Option<i64>,
        date: &str,
    ) -> TimedSet {
        TimedSet {
            exercise_id,
            set_number,
            weight_kg: weight,
            reps,
            rir,
            date: date.to_string(),
        }
    }

    // ---------------------------------------------------------------
    // detect_prs
    // ---------------------------------------------------------------

    #[test]
    fn detect_absolute_pr() {
        let sets = vec![
            make_set(1, 1, 80.0, 5, "2026-01-01"),
            make_set(1, 1, 90.0, 5, "2026-01-08"), // absolute PR
            make_set(1, 1, 85.0, 5, "2026-01-15"), // no PR
        ];
        let prs = detect_prs(&sets, "2026-01-01");
        assert_eq!(prs.len(), 1);
        assert_eq!(prs[0].date, "2026-01-08");
        assert!(prs[0].has_absolute_pr);
    }

    #[test]
    fn detect_set_position_pr() {
        let sets = vec![
            make_set(1, 1, 80.0, 5, "2026-01-01"),
            make_set(1, 2, 75.0, 5, "2026-01-01"),
            make_set(1, 1, 78.0, 5, "2026-01-08"), // no PR on set 1
            make_set(1, 2, 78.0, 5, "2026-01-08"), // set position PR on set 2
        ];
        let prs = detect_prs(&sets, "2026-01-01");
        assert_eq!(prs.len(), 1);
        assert_eq!(prs[0].date, "2026-01-08");
        assert!(!prs[0].has_absolute_pr);
        assert!(prs[0].has_set_pr);
    }

    #[test]
    fn cutoff_filters_reporting() {
        let sets = vec![
            make_set(1, 1, 80.0, 5, "2026-01-01"),
            make_set(1, 1, 90.0, 5, "2026-01-08"),
            make_set(1, 1, 95.0, 5, "2026-02-01"),
        ];
        // Only report PRs from Feb onwards
        let prs = detect_prs(&sets, "2026-02-01");
        assert_eq!(prs.len(), 1);
        assert_eq!(prs[0].date, "2026-02-01");
    }

    #[test]
    fn detect_prs_empty_input() {
        let prs = detect_prs(&[], "2026-01-01");
        assert!(prs.is_empty());
    }

    #[test]
    fn detect_prs_single_session_no_prs() {
        // First session ever — no prior history means abs_best is 0.0
        // PR requires abs_best > 0.0 (prior history), so first session never generates PRs
        let sets = vec![
            make_set(1, 1, 100.0, 5, "2026-01-01"),
            make_set(1, 2, 95.0, 5, "2026-01-01"),
        ];
        let prs = detect_prs(&sets, "2026-01-01");
        assert!(prs.is_empty());
    }

    #[test]
    fn detect_prs_multiple_exercises_interleaved() {
        // Two exercises, interleaved chronologically
        let sets = vec![
            // Day 1: exercise 1 and 2 baselines
            make_set(1, 1, 80.0, 5, "2026-01-01"),
            make_set(2, 1, 60.0, 8, "2026-01-01"),
            // Day 2: exercise 1 PR, exercise 2 no PR
            make_set(1, 1, 90.0, 5, "2026-01-08"),
            make_set(2, 1, 55.0, 8, "2026-01-08"),
            // Day 3: exercise 2 PR, exercise 1 no PR
            make_set(1, 1, 85.0, 5, "2026-01-15"),
            make_set(2, 1, 70.0, 8, "2026-01-15"),
        ];
        let prs = detect_prs(&sets, "2026-01-01");
        assert_eq!(prs.len(), 2);
        // Day 2: exercise 1 absolute PR
        assert_eq!(prs[0].date, "2026-01-08");
        assert!(prs[0].has_absolute_pr);
        // Day 3: exercise 2 absolute PR
        assert_eq!(prs[1].date, "2026-01-15");
        assert!(prs[1].has_absolute_pr);
    }

    #[test]
    fn detect_prs_same_date_both_absolute_and_set() {
        // Day 1: baseline with 2 set positions
        let sets = vec![
            make_set(1, 1, 80.0, 5, "2026-01-01"),
            make_set(1, 2, 70.0, 5, "2026-01-01"),
            // Day 2: set 1 gets absolute PR, set 2 gets set-position PR (not absolute)
            make_set(1, 1, 100.0, 5, "2026-01-08"), // absolute PR
            make_set(1, 2, 75.0, 5, "2026-01-08"),  // set position PR (but not absolute since 100>75)
        ];
        let prs = detect_prs(&sets, "2026-01-01");
        assert_eq!(prs.len(), 1);
        assert_eq!(prs[0].date, "2026-01-08");
        assert!(prs[0].has_absolute_pr);
        assert!(prs[0].has_set_pr);
    }

    #[test]
    fn detect_prs_cutoff_excludes_earlier_dates() {
        let sets = vec![
            make_set(1, 1, 50.0, 5, "2026-01-01"),
            make_set(1, 1, 60.0, 5, "2026-01-08"), // PR but before cutoff
            make_set(1, 1, 55.0, 5, "2026-01-15"), // after cutoff, no PR
        ];
        let prs = detect_prs(&sets, "2026-01-15");
        assert!(prs.is_empty());
    }

    #[test]
    fn detect_prs_progressive_overload_multiple_prs() {
        // Each session is heavier: constant PRs
        let sets = vec![
            make_set(1, 1, 60.0, 5, "2026-01-01"),
            make_set(1, 1, 70.0, 5, "2026-01-08"),
            make_set(1, 1, 80.0, 5, "2026-01-15"),
            make_set(1, 1, 90.0, 5, "2026-01-22"),
        ];
        let prs = detect_prs(&sets, "2026-01-01");
        assert_eq!(prs.len(), 3);
        assert_eq!(prs[0].date, "2026-01-08");
        assert_eq!(prs[1].date, "2026-01-15");
        assert_eq!(prs[2].date, "2026-01-22");
    }

    #[test]
    fn detect_prs_equal_e1rm_is_not_pr() {
        // Matching the best but not exceeding it should NOT be a PR
        let sets = vec![
            make_set(1, 1, 80.0, 5, "2026-01-01"),
            make_set(1, 1, 80.0, 5, "2026-01-08"), // same e1RM, not a PR
        ];
        let prs = detect_prs(&sets, "2026-01-01");
        assert!(prs.is_empty());
    }

    #[test]
    fn detect_prs_rir_affects_e1rm() {
        // Without RIR: 80 * (1 + 5/30) = 93.333
        // With RIR=3:  80 * (1 + 8/30) = 101.333 (higher e1RM)
        let sets = vec![
            make_set(1, 1, 80.0, 5, "2026-01-01"),
            // Same weight/reps but with RIR => higher e1RM => should be a PR
            make_set_with_rir(1, 1, 80.0, 5, Some(3), "2026-01-08"),
        ];
        let prs = detect_prs(&sets, "2026-01-01");
        assert_eq!(prs.len(), 1);
        assert!(prs[0].has_absolute_pr);
    }

    #[test]
    fn detect_prs_set_pr_not_absolute() {
        // Set 1 baseline at 100, set 2 baseline at 80
        // Later: set 1 at 90 (no PR), set 2 at 85 (set-position PR, but not absolute)
        let sets = vec![
            make_set(1, 1, 100.0, 5, "2026-01-01"),
            make_set(1, 2, 80.0, 5, "2026-01-01"),
            make_set(1, 1, 90.0, 5, "2026-01-08"),
            make_set(1, 2, 85.0, 5, "2026-01-08"),
        ];
        let prs = detect_prs(&sets, "2026-01-01");
        assert_eq!(prs.len(), 1);
        assert!(!prs[0].has_absolute_pr);
        assert!(prs[0].has_set_pr);
    }

    #[test]
    fn detect_prs_results_sorted_by_date() {
        let sets = vec![
            make_set(1, 1, 50.0, 5, "2026-01-01"),
            make_set(2, 1, 40.0, 5, "2026-01-01"),
            make_set(2, 1, 50.0, 5, "2026-01-08"), // exercise 2 PR
            make_set(1, 1, 60.0, 5, "2026-01-15"), // exercise 1 PR
        ];
        let prs = detect_prs(&sets, "2026-01-01");
        assert_eq!(prs.len(), 2);
        assert!(prs[0].date < prs[1].date);
    }

    #[test]
    fn detect_prs_set_positions_1_through_5() {
        // 5 set positions on day 1, then all improve on day 2
        let mut sets = Vec::new();
        for pos in 1..=5 {
            sets.push(make_set(1, pos, 60.0, 5, "2026-01-01"));
        }
        for pos in 1..=5 {
            sets.push(make_set(1, pos, 70.0, 5, "2026-01-08"));
        }
        let prs = detect_prs(&sets, "2026-01-01");
        assert_eq!(prs.len(), 1);
        assert_eq!(prs[0].date, "2026-01-08");
        // The first set on day 2 triggers absolute PR; remaining sets trigger set-position PRs
        assert!(prs[0].has_absolute_pr);
        assert!(prs[0].has_set_pr);
    }

    #[test]
    fn detect_prs_zero_weight_sets() {
        // Bodyweight exercises (weight = 0): e1RM = 0
        // PR requires > 0.0, but 0 is never > 0 so no PRs
        let sets = vec![
            make_set(1, 1, 0.0, 10, "2026-01-01"),
            make_set(1, 1, 0.0, 15, "2026-01-08"),
        ];
        let prs = detect_prs(&sets, "2026-01-01");
        assert!(prs.is_empty());
    }

    // ---------------------------------------------------------------
    // historical_bests
    // ---------------------------------------------------------------

    #[test]
    fn historical_bests_basic() {
        let sets = vec![
            make_set(1, 1, 100.0, 5, "2026-01-01"),
            make_set(1, 2, 95.0, 8, "2026-01-01"),
            make_set(1, 1, 90.0, 10, "2026-01-08"),
        ];
        let (best, by_pos) = historical_bests(&sets);
        // 100*(1+5/30) = 116.7, 95*(1+8/30) = 120.3, 90*(1+10/30) = 120.0
        assert_eq!(best, Some(120.3));
        assert_eq!(*by_pos.get(&1).unwrap(), 120.0); // best for set 1
        assert_eq!(*by_pos.get(&2).unwrap(), 120.3); // best for set 2
    }

    #[test]
    fn historical_bests_empty_input() {
        let (best, by_pos) = historical_bests(&[]);
        assert_eq!(best, None);
        assert!(by_pos.is_empty());
    }

    #[test]
    fn historical_bests_single_set() {
        let sets = vec![make_set(1, 1, 100.0, 5, "2026-01-01")];
        let (best, by_pos) = historical_bests(&sets);
        // 100 * (1 + 5/30) = 116.667 => rounded to 116.7
        assert_eq!(best, Some(116.7));
        assert_eq!(by_pos.len(), 1);
        assert_eq!(*by_pos.get(&1).unwrap(), 116.7);
    }

    #[test]
    fn historical_bests_multiple_positions() {
        let sets = vec![
            make_set(1, 1, 100.0, 5, "2026-01-01"),
            make_set(1, 2, 95.0, 5, "2026-01-01"),
            make_set(1, 3, 90.0, 5, "2026-01-01"),
            make_set(1, 4, 85.0, 5, "2026-01-01"),
            make_set(1, 5, 80.0, 5, "2026-01-01"),
        ];
        let (best, by_pos) = historical_bests(&sets);
        // best = 100*(1+5/30) = 116.667 => 116.7
        assert_eq!(best, Some(116.7));
        assert_eq!(by_pos.len(), 5);
        // Each position has exactly one entry
        assert_eq!(*by_pos.get(&1).unwrap(), 116.7);
        assert_eq!(*by_pos.get(&2).unwrap(), 110.8); // 95*7/6 = 110.833
        assert_eq!(*by_pos.get(&3).unwrap(), 105.0); // 90*7/6 = 105.0
        assert_eq!(*by_pos.get(&4).unwrap(), 99.2);  // 85*7/6 = 99.167
        assert_eq!(*by_pos.get(&5).unwrap(), 93.3);  // 80*7/6 = 93.333
    }

    #[test]
    fn historical_bests_position_updated_over_time() {
        // Same position across multiple sessions; should keep the best
        let sets = vec![
            make_set(1, 1, 80.0, 5, "2026-01-01"),
            make_set(1, 1, 100.0, 5, "2026-01-08"),
            make_set(1, 1, 90.0, 5, "2026-01-15"),
        ];
        let (best, by_pos) = historical_bests(&sets);
        // best = 100*(1+5/30) = 116.667 => 116.7
        assert_eq!(best, Some(116.7));
        assert_eq!(*by_pos.get(&1).unwrap(), 116.7);
    }

    #[test]
    fn historical_bests_values_are_rounded() {
        // 100 * (1 + 8/30) = 126.667 => should round to 126.7
        let sets = vec![make_set(1, 1, 100.0, 8, "2026-01-01")];
        let (best, by_pos) = historical_bests(&sets);
        assert_eq!(best, Some(126.7));
        assert_eq!(*by_pos.get(&1).unwrap(), 126.7);
    }

    #[test]
    fn historical_bests_with_rir() {
        // 80kg x 5 reps, RIR 3 => effective 8 reps => 80*(1+8/30) = 101.333 => 101.3
        let sets = vec![make_set_with_rir(1, 1, 80.0, 5, Some(3), "2026-01-01")];
        let (best, by_pos) = historical_bests(&sets);
        assert_eq!(best, Some(101.3));
        assert_eq!(*by_pos.get(&1).unwrap(), 101.3);
    }

    #[test]
    fn historical_bests_zero_weight() {
        let sets = vec![make_set(1, 1, 0.0, 10, "2026-01-01")];
        let (best, by_pos) = historical_bests(&sets);
        // 0 * anything = 0
        assert_eq!(best, Some(0.0));
        assert_eq!(*by_pos.get(&1).unwrap(), 0.0);
    }

    #[test]
    fn historical_bests_heavy_single() {
        // 250kg x 1 => 250 * (1 + 1/30) = 258.333 => 258.3
        let sets = vec![make_set(1, 1, 250.0, 1, "2026-01-01")];
        let (best, _by_pos) = historical_bests(&sets);
        assert_eq!(best, Some(258.3));
    }
}
