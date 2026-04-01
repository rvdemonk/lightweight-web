use crate::db::DbPool;
use crate::error::AppError;
use crate::models::{CreateTemplate, Template, TemplateExercise, TemplateSnapshot, UpdateTemplate};

pub fn list(db: &DbPool, user_id: i64) -> Result<Vec<Template>, AppError> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, notes, archived, created_at, updated_at, version
         FROM templates WHERE archived = 0 AND user_id = ?1 ORDER BY name"
    )?;

    let templates: Vec<(i64, String, Option<String>, i32, String, String, i64)> = stmt
        .query_map([user_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
            ))
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut result = Vec::new();
    for (id, name, notes, archived, created_at, updated_at, version) in templates {
        let exercises = get_template_exercises(&conn, id)?;
        result.push(Template {
            id,
            name,
            notes,
            archived: archived != 0,
            created_at,
            updated_at,
            version,
            exercises,
        });
    }
    Ok(result)
}

pub fn get(db: &DbPool, user_id: i64, id: i64) -> Result<Template, AppError> {
    let conn = db.lock().unwrap();
    let (name, notes, archived, created_at, updated_at, version) = conn
        .query_row(
            "SELECT name, notes, archived, created_at, updated_at, version FROM templates WHERE id = ?1 AND user_id = ?2",
            rusqlite::params![id, user_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, i32>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, i64>(5)?,
                ))
            },
        )
        .map_err(|_| AppError::NotFound)?;

    let exercises = get_template_exercises(&conn, id)?;

    Ok(Template {
        id,
        name,
        notes,
        archived: archived != 0,
        created_at,
        updated_at,
        version,
        exercises,
    })
}

pub fn create(db: &DbPool, user_id: i64, input: &CreateTemplate) -> Result<Template, AppError> {
    let conn = db.lock().unwrap();

    // Verify all referenced exercise_ids belong to the user
    for ex in &input.exercises {
        let owns: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM exercises WHERE id = ?1 AND user_id = ?2",
            rusqlite::params![ex.exercise_id, user_id],
            |row| row.get(0),
        )?;
        if !owns {
            return Err(AppError::NotFound);
        }
    }

    conn.execute(
        "INSERT INTO templates (user_id, name, notes) VALUES (?1, ?2, ?3)",
        rusqlite::params![user_id, input.name, input.notes],
    )
    .map_err(|e| match e {
        rusqlite::Error::SqliteFailure(_, _) => AppError::AlreadyExists,
        other => AppError::Database(other),
    })?;

    let template_id = conn.last_insert_rowid();

    for ex in &input.exercises {
        conn.execute(
            "INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                template_id, ex.exercise_id, ex.position, ex.target_sets,
                ex.target_reps_min, ex.target_reps_max, ex.rest_seconds, ex.notes
            ],
        )?;
    }

    drop(conn);
    get(db, user_id, template_id)
}

