use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
    Json, Router,
};
use std::sync::Arc;

use crate::app::AppState;
use lightweight_core::models::*;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/exercises/:id/history", get(exercise_history))
        .route("/templates/:id/previous", get(template_previous))
}

async fn exercise_history(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<ExerciseHistory>, StatusCode> {
    lightweight_core::sessions::exercise_history(&state.db, id, 10)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn template_previous(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<Option<Session>>, StatusCode> {
    lightweight_core::sessions::template_previous(&state.db, id)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
