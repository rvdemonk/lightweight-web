use serde::Serialize;
use std::collections::HashMap;

use crate::db::DbPool;
use crate::error::AppError;

#[derive(Debug, Serialize)]
pub struct DayActivity {
    pub date: String,
    pub set_count: i64,
}

/// Returns set counts per day for the last N days, only days with activity.
pub fn activity_heatmap(db: &DbPool, user_id: i64, days: i64) -> Result<Vec<DayActivity>, AppError> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT date(s2.completed_at) as day, COUNT(*) as set_count
         FROM sets s2
         JOIN session_exercises se ON se.id = s2.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         WHERE s.user_id = ?1
           AND s2.completed_at >= date('now', ?2)
           AND s2.set_type = 'working'
         GROUP BY day
         ORDER BY day"
    )?;

    let days_param = format!("-{} days", days);
    let rows = stmt.query_map(rusqlite::params![user_id, days_param], |row| {
        Ok(DayActivity {
            date: row.get(0)?,
            set_count: row.get(1)?,
        })
    })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

#[derive(Debug, Clone, Serialize)]
pub struct E1rmDataPoint {
    pub date: String,
    pub e1rm: f64,
    pub weight_kg: f64,
    pub reps: i64,
    pub rir: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct PersonalRecord {
    pub value: f64,
    pub date: String,
    pub detail: String,
}

#[derive(Debug, Serialize)]
pub struct ExerciseE1rm {
    pub exercise_id: i64,
    pub exercise_name: String,
    pub data: Vec<E1rmDataPoint>,
    pub prs: ExercisePRs,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub all_time_prs: Option<ExercisePRs>,
}

#[derive(Debug, Serialize)]
pub struct ExercisePRs {
    pub best_e1rm: Option<PersonalRecord>,
    pub heaviest_weight: Option<PersonalRecord>,
    pub most_reps: Option<PersonalRecord>,
}

/// Returns best e1RM per session for each exercise the user has performed.
/// Epley formula: e1rm = weight * (1 + reps / 30)
/// When RIR is recorded, effective reps = reps + rir for a more accurate estimate.
/// Optional since/until filter output to a date range (YYYY-MM-DD).
pub fn e1rm_progression(
    db: &DbPool,
    user_id: i64,
    exercise_id: i64,
    since: Option<&str>,
    until: Option<&str>,
) -> Result<ExerciseE1rm, AppError> {
    let conn = db.lock().unwrap();

    // Get exercise name
    let exercise_name: String = conn.query_row(
        "SELECT name FROM exercises WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![exercise_id, user_id],
        |row| row.get(0),
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound,
        e => AppError::Database(e),
    })?;

    // Get all working sets for this exercise across all sessions, best e1rm per session
    let mut stmt = conn.prepare(
        "SELECT date(s.started_at) as session_date,
                st.weight_kg, st.reps, st.rir
         FROM sets st
         JOIN session_exercises se ON se.id = st.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         WHERE s.user_id = ?1
           AND se.exercise_id = ?2
           AND st.set_type = 'working'
           AND st.weight_kg IS NOT NULL
           AND st.weight_kg > 0
           AND st.reps > 0
         ORDER BY s.started_at, st.id"
    )?;

