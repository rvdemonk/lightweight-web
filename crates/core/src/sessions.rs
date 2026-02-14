use crate::db::DbPool;
use crate::error::AppError;
use crate::models::*;

pub fn list(db: &DbPool, params: &SessionListParams) -> Result<Vec<SessionSummary>, AppError> {
    let conn = db.lock().unwrap();
    let limit = params.limit.unwrap_or(20);
    let offset = params.offset.unwrap_or(0);

    let (sql, sql_params): (String, Vec<Box<dyn rusqlite::types::ToSql>>) = if let Some(tid) = params.template_id {
        (
            "SELECT s.id, s.template_id, t.name, s.name, s.started_at, s.ended_at, s.status
             FROM sessions s LEFT JOIN templates t ON t.id = s.template_id
             WHERE s.template_id = ?1
             ORDER BY s.started_at DESC LIMIT ?2 OFFSET ?3".to_string(),
            vec![Box::new(tid), Box::new(limit), Box::new(offset)],
        )
    } else {
        (
            "SELECT s.id, s.template_id, t.name, s.name, s.started_at, s.ended_at, s.status
             FROM sessions s LEFT JOIN templates t ON t.id = s.template_id
             ORDER BY s.started_at DESC LIMIT ?1 OFFSET ?2".to_string(),
            vec![Box::new(limit), Box::new(offset)],
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
        })
    })?;

    let mut sessions = Vec::new();
    for row in rows {
        sessions.push(row?);
    }
    Ok(sessions)
}

pub fn get_active(db: &DbPool) -> Result<Option<Session>, AppError> {
    let conn = db.lock().unwrap();
    let id: Result<i64, _> = conn.query_row(
        "SELECT id FROM sessions WHERE status IN ('active', 'paused') ORDER BY started_at DESC LIMIT 1",
        [],
        |row| row.get(0),
    );

    match id {
        Ok(id) => {
            drop(conn);
            Ok(Some(get(db, id)?))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn get(db: &DbPool, id: i64) -> Result<Session, AppError> {
    let conn = db.lock().unwrap();
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

pub fn create(db: &DbPool, input: &CreateSession) -> Result<Session, AppError> {
    let conn = db.lock().unwrap();

    let status = input.status.as_deref().unwrap_or("active");

    if input.started_at.is_some() || input.ended_at.is_some() {
        conn.execute(
            "INSERT INTO sessions (template_id, name, started_at, ended_at, status, notes)
             VALUES (?1, ?2, COALESCE(?3, datetime('now')), ?4, ?5, ?6)",
            rusqlite::params![
                input.template_id, input.name,
                input.started_at, input.ended_at,
                status, input.notes
            ],
        )?;
    } else {
        conn.execute(
            "INSERT INTO sessions (template_id, name, status, notes) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![input.template_id, input.name, status, input.notes],
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
    get(db, session_id)
}

pub fn update(db: &DbPool, id: i64, input: &UpdateSession) -> Result<Session, AppError> {
    let conn = db.lock().unwrap();

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
    get(db, id)
}

pub fn delete(db: &DbPool, id: i64) -> Result<(), AppError> {
    let conn = db.lock().unwrap();
    let rows = conn.execute("DELETE FROM sessions WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

// ── Session Exercises ──

pub fn add_exercise(db: &DbPool, session_id: i64, input: &AddSessionExercise) -> Result<SessionExerciseWithSets, AppError> {
    let conn = db.lock().unwrap();

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

pub fn update_exercise(db: &DbPool, _session_id: i64, se_id: i64, input: &UpdateSessionExercise) -> Result<(), AppError> {
    let conn = db.lock().unwrap();

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

pub fn remove_exercise(db: &DbPool, _session_id: i64, se_id: i64) -> Result<(), AppError> {
    let conn = db.lock().unwrap();
    let rows = conn.execute("DELETE FROM session_exercises WHERE id = ?1", [se_id])?;
    if rows == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

// ── Sets ──

pub fn add_set(db: &DbPool, se_id: i64, input: &CreateSet) -> Result<Set, AppError> {
    let conn = db.lock().unwrap();

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
        "INSERT INTO sets (session_exercise_id, set_number, weight_kg, reps, set_type)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![se_id, set_number, input.weight_kg, input.reps, set_type],
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
        completed_at,
    })
}

pub fn update_set(db: &DbPool, set_id: i64, input: &UpdateSet) -> Result<Set, AppError> {
    let conn = db.lock().unwrap();

    if let Some(weight_kg) = input.weight_kg {
        conn.execute("UPDATE sets SET weight_kg = ?1 WHERE id = ?2", rusqlite::params![weight_kg, set_id])?;
    }
    if let Some(reps) = input.reps {
        conn.execute("UPDATE sets SET reps = ?1 WHERE id = ?2", rusqlite::params![reps, set_id])?;
    }
    if let Some(ref set_type) = input.set_type {
        conn.execute("UPDATE sets SET set_type = ?1 WHERE id = ?2", rusqlite::params![set_type, set_id])?;
    }

    conn.query_row(
        "SELECT id, session_exercise_id, set_number, weight_kg, reps, set_type, completed_at
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
                completed_at: row.get(6)?,
            })
        },
    )
    .map_err(|_| AppError::NotFound)
}

pub fn delete_set(db: &DbPool, set_id: i64) -> Result<(), AppError> {
    let conn = db.lock().unwrap();
    let rows = conn.execute("DELETE FROM sets WHERE id = ?1", [set_id])?;
    if rows == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

// ── History ──

pub fn exercise_history(db: &DbPool, exercise_id: i64, limit: i64) -> Result<ExerciseHistory, AppError> {
    let conn = db.lock().unwrap();

    let exercise_name: String = conn
        .query_row("SELECT name FROM exercises WHERE id = ?1", [exercise_id], |row| row.get(0))
        .map_err(|_| AppError::NotFound)?;

    let mut stmt = conn.prepare(
        "SELECT DISTINCT s.id, s.name, s.started_at
         FROM sessions s
         JOIN session_exercises se ON se.session_id = s.id
         WHERE se.exercise_id = ?1 AND s.status = 'completed'
         ORDER BY s.started_at DESC LIMIT ?2"
    )?;

    let session_rows: Vec<(i64, Option<String>, String)> = stmt
        .query_map(rusqlite::params![exercise_id, limit], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut sessions = Vec::new();
    for (session_id, session_name, date) in session_rows {
        let mut set_stmt = conn.prepare(
            "SELECT st.id, st.session_exercise_id, st.set_number, st.weight_kg, st.reps, st.set_type, st.completed_at
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
                    completed_at: row.get(6)?,
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

pub fn template_previous(db: &DbPool, template_id: i64) -> Result<Option<Session>, AppError> {
    let conn = db.lock().unwrap();
    let id: Result<i64, _> = conn.query_row(
        "SELECT id FROM sessions
         WHERE template_id = ?1 AND status = 'completed'
         ORDER BY started_at DESC LIMIT 1",
        [template_id],
        |row| row.get(0),
    );

    match id {
        Ok(id) => {
            drop(conn);
            Ok(Some(get(db, id)?))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
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
            "SELECT id, session_exercise_id, set_number, weight_kg, reps, set_type, completed_at
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
                    completed_at: row.get(6)?,
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
