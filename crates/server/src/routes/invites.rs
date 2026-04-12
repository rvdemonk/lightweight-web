use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
    Extension, Json, Router,
};
use std::sync::Arc;

use crate::app::AppState;
use crate::auth::UserId;
use lightweight_core::models::*;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new().route("/invites", get(list_invites).post(create_invite))
}

pub fn public_routes() -> Router<Arc<AppState>> {
    Router::new().route(
        "/auth/join/:code",
        get(validate_join_code).post(register_via_invite),
    )
}

async fn create_invite(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<(StatusCode, Json<Invite>), StatusCode> {
    lightweight_core::invites::create_invite(&state.db, user_id)
        .map(|i| (StatusCode::CREATED, Json(i)))
        .map_err(|e| match e {
            lightweight_core::error::AppError::InviteQuotaExceeded => StatusCode::FORBIDDEN,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn list_invites(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<InviteList>, StatusCode> {
    lightweight_core::invites::list_invites(&state.db, user_id)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn validate_join_code(
    State(state): State<Arc<AppState>>,
    Path(code): Path<String>,
) -> Result<Json<InviteValidation>, StatusCode> {
    lightweight_core::invites::validate_invite_code(&state.db, &code)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn register_via_invite(
    State(state): State<Arc<AppState>>,
    Path(code): Path<String>,
    Json(body): Json<JoinRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), StatusCode> {
    lightweight_core::invites::register_with_invite(&state.db, &code, &body.username, &body.password)
        .map(|r| (StatusCode::CREATED, Json(r)))
        .map_err(|e| match e {
            lightweight_core::error::AppError::InvalidInviteCode => StatusCode::FORBIDDEN,
            lightweight_core::error::AppError::UsernameTaken => StatusCode::CONFLICT,
            lightweight_core::error::AppError::InvalidUsername(_) => StatusCode::BAD_REQUEST,
            lightweight_core::error::AppError::WeakPassword => StatusCode::BAD_REQUEST,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}
