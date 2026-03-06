use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use std::sync::Arc;

use crate::app::AppState;

#[derive(Clone, Copy)]
pub struct UserId(pub i64);

pub async fn auth_middleware(
    state: axum::extract::State<Arc<AppState>>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = request
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok());

    let token = match auth_header {
        Some(h) if h.starts_with("Bearer ") => &h[7..],
        _ => return Err(StatusCode::UNAUTHORIZED),
    };

    match lightweight_core::auth::verify_token(&state.db, token) {
        Ok(Some(user_id)) => {
            request.extensions_mut().insert(UserId(user_id));
            Ok(next.run(request).await)
        }
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}
