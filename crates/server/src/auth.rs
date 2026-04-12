use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use std::sync::Arc;
use std::time::{Duration, Instant};

use crate::app::AppState;

#[derive(Clone, Copy)]
pub struct UserId(pub i64);

#[derive(Clone)]
pub struct AuthToken(pub String);

const RATE_LIMIT_WINDOW: Duration = Duration::from_secs(60);
const RATE_LIMIT_MAX: u32 = 10;

pub async fn auth_middleware(
    state: axum::extract::State<Arc<AppState>>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let token = request
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .map(|s| s.to_string());

    let token = match token {
        Some(t) => t,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    match lightweight_core::auth::verify_token(&state.db, &token) {
        Ok(Some(user_id)) => {
            request.extensions_mut().insert(UserId(user_id));
            request.extensions_mut().insert(AuthToken(token));
            Ok(next.run(request).await)
        }
        _ => Err(StatusCode::UNAUTHORIZED),
    }
}

/// Rate limit middleware for public auth endpoints (login, register, join).
/// 10 requests per IP per 60-second window.
pub async fn rate_limit_middleware(
    state: axum::extract::State<Arc<AppState>>,
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Extract client IP: X-Forwarded-For (behind nginx) or peer address
    let ip = request
        .headers()
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.split(',').next())
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| "unknown".to_string());

    {
        let mut store = state.rate_limits.lock().unwrap();
        let now = Instant::now();

        // Evict stale entries every 100 requests to prevent unbounded growth
        if store.len() > 100 {
            store.retain(|_, (_, window_start)| now.duration_since(*window_start) <= RATE_LIMIT_WINDOW);
        }

        let entry = store.entry(ip).or_insert((0, now));

        // Reset window if expired
        if now.duration_since(entry.1) > RATE_LIMIT_WINDOW {
            *entry = (0, now);
        }

        entry.0 += 1;

        if entry.0 > RATE_LIMIT_MAX {
            return Err(StatusCode::TOO_MANY_REQUESTS);
        }
    }

    Ok(next.run(request).await)
}
