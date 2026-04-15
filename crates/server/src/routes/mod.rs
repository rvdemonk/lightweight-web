mod admin;
mod analytics;
mod beta;
mod exercises;
mod export;
mod history;
mod invites;
mod preferences;
mod sessions;
mod templates;

use axum::{routing::{get, post}, Router};
use std::sync::Arc;

use crate::app::AppState;

pub fn public_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/auth/login", post(auth_login))
        .route("/auth/register", post(auth_register))
        .route("/auth/google", post(auth_google))
        .route("/config", get(get_config))
        .merge(invites::public_routes())
        .merge(beta::public_routes())
}

async fn get_config() -> Json<serde_json::Value> {
    let google_client_id = std::env::var("LW_GOOGLE_CLIENT_ID").unwrap_or_default();
    Json(serde_json::json!({ "google_client_id": google_client_id }))
}

pub fn protected_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/auth/check", get(auth_check))
        .route("/auth/logout", post(auth_logout))
        .merge(exercises::routes())
        .merge(templates::routes())
        .merge(sessions::routes())
        .merge(history::routes())
        .merge(analytics::routes())
        .merge(preferences::routes())
        .merge(export::routes())
        .merge(invites::routes())
        .merge(admin::routes())
}

// ── Auth handlers ──

use axum::{extract::State, http::StatusCode, Extension, Json};
use crate::auth::AuthToken;
use lightweight_core::models::{AuthResponse, GoogleAuthRequest, LoginRequest, RegisterRequest};

async fn auth_register(
    State(state): State<Arc<AppState>>,
    Json(body): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), StatusCode> {
    let invite_code = std::env::var("LW_INVITE_CODE").ok();
    lightweight_core::auth::register(
        &state.db,
        &body.username,
        &body.password,
        body.invite_code.as_deref(),
        invite_code.as_deref(),
        body.email.as_deref(),
    )
    .map(|r| (StatusCode::CREATED, Json(r)))
    .map_err(|e| match e {
        lightweight_core::error::AppError::UsernameTaken => StatusCode::CONFLICT,
        lightweight_core::error::AppError::InvalidInviteCode => StatusCode::FORBIDDEN,
        lightweight_core::error::AppError::InvalidUsername(_) => StatusCode::BAD_REQUEST,
        lightweight_core::error::AppError::WeakPassword => StatusCode::BAD_REQUEST,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })
}

async fn auth_google(
    State(state): State<Arc<AppState>>,
    Json(body): Json<GoogleAuthRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), StatusCode> {
    let google_client_id = std::env::var("LW_GOOGLE_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let claims = crate::google::verify_google_id_token(
        &state.http_client,
        &body.id_token,
        &google_client_id,
    )
    .await
    .map_err(|_| StatusCode::UNAUTHORIZED)?;

    lightweight_core::auth::google_auth(&state.db, &claims.sub, claims.email.as_deref())
        .map(|r| (StatusCode::CREATED, Json(r)))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn auth_login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    lightweight_core::auth::login(&state.db, &body.username, &body.password)
        .map(Json)
        .map_err(|_| StatusCode::UNAUTHORIZED)
}

async fn auth_check() -> StatusCode {
    StatusCode::OK
}

async fn auth_logout(
    State(state): State<Arc<AppState>>,
    Extension(AuthToken(token)): Extension<AuthToken>,
) -> StatusCode {
    match lightweight_core::auth::logout(&state.db, &token) {
        Ok(()) => StatusCode::NO_CONTENT,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}