    let all_sets: Vec<(String, f64, i64, Option<i64>)> = stmt.query_map(
        rusqlite::params![user_id, exercise_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    )?
        .filter_map(|r| r.ok())
        .collect();

    // Filter by date range if specified
    let filtered_sets: Vec<&(String, f64, i64, Option<i64>)> = all_sets.iter()
        .filter(|(date, _, _, _)| {
            if let Some(s) = since { if date.as_str() < s { return false; } }
            if let Some(u) = until { if date.as_str() > u { return false; } }
            true
        })
        .collect();

    // Group by session date, take best e1rm per date
    // Also track PRs across filtered sets
    let mut best_by_date: std::collections::BTreeMap<String, E1rmDataPoint> = std::collections::BTreeMap::new();

    let mut pr_e1rm: Option<(f64, String, f64, i64)> = None;       // (e1rm, date, weight, reps)
    let mut pr_weight: Option<(f64, String, i64)> = None;           // (weight, date, reps)
    let mut pr_reps: Option<(i64, String, f64)> = None;             // (reps, date, weight)

    for (date, weight, reps, rir) in filtered_sets {
        let effective_reps = match rir {
            Some(r) => reps + r,
            None => *reps,
        };
        let e1rm = weight * (1.0 + effective_reps as f64 / 30.0);

        let entry = best_by_date.entry(date.clone()).or_insert(E1rmDataPoint {
            date: date.clone(),
            e1rm: 0.0,
            weight_kg: 0.0,
            reps: 0,
            rir: None,
        });

        if e1rm > entry.e1rm {
            entry.e1rm = e1rm;
            entry.weight_kg = *weight;
            entry.reps = *reps;
            entry.rir = *rir;
        }

        // Track PRs
        if pr_e1rm.is_none() || e1rm > pr_e1rm.as_ref().unwrap().0 {
            pr_e1rm = Some((e1rm, date.clone(), *weight, *reps));
        }
        if pr_weight.is_none() || *weight > pr_weight.as_ref().unwrap().0 {
            pr_weight = Some((*weight, date.clone(), *reps));
        }
        if pr_reps.is_none() || *reps > pr_reps.as_ref().unwrap().0 {
            pr_reps = Some((*reps, date.clone(), *weight));
        }
    }

    let data: Vec<E1rmDataPoint> = best_by_date.into_values().collect();

    let prs = ExercisePRs {
        best_e1rm: pr_e1rm.map(|(e1rm, date, w, r)| PersonalRecord {
            value: (e1rm * 10.0).round() / 10.0,
            date,
            detail: format!("{:.1}kg x {}", w, r),
        }),
        heaviest_weight: pr_weight.map(|(w, date, r)| PersonalRecord {
            value: w,
            date,
            detail: format!("{} reps", r),
        }),
        most_reps: pr_reps.map(|(r, date, w)| PersonalRecord {
            value: r as f64,
            date,
            detail: format!("{:.1}kg", w),
        }),
    };

    // Compute all-time PRs when date filtering is active (for comparison)
    let has_date_filter = since.is_some() || until.is_some();
    let all_time_prs = if has_date_filter {
        let mut at_e1rm: Option<(f64, String, f64, i64)> = None;
        let mut at_weight: Option<(f64, String, i64)> = None;
        let mut at_reps: Option<(i64, String, f64)> = None;

        for (date, weight, reps, rir) in &all_sets {
            let effective_reps = match rir {
                Some(r) => reps + r,
                None => *reps,
            };
            let e1rm = weight * (1.0 + effective_reps as f64 / 30.0);

            if at_e1rm.is_none() || e1rm > at_e1rm.as_ref().unwrap().0 {
                at_e1rm = Some((e1rm, date.clone(), *weight, *reps));
            }
            if at_weight.is_none() || *weight > at_weight.as_ref().unwrap().0 {
                at_weight = Some((*weight, date.clone(), *reps));
            }
            if at_reps.is_none() || *reps > at_reps.as_ref().unwrap().0 {
                at_reps = Some((*reps, date.clone(), *weight));
            }
        }

        Some(ExercisePRs {
            best_e1rm: at_e1rm.map(|(e1rm, date, w, r)| PersonalRecord {
                value: (e1rm * 10.0).round() / 10.0,
                date,
                detail: format!("{:.1}kg x {}", w, r),
            }),
            heaviest_weight: at_weight.map(|(w, date, r)| PersonalRecord {
                value: w,
                date,
                detail: format!("{} reps", r),
            }),
            most_reps: at_reps.map(|(r, date, w)| PersonalRecord {
                value: r as f64,
                date,
                detail: format!("{:.1}kg", w),
            }),
        })
    } else {
        None
    };

    Ok(ExerciseE1rm {
        exercise_id,
        exercise_name,
        data,
        prs,
        all_time_prs,
    })
}

#[derive(Debug, Serialize)]
pub struct E1rmSpiderPoint {
    pub exercise_id: i64,
    pub exercise_name: String,
    pub pct_change: Option<f64>,
    pub current_e1rm: Option<f64>,
    pub previous_e1rm: Option<f64>,
}

/// For each exercise, computes % change in rolling-best e1RM over a given span.
/// "current" = best e1RM in the most recent `weeks` window.
/// "previous" = best e1RM in the `weeks` window before that.
pub fn e1rm_spider(
    db: &DbPool,
    user_id: i64,
    exercise_ids: &[i64],
    weeks: i64,
) -> Result<Vec<E1rmSpiderPoint>, AppError> {
    let conn = db.lock().unwrap();

    let mut results = Vec::new();

    for &exercise_id in exercise_ids {
        let exercise_name: String = match conn.query_row(
            "SELECT name FROM exercises WHERE id = ?1 AND user_id = ?2",
            rusqlite::params![exercise_id, user_id],
            |row| row.get(0),
        ) {
            Ok(name) => name,
            Err(rusqlite::Error::QueryReturnedNoRows) => continue,
            Err(e) => return Err(AppError::Database(e)),
        };

        // Get best e1RM in the current span (last N weeks)
        let current_e1rm = best_e1rm_in_range(
            &conn, user_id, exercise_id,
            &format!("-{} days", weeks * 7), "0 days",
        )?;

        // Get best e1RM in the previous span (N to 2N weeks ago)
        let previous_e1rm = best_e1rm_in_range(
            &conn, user_id, exercise_id,
            &format!("-{} days", weeks * 7 * 2), &format!("-{} days", weeks * 7),
        )?;

        let pct_change = match (current_e1rm, previous_e1rm) {
            (Some(curr), Some(prev)) if prev > 0.0 => Some(((curr - prev) / prev) * 100.0),
            _ => None,
        };

        results.push(E1rmSpiderPoint {
            exercise_id,
            exercise_name,
            pct_change,
            current_e1rm,
            previous_e1rm,
        });
    }

    Ok(results)
}

fn best_e1rm_in_range(
    conn: &rusqlite::Connection,
    user_id: i64,
    exercise_id: i64,
    from_offset: &str,
    to_offset: &str,
) -> Result<Option<f64>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT st.weight_kg, st.reps, st.rir
         FROM sets st
         JOIN session_exercises se ON se.id = st.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         WHERE s.user_id = ?1
           AND se.exercise_id = ?2
           AND st.set_type = 'working'
           AND st.weight_kg IS NOT NULL
           AND st.weight_kg > 0
           AND st.reps > 0
           AND date(s.started_at) >= date('now', ?3)
           AND date(s.started_at) < date('now', ?4)"
    )?;

    let sets: Vec<(f64, i64, Option<i64>)> = stmt.query_map(
        rusqlite::params![user_id, exercise_id, from_offset, to_offset],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?
        .filter_map(|r| r.ok())
        .collect();

    let mut best: Option<f64> = None;
    for (weight, reps, rir) in sets {
        let effective_reps = match rir {
            Some(r) => reps + r,
            None => reps,
        };
        let e1rm = weight * (1.0 + effective_reps as f64 / 30.0);
        if best.is_none() || e1rm > best.unwrap() {
            best = Some(e1rm);
        }
    }

    Ok(best)
}

