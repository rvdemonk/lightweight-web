use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Trend {
    Up,
    Down,
    Flat,
}

impl Trend {
    pub fn as_str(&self) -> &'static str {
        match self {
            Trend::Up => "up",
            Trend::Down => "down",
            Trend::Flat => "flat",
        }
    }
}

/// Filter out deload sessions from an e1RM series (ordered most recent first).
/// A session is considered a deload if its e1RM is <85% of the series max,
/// indicating an intentional light day rather than genuine regression.
/// Returns at most 4 values after filtering.
pub fn filter_deloads(e1rms: &[f64]) -> Vec<f64> {
    if e1rms.len() < 3 {
        return e1rms.to_vec();
    }

    let max = e1rms.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let threshold = max * 0.85;

    let filtered: Vec<f64> = e1rms.iter().copied().filter(|&v| v >= threshold).collect();

    // If filtering removed too many, fall back to unfiltered
    if filtered.len() < 3 {
        e1rms.to_vec()
    } else {
        filtered.into_iter().take(4).collect()
    }
}

/// Compute trend direction from session e1RMs (ordered most recent first).
/// Requires at least 3 data points. Compares avg of last 2 vs avg of prior sessions.
/// Returns Up (>2%), Down (<-2%), or Flat.
pub fn compute_trend(e1rms: &[f64]) -> Option<Trend> {
    if e1rms.len() < 3 {
        return None;
    }
    let recent_avg = (e1rms[0] + e1rms[1]) / 2.0;
    let prior = &e1rms[2..];
    let prior_avg: f64 = prior.iter().sum::<f64>() / prior.len() as f64;

    if prior_avg == 0.0 {
        return None;
    }

    let pct = (recent_avg - prior_avg) / prior_avg;
    Some(if pct > 0.02 {
        Trend::Up
    } else if pct < -0.02 {
        Trend::Down
    } else {
        Trend::Flat
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    // ---------------------------------------------------------------
    // compute_trend
    // ---------------------------------------------------------------

    #[test]
    fn trend_up() {
        // Most recent first: 110, 108, 100, 98
        // recent_avg = (110+108)/2 = 109, prior_avg = (100+98)/2 = 99
        // pct = (109-99)/99 = 10.1% > 2% => Up
        let result = compute_trend(&[110.0, 108.0, 100.0, 98.0]);
        assert_eq!(result, Some(Trend::Up));
    }

    #[test]
    fn trend_down() {
        // Most recent first: 90, 92, 100, 102
        // recent_avg = 91, prior_avg = 101
        // pct = (91-101)/101 = -9.9% < -2% => Down
        let result = compute_trend(&[90.0, 92.0, 100.0, 102.0]);
        assert_eq!(result, Some(Trend::Down));
    }

    #[test]
    fn trend_flat() {
        // Most recent first: 100, 101, 100, 100
        // recent_avg = 100.5, prior_avg = 100
        // pct = 0.5/100 = 0.5% => Flat (within +/-2%)
        let result = compute_trend(&[100.0, 101.0, 100.0, 100.0]);
        assert_eq!(result, Some(Trend::Flat));
    }

    #[test]
    fn trend_insufficient_data() {
        assert_eq!(compute_trend(&[100.0, 101.0]), None);
        assert_eq!(compute_trend(&[100.0]), None);
        assert_eq!(compute_trend(&[]), None);
    }

    #[test]
    fn trend_exactly_three_data_points() {
        // Minimum viable input: 3 points
        // recent_avg = (110+105)/2 = 107.5, prior_avg = 100
        // pct = 7.5/100 = 7.5% => Up
        let result = compute_trend(&[110.0, 105.0, 100.0]);
        assert_eq!(result, Some(Trend::Up));
    }

    #[test]
    fn trend_exactly_at_positive_2pct_boundary() {
        // recent_avg = 102, prior_avg = 100 => pct = 2% exactly
        // Code says > 0.02 for Up, so exactly 2% should be Flat
        let result = compute_trend(&[102.0, 102.0, 100.0]);
        assert_eq!(result, Some(Trend::Flat));
    }

    #[test]
    fn trend_just_above_positive_2pct_boundary() {
        // recent_avg = 102.05, prior_avg = 100 => pct = 2.05% > 2% => Up
        let result = compute_trend(&[102.1, 102.0, 100.0]);
        assert_eq!(result, Some(Trend::Up));
    }

    #[test]
    fn trend_exactly_at_negative_2pct_boundary() {
        // recent_avg = 98, prior_avg = 100 => pct = -2% exactly
        // Code says < -0.02 for Down, so exactly -2% should be Flat
        let result = compute_trend(&[98.0, 98.0, 100.0]);
        assert_eq!(result, Some(Trend::Flat));
    }

    #[test]
    fn trend_just_below_negative_2pct_boundary() {
        // recent_avg = 97.9, prior_avg = 100 => pct = -2.1% < -2% => Down
        let result = compute_trend(&[97.9, 97.9, 100.0]);
        assert_eq!(result, Some(Trend::Down));
    }

    #[test]
    fn trend_all_identical_values() {
        // recent_avg = 100, prior_avg = 100 => pct = 0% => Flat
        let result = compute_trend(&[100.0, 100.0, 100.0, 100.0]);
        assert_eq!(result, Some(Trend::Flat));
    }

    #[test]
    fn trend_large_series_8_values() {
        // recent_avg = (120+118)/2 = 119
        // prior_avg = (100+98+95+102+99+97)/6 = 591/6 = 98.5
        // pct = (119-98.5)/98.5 = 20.5/98.5 = 20.8% => Up
        let result = compute_trend(&[120.0, 118.0, 100.0, 98.0, 95.0, 102.0, 99.0, 97.0]);
        assert_eq!(result, Some(Trend::Up));
    }

    #[test]
    fn trend_prior_avg_zero() {
        // If prior values are all zero, prior_avg = 0 => return None
        let result = compute_trend(&[100.0, 100.0, 0.0, 0.0]);
        assert_eq!(result, None);
    }

    #[test]
    fn trend_as_str() {
        assert_eq!(Trend::Up.as_str(), "up");
        assert_eq!(Trend::Down.as_str(), "down");
        assert_eq!(Trend::Flat.as_str(), "flat");
    }

    #[test]
    fn trend_many_prior_points_dilute() {
        // recent_avg = (110+108)/2 = 109
        // prior has 6 values: [100, 100, 100, 100, 100, 100], avg = 100
        // pct = 9/100 = 9% => Up
        let result = compute_trend(&[110.0, 108.0, 100.0, 100.0, 100.0, 100.0, 100.0, 100.0]);
        assert_eq!(result, Some(Trend::Up));
    }

    // ---------------------------------------------------------------
    // filter_deloads
    // ---------------------------------------------------------------

    #[test]
    fn deload_filtering() {
        // 100, 80 (deload at 80%), 98, 95
        let result = filter_deloads(&[100.0, 80.0, 98.0, 95.0]);
        assert_eq!(result, vec![100.0, 98.0, 95.0]);
    }

    #[test]
    fn deload_preserves_when_all_close() {
        let result = filter_deloads(&[100.0, 95.0, 90.0, 88.0]);
        assert_eq!(result, vec![100.0, 95.0, 90.0, 88.0]);
    }

    #[test]
    fn deload_fallback_when_too_many_filtered() {
        // If filtering leaves < 3, return original
        let result = filter_deloads(&[100.0, 50.0, 48.0]);
        assert_eq!(result, vec![100.0, 50.0, 48.0]);
    }

    #[test]
    fn deload_short_series() {
        let result = filter_deloads(&[100.0, 95.0]);
        assert_eq!(result, vec![100.0, 95.0]);
    }

    #[test]
    fn deload_empty_input() {
        let result = filter_deloads(&[]);
        assert_eq!(result, Vec::<f64>::new());
    }

    #[test]
    fn deload_single_element() {
        let result = filter_deloads(&[100.0]);
        assert_eq!(result, vec![100.0]);
    }

    #[test]
    fn deload_exactly_at_85pct_threshold() {
        // max = 100, threshold = 85.0
        // Value of exactly 85.0 should be kept (>= threshold)
        let result = filter_deloads(&[100.0, 85.0, 90.0, 95.0]);
        assert_eq!(result, vec![100.0, 85.0, 90.0, 95.0]);
    }

    #[test]
    fn deload_just_below_85pct_threshold() {
        // max = 100, threshold = 85.0
        // 84.9 < 85.0 => filtered out
        let result = filter_deloads(&[100.0, 84.9, 90.0, 95.0]);
        assert_eq!(result, vec![100.0, 90.0, 95.0]);
    }

    #[test]
    fn deload_all_except_one_are_deloads() {
        // max = 100, threshold = 85
        // Only 100 survives filtering => filtered.len() = 1 < 3 => fallback
        let result = filter_deloads(&[100.0, 50.0, 60.0, 70.0]);
        assert_eq!(result, vec![100.0, 50.0, 60.0, 70.0]);
    }

    #[test]
    fn deload_truncates_to_4_after_filtering() {
        // 6 values, all above 85% of max (100) => filtered keeps all
        // But take(4) limits to 4
        let result = filter_deloads(&[100.0, 98.0, 96.0, 94.0, 92.0, 90.0]);
        assert_eq!(result, vec![100.0, 98.0, 96.0, 94.0]);
    }

    #[test]
    fn deload_exactly_3_values_all_above_threshold() {
        let result = filter_deloads(&[100.0, 95.0, 90.0]);
        assert_eq!(result, vec![100.0, 95.0, 90.0]);
    }

    #[test]
    fn deload_all_identical_values() {
        // max = 100, threshold = 85, all values = 100 => all kept
        let result = filter_deloads(&[100.0, 100.0, 100.0, 100.0]);
        assert_eq!(result, vec![100.0, 100.0, 100.0, 100.0]);
    }

    #[test]
    fn deload_filters_multiple_deloads() {
        // max = 100, threshold = 85
        // 70 and 60 are deloads, leaving [100, 95, 90] (3 values, enough)
        let result = filter_deloads(&[100.0, 70.0, 95.0, 60.0, 90.0]);
        assert_eq!(result, vec![100.0, 95.0, 90.0]);
    }

    #[test]
    fn deload_two_elements_returns_as_is() {
        // < 3 elements => return original regardless
        let result = filter_deloads(&[100.0, 50.0]);
        assert_eq!(result, vec![100.0, 50.0]);
    }

    #[test]
    fn deload_exactly_3_with_one_deload_leaves_2_falls_back() {
        // max = 100, threshold = 85, 50 filtered => [100, 90] => only 2 < 3 => fallback
        let result = filter_deloads(&[100.0, 50.0, 90.0]);
        assert_eq!(result, vec![100.0, 50.0, 90.0]);
    }
}
