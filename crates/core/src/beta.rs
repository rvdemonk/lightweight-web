use crate::db::DbPool;
use crate::error::AppError;
use crate::models::BetaSignup;

/// Record a beta signup for a user who authenticated (Google/password).
/// Uses INSERT OR IGNORE to skip duplicates on the same email.
pub fn record_signup(
    db: &DbPool,
    user_id: i64,
    email: &str,
    platform: &str,
    referrer: Option<&str>,
) -> Result<(), AppError> {
    let conn = db.lock().unwrap();
    conn.execute(
        "INSERT OR IGNORE INTO beta_signups (user_id, email, platform, referrer) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![user_id, email, platform, referrer],
    )?;
    Ok(())
}

/// Record a beta join (email-only, no account created).
/// Returns true if inserted, false if email already exists.
pub fn record_join(
    db: &DbPool,
    email: &str,
    platform: &str,
    referrer: Option<&str>,
) -> Result<bool, AppError> {
    let conn = db.lock().unwrap();
    let rows = conn.execute(
        "INSERT OR IGNORE INTO beta_signups (email, platform, referrer) VALUES (?1, ?2, ?3)",
        rusqlite::params![email, platform, referrer],
    )?;
    Ok(rows > 0)
}

pub fn admin_add_signup(
    db: &DbPool,
    email: &str,
    platform: &str,
    referrer: Option<&str>,
) -> Result<i64, AppError> {
    let conn = db.lock().unwrap();
    let rows = conn.execute(
        "INSERT OR IGNORE INTO beta_signups (email, platform, referrer) VALUES (?1, ?2, ?3)",
        rusqlite::params![email, platform, referrer],
    )?;
    if rows == 0 {
        return Err(AppError::AlreadyExists);
    }
    Ok(conn.last_insert_rowid())
}

pub fn admin_update_status(db: &DbPool, id: i64, status: &str) -> Result<(), AppError> {
    if status != "pending" && status != "added" {
        return Err(AppError::BadRequest(format!("invalid status: {status}")));
    }
    let conn = db.lock().unwrap();
    let rows = conn.execute(
        "UPDATE beta_signups SET status = ?1 WHERE id = ?2",
        rusqlite::params![status, id],
    )?;
    if rows == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn list_signups(conn: &rusqlite::Connection) -> Result<Vec<BetaSignup>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT b.id, b.email, b.platform, b.referrer, b.created_at, b.status,
                    u.username, u.google_id
             FROM beta_signups b
             LEFT JOIN users u ON u.id = b.user_id
             ORDER BY b.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(BetaSignup {
                id: row.get(0)?,
                email: row.get(1)?,
                platform: row.get(2)?,
                referrer: row.get(3)?,
                created_at: row.get(4)?,
                status: row.get(5)?,
                username: row.get(6)?,
                google_id: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
