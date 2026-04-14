use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand::Rng;

use crate::db::DbPool;
use crate::error::AppError;
use crate::models::AuthResponse;

const SEED_EXERCISES: &[(&str, &str, &str)] = &[
    ("Incline Barbell Bench", "Chest", "Barbell"),
    ("DB Chest Flies", "Chest", "Dumbbells"),
    ("Weighted Push-ups", "Chest", "Bodyweight"),
    ("Barbell Bent Row", "Back", "Barbell"),
    ("Chin-ups", "Back", "Bodyweight"),
    ("Egyptian Raises", "Shoulders", "Dumbbells"),
    ("DB Overhead Press", "Shoulders", "Dumbbells"),
    ("Seated Incline DB Curls", "Biceps", "Dumbbells"),
    ("Barbell Curls", "Biceps", "Barbell"),
    ("Overhead DB Tricep Extension", "Triceps", "Dumbbells"),
    ("Back Squat", "Quads", "Barbell"),
    ("Walking Lunges", "Quads", "Dumbbells"),
    ("Reverse Lunges", "Quads", "Dumbbells"),
    ("Romanian Deadlift", "Hamstrings", "Barbell"),
    ("Good Mornings", "Hamstrings", "Barbell"),
    ("Hanging Leg Raise", "Core", "Bodyweight"),
    ("Standing Calf Raise", "Calves", "Machine"),
];

pub(crate) fn generate_token() -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
    hex::encode(bytes)
}

pub(crate) fn hash_password(password: &str) -> Result<String, AppError> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::BadRequest(format!("Hash error: {}", e)))?;
    Ok(hash.to_string())
}

fn verify_password(password: &str, hash: &str) -> Result<bool, AppError> {
    let parsed = PasswordHash::new(hash)
        .map_err(|e| AppError::BadRequest(format!("Hash parse error: {}", e)))?;
    Ok(Argon2::default()
        .verify_password(password.as_bytes(), &parsed)
        .is_ok())
}

pub(crate) fn validate_password(password: &str) -> Result<(), AppError> {
    lightweight_calc::validation::validate_password(password)
        .map_err(|_| AppError::WeakPassword)
}

pub(crate) fn validate_username(username: &str) -> Result<String, AppError> {
    lightweight_calc::validation::validate_username(username)
        .map_err(|e| AppError::InvalidUsername(e.to_string()))
}

pub(crate) fn seed_exercises(conn: &rusqlite::Connection, user_id: i64) -> Result<(), AppError> {
    for (name, muscle_group, equipment) in SEED_EXERCISES {
        conn.execute(
            "INSERT OR IGNORE INTO exercises (user_id, name, muscle_group, equipment) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![user_id, name, muscle_group, equipment],
        )?;
    }
    Ok(())
}

const SESSION_DURATION_DAYS: i32 = 30;

pub(crate) fn create_auth_session(conn: &rusqlite::Connection, user_id: i64) -> Result<String, AppError> {
    let token = generate_token();
    conn.execute(
        "INSERT INTO auth_sessions (user_id, token, expires_at) VALUES (?1, ?2, datetime('now', ?3))",
        rusqlite::params![user_id, token, format!("+{} days", SESSION_DURATION_DAYS)],
    )?;
    Ok(token)
}

pub fn register(
    db: &DbPool,
    username: &str,
    password: &str,
    invite_code: Option<&str>,
    required_invite_code: Option<&str>,
) -> Result<AuthResponse, AppError> {
    // Validate invite code if required
    if let Some(required) = required_invite_code {
        match invite_code {
            Some(provided) if provided == required => {}
            _ => return Err(AppError::InvalidInviteCode),
        }
    }

    let username = validate_username(username)?;
    validate_password(password)?;
    let hash = hash_password(password)?;

    let conn = db.lock().unwrap();

    // Check if username is taken
    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM users WHERE username = ?1",
        rusqlite::params![username],
        |row| row.get(0),
    )?;
    if exists {
        return Err(AppError::UsernameTaken);
    }

    // Insert user (token column no longer used)
    conn.execute(
        "INSERT INTO users (username, password_hash) VALUES (?1, ?2)",
        rusqlite::params![username, hash],
    )?;
    let user_id = conn.last_insert_rowid();

    seed_exercises(&conn, user_id)?;

    let token = create_auth_session(&conn, user_id)?;
    Ok(AuthResponse { token, user_id })
}

pub fn login(db: &DbPool, username: &str, password: &str) -> Result<AuthResponse, AppError> {
    let conn = db.lock().unwrap();

    let result: Result<(i64, Option<String>), _> = conn.query_row(
        "SELECT id, password_hash FROM users WHERE username = ?1",
        rusqlite::params![username],
        |row| Ok((row.get(0)?, row.get(1)?)),
    );

    let (user_id, hash) = result.map_err(|_| AppError::Unauthorized)?;

    // Google-only users have no password_hash
    let hash = hash.ok_or(AppError::Unauthorized)?;

    if !verify_password(password, &hash)? {
        return Err(AppError::Unauthorized);
    }

    let token = create_auth_session(&conn, user_id)?;
    Ok(AuthResponse { token, user_id })
}

/// Find or create a user from a verified Google identity.
pub fn google_auth(
    db: &DbPool,
    google_id: &str,
    email: Option<&str>,
) -> Result<AuthResponse, AppError> {
    let conn = db.lock().unwrap();

    // Try to find existing user by google_id
    let existing: Result<i64, _> = conn.query_row(
        "SELECT id FROM users WHERE google_id = ?1",
        rusqlite::params![google_id],
        |row| row.get(0),
    );

    let user_id = match existing {
        Ok(id) => {
            // Update email if changed
            if let Some(email) = email {
                conn.execute(
                    "UPDATE users SET email = ?1 WHERE id = ?2",
                    rusqlite::params![email, id],
                )?;
            }
            id
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            conn.execute(
                "INSERT INTO users (google_id, email) VALUES (?1, ?2)",
                rusqlite::params![google_id, email],
            )?;
            let user_id = conn.last_insert_rowid();
            seed_exercises(&conn, user_id)?;
            user_id
        }
        Err(e) => return Err(AppError::Database(e)),
    };

    let token = create_auth_session(&conn, user_id)?;
    Ok(AuthResponse { token, user_id })
}

pub fn logout(db: &DbPool, token: &str) -> Result<(), AppError> {
    let conn = db.lock().unwrap();
    conn.execute(
        "DELETE FROM auth_sessions WHERE token = ?1",
        rusqlite::params![token],
    )?;
    Ok(())
}

pub fn verify_token(db: &DbPool, token: &str) -> Result<Option<i64>, AppError> {
    let conn = db.lock().unwrap();
    let result: Result<i64, _> = conn.query_row(
        "SELECT user_id FROM auth_sessions WHERE token = ?1 AND expires_at > datetime('now')",
        rusqlite::params![token],
        |row| row.get(0),
    );

    match result {
        Ok(user_id) => Ok(Some(user_id)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}