#[derive(Debug, Serialize)]
pub struct E1rmMover {
    pub exercise_id: i64,
    pub exercise_name: String,
    pub muscle_group: Option<String>,
    pub current_e1rm: f64,
    pub previous_e1rm: f64,
    pub pct_change: f64,
}

/// Returns exercises ranked by e1RM percentage change over a given period.
/// Compares best e1RM in the recent `days` window vs the prior `days` window.
/// Only includes exercises with data in both windows.
pub fn e1rm_movers(db: &DbPool, user_id: i64, days: i64) -> Result<Vec<E1rmMover>, AppError> {
    let conn = db.lock().unwrap();

    // Get all exercises with working set data
    let mut ex_stmt = conn.prepare(
        "SELECT DISTINCT e.id, e.name, e.muscle_group
         FROM exercises e
         JOIN session_exercises se ON se.exercise_id = e.id
         JOIN sessions s ON s.id = se.session_id
         JOIN sets st ON st.session_exercise_id = se.id
         WHERE s.user_id = ?1
           AND st.set_type = 'working'
           AND st.weight_kg IS NOT NULL
           AND st.weight_kg > 0
           AND st.reps > 0"
    )?;

    let exercises: Vec<(i64, String, Option<String>)> = ex_stmt.query_map(
        rusqlite::params![user_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?
        .filter_map(|r| r.ok())
        .collect();

    let current_from = format!("-{} days", days);
    let previous_from = format!("-{} days", days * 2);
    let previous_to = format!("-{} days", days);

    let mut movers = Vec::new();

    for (exercise_id, name, muscle_group) in exercises {
        let current = best_e1rm_in_range(&conn, user_id, exercise_id, &current_from, "0 days")?;
        let previous = best_e1rm_in_range(&conn, user_id, exercise_id, &previous_from, &previous_to)?;

        if let (Some(curr), Some(prev)) = (current, previous) {
            if prev > 0.0 {
                let pct = ((curr - prev) / prev) * 100.0;
                movers.push(E1rmMover {
                    exercise_id,
                    exercise_name: name,
                    muscle_group,
                    current_e1rm: (curr * 10.0).round() / 10.0,
                    previous_e1rm: (prev * 10.0).round() / 10.0,
                    pct_change: (pct * 10.0).round() / 10.0,
                });
            }
        }
    }

    // Sort by pct_change descending (biggest gainers first)
    movers.sort_by(|a, b| b.pct_change.partial_cmp(&a.pct_change).unwrap_or(std::cmp::Ordering::Equal));

    Ok(movers)
}

#[derive(Debug, Serialize)]
pub struct StaleExercise {
    pub exercise_id: i64,
    pub exercise_name: String,
    pub muscle_group: Option<String>,
    pub last_performed: String,
    pub days_ago: i64,
    pub total_sets: i64,
}

/// Returns exercises the user hasn't performed in at least `days` days,
/// filtered to only exercises that appear in a non-archived template (i.e. "in rotation").
/// Sorted by most stale first.
pub fn stale_exercises(db: &DbPool, user_id: i64, days: i64) -> Result<Vec<StaleExercise>, AppError> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT e.id, e.name, e.muscle_group,
                MAX(date(s.started_at)) as last_date,
                CAST(julianday('now') - julianday(MAX(date(s.started_at))) AS INTEGER) as days_ago,
                COUNT(*) as total_sets
         FROM exercises e
         JOIN session_exercises se ON se.exercise_id = e.id
         JOIN sessions s ON s.id = se.session_id
         JOIN sets st ON st.session_exercise_id = se.id
         WHERE s.user_id = ?1
           AND st.set_type = 'working'
           AND e.archived = 0
           AND e.id IN (
               SELECT te.exercise_id FROM template_exercises te
               JOIN templates t ON t.id = te.template_id
               WHERE t.user_id = ?1 AND t.archived = 0
           )
         GROUP BY e.id
         HAVING days_ago >= ?2
         ORDER BY days_ago DESC"
    )?;

    let rows = stmt.query_map(rusqlite::params![user_id, days], |row| {
        Ok(StaleExercise {
            exercise_id: row.get(0)?,
            exercise_name: row.get(1)?,
            muscle_group: row.get(2)?,
            last_performed: row.get(3)?,
            days_ago: row.get(4)?,
            total_sets: row.get(5)?,
        })
    })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

#[derive(Debug, Serialize)]
pub struct DayTemplateActivity {
    pub date: String,
    pub template_id: Option<i64>,
    pub template_name: Option<String>,
    pub set_count: i64,
}

/// Returns set counts per day per template for the last N days.
/// Each row is a (date, template) combination. Freeform sessions have null template.
pub fn activity_heatmap_by_template(db: &DbPool, user_id: i64, days: i64) -> Result<Vec<DayTemplateActivity>, AppError> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT date(s2.completed_at) as day,
                s.template_id,
                t.name as template_name,
                COUNT(*) as set_count
         FROM sets s2
         JOIN session_exercises se ON se.id = s2.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         LEFT JOIN templates t ON t.id = s.template_id
         WHERE s.user_id = ?1
           AND s2.completed_at >= date('now', ?2)
           AND s2.set_type = 'working'
         GROUP BY day, s.template_id
         ORDER BY day, set_count DESC"
    )?;

    let days_param = format!("-{} days", days);
    let rows = stmt.query_map(rusqlite::params![user_id, days_param], |row| {
        Ok(DayTemplateActivity {
            date: row.get(0)?,
            template_id: row.get(1)?,
            template_name: row.get(2)?,
            set_count: row.get(3)?,
        })
    })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

