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

fn generate_token() -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
    hex::encode(bytes)
}

fn hash_password(password: &str) -> Result<String, AppError> {
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

fn validate_username(username: &str) -> Result<String, AppError> {
    let lowered = username.to_lowercase();
    if lowered.len() < 3 || lowered.len() > 20 {
        return Err(AppError::InvalidUsername(
            "Username must be 3-20 characters".to_string(),
        ));
    }
    if !lowered.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
        return Err(AppError::InvalidUsername(
            "Username must contain only alphanumeric characters and underscores".to_string(),
        ));
    }
    Ok(lowered)
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
    let hash = hash_password(password)?;
    let token = generate_token();

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

    // Insert user
    conn.execute(
        "INSERT INTO users (username, password_hash, token) VALUES (?1, ?2, ?3)",
        rusqlite::params![username, hash, token],
    )?;
    let user_id = conn.last_insert_rowid();

    // Clone seed exercises for new user (OR IGNORE handles fresh-DB case
    // where migration already assigned orphaned seed data to user_id=1)
    for (name, muscle_group, equipment) in SEED_EXERCISES {
        conn.execute(
            "INSERT OR IGNORE INTO exercises (user_id, name, muscle_group, equipment) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![user_id, name, muscle_group, equipment],
        )?;
    }

    Ok(AuthResponse { token })
}

pub fn login(db: &DbPool, username: &str, password: &str) -> Result<AuthResponse, AppError> {
    let conn = db.lock().unwrap();

    let result: Result<(i64, String), _> = conn.query_row(
        "SELECT id, password_hash FROM users WHERE username = ?1",
        rusqlite::params![username],
        |row| Ok((row.get(0)?, row.get(1)?)),
    );

    let (user_id, hash) = result.map_err(|_| AppError::Unauthorized)?;

    if !verify_password(password, &hash)? {
        return Err(AppError::Unauthorized);
    }

    let token = generate_token();
    conn.execute(
        "UPDATE users SET token = ?1 WHERE id = ?2",
        rusqlite::params![token, user_id],
    )?;

    Ok(AuthResponse { token })
}

pub fn verify_token(db: &DbPool, token: &str) -> Result<Option<i64>, AppError> {
    let conn = db.lock().unwrap();
    let result: Result<i64, _> = conn.query_row(
        "SELECT id FROM users WHERE token = ?1",
        rusqlite::params![token],
        |row| row.get(0),
    );

    match result {
        Ok(user_id) => Ok(Some(user_id)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(AppError::Database(e)),
    }
}
