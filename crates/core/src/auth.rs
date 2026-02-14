use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use rand::Rng;

use crate::db::DbPool;
use crate::error::AppError;
use crate::models::AuthResponse;

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

pub fn setup(db: &DbPool, password: &str) -> Result<AuthResponse, AppError> {
    let conn = db.lock().unwrap();

    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM auth",
        [],
        |row| row.get(0),
    )?;

    if exists {
        return Err(AppError::AuthAlreadyConfigured);
    }

    let hash = hash_password(password)?;
    let token = generate_token();

    conn.execute(
        "INSERT INTO auth (id, password_hash, token) VALUES (1, ?1, ?2)",
        rusqlite::params![hash, token],
    )?;

    Ok(AuthResponse { token })
}

pub fn login(db: &DbPool, password: &str) -> Result<AuthResponse, AppError> {
    let conn = db.lock().unwrap();

    let hash: String = conn
        .query_row("SELECT password_hash FROM auth WHERE id = 1", [], |row| {
            row.get(0)
        })
        .map_err(|_| AppError::Unauthorized)?;

    if !verify_password(password, &hash)? {
        return Err(AppError::Unauthorized);
    }

    let token = generate_token();
    conn.execute(
        "UPDATE auth SET token = ?1 WHERE id = 1",
        rusqlite::params![token],
    )?;

    Ok(AuthResponse { token })
}

pub fn verify_token(db: &DbPool, token: &str) -> Result<bool, AppError> {
    let conn = db.lock().unwrap();
    let stored: Result<String, _> = conn.query_row(
        "SELECT token FROM auth WHERE id = 1",
        [],
        |row| row.get(0),
    );

    match stored {
        Ok(t) => Ok(t == token),
        Err(_) => Ok(false),
    }
}

pub fn is_setup(db: &DbPool) -> Result<bool, AppError> {
    let conn = db.lock().unwrap();
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM auth", [], |row| row.get(0))?;
    Ok(count > 0)
}
