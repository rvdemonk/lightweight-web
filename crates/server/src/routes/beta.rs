use axum::{extract::State, http::StatusCode, Json, Router, routing::post};
use std::sync::Arc;

use crate::app::AppState;
use lightweight_core::models::{AuthResponse, BetaJoinRequest, BetaJoinResponse, BetaRegisterRequest, BetaSignupRequest, BetaSignupResponse};

pub fn public_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/beta/signup", post(beta_signup))
        .route("/beta/register", post(beta_register))
        .route("/beta/join", post(beta_join))
}

/// Email-only beta join (no account creation, works in any browser)
async fn beta_join(
    State(state): State<Arc<AppState>>,
    Json(body): Json<BetaJoinRequest>,
) -> Result<(StatusCode, Json<BetaJoinResponse>), StatusCode> {
    let inserted = lightweight_core::beta::record_join(
        &state.db,
        &body.email,
        &body.platform,
        body.referrer.as_deref(),
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !inserted {
        return Err(StatusCode::CONFLICT);
    }

    Ok((
        StatusCode::CREATED,
        Json(BetaJoinResponse {
            email: body.email,
            platform: body.platform,
        }),
    ))
}

/// Google Sign-In beta signup (Android flow)
async fn beta_signup(
    State(state): State<Arc<AppState>>,
    Json(body): Json<BetaSignupRequest>,
) -> Result<(StatusCode, Json<BetaSignupResponse>), StatusCode> {
    let google_client_id = std::env::var("LW_GOOGLE_CLIENT_ID")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let claims = crate::google::verify_google_id_token(
        &state.http_client,
        &body.id_token,
        &google_client_id,
    )
    .await
    .map_err(|_| StatusCode::UNAUTHORIZED)?;

    let email = claims.email.clone().ok_or(StatusCode::BAD_REQUEST)?;

    let auth = lightweight_core::auth::google_auth(&state.db, &claims.sub, Some(&email))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    super::tag_session_platform(&state, &auth.token, &body.platform);

    lightweight_core::beta::record_signup(
        &state.db,
        auth.user_id,
        &email,
        &body.platform,
        body.referrer.as_deref(),
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((
        StatusCode::CREATED,
        Json(BetaSignupResponse {
            token: auth.token,
            user_id: auth.user_id,
            email,
            platform: body.platform,
        }),
    ))
}

/// Username/password beta registration (non-Android flow)
async fn beta_register(
    State(state): State<Arc<AppState>>,
    Json(body): Json<BetaRegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), StatusCode> {
    let auth = lightweight_core::auth::register(
        &state.db,
        &body.username,
        &body.password,
        None,
        None,
        body.email.as_deref(),
    )
    .map_err(|e| match e {
        lightweight_core::error::AppError::UsernameTaken => StatusCode::CONFLICT,
        lightweight_core::error::AppError::InvalidUsername(_) => StatusCode::BAD_REQUEST,
        lightweight_core::error::AppError::WeakPassword => StatusCode::BAD_REQUEST,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    // Record beta signup — use email if provided, otherwise username as identifier
    let signup_email = body.email.as_deref().unwrap_or(&body.username);
    lightweight_core::beta::record_signup(
        &state.db,
        auth.user_id,
        signup_email,
        &body.platform,
        body.referrer.as_deref(),
    )
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    super::tag_session_platform(&state, &auth.token, &body.platform);

    Ok((StatusCode::CREATED, Json(auth)))
}
