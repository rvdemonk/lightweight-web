use serde::Serialize;

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

#[derive(Debug, Serialize)]
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
pub fn e1rm_progression(db: &DbPool, user_id: i64, exercise_id: i64) -> Result<ExerciseE1rm, AppError> {
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

    // Group by session date, take best e1rm per date
    // Also track PRs across all sets
    let mut best_by_date: std::collections::BTreeMap<String, E1rmDataPoint> = std::collections::BTreeMap::new();

    let mut pr_e1rm: Option<(f64, String, f64, i64)> = None;       // (e1rm, date, weight, reps)
    let mut pr_weight: Option<(f64, String, i64)> = None;           // (weight, date, reps)
    let mut pr_reps: Option<(i64, String, f64)> = None;             // (reps, date, weight)

    for (date, weight, reps, rir) in &all_sets {
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

    Ok(ExerciseE1rm {
        exercise_id,
        exercise_name,
        data,
        prs,
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
pub fn weekly_volume(db: &DbPool, user_id: i64) -> Result<Vec<WeeklyVolume>, AppError> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT date(st.completed_at, 'weekday 1', '-7 days') as week_start,
                COALESCE(e.muscle_group, 'Other') as mg,
                COUNT(*) as set_count
         FROM sets st
         JOIN session_exercises se ON se.id = st.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         JOIN exercises e ON e.id = se.exercise_id
         WHERE s.user_id = ?1
           AND st.set_type = 'working'
         GROUP BY week_start, mg
         ORDER BY week_start, mg"
    )?;

    let rows = stmt.query_map(rusqlite::params![user_id], |row| {
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
        "SELECT date(s.started_at, 'weekday 1', '-7 days') as week_start,
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
