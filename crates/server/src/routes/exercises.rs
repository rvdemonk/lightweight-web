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
    Router::new()
        .route("/exercises", get(list_exercises).post(create_exercise))
        .route("/exercises/:id", get(get_exercise).put(update_exercise).delete(archive_exercise))
}

async fn list_exercises(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<Exercise>>, StatusCode> {
    lightweight_core::exercises::list(&state.db, user_id)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn get_exercise(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(id): Path<i64>,
) -> Result<Json<Exercise>, StatusCode> {
    lightweight_core::exercises::get(&state.db, user_id, id)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn create_exercise(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Json(body): Json<CreateExercise>,
) -> Result<(StatusCode, Json<Exercise>), StatusCode> {
    lightweight_core::exercises::create(&state.db, user_id, &body)
        .map(|e| (StatusCode::CREATED, Json(e)))
        .map_err(|e| match e {
            lightweight_core::error::AppError::AlreadyExists => StatusCode::CONFLICT,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn update_exercise(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(id): Path<i64>,
    Json(body): Json<UpdateExercise>,
) -> Result<Json<Exercise>, StatusCode> {
    lightweight_core::exercises::update(&state.db, user_id, id, &body)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn archive_exercise(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(id): Path<i64>,
) -> StatusCode {
    match lightweight_core::exercises::archive(&state.db, user_id, id) {
        Ok(()) => StatusCode::NO_CONTENT,
        Err(lightweight_core::error::AppError::NotFound) => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}
