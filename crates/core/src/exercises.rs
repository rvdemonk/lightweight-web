use crate::db::DbPool;
use crate::error::AppError;
use crate::models::{CreateExercise, Exercise, UpdateExercise};

pub fn list(db: &DbPool) -> Result<Vec<Exercise>, AppError> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, muscle_group, equipment, notes, archived, created_at
         FROM exercises WHERE archived = 0 ORDER BY name"
    )?;

    let rows = stmt.query_map([], |row| {
        Ok(Exercise {
            id: row.get(0)?,
            name: row.get(1)?,
            muscle_group: row.get(2)?,
            equipment: row.get(3)?,
            notes: row.get(4)?,
            archived: row.get::<_, i32>(5)? != 0,
            created_at: row.get(6)?,
        })
    })?;

    let mut exercises = Vec::new();
    for row in rows {
        exercises.push(row?);
    }
    Ok(exercises)
}

pub fn get(db: &DbPool, id: i64) -> Result<Exercise, AppError> {
    let conn = db.lock().unwrap();
    conn.query_row(
        "SELECT id, name, muscle_group, equipment, notes, archived, created_at
         FROM exercises WHERE id = ?1",
        [id],
        |row| {
            Ok(Exercise {
                id: row.get(0)?,
                name: row.get(1)?,
                muscle_group: row.get(2)?,
                equipment: row.get(3)?,
                notes: row.get(4)?,
                archived: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
            })
        },
    )
    .map_err(|_| AppError::NotFound)
}

pub fn create(db: &DbPool, input: &CreateExercise) -> Result<Exercise, AppError> {
    let conn = db.lock().unwrap();
    conn.execute(
        "INSERT INTO exercises (name, muscle_group, equipment, notes) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![input.name, input.muscle_group, input.equipment, input.notes],
    )
    .map_err(|e| match e {
        rusqlite::Error::SqliteFailure(_, _) => AppError::AlreadyExists,
        other => AppError::Database(other),
    })?;

    let id = conn.last_insert_rowid();
    drop(conn);
    get(db, id)
}

pub fn update(db: &DbPool, id: i64, input: &UpdateExercise) -> Result<Exercise, AppError> {
    let conn = db.lock().unwrap();

    // Check exists
    let exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM exercises WHERE id = ?1",
            [id],
            |row| row.get(0),
        )?;
    if !exists {
        return Err(AppError::NotFound);
    }

    if let Some(ref name) = input.name {
        conn.execute("UPDATE exercises SET name = ?1 WHERE id = ?2", rusqlite::params![name, id])?;
    }
    if let Some(ref mg) = input.muscle_group {
        conn.execute("UPDATE exercises SET muscle_group = ?1 WHERE id = ?2", rusqlite::params![mg, id])?;
    }
    if let Some(ref eq) = input.equipment {
        conn.execute("UPDATE exercises SET equipment = ?1 WHERE id = ?2", rusqlite::params![eq, id])?;
    }
    if let Some(ref notes) = input.notes {
        conn.execute("UPDATE exercises SET notes = ?1 WHERE id = ?2", rusqlite::params![notes, id])?;
    }

    drop(conn);
    get(db, id)
}

pub fn archive(db: &DbPool, id: i64) -> Result<(), AppError> {
    let conn = db.lock().unwrap();
    let rows = conn.execute("UPDATE exercises SET archived = 1 WHERE id = ?1", [id])?;
    if rows == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}