pub fn update(db: &DbPool, user_id: i64, id: i64, input: &UpdateTemplate) -> Result<Template, AppError> {
    let conn = db.lock().unwrap();

    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM templates WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![id, user_id],
        |row| row.get(0),
    )?;
    if !exists {
        return Err(AppError::NotFound);
    }

    // Snapshot current state before mutation
    let (current_name, current_notes, current_version): (String, Option<String>, i64) = conn.query_row(
        "SELECT name, notes, version FROM templates WHERE id = ?1",
        [id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    let current_exercises = get_template_exercises(&conn, id)?;

    let snapshot = serde_json::json!({
        "name": current_name,
        "notes": current_notes,
        "version": current_version,
        "exercises": current_exercises,
    });
    let snapshot_json = serde_json::to_string(&snapshot)
        .map_err(|_| AppError::BadRequest("Failed to serialize snapshot".into()))?;

    conn.execute(
        "INSERT INTO template_snapshots (template_id, version, snapshot_json) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, current_version, snapshot_json],
    )?;

    conn.execute(
        "UPDATE templates SET version = version + 1 WHERE id = ?1",
        [id],
    )?;

    // Apply mutations
    if let Some(ref name) = input.name {
        conn.execute("UPDATE templates SET name = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![name, id])?;
    }
    if let Some(ref notes) = input.notes {
        conn.execute("UPDATE templates SET notes = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![notes, id])?;
    }

    if let Some(ref exercises) = input.exercises {
        // Verify all referenced exercise_ids belong to the user
        for ex in exercises {
            let owns: bool = conn.query_row(
                "SELECT COUNT(*) > 0 FROM exercises WHERE id = ?1 AND user_id = ?2",
                rusqlite::params![ex.exercise_id, user_id],
                |row| row.get(0),
            )?;
            if !owns {
                return Err(AppError::NotFound);
            }
        }

        conn.execute("DELETE FROM template_exercises WHERE template_id = ?1", [id])?;
        for ex in exercises {
            conn.execute(
                "INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params![
                    id, ex.exercise_id, ex.position, ex.target_sets,
                    ex.target_reps_min, ex.target_reps_max, ex.rest_seconds, ex.notes
                ],
            )?;
        }
        conn.execute("UPDATE templates SET updated_at = datetime('now') WHERE id = ?1", [id])?;
    }

    drop(conn);
    get(db, user_id, id)
}

pub fn archive(db: &DbPool, user_id: i64, id: i64) -> Result<(), AppError> {
    let conn = db.lock().unwrap();
    let rows = conn.execute(
        "UPDATE templates SET archived = 1 WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![id, user_id],
    )?;
    if rows == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn list_versions(db: &DbPool, user_id: i64, template_id: i64) -> Result<Vec<TemplateSnapshot>, AppError> {
    let conn = db.lock().unwrap();

    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM templates WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![template_id, user_id],
        |row| row.get(0),
    )?;
    if !exists {
        return Err(AppError::NotFound);
    }

    let mut stmt = conn.prepare(
        "SELECT id, template_id, version, snapshot_json, created_at
         FROM template_snapshots WHERE template_id = ?1
         ORDER BY version DESC"
    )?;

    let rows = stmt.query_map([template_id], |row| {
        Ok(TemplateSnapshot {
            id: row.get(0)?,
            template_id: row.get(1)?,
            version: row.get(2)?,
            snapshot_json: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;

    let mut snapshots = Vec::new();
    for row in rows {
        snapshots.push(row?);
    }
    Ok(snapshots)
}

pub fn get_version(db: &DbPool, user_id: i64, template_id: i64, version: i64) -> Result<TemplateSnapshot, AppError> {
    let conn = db.lock().unwrap();

    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM templates WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![template_id, user_id],
        |row| row.get(0),
    )?;
    if !exists {
        return Err(AppError::NotFound);
    }

    conn.query_row(
        "SELECT id, template_id, version, snapshot_json, created_at
         FROM template_snapshots WHERE template_id = ?1 AND version = ?2",
        rusqlite::params![template_id, version],
        |row| {
            Ok(TemplateSnapshot {
                id: row.get(0)?,
                template_id: row.get(1)?,
                version: row.get(2)?,
                snapshot_json: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    )
    .map_err(|_| AppError::NotFound)
}

fn get_template_exercises(conn: &rusqlite::Connection, template_id: i64) -> Result<Vec<TemplateExercise>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT te.id, te.exercise_id, e.name, te.position, te.target_sets,
                te.target_reps_min, te.target_reps_max, te.rest_seconds, te.notes
         FROM template_exercises te
         JOIN exercises e ON e.id = te.exercise_id
         WHERE te.template_id = ?1
         ORDER BY te.position"
    )?;

    let rows = stmt.query_map([template_id], |row| {
        Ok(TemplateExercise {
            id: row.get(0)?,
            exercise_id: row.get(1)?,
            exercise_name: row.get(2)?,
            position: row.get(3)?,
            target_sets: row.get(4)?,
            target_reps_min: row.get(5)?,
            target_reps_max: row.get(6)?,
            rest_seconds: row.get(7)?,
            notes: row.get(8)?,
        })
    })?;

    let mut exercises = Vec::new();
    for row in rows {
        exercises.push(row?);
    }
    Ok(exercises)
}
