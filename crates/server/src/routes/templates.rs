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
        .route("/templates", get(list_templates).post(create_template))
        .route("/templates/:id", get(get_template).put(update_template).delete(archive_template))
}

async fn list_templates(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Template>>, StatusCode> {
    lightweight_core::templates::list(&state.db)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn get_template(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> Result<Json<Template>, StatusCode> {
    lightweight_core::templates::get(&state.db, id)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn create_template(
    State(state): State<Arc<AppState>>,
    Json(body): Json<CreateTemplate>,
) -> Result<(StatusCode, Json<Template>), StatusCode> {
    lightweight_core::templates::create(&state.db, &body)
        .map(|t| (StatusCode::CREATED, Json(t)))
        .map_err(|e| match e {
            lightweight_core::error::AppError::AlreadyExists => StatusCode::CONFLICT,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn update_template(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
    Json(body): Json<UpdateTemplate>,
) -> Result<Json<Template>, StatusCode> {
    lightweight_core::templates::update(&state.db, id, &body)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn archive_template(
    State(state): State<Arc<AppState>>,
    Path(id): Path<i64>,
) -> StatusCode {
    match lightweight_core::templates::archive(&state.db, id) {
        Ok(()) => StatusCode::NO_CONTENT,
        Err(lightweight_core::error::AppError::NotFound) => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}
