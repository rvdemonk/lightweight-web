use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::get,
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::app::AppState;
use crate::auth::UserId;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/preferences/:key", get(get_pref).put(set_pref))
}

#[derive(Serialize)]
struct PrefResponse {
    key: String,
    value: String,
}

#[derive(Deserialize)]
struct PrefBody {
    value: String,
}

async fn get_pref(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(key): Path<String>,
) -> Result<Json<PrefResponse>, StatusCode> {
    match lightweight_core::preferences::get_preference(&state.db, user_id, &key) {
        Ok(Some(value)) => Ok(Json(PrefResponse { key, value })),
        Ok(None) => Err(StatusCode::NOT_FOUND),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

async fn set_pref(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(key): Path<String>,
    Json(body): Json<PrefBody>,
) -> Result<StatusCode, StatusCode> {
    lightweight_core::preferences::set_preference(&state.db, user_id, &key, &body.value)
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