/// Returns list of exercises that the user has actually logged sets for (for the exercise picker).
#[derive(Debug, Serialize)]
pub struct ExerciseSummary {
    pub id: i64,
    pub name: String,
    pub muscle_group: Option<String>,
    pub session_count: i64,
}

pub fn exercises_with_data(db: &DbPool, user_id: i64) -> Result<Vec<ExerciseSummary>, AppError> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT e.id, e.name, e.muscle_group,
                COUNT(DISTINCT s.id) as session_count
         FROM exercises e
         JOIN session_exercises se ON se.exercise_id = e.id
         JOIN sessions s ON s.id = se.session_id
         JOIN sets st ON st.session_exercise_id = se.id
         WHERE s.user_id = ?1
           AND st.set_type = 'working'
           AND st.weight_kg IS NOT NULL
           AND st.weight_kg > 0
         GROUP BY e.id
         ORDER BY session_count DESC, e.name"
    )?;

    let rows = stmt.query_map(rusqlite::params![user_id], |row| {
        Ok(ExerciseSummary {
            id: row.get(0)?,
            name: row.get(1)?,
            muscle_group: row.get(2)?,
            session_count: row.get(3)?,
        })
    })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

#[derive(Debug, Serialize)]
pub struct WeeklyVolume {
    pub week: String,
    pub muscle_group: String,
    pub set_count: i64,
}

/// Returns working sets per week broken down by muscle group.
/// Week is the Monday date of that ISO week.
/// Optional since/until filter to a date range (YYYY-MM-DD).
pub fn weekly_volume(
    db: &DbPool,
    user_id: i64,
    since: Option<&str>,
    until: Option<&str>,
) -> Result<Vec<WeeklyVolume>, AppError> {
    let conn = db.lock().unwrap();

    let mut sql = String::from(
        "SELECT date(st.completed_at, '+1 day', 'weekday 1', '-7 days') as week_start,
                COALESCE(e.muscle_group, 'Other') as mg,
                COUNT(*) as set_count
         FROM sets st
         JOIN session_exercises se ON se.id = st.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         JOIN exercises e ON e.id = se.exercise_id
         WHERE s.user_id = ?1
           AND st.set_type = 'working'"
    );

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(user_id)];
    if let Some(s) = since {
        params.push(Box::new(s.to_string()));
        sql.push_str(&format!(" AND date(s.started_at) >= ?{}", params.len()));
    }
    if let Some(u) = until {
        params.push(Box::new(u.to_string()));
        sql.push_str(&format!(" AND date(s.started_at) <= ?{}", params.len()));
    }
    sql.push_str(" GROUP BY week_start, mg ORDER BY week_start, mg");

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(WeeklyVolume {
            week: row.get(0)?,
            muscle_group: row.get(1)?,
            set_count: row.get(2)?,
        })
    })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

