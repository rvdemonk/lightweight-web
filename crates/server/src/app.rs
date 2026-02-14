use axum::{middleware, Router};
use lightweight_core::db::DbPool;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use crate::routes;
use crate::static_files;

#[derive(Clone)]
pub struct AppState {
    pub db: DbPool,
}

pub fn create_app(db: DbPool) -> Router {
    let state = Arc::new(AppState { db });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Public routes (no auth)
    let public = routes::public_routes();

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
