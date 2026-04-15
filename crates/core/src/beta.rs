use crate::db::DbPool;
use crate::error::AppError;
use crate::models::BetaSignup;

pub fn record_signup(
    db: &DbPool,
    user_id: i64,
    email: &str,
    platform: &str,
    referrer: Option<&str>,
) -> Result<(), AppError> {
    let conn = db.lock().unwrap();
    conn.execute(
        "INSERT INTO beta_signups (user_id, email, platform, referrer) VALUES (?1, ?2, ?3, ?4)",
        rusqlite::params![user_id, email, platform, referrer],
    )?;
    Ok(())
}

pub fn list_signups(conn: &rusqlite::Connection) -> Result<Vec<BetaSignup>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT b.id, b.email, b.platform, b.referrer, b.created_at, b.status,
                    u.username, u.google_id
             FROM beta_signups b
             JOIN users u ON u.id = b.user_id
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
