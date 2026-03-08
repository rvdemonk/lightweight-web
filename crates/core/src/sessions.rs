use std::collections::HashMap;

use crate::db::DbPool;
use crate::error::AppError;
use crate::models::*;

// ── Ownership verification helpers ──

fn verify_session_ownership(conn: &rusqlite::Connection, session_id: i64, user_id: i64) -> Result<(), AppError> {
    let owns: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM sessions WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![session_id, user_id],
        |row| row.get(0),
    )?;
    if !owns {
        return Err(AppError::NotFound);
    }
    Ok(())
}

fn verify_set_ownership(conn: &rusqlite::Connection, set_id: i64, user_id: i64) -> Result<(), AppError> {
    let owns: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM sets st
         JOIN session_exercises se ON se.id = st.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         WHERE st.id = ?1 AND s.user_id = ?2",
        rusqlite::params![set_id, user_id],
        |row| row.get(0),
    )?;
    if !owns {
        return Err(AppError::NotFound);
    }
    Ok(())
}

fn verify_session_exercise_ownership(conn: &rusqlite::Connection, se_id: i64, user_id: i64) -> Result<(), AppError> {
    let owns: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM session_exercises se
         JOIN sessions s ON s.id = se.session_id
         WHERE se.id = ?1 AND s.user_id = ?2",
        rusqlite::params![se_id, user_id],
        |row| row.get(0),
    )?;
    if !owns {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn list(db: &DbPool, user_id: i64, params: &SessionListParams) -> Result<Vec<SessionSummary>, AppError> {
    let conn = db.lock().unwrap();
    let limit = params.limit.unwrap_or(20);
    let offset = params.offset.unwrap_or(0);

    let (sql, sql_params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = if let Some(tid) = params.template_id {
        (
            "SELECT s.id, s.template_id, t.name, s.name, s.started_at, s.ended_at, s.status,
                    (SELECT COUNT(*) FROM sets st JOIN session_exercises se ON se.id = st.session_exercise_id WHERE se.session_id = s.id) as set_count,
                    (SELECT COUNT(DISTINCT se.id) FROM session_exercises se WHERE se.session_id = s.id) as exercise_count,
                    (SELECT SUM(te.target_sets) FROM template_exercises te WHERE te.template_id = s.template_id) as target_set_count
             FROM sessions s LEFT JOIN templates t ON t.id = s.template_id
             WHERE s.user_id = ?1 AND s.template_id = ?2
             ORDER BY s.started_at DESC LIMIT ?3 OFFSET ?4".to_string(),
            vec![Box::new(user_id), Box::new(tid), Box::new(limit), Box::new(offset)],
        )
    } else {
        (
            "SELECT s.id, s.template_id, t.name, s.name, s.started_at, s.ended_at, s.status,
                    (SELECT COUNT(*) FROM sets st JOIN session_exercises se ON se.id = st.session_exercise_id WHERE se.session_id = s.id) as set_count,
                    (SELECT COUNT(DISTINCT se.id) FROM session_exercises se WHERE se.session_id = s.id) as exercise_count,
                    (SELECT SUM(te.target_sets) FROM template_exercises te WHERE te.template_id = s.template_id) as target_set_count
             FROM sessions s LEFT JOIN templates t ON t.id = s.template_id
             WHERE s.user_id = ?1
             ORDER BY s.started_at DESC LIMIT ?2 OFFSET ?3".to_string(),
            vec![Box::new(user_id), Box::new(limit), Box::new(offset)],
        )
    };

    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(rusqlite::params_from_iter(sql_params.iter()), |row| {
        Ok(SessionSummary {
            id: row.get(0)?,
            template_id: row.get(1)?,
            template_name: row.get(2)?,
            name: row.get(3)?,
            started_at: row.get(4)?,
            ended_at: row.get(5)?,
            status: row.get(6)?,
            set_count: row.get(7)?,
            exercise_count: row.get(8)?,
            target_set_count: row.get(9)?,
        })
    })?;

    let mut sessions = Vec::new();
    for row in rows {
        sessions.push(row?);
    }
    Ok(sessions)
}

pub fn get_active(db: &DbPool, user_id: i64) -> Result<Option<Session>, AppError> {
    let conn = db.lock().unwrap();
    let id: Result<i64, _> = conn.query_row(
        "SELECT id FROM sessions WHERE user_id = ?1 AND status IN ('active', 'paused') ORDER BY started_at DESC LIMIT 1",
        [user_id],
        |row| row.get(0),
    );

    match id {
        Ok(id) => {
            drop(conn);
            Ok(Some(get(db, user_id, id)?))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn get(db: &DbPool, user_id: i64, id: i64) -> Result<Session, AppError> {
    let conn = db.lock().unwrap();
    let (template_id, template_name, name, started_at, ended_at, paused_duration, notes, status) = conn
        .query_row(
            "SELECT s.template_id, t.name, s.name, s.started_at, s.ended_at, s.paused_duration, s.notes, s.status
             FROM sessions s LEFT JOIN templates t ON t.id = s.template_id
             WHERE s.id = ?1 AND s.user_id = ?2",
            rusqlite::params![id, user_id],
            |row| {
                Ok((
                    row.get::<_, Option<i64>>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, Option<String>>(4)?,
                    row.get::<_, i64>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, String>(7)?,
                ))
            },
        )
        .map_err(|_| AppError::NotFound)?;

    let exercises = get_session_exercises(&conn, id)?;

    Ok(Session {
        id,
        template_id,
        template_name,
        name,
        started_at,
        ended_at,
        paused_duration,
        notes,
        status,
        exercises,
    })
}

pub fn create(db: &DbPool, user_id: i64, input: &CreateSession) -> Result<Session, AppError> {
    let conn = db.lock().unwrap();

    // Verify template belongs to user if provided
    if let Some(template_id) = input.template_id {
        let owns: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM templates WHERE id = ?1 AND user_id = ?2",
            rusqlite::params![template_id, user_id],
            |row| row.get(0),
        )?;
        if !owns {
            return Err(AppError::NotFound);
        }
    }

    let status = input.status.as_deref().unwrap_or("active");

    if input.started_at.is_some() || input.ended_at.is_some() {
        conn.execute(
            "INSERT INTO sessions (user_id, template_id, name, started_at, ended_at, status, notes)
             VALUES (?1, ?2, ?3, COALESCE(?4, datetime('now')), ?5, ?6, ?7)",
            rusqlite::params![
                user_id, input.template_id, input.name,
                input.started_at, input.ended_at,
                status, input.notes
            ],
        )?;
    } else {
        conn.execute(
            "INSERT INTO sessions (user_id, template_id, name, status, notes) VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![user_id, input.template_id, input.name, status, input.notes],
        )?;
    }

    let session_id = conn.last_insert_rowid();

    // If from template, pre-populate exercises
    if let Some(template_id) = input.template_id {
        let mut stmt = conn.prepare(
            "SELECT exercise_id, position, notes FROM template_exercises
             WHERE template_id = ?1 ORDER BY position"
        )?;

        let exercises: Vec<(i64, i32, Option<String>)> = stmt
            .query_map([template_id], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?))
            })?
            .filter_map(|r| r.ok())
            .collect();

        for (exercise_id, position, notes) in exercises {
            conn.execute(
                "INSERT INTO session_exercises (session_id, exercise_id, position, notes)
                 VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![session_id, exercise_id, position, notes],
            )?;
        }
    }

    drop(conn);
    get(db, user_id, session_id)
}

pub fn update(db: &DbPool, user_id: i64, id: i64, input: &UpdateSession) -> Result<Session, AppError> {
    let conn = db.lock().unwrap();

    verify_session_ownership(&conn, id, user_id)?;

    if let Some(ref status) = input.status {
        let valid = ["active", "paused", "completed", "abandoned"];
        if !valid.contains(&status.as_str()) {
            return Err(AppError::BadRequest(format!("Invalid status: {}", status)));
        }
        if status == "completed" || status == "abandoned" {
            conn.execute(
                "UPDATE sessions SET status = ?1, ended_at = datetime('now') WHERE id = ?2",
                rusqlite::params![status, id],
            )?;
        } else {
            conn.execute(
                "UPDATE sessions SET status = ?1 WHERE id = ?2",
                rusqlite::params![status, id],
            )?;
        }
    }
    if let Some(ref notes) = input.notes {
        conn.execute("UPDATE sessions SET notes = ?1 WHERE id = ?2", rusqlite::params![notes, id])?;
    }
    if let Some(paused_duration) = input.paused_duration {
        conn.execute(
            "UPDATE sessions SET paused_duration = ?1 WHERE id = ?2",
            rusqlite::params![paused_duration, id],
        )?;
    }
    if let Some(ref started_at) = input.started_at {
        conn.execute(
            "UPDATE sessions SET started_at = ?1 WHERE id = ?2",
            rusqlite::params![started_at, id],
        )?;
    }
    if let Some(ref ended_at) = input.ended_at {
        conn.execute(
            "UPDATE sessions SET ended_at = ?1 WHERE id = ?2",
            rusqlite::params![ended_at, id],
        )?;
    }

    drop(conn);
    get(db, user_id, id)
}

pub fn delete(db: &DbPool, user_id: i64, id: i64) -> Result<(), AppError> {
    let conn = db.lock().unwrap();
    let rows = conn.execute(
        "DELETE FROM sessions WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![id, user_id],
    )?;
    if rows == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

// ── Session Exercises ──

pub fn add_exercise(db: &DbPool, user_id: i64, session_id: i64, input: &AddSessionExercise) -> Result<SessionExerciseWithSets, AppError> {
    let conn = db.lock().unwrap();

    // Verify session belongs to user
    verify_session_ownership(&conn, session_id, user_id)?;

    // Verify exercise belongs to user
    let exercise_owns: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM exercises WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![input.exercise_id, user_id],
        |row| row.get(0),
    )?;
    if !exercise_owns {
        return Err(AppError::NotFound);
    }

    let position = match input.position {
        Some(p) => p,
        None => {
            let max: Option<i32> = conn
                .query_row(
                    "SELECT MAX(position) FROM session_exercises WHERE session_id = ?1",
                    [session_id],
                    |row| row.get(0),
                )?;
            max.unwrap_or(0) + 1
        }
    };

    conn.execute(
        "INSERT INTO session_exercises (session_id, exercise_id, position, notes)
         VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![session_id, input.exercise_id, position, input.notes],
    )?;

    let id = conn.last_insert_rowid();
    let exercise_name: String = conn.query_row(
        "SELECT name FROM exercises WHERE id = ?1",
        [input.exercise_id],
        |row| row.get(0),
    )?;

    Ok(SessionExerciseWithSets {
        id,
        exercise_id: input.exercise_id,
        exercise_name,
        position,
        notes: None,
        sets: vec![],
    })
}

pub fn update_exercise(db: &DbPool, user_id: i64, _session_id: i64, se_id: i64, input: &UpdateSessionExercise) -> Result<(), AppError> {
    let conn = db.lock().unwrap();

    // Verify ownership via session_exercises -> sessions
    verify_session_exercise_ownership(&conn, se_id, user_id)?;

    if let Some(position) = input.position {
        conn.execute(
            "UPDATE session_exercises SET position = ?1 WHERE id = ?2",
            rusqlite::params![position, se_id],
        )?;
    }
    if let Some(ref notes) = input.notes {
        conn.execute(
            "UPDATE session_exercises SET notes = ?1 WHERE id = ?2",
            rusqlite::params![notes, se_id],
        )?;
    }

    Ok(())
}

pub fn remove_exercise(db: &DbPool, user_id: i64, _session_id: i64, se_id: i64) -> Result<(), AppError> {
    let conn = db.lock().unwrap();

    // Verify ownership via session_exercises -> sessions
    verify_session_exercise_ownership(&conn, se_id, user_id)?;

    let rows = conn.execute("DELETE FROM session_exercises WHERE id = ?1", [se_id])?;
    if rows == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

// ── Sets ──

pub fn add_set(db: &DbPool, user_id: i64, se_id: i64, input: &CreateSet) -> Result<Set, AppError> {
    let conn = db.lock().unwrap();

    // Verify ownership via session_exercises -> sessions
    verify_session_exercise_ownership(&conn, se_id, user_id)?;

    let set_number: i32 = {
        let max: Option<i32> = conn.query_row(
            "SELECT MAX(set_number) FROM sets WHERE session_exercise_id = ?1",
            [se_id],
            |row| row.get(0),
        )?;
        max.unwrap_or(0) + 1
    };

    let set_type = input.set_type.as_deref().unwrap_or("working");

    conn.execute(
        "INSERT INTO sets (session_exercise_id, set_number, weight_kg, reps, set_type, rir)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![se_id, set_number, input.weight_kg, input.reps, set_type, input.rir],
    )?;

    let id = conn.last_insert_rowid();
    let completed_at: String = conn.query_row(
        "SELECT completed_at FROM sets WHERE id = ?1",
        [id],
        |row| row.get(0),
    )?;

    Ok(Set {
        id,
        session_exercise_id: se_id,
        set_number,
        weight_kg: input.weight_kg,
        reps: input.reps,
        set_type: set_type.to_string(),
        rir: input.rir,
        completed_at,
    })
}

pub fn update_set(db: &DbPool, user_id: i64, set_id: i64, input: &UpdateSet) -> Result<Set, AppError> {
    let conn = db.lock().unwrap();

    verify_set_ownership(&conn, set_id, user_id)?;

    if let Some(weight_kg) = input.weight_kg {
        conn.execute("UPDATE sets SET weight_kg = ?1 WHERE id = ?2", rusqlite::params![weight_kg, set_id])?;
    }
    if let Some(reps) = input.reps {
        conn.execute("UPDATE sets SET reps = ?1 WHERE id = ?2", rusqlite::params![reps, set_id])?;
    }
    if let Some(ref set_type) = input.set_type {
        conn.execute("UPDATE sets SET set_type = ?1 WHERE id = ?2", rusqlite::params![set_type, set_id])?;
    }
    if let Some(rir) = input.rir {
        conn.execute("UPDATE sets SET rir = ?1 WHERE id = ?2", rusqlite::params![rir, set_id])?;
    }

    conn.query_row(
        "SELECT id, session_exercise_id, set_number, weight_kg, reps, set_type, rir, completed_at
         FROM sets WHERE id = ?1",
        [set_id],
        |row| {
            Ok(Set {
                id: row.get(0)?,
                session_exercise_id: row.get(1)?,
                set_number: row.get(2)?,
                weight_kg: row.get(3)?,
                reps: row.get(4)?,
                set_type: row.get(5)?,
                rir: row.get(6)?,
                completed_at: row.get(7)?,
            })
        },
    )
    .map_err(|_| AppError::NotFound)
}

pub fn delete_set(db: &DbPool, user_id: i64, set_id: i64) -> Result<(), AppError> {
    let conn = db.lock().unwrap();

    verify_set_ownership(&conn, set_id, user_id)?;

    let rows = conn.execute("DELETE FROM sets WHERE id = ?1", [set_id])?;
    if rows == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

// ── History ──

pub fn exercise_history(db: &DbPool, user_id: i64, exercise_id: i64, limit: i64) -> Result<ExerciseHistory, AppError> {
    let conn = db.lock().unwrap();

    // Verify exercise belongs to user
    let exercise_name: String = conn
        .query_row(
            "SELECT name FROM exercises WHERE id = ?1 AND user_id = ?2",
            rusqlite::params![exercise_id, user_id],
            |row| row.get(0),
        )
        .map_err(|_| AppError::NotFound)?;

    let mut stmt = conn.prepare(
        "SELECT DISTINCT s.id, s.name, s.started_at
         FROM sessions s
         JOIN session_exercises se ON se.session_id = s.id
         WHERE se.exercise_id = ?1 AND s.status = 'completed' AND s.user_id = ?2
         ORDER BY s.started_at DESC LIMIT ?3"
    )?;

    let session_rows: Vec<(i64, Option<String>, String)> = stmt
        .query_map(rusqlite::params![exercise_id, user_id, limit], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut sessions = Vec::new();
    for (session_id, session_name, date) in session_rows {
        let mut set_stmt = conn.prepare(
            "SELECT st.id, st.session_exercise_id, st.set_number, st.weight_kg, st.reps, st.set_type, st.rir, st.completed_at
             FROM sets st
             JOIN session_exercises se ON se.id = st.session_exercise_id
             WHERE se.session_id = ?1 AND se.exercise_id = ?2
             ORDER BY st.set_number"
        )?;

        let sets: Vec<Set> = set_stmt
            .query_map(rusqlite::params![session_id, exercise_id], |row| {
                Ok(Set {
                    id: row.get(0)?,
                    session_exercise_id: row.get(1)?,
                    set_number: row.get(2)?,
                    weight_kg: row.get(3)?,
                    reps: row.get(4)?,
                    set_type: row.get(5)?,
                    rir: row.get(6)?,
                    completed_at: row.get(7)?,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        sessions.push(ExerciseHistoryEntry {
            session_id,
            session_name,
            date,
            sets,
        });
    }

    Ok(ExerciseHistory {
        exercise_id,
        exercise_name,
        sessions,
    })
}

pub fn template_previous(db: &DbPool, user_id: i64, template_id: i64) -> Result<Option<Session>, AppError> {
    let conn = db.lock().unwrap();
    let id: Result<i64, _> = conn.query_row(
        "SELECT id FROM sessions
         WHERE template_id = ?1 AND user_id = ?2 AND status = 'completed'
         ORDER BY started_at DESC LIMIT 1",
        rusqlite::params![template_id, user_id],
        |row| row.get(0),
    );

    match id {
        Ok(id) => {
            drop(conn);
            Ok(Some(get(db, user_id, id)?))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

// ── Import ──

fn parse_import_date(date: &str) -> Result<String, AppError> {
    let date = date.trim();
    if date.len() != 10 {
        return Err(AppError::BadRequest(format!("Invalid date format: '{}', expected YYYY-MM-DD", date)));
    }
    let parts: Vec<&str> = date.split('-').collect();
    if parts.len() != 3 {
        return Err(AppError::BadRequest(format!("Invalid date format: '{}', expected YYYY-MM-DD", date)));
    }
    let year: u32 = parts[0].parse().map_err(|_| AppError::BadRequest(format!("Invalid year in date: '{}'", date)))?;
    let month: u32 = parts[1].parse().map_err(|_| AppError::BadRequest(format!("Invalid month in date: '{}'", date)))?;
    let day: u32 = parts[2].parse().map_err(|_| AppError::BadRequest(format!("Invalid day in date: '{}'", date)))?;
    if year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31 {
        return Err(AppError::BadRequest(format!("Date out of range: '{}'", date)));
    }
    Ok(format!("{} 00:00:00", date))
}

fn resolve_exercise(conn: &rusqlite::Connection, user_id: i64, name: &str, warnings: &mut Vec<String>) -> Result<Option<(i64, String)>, AppError> {
    // Phase 1: exact case-insensitive match scoped to user
    let exact: Result<(i64, String), _> = conn.query_row(
        "SELECT id, name FROM exercises WHERE LOWER(name) = LOWER(?1) AND archived = 0 AND user_id = ?2",
        rusqlite::params![name, user_id],
        |row| Ok((row.get(0)?, row.get(1)?)),
    );
    if let Ok(result) = exact {
        return Ok(Some(result));
    }

    // Phase 2: fuzzy word match — all words must appear, scoped to user
    let words: Vec<String> = name.split_whitespace()
        .map(|w| w.to_lowercase())
        .filter(|w| w.len() > 1)
        .collect();
    if words.is_empty() {
        return Ok(None);
    }

    let conditions: Vec<String> = words.iter()
        .enumerate()
        .map(|(i, _)| format!("LOWER(name) LIKE ?{}", i + 1))
        .collect();
    let sql = format!(
        "SELECT id, name FROM exercises WHERE {} AND archived = 0 AND user_id = ?{}",
        conditions.join(" AND "),
        words.len() + 1
    );

    let mut stmt = conn.prepare(&sql)?;
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = words.iter()
        .map(|w| Box::new(format!("%{}%", w)) as Box<dyn rusqlite::types::ToSql>)
        .collect();
    params.push(Box::new(user_id));

    let matches: Vec<(i64, String)> = stmt.query_map(rusqlite::params_from_iter(params.iter()), |row| {
        Ok((row.get(0)?, row.get(1)?))
    })?
    .filter_map(|r| r.ok())
    .collect();

    match matches.len() {
        0 => Ok(None),
        1 => {
            warnings.push(format!("Matched '{}' -> '{}'", name, matches[0].1));
            Ok(Some(matches[0].clone()))
        }
        _ => {
            let names: Vec<&str> = matches.iter().map(|(_, n)| n.as_str()).collect();
            Err(AppError::BadRequest(format!(
                "Ambiguous exercise '{}': matches [{}]", name, names.join(", ")
            )))
        }
    }
}

pub fn import_sessions(db: &DbPool, user_id: i64, input: Vec<ImportSession>) -> Result<ImportResult, AppError> {
    let conn = db.lock().unwrap();
    let mut warnings: Vec<String> = Vec::new();

    // ── Validation pass (read-only) ──

    // Resolve template names -> IDs (scoped to user)
    let mut template_ids: Vec<Option<i64>> = Vec::new();
    for session in &input {
        parse_import_date(&session.date)?;

        let tid = if let Some(ref tname) = session.template {
            let id: Result<i64, _> = conn.query_row(
                "SELECT id FROM templates WHERE LOWER(name) = LOWER(?1) AND user_id = ?2",
                rusqlite::params![tname, user_id],
                |row| row.get(0),
            );
            match id {
                Ok(id) => Some(id),
                Err(_) => return Err(AppError::BadRequest(format!("Template not found: '{}'", tname))),
            }
        } else {
            None
        };
        template_ids.push(tid);
    }

    // Resolve exercise names -> IDs, tracking auto-creates (scoped to user)
    let mut exercise_cache: HashMap<String, Option<(i64, String)>> = HashMap::new();
    let mut exercises_to_create: Vec<String> = Vec::new();

    for session in &input {
        for exercise in &session.exercises {
            let key = exercise.name.to_lowercase();
            if exercise_cache.contains_key(&key) {
                continue;
            }
            let resolved = resolve_exercise(&conn, user_id, &exercise.name, &mut warnings)?;
            if resolved.is_none() {
                exercises_to_create.push(exercise.name.clone());
            }
            exercise_cache.insert(key, resolved);
        }
    }

    // ── Insertion pass (single transaction) ──

    conn.execute_batch("BEGIN")?;

    // Auto-create exercises that weren't found (with user_id)
    let mut exercises_created: Vec<String> = Vec::new();
    for name in &exercises_to_create {
        let key = name.to_lowercase();
        conn.execute(
            "INSERT INTO exercises (user_id, name) VALUES (?1, ?2)",
            rusqlite::params![user_id, name],
        )?;
        let id = conn.last_insert_rowid();
        exercise_cache.insert(key, Some((id, name.clone())));
        exercises_created.push(name.clone());
        warnings.push(format!("Created new exercise: '{}'", name));
    }

    let mut session_ids: Vec<i64> = Vec::new();

    for (i, session) in input.iter().enumerate() {
        let date = parse_import_date(&session.date)?;
        let template_id = template_ids[i];

        conn.execute(
            "INSERT INTO sessions (user_id, template_id, started_at, ended_at, status, notes, paused_duration)
             VALUES (?1, ?2, ?3, ?4, 'completed', ?5, 0)",
            rusqlite::params![user_id, template_id, &date, &date, session.notes],
        )?;
        let session_id = conn.last_insert_rowid();
        session_ids.push(session_id);

        for (pos, exercise) in session.exercises.iter().enumerate() {
            let key = exercise.name.to_lowercase();
            let (exercise_id, _) = exercise_cache.get(&key)
                .and_then(|v| v.clone())
                .ok_or_else(|| AppError::BadRequest(format!("Exercise resolution failed: '{}'", exercise.name)))?;

            conn.execute(
                "INSERT INTO session_exercises (session_id, exercise_id, position, notes)
                 VALUES (?1, ?2, ?3, ?4)",
                rusqlite::params![session_id, exercise_id, (pos + 1) as i32, exercise.notes],
            )?;
            let se_id = conn.last_insert_rowid();

            for (set_idx, set) in exercise.sets.iter().enumerate() {
                let set_type = set.set_type.as_deref().unwrap_or("working");
                conn.execute(
                    "INSERT INTO sets (session_exercise_id, set_number, weight_kg, reps, set_type, completed_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    rusqlite::params![se_id, (set_idx + 1) as i32, set.weight_kg, set.reps, set_type, &date],
                )?;
            }
        }
    }

    conn.execute_batch("COMMIT")?;

    // Fetch full session objects for response
    let mut sessions: Vec<Session> = Vec::new();
    for id in session_ids {
        let exercises = get_session_exercises(&conn, id)?;
        let (template_id, template_name, name, started_at, ended_at, paused_duration, notes, status) = conn
            .query_row(
                "SELECT s.template_id, t.name, s.name, s.started_at, s.ended_at, s.paused_duration, s.notes, s.status
                 FROM sessions s LEFT JOIN templates t ON t.id = s.template_id
                 WHERE s.id = ?1",
                [id],
                |row| {
                    Ok((
                        row.get::<_, Option<i64>>(0)?,
                        row.get::<_, Option<String>>(1)?,
                        row.get::<_, Option<String>>(2)?,
                        row.get::<_, String>(3)?,
                        row.get::<_, Option<String>>(4)?,
                        row.get::<_, i64>(5)?,
                        row.get::<_, Option<String>>(6)?,
                        row.get::<_, String>(7)?,
                    ))
                },
            )?;

        sessions.push(Session {
            id,
            template_id,
            template_name,
            name,
            started_at,
            ended_at,
            paused_duration,
            notes,
            status,
            exercises,
        });
    }

    Ok(ImportResult {
        sessions,
        exercises_created,
        warnings,
    })
}

// ── Helpers ──

fn get_session_exercises(conn: &rusqlite::Connection, session_id: i64) -> Result<Vec<SessionExerciseWithSets>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT se.id, se.exercise_id, e.name, se.position, se.notes
         FROM session_exercises se
         JOIN exercises e ON e.id = se.exercise_id
         WHERE se.session_id = ?1
         ORDER BY se.position"
    )?;

    let exercise_rows: Vec<(i64, i64, String, i32, Option<String>)> = stmt
        .query_map([session_id], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut exercises = Vec::new();
    for (se_id, exercise_id, exercise_name, position, notes) in exercise_rows {
        let mut set_stmt = conn.prepare(
            "SELECT id, session_exercise_id, set_number, weight_kg, reps, set_type, rir, completed_at
             FROM sets WHERE session_exercise_id = ?1 ORDER BY set_number"
        )?;

        let sets: Vec<Set> = set_stmt
            .query_map([se_id], |row| {
                Ok(Set {
                    id: row.get(0)?,
                    session_exercise_id: row.get(1)?,
                    set_number: row.get(2)?,
                    weight_kg: row.get(3)?,
                    reps: row.get(4)?,
                    set_type: row.get(5)?,
                    rir: row.get(6)?,
                    completed_at: row.get(7)?,
                })
            })?
            .filter_map(|r| r.ok())
            .collect();

        exercises.push(SessionExerciseWithSets {
            id: se_id,
            exercise_id,
            exercise_name,
            position,
            notes,
            sets,
        });
    }

    Ok(exercises)
}
