mod exercises;
mod history;
mod sessions;
mod templates;

use axum::{routing::{get, post}, Router};
use std::sync::Arc;

use crate::app::AppState;

pub fn public_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/auth/login", post(auth_login))
        .route("/auth/setup", post(auth_setup))
}

pub fn protected_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/auth/check", get(auth_check))
        .merge(exercises::routes())
        .merge(templates::routes())
        .merge(sessions::routes())
        .merge(history::routes())
}

// ── Auth handlers ──

use axum::{extract::State, http::StatusCode, Json};
use lightweight_core::models::{AuthResponse, LoginRequest};

async fn auth_setup(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    lightweight_core::auth::setup(&state.db, &body.password)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::AuthAlreadyConfigured => StatusCode::CONFLICT,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn auth_login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    lightweight_core::auth::login(&state.db, &body.password)
        .map(Json)
        .map_err(|_| StatusCode::UNAUTHORIZED)
}

async fn auth_check() -> StatusCode {
    StatusCode::OK
}
