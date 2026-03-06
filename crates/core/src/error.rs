use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("Not found")]
    NotFound,

    #[error("Already exists")]
    AlreadyExists,

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Bad request: {0}")]
    BadRequest(String),

    #[error("Invalid invite code")]
    InvalidInviteCode,

    #[error("Username already taken")]
    UsernameTaken,

    #[error("Invalid username: {0}")]
    InvalidUsername(String),
}
