use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post, put},
    Json, Router,
};
use std::sync::Arc;

use crate::app::AppState;
use lightweight_core::models::*;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/sessions", get(list_sessions).post(create_session))
        .route("/sessions/active", get(get_active_session))
        .route("/sessions/:id", get(get_session).put(update_session).delete(delete_session))
        .route("/sessions/:sid/exercises", post(add_exercise))
        .route("/sessions/:sid/exercises/:seid", put(update_exercise).delete(remove_exercise))
        .route("/sessions/:sid/exercises/:seid/sets", post(add_set))
        .route("/sets/:id", put(update_set).delete(delete_set))
}

async fn list_sessions(
    State(state): State<Arc<AppState>>,
    Query(params): Query<SessionListParams>,
) -> Result<Json<Vec<SessionSummary>>, StatusCode> {
    lightweight_core::sessions::list(&state.db, &params)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn get_active_session(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Option<Session>>, StatusCode> {
    lightweight_core::sessions::get_active(&state.db)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn get_session(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<Session>, StatusCode> {
    lightweight_core::sessions::get(&state.db, id)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn create_session(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateSession>,
) -> Result<(StatusCode, Json<Session>), StatusCode> {
    lightweight_core::sessions::create(&state.db, &body)
        .map(|s| (StatusCode::CREATED, Json(s)))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn update_session(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Json(body): Json<UpdateSession>,
) -> Result<Json<Session>, StatusCode> {
    lightweight_core::sessions::update(&state.db, id, &body)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            lightweight_core::error::AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn delete_session(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> StatusCode {
    match lightweight_core::sessions::delete(&state.db, id) {
        Ok(()) => StatusCode::NO_CONTENT,
        Err(lightweight_core::error::AppError::NotFound) => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

async fn add_exercise(
    State(state): State<Arc<AppState>>,
    Path(sid): Path<i64>,
    Json(body): Json<AddSessionExercise>,
) -> Result<(StatusCode, Json<SessionExerciseWithSets>), StatusCode> {
    let _ = lightweight_core::sessions::get(&state.db, sid)
        .map_err(|_| StatusCode::NOT_FOUND)?;

    lightweight_core::sessions::add_exercise(&state.db, sid, &body)
        .map(|e| (StatusCode::CREATED, Json(e)))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn update_exercise(
    State(state): State<Arc<AppState>>,
    Path((sid, seid)): Path<(i64, i64)>,
    Json(body): Json<UpdateSessionExercise>,
) -> StatusCode {
    match lightweight_core::sessions::update_exercise(&state.db, sid, seid, &body) {
        Ok(()) => StatusCode::OK,
        Err(lightweight_core::error::AppError::NotFound) => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

async fn remove_exercise(
    State(state): State<Arc<AppState>>,
    Path((sid, seid)): Path<(i64, i64)>,
) -> StatusCode {
    match lightweight_core::sessions::remove_exercise(&state.db, sid, seid) {
        Ok(()) => StatusCode::NO_CONTENT,
        Err(lightweight_core::error::AppError::NotFound) => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

async fn add_set(
    State(state): State<Arc<AppState>>,
    Path((_sid, seid)): Path<(i64, i64)>,
    Json(body): Json<CreateSet>,
) -> Result<(StatusCode, Json<Set>), StatusCode> {
    lightweight_core::sessions::add_set(&state.db, seid, &body)
        .map(|s| (StatusCode::CREATED, Json(s)))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn update_set(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Json(body): Json<UpdateSet>,
) -> Result<Json<Set>, StatusCode> {
    lightweight_core::sessions::update_set(&state.db, id, &body)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn delete_set(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> StatusCode {
    match lightweight_core::sessions::delete_set(&state.db, id) {
        Ok(()) => StatusCode::NO_CONTENT,
        Err(lightweight_core::error::AppError::NotFound) => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}
