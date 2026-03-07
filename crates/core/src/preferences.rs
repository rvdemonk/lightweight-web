use serde::{Deserialize, Serialize};

use crate::db::DbPool;
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct E1rmSpiderPrefs {
    pub exercise_ids: Vec<i64>,
}

pub fn get_preference(db: &DbPool, user_id: i64, key: &str) -> Result<Option<String>, AppError> {
    let conn = db.lock().unwrap();
    let result = conn.query_row(
        "SELECT value FROM user_preferences WHERE user_id = ?1 AND key = ?2",
        rusqlite::params![user_id, key],
        |row| row.get(0),
    );
    match result {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn set_preference(db: &DbPool, user_id: i64, key: &str, value: &str) -> Result<(), AppError> {
    let conn = db.lock().unwrap();
    conn.execute(
        "INSERT INTO user_preferences (user_id, key, value) VALUES (?1, ?2, ?3)
         ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value",
        rusqlite::params![user_id, key, value],
    )?;
    Ok(())
}
