use axum::{
    extract::State,
    http::{header, StatusCode},
    response::IntoResponse,
    routing::get,
    Extension, Json, Router,
};
use std::sync::Arc;

use crate::app::AppState;
use crate::auth::UserId;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/export/meta", get(export_meta))
        .route("/export/sessions", get(export_sessions))
}

async fn export_meta(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<lightweight_core::export::ExportMeta>, StatusCode> {
    lightweight_core::export::export_meta(&state.db, user_id)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

const RATE_LIMIT_KEY: &str = "last_export_at";
const RATE_LIMIT_SECONDS: i64 = 7 * 24 * 60 * 60; // 1 week

async fn export_sessions(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<impl IntoResponse, StatusCode> {
    // Rate limit check
    if let Ok(Some(last_export)) =
        lightweight_core::preferences::get_preference(&state.db, user_id, RATE_LIMIT_KEY)
    {
        if let Ok(last_ts) = chrono::NaiveDateTime::parse_from_str(&last_export, "%Y-%m-%d %H:%M:%S") {
            let now = chrono::Utc::now().naive_utc();
            let elapsed = (now - last_ts).num_seconds();
            if elapsed < RATE_LIMIT_SECONDS {
                return Err(StatusCode::TOO_MANY_REQUESTS);
            }
        }
    }

    let csv = lightweight_core::export::export_csv(&state.db, user_id)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Record export time
    let now = chrono::Utc::now().naive_utc().format("%Y-%m-%d %H:%M:%S").to_string();
    let _ = lightweight_core::preferences::set_preference(&state.db, user_id, RATE_LIMIT_KEY, &now);

    let headers = [
        (header::CONTENT_TYPE, "text/csv; charset=utf-8"),
        (header::CONTENT_DISPOSITION, "attachment; filename=\"lightweight-export.csv\""),
    ];

    Ok((headers, csv))
}