#[derive(Debug, Serialize)]
pub struct WeeklyFrequency {
    pub week: String,
    pub session_count: i64,
}

/// Returns number of completed sessions per week.
/// Week is the Monday date of that ISO week.
pub fn session_frequency(db: &DbPool, user_id: i64) -> Result<Vec<WeeklyFrequency>, AppError> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT date(s.started_at, '+1 day', 'weekday 1', '-7 days') as week_start,
                COUNT(*) as session_count
         FROM sessions s
         WHERE s.user_id = ?1
           AND s.status = 'completed'
         GROUP BY week_start
         ORDER BY week_start"
    )?;

    let rows = stmt.query_map(rusqlite::params![user_id], |row| {
        Ok(WeeklyFrequency {
            week: row.get(0)?,
            session_count: row.get(1)?,
        })
    })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

#[derive(Debug, Serialize)]
pub struct ExercisePRData {
    pub exercise_id: i64,
    pub best_e1rm_ever: Option<f64>,
    pub best_e1rm_by_position: HashMap<i32, f64>,
}

#[derive(Debug, Serialize)]
pub struct DayPR {
    pub date: String,
    pub has_absolute_pr: bool,
    pub has_set_pr: bool,
}

/// Returns dates where e1RM personal records were set, scanning all history chronologically.
/// An "absolute" PR means the set was the all-time best e1RM for that exercise.
/// A "set" PR means the set was the best e1RM for that exercise at that set_number position.
/// Single-pass O(n) over all sets, maintaining running maximums.
pub fn heatmap_prs(db: &DbPool, user_id: i64, days: i64) -> Result<Vec<DayPR>, AppError> {
    let conn = db.lock().unwrap();

    // Fetch ALL working sets for this user ordered chronologically.
    // We need full history to build running bests, but only report PRs within the date window.
    let mut stmt = conn.prepare(
        "SELECT date(st.completed_at) as day,
                se.exercise_id,
                st.set_number,
                st.weight_kg,
                st.reps,
                st.rir
         FROM sets st
         JOIN session_exercises se ON se.id = st.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         WHERE s.user_id = ?1
           AND s.status = 'completed'
           AND st.set_type = 'working'
           AND st.weight_kg IS NOT NULL
           AND st.weight_kg > 0
           AND st.reps > 0
         ORDER BY st.completed_at, st.id"
    )?;

    let sets: Vec<(String, i64, i32, f64, i64, Option<i64>)> = stmt.query_map(
        rusqlite::params![user_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?)),
    )?
        .filter_map(|r| r.ok())
        .collect();

    // Compute the cutoff date for reporting (we still process all sets for running bests)
    let cutoff: String = conn.query_row(
        "SELECT date('now', ?1)",
        rusqlite::params![format!("-{} days", days)],
        |row| row.get(0),
    )?;

    // Running bests: exercise_id -> (best_absolute_e1rm, {set_number -> best_e1rm})
    let mut best_absolute: HashMap<i64, f64> = HashMap::new();
    let mut best_by_pos: HashMap<i64, HashMap<i32, f64>> = HashMap::new();

    // Accumulate PR flags per date
    let mut day_prs: HashMap<String, (bool, bool)> = HashMap::new(); // (absolute, set)

    for (date, exercise_id, set_number, weight, reps, rir) in &sets {
        let effective_reps = match rir {
            Some(r) => reps + r,
            None => *reps,
        };
        let e1rm = weight * (1.0 + effective_reps as f64 / 30.0);

        let abs_best = best_absolute.entry(*exercise_id).or_insert(0.0);
        let pos_map = best_by_pos.entry(*exercise_id).or_default();
        let pos_best = pos_map.entry(*set_number).or_insert(0.0);

        // Only record PRs within the reporting window, but always after first set
        if date.as_str() >= cutoff.as_str() {
            if e1rm > *abs_best && *abs_best > 0.0 {
                let entry = day_prs.entry(date.clone()).or_insert((false, false));
                entry.0 = true;
            } else if e1rm > *pos_best && *pos_best > 0.0 {
                let entry = day_prs.entry(date.clone()).or_insert((false, false));
                entry.1 = true;
            }
        }

        // Update running bests AFTER comparison
        if e1rm > *abs_best {
            *abs_best = e1rm;
        }
        if e1rm > *pos_best {
            *pos_best = e1rm;
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

    Ok(result)
}

#[derive(Debug, Serialize)]
pub struct ExerciseWeeklyVolume {
    pub exercise_id: i64,
    pub exercise_name: String,
    pub week: String,
    pub sets: i64,
    pub reps: i64,
    pub tonnage: f64,
}

/// Returns per-exercise weekly breakdown: sets, total reps, and tonnage (weight × reps).
/// When exercise_id is Some, filters to that exercise. When None, returns all exercises.
/// Week is the Monday date of that ISO week.
/// Optional since/until filter to a date range (YYYY-MM-DD).
pub fn exercise_volume(
    db: &DbPool,
    user_id: i64,
    exercise_id: Option<i64>,
    since: Option<&str>,
    until: Option<&str>,
) -> Result<Vec<ExerciseWeeklyVolume>, AppError> {
    let conn = db.lock().unwrap();

    let mut sql = String::from(
        "SELECT se.exercise_id, e.name,
                date(st.completed_at, '+1 day', 'weekday 1', '-7 days') as week_start,
                COUNT(*) as sets,
                SUM(st.reps) as reps,
                SUM(st.weight_kg * st.reps) as tonnage
         FROM sets st
         JOIN session_exercises se ON se.id = st.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         JOIN exercises e ON e.id = se.exercise_id
         WHERE s.user_id = ?1
           AND st.set_type = 'working'
           AND st.weight_kg IS NOT NULL
           AND st.weight_kg > 0
           AND st.reps > 0"
    );

    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = vec![Box::new(user_id)];
    if let Some(eid) = exercise_id {
        params.push(Box::new(eid));
        sql.push_str(&format!(" AND se.exercise_id = ?{}", params.len()));
    }
    if let Some(s) = since {
        params.push(Box::new(s.to_string()));
        sql.push_str(&format!(" AND date(s.started_at) >= ?{}", params.len()));
    }
    if let Some(u) = until {
        params.push(Box::new(u.to_string()));
        sql.push_str(&format!(" AND date(s.started_at) <= ?{}", params.len()));
    }
    sql.push_str(" GROUP BY se.exercise_id, week_start ORDER BY week_start, e.name");

    let mut stmt = conn.prepare(&sql)?;
    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(ExerciseWeeklyVolume {
            exercise_id: row.get(0)?,
            exercise_name: row.get(1)?,
            week: row.get(2)?,
            sets: row.get(3)?,
            reps: row.get(4)?,
            tonnage: row.get::<_, f64>(5).map(|v| (v * 10.0).round() / 10.0)?,
        })
    })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

