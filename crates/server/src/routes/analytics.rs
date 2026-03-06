use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
    Extension, Json, Router,
};
use std::sync::Arc;

use crate::app::AppState;
use crate::auth::UserId;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/analytics/heatmap", get(heatmap))
        .route("/analytics/exercises", get(exercises_with_data))
        .route("/analytics/e1rm/:exercise_id", get(e1rm_progression))
        .route("/analytics/volume", get(weekly_volume))
}

async fn heatmap(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<lightweight_core::analytics::DayActivity>>, StatusCode> {
    lightweight_core::analytics::activity_heatmap(&state.db, user_id, 365)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn exercises_with_data(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<lightweight_core::analytics::ExerciseSummary>>, StatusCode> {
    lightweight_core::analytics::exercises_with_data(&state.db, user_id)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn e1rm_progression(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(exercise_id): Path<i64>,
) -> Result<Json<lightweight_core::analytics::ExerciseE1rm>, StatusCode> {
    lightweight_core::analytics::e1rm_progression(&state.db, user_id, exercise_id)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn weekly_volume(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<lightweight_core::analytics::WeeklyVolume>>, StatusCode> {
    lightweight_core::analytics::weekly_volume(&state.db, user_id)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
