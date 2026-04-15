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
        .route("/auth/me", get(auth_me))
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

use axum::{extract::State, http::{HeaderMap, StatusCode}, Extension, Json};
use crate::auth::AuthToken;
use lightweight_core::models::{AuthResponse, GoogleAuthRequest, LoginRequest, RegisterRequest};

pub(super) fn detect_platform(headers: &HeaderMap) -> &'static str {
    if let Some(ua) = headers.get("user-agent").and_then(|v| v.to_str().ok()) {
        if ua.contains("okhttp") || ua.contains("Android") {
            return "android";
        }
    }
    "web"
}

pub(crate) fn tag_session_platform(state: &AppState, token: &str, platform: &str) {
    if let Ok(conn) = state.db.lock() {
        let _ = conn.execute(
            "UPDATE auth_sessions SET platform = ?1 WHERE token = ?2",
            [platform, token],
        );
    }
}

async fn auth_register(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), StatusCode> {
    let invite_code = std::env::var("LW_INVITE_CODE").ok();
    let result = lightweight_core::auth::register(
        &state.db,
        &body.username,
        &body.password,
        body.invite_code.as_deref(),
        invite_code.as_deref(),
        body.email.as_deref(),
    )
    .map_err(|e| match e {
        lightweight_core::error::AppError::UsernameTaken => StatusCode::CONFLICT,
        lightweight_core::error::AppError::InvalidInviteCode => StatusCode::FORBIDDEN,
        lightweight_core::error::AppError::InvalidUsername(_) => StatusCode::BAD_REQUEST,
        lightweight_core::error::AppError::WeakPassword => StatusCode::BAD_REQUEST,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;
    tag_session_platform(&state, &result.token, detect_platform(&headers));
    Ok((StatusCode::CREATED, Json(result)))
}

async fn auth_google(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
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

    let result = lightweight_core::auth::google_auth(&state.db, &claims.sub, claims.email.as_deref())
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    tag_session_platform(&state, &result.token, detect_platform(&headers));
    Ok((StatusCode::CREATED, Json(result)))
}

async fn auth_login(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, StatusCode> {
    let result = lightweight_core::auth::login(&state.db, &body.username, &body.password)
        .map_err(|_| StatusCode::UNAUTHORIZED)?;
    tag_session_platform(&state, &result.token, detect_platform(&headers));
    Ok(Json(result))
}

async fn auth_check() -> StatusCode {
    StatusCode::OK
}

async fn auth_me(
    State(state): State<Arc<AppState>>,
    Extension(crate::auth::UserId(user_id)): Extension<crate::auth::UserId>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let conn = state.db.lock().unwrap();
    let result: Result<(Option<String>, Option<String>, String), _> = conn.query_row(
        "SELECT username, email, created_at FROM users WHERE id = ?1",
        [user_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    );
    match result {
        Ok((username, email, created_at)) => Ok(Json(serde_json::json!({
            "user_id": user_id,
            "username": username,
            "email": email,
            "created_at": created_at,
        }))),
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
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
