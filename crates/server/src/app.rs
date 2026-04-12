use axum::{middleware, Router};
use lightweight_core::db::DbPool;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tower_http::cors::{Any, CorsLayer};

use crate::routes;
use crate::static_files;

/// Per-IP rate limit tracking: (request_count, window_start)
pub type RateLimitStore = Mutex<HashMap<String, (u32, Instant)>>;

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
    pub rate_limits: Arc<RateLimitStore>,
}

pub fn create_app(db: DbPool) -> Router {
    let state = Arc::new(AppState {
        db,
        rate_limits: Arc::new(Mutex::new(HashMap::new())),
    });

    let cors = if std::env::var("LW_CORS_ORIGIN").is_ok() {
        let origin = std::env::var("LW_CORS_ORIGIN").unwrap();
        CorsLayer::new()
            .allow_origin(origin.parse::<axum::http::HeaderValue>().unwrap())
            .allow_methods(Any)
            .allow_headers(Any)
    } else {
        CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any)
    };

    // Public routes (no auth, rate limited)
    let public = routes::public_routes().layer(middleware::from_fn_with_state(
        state.clone(),
        crate::auth::rate_limit_middleware,
    ));

    // Protected routes (require auth)
    let protected = routes::protected_routes()
        .layer(middleware::from_fn_with_state(
            state.clone(),
            crate::auth::auth_middleware,
        ));

    Router::new()
        .nest("/api/v1", public.merge(protected))
        .fallback(static_files::static_handler)
        .layer(cors)
        .with_state(state)
}