#[derive(Debug, Serialize)]
pub struct AnalyticsSummary {
    pub exercise_id: i64,
    pub exercise_name: String,
    pub muscle_group: Option<String>,
    pub session_count: i64,
    pub last_trained: Option<String>,
    pub current_e1rm: Option<f64>,
    pub trend: Option<String>,
}

/// One-shot orientation: all exercises with session count, last trained date, current best e1RM,
/// and trend direction (up/flat/down) based on last 4 sessions.
pub fn summary(db: &DbPool, user_id: i64) -> Result<Vec<AnalyticsSummary>, AppError> {
    let conn = db.lock().unwrap();

    // Main stats query
    let mut stmt = conn.prepare(
        "WITH exercise_stats AS (
            SELECT e.id as exercise_id,
                   e.name as exercise_name,
                   e.muscle_group,
                   COUNT(DISTINCT s.id) as session_count,
                   MAX(date(s.started_at)) as last_trained
            FROM exercises e
            JOIN session_exercises se ON se.exercise_id = e.id
            JOIN sessions s ON s.id = se.session_id
            JOIN sets st ON st.session_exercise_id = se.id
            WHERE s.user_id = ?1
              AND st.set_type = 'working'
              AND st.weight_kg IS NOT NULL
              AND st.weight_kg > 0
              AND st.reps > 0
            GROUP BY e.id
        ),
        latest_e1rm AS (
            SELECT se.exercise_id,
                   MAX(st.weight_kg * (1.0 + (st.reps + COALESCE(st.rir, 0)) / 30.0)) as best_e1rm
            FROM sets st
            JOIN session_exercises se ON se.id = st.session_exercise_id
            JOIN sessions s ON s.id = se.session_id
            WHERE s.user_id = ?1
              AND st.set_type = 'working'
              AND st.weight_kg IS NOT NULL
              AND st.weight_kg > 0
              AND st.reps > 0
              AND date(s.started_at) = (
                  SELECT MAX(date(s2.started_at))
                  FROM sessions s2
                  JOIN session_exercises se2 ON se2.session_id = s2.id
                  JOIN sets st2 ON st2.session_exercise_id = se2.id
                  WHERE s2.user_id = ?1 AND se2.exercise_id = se.exercise_id
                    AND st2.set_type = 'working'
                    AND st2.weight_kg IS NOT NULL
                    AND st2.weight_kg > 0
                    AND st2.reps > 0
              )
            GROUP BY se.exercise_id
        )
        SELECT es.exercise_id, es.exercise_name, es.muscle_group,
               es.session_count, es.last_trained,
               le.best_e1rm
        FROM exercise_stats es
        LEFT JOIN latest_e1rm le ON le.exercise_id = es.exercise_id
        ORDER BY es.session_count DESC, es.exercise_name"
    )?;

    let mut rows: Vec<AnalyticsSummary> = stmt.query_map(rusqlite::params![user_id], |row| {
        Ok(AnalyticsSummary {
            exercise_id: row.get(0)?,
            exercise_name: row.get(1)?,
            muscle_group: row.get(2)?,
            session_count: row.get(3)?,
            last_trained: row.get(4)?,
            current_e1rm: row.get::<_, Option<f64>>(5)?
                .map(|v| (v * 10.0).round() / 10.0),
            trend: None,
        })
    })?
        .filter_map(|r| r.ok())
        .collect();

    // Compute trends: best e1RM per session per exercise, last 8 sessions each
    // (fetch extra to have enough after filtering deloads)
    let mut trend_stmt = conn.prepare(
        "WITH ranked AS (
            SELECT se.exercise_id,
                   MAX(st.weight_kg * (1.0 + (st.reps + COALESCE(st.rir, 0)) / 30.0)) as best_e1rm,
                   DENSE_RANK() OVER (PARTITION BY se.exercise_id ORDER BY date(s.started_at) DESC) as rn
            FROM sets st
            JOIN session_exercises se ON se.id = st.session_exercise_id
            JOIN sessions s ON s.id = se.session_id
            WHERE s.user_id = ?1
              AND st.set_type = 'working'
              AND st.weight_kg IS NOT NULL
              AND st.weight_kg > 0
              AND st.reps > 0
            GROUP BY se.exercise_id, s.id
        )
        SELECT exercise_id, rn, best_e1rm
        FROM ranked
        WHERE rn <= 8
        ORDER BY exercise_id, rn"
    )?;

    let trend_data: Vec<(i64, i64, f64)> = trend_stmt.query_map(
        rusqlite::params![user_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?
        .filter_map(|r| r.ok())
        .collect();

    // Group by exercise, filter deloads, compute trend direction
    let mut trends: HashMap<i64, String> = HashMap::new();
    let mut current_id: Option<i64> = None;
    let mut session_e1rms: Vec<f64> = Vec::new();

    for (exercise_id, _rn, e1rm) in &trend_data {
        if current_id != Some(*exercise_id) {
            if let Some(id) = current_id {
                let filtered = filter_deloads(&session_e1rms);
                if let Some(t) = compute_trend(&filtered) {
                    trends.insert(id, t);
                }
            }
            current_id = Some(*exercise_id);
            session_e1rms.clear();
        }
        session_e1rms.push(*e1rm);
    }
    // Final exercise
    if let Some(id) = current_id {
        let filtered = filter_deloads(&session_e1rms);
        if let Some(t) = compute_trend(&filtered) {
            trends.insert(id, t);
        }
    }

    // Merge trends into summary rows
    for row in &mut rows {
        row.trend = trends.remove(&row.exercise_id);
    }

    Ok(rows)
}

/// Filter out deload sessions from e1RM series (ordered most recent first).
/// A session is considered a deload if its e1RM is <85% of the series max,
/// indicating an intentional light day rather than genuine regression.
fn filter_deloads(e1rms: &[f64]) -> Vec<f64> {
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
        // Take at most 4 after filtering
        filtered.into_iter().take(4).collect()
    }
}

