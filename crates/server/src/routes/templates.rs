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
        .route("/templates", get(list_templates).post(create_template))
        .route("/templates/:id", get(get_template).put(update_template).delete(archive_template))
        .route("/templates/:id/versions", get(list_versions))
        .route("/templates/:id/versions/:version", get(get_version))
}

async fn list_templates(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<Template>>, StatusCode> {
    lightweight_core::templates::list(&state.db, user_id)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn get_template(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(id): Path<i64>,
) -> Result<Json<Template>, StatusCode> {
    lightweight_core::templates::get(&state.db, user_id, id)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn create_template(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Json(body): Json<CreateTemplate>,
) -> Result<(StatusCode, Json<Template>), StatusCode> {
    lightweight_core::templates::create(&state.db, user_id, &body)
        .map(|t| (StatusCode::CREATED, Json(t)))
        .map_err(|e| match e {
            lightweight_core::error::AppError::AlreadyExists => StatusCode::CONFLICT,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn update_template(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(id): Path<i64>,
    Json(body): Json<UpdateTemplate>,
) -> Result<Json<Template>, StatusCode> {
    lightweight_core::templates::update(&state.db, user_id, id, &body)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn list_versions(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(id): Path<i64>,
) -> Result<Json<Vec<lightweight_core::models::TemplateSnapshot>>, StatusCode> {
    lightweight_core::templates::list_versions(&state.db, user_id, id)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn get_version(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path((id, version)): Path<(i64, i64)>,
) -> Result<Json<lightweight_core::models::TemplateSnapshot>, StatusCode> {
    lightweight_core::templates::get_version(&state.db, user_id, id, version)
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn archive_template(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(id): Path<i64>,
) -> StatusCode {
    match lightweight_core::templates::archive(&state.db, user_id, id) {
        Ok(()) => StatusCode::NO_CONTENT,
        Err(lightweight_core::error::AppError::NotFound) => StatusCode::NOT_FOUND,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}
