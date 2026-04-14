use crate::auth::{create_auth_session, generate_token, hash_password, seed_exercises, validate_password, validate_username};
use crate::db::DbPool;
use crate::error::AppError;
use crate::models::{AuthResponse, Invite, InviteList, InviteValidation};

pub fn create_invite(db: &DbPool, user_id: i64) -> Result<Invite, AppError> {
    let code = generate_token();
    let conn = db.lock().unwrap();

    let quota: i64 = conn.query_row(
        "SELECT invite_quota FROM users WHERE id = ?1",
        rusqlite::params![user_id],
        |row| row.get(0),
    )?;

    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM invites WHERE created_by = ?1",
        rusqlite::params![user_id],
        |row| row.get(0),
    )?;

    if count >= quota {
        return Err(AppError::InviteQuotaExceeded);
    }

    conn.execute(
        "INSERT INTO invites (code, created_by) VALUES (?1, ?2)",
        rusqlite::params![code, user_id],
    )?;

    let id = conn.last_insert_rowid();
    let created_at: String = conn.query_row(
        "SELECT created_at FROM invites WHERE id = ?1",
        rusqlite::params![id],
        |row| row.get(0),
    )?;

    Ok(Invite {
        id,
        code,
        created_at,
        used_by_username: None,
        used_at: None,
    })
}

pub fn list_invites(db: &DbPool, user_id: i64) -> Result<InviteList, AppError> {
    let conn = db.lock().unwrap();

    let quota: i64 = conn.query_row(
        "SELECT invite_quota FROM users WHERE id = ?1",
        rusqlite::params![user_id],
        |row| row.get(0),
    )?;

    let mut stmt = conn.prepare(
        "SELECT i.id, i.code, i.created_at, u.username, i.used_at
         FROM invites i
         LEFT JOIN users u ON u.id = i.used_by
         WHERE i.created_by = ?1
         ORDER BY i.created_at DESC",
    )?;

    let invites: Vec<Invite> = stmt
        .query_map(rusqlite::params![user_id], |row| {
            Ok(Invite {
                id: row.get(0)?,
                code: row.get(1)?,
                created_at: row.get(2)?,
                used_by_username: row.get(3)?,
                used_at: row.get(4)?,
            })
        })?
        .collect::<Result<_, _>>()?;

    let used_count = invites.iter().filter(|i| i.used_by_username.is_some()).count() as i64;

    Ok(InviteList {
        quota,
        used_count,
        invites,
    })
}

pub fn validate_invite_code(db: &DbPool, code: &str) -> Result<InviteValidation, AppError> {
    let conn = db.lock().unwrap();

    let result: Result<(Option<i64>, i64), _> = conn.query_row(
        "SELECT i.used_by, i.created_by FROM invites i WHERE i.code = ?1",
        rusqlite::params![code],
        |row| Ok((row.get(0)?, row.get(1)?)),
    );

    match result {
        Ok((used_by, created_by)) => {
            if used_by.is_some() {
                return Ok(InviteValidation {
                    valid: false,
                    invited_by: None,
                });
            }
            let inviter: String = conn.query_row(
                "SELECT username FROM users WHERE id = ?1",
                rusqlite::params![created_by],
                |row| row.get(0),
            )?;
            Ok(InviteValidation {
                valid: true,
                invited_by: Some(inviter),
            })
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(InviteValidation {
            valid: false,
            invited_by: None,
        }),
        Err(e) => Err(AppError::Database(e)),
    }
}

pub fn register_with_invite(
    db: &DbPool,
    code: &str,
    username: &str,
    password: &str,
) -> Result<AuthResponse, AppError> {
    let username = validate_username(username)?;
    validate_password(password)?;
    let hash = hash_password(password)?;

    let conn = db.lock().unwrap();

    conn.execute_batch("BEGIN")?;

    let result = (|| -> Result<AuthResponse, AppError> {
        // Verify invite is valid and unclaimed
        let invite_id: i64 = conn
            .query_row(
                "SELECT id FROM invites WHERE code = ?1 AND used_by IS NULL",
                rusqlite::params![code],
                |row| row.get(0),
            )
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows => AppError::InvalidInviteCode,
                other => AppError::Database(other),
            })?;

        // Check username uniqueness
        let exists: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM users WHERE username = ?1",
            rusqlite::params![username],
            |row| row.get(0),
        )?;
        if exists {
            return Err(AppError::UsernameTaken);
        }

        // Insert user
        conn.execute(
            "INSERT INTO users (username, password_hash) VALUES (?1, ?2)",
            rusqlite::params![username, hash],
        )?;
        let user_id = conn.last_insert_rowid();

        // Claim invite — WHERE used_by IS NULL guards against races
        let rows = conn.execute(
            "UPDATE invites SET used_by = ?1, used_at = datetime('now') WHERE id = ?2 AND used_by IS NULL",
            rusqlite::params![user_id, invite_id],
        )?;
        if rows == 0 {
            return Err(AppError::InvalidInviteCode);
        }

        seed_exercises(&conn, user_id)?;
        let token = create_auth_session(&conn, user_id)?;
        Ok(AuthResponse { token, user_id })
    })();

    match &result {
        Ok(_) => conn.execute_batch("COMMIT")?,
        Err(_) => { let _ = conn.execute_batch("ROLLBACK"); }
    }

    result
}