/// Compute trend direction from session e1RMs (ordered most recent first).
/// Requires at least 3 data points. Compares avg of last 2 vs avg of prior sessions.
/// Returns "up" (>2%), "down" (<-2%), or "flat".
fn compute_trend(e1rms: &[f64]) -> Option<String> {
    if e1rms.len() < 3 {
        return None;
    }
    let recent_avg = (e1rms[0] + e1rms[1]) / 2.0;
    let prior: &[f64] = &e1rms[2..];
    let prior_avg: f64 = prior.iter().sum::<f64>() / prior.len() as f64;

    if prior_avg == 0.0 {
        return None;
    }

    let pct = (recent_avg - prior_avg) / prior_avg;
    Some(if pct > 0.02 {
        "up".to_string()
    } else if pct < -0.02 {
        "down".to_string()
    } else {
        "flat".to_string()
    })
}

/// For each exercise in a session, returns the historical best e1RM (absolute)
/// and best e1RM per set_number position from all other completed sessions.
/// The frontend can compare current-session sets against these thresholds
/// to determine PR badges.
pub fn session_prs(db: &DbPool, user_id: i64, session_id: i64) -> Result<Vec<ExercisePRData>, AppError> {
    let conn = db.lock().unwrap();

    // Find all exercises in the given session
    let mut ex_stmt = conn.prepare(
        "SELECT DISTINCT se.exercise_id
         FROM session_exercises se
         JOIN sessions s ON s.id = se.session_id
         WHERE se.session_id = ?1 AND s.user_id = ?2"
    )?;

    let exercise_ids: Vec<i64> = ex_stmt.query_map(
        rusqlite::params![session_id, user_id],
        |row| row.get(0),
    )?
        .filter_map(|r| r.ok())
        .collect();

    let mut results = Vec::new();

    for exercise_id in exercise_ids {
        let mut stmt = conn.prepare(
            "SELECT st.set_number, st.weight_kg, st.reps, st.rir
             FROM sets st
             JOIN session_exercises se ON se.id = st.session_exercise_id
             JOIN sessions s ON s.id = se.session_id
             WHERE s.user_id = ?1
               AND se.exercise_id = ?2
               AND s.id != ?3
               AND s.status = 'completed'
               AND st.set_type = 'working'
               AND st.weight_kg IS NOT NULL
               AND st.weight_kg > 0
               AND st.reps > 0"
        )?;

        let sets: Vec<(i32, f64, i64, Option<i64>)> = stmt.query_map(
            rusqlite::params![user_id, exercise_id, session_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )?
            .filter_map(|r| r.ok())
            .collect();

        let mut best_ever: Option<f64> = None;
        let mut best_by_position: HashMap<i32, f64> = HashMap::new();

        for (set_number, weight, reps, rir) in sets {
            let effective_reps = match rir {
                Some(r) => reps + r,
                None => reps,
            };
            let e1rm = weight * (1.0 + effective_reps as f64 / 30.0);

            if best_ever.is_none() || e1rm > best_ever.unwrap() {
                best_ever = Some(e1rm);
            }

            let pos_entry = best_by_position.entry(set_number).or_insert(0.0);
            if e1rm > *pos_entry {
                *pos_entry = e1rm;
            }
        }

        results.push(ExercisePRData {
            exercise_id,
            best_e1rm_ever: best_ever.map(|v| (v * 10.0).round() / 10.0),
            best_e1rm_by_position: best_by_position.into_iter()
                .map(|(k, v)| (k, (v * 10.0).round() / 10.0))
                .collect(),
        });
    }

    Ok(results)
}

// ── Report ──

#[derive(Debug, Serialize)]
pub struct Report {
    pub watched: Vec<WatchedExercise>,
    pub all_exercises: Vec<AnalyticsSummary>,
    pub movers: Vec<E1rmMover>,
    pub frequency: Vec<WeeklyFrequency>,
}

#[derive(Debug, Serialize)]
pub struct WatchedExercise {
    pub exercise_id: i64,
    pub exercise_name: String,
    pub muscle_group: Option<String>,
    pub current_e1rm: Option<f64>,
    pub trend: Option<String>,
    pub last_trained: Option<String>,
    pub recent_sessions: Vec<E1rmDataPoint>,
}

/// Single-call report: watched exercises with recent e1RM history, full exercise summary,
/// top movers, and training frequency. Designed for Claude Code health analysis sessions.
pub fn report(db: &DbPool, user_id: i64, watched_ids: &[i64]) -> Result<Report, AppError> {
    let all_exercises = summary(db, user_id)?;

    let mut watched = Vec::new();
    for &eid in watched_ids {
        let summary_entry = all_exercises.iter().find(|e| e.exercise_id == eid);

        // Get recent e1rm progression (last 8 sessions)
        let recent_sessions = match e1rm_progression(db, user_id, eid, None, None) {
            Ok(prog) => {
                let len = prog.data.len();
                let start = if len > 8 { len - 8 } else { 0 };
                prog.data[start..].to_vec()
            }
            Err(_) => vec![],
        };

        watched.push(WatchedExercise {
            exercise_id: eid,
            exercise_name: summary_entry.map_or_else(
                || "Unknown".to_string(),
                |e| e.exercise_name.clone(),
            ),
            muscle_group: summary_entry.and_then(|e| e.muscle_group.clone()),
            current_e1rm: summary_entry.and_then(|e| e.current_e1rm),
            trend: summary_entry.and_then(|e| e.trend.clone()),
            last_trained: summary_entry.and_then(|e| e.last_trained.clone()),
            recent_sessions,
        });
    }

    let movers = e1rm_movers(db, user_id, 30).unwrap_or_default();
    let frequency = session_frequency(db, user_id)?;

    Ok(Report {
        watched,
        all_exercises,
        movers,
        frequency,
    })
}
