use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::get,
    Extension, Json, Router,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::app::AppState;
use crate::auth::UserId;

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/analytics/heatmap", get(heatmap))
        .route("/analytics/heatmap-templates", get(heatmap_templates))
        .route("/analytics/heatmap-prs", get(heatmap_prs))
        .route("/analytics/exercises", get(exercises_with_data))
        .route("/analytics/e1rm/:exercise_id", get(e1rm_progression))
        .route("/analytics/e1rm-spider", get(e1rm_spider))
        .route("/analytics/volume", get(weekly_volume))
        .route("/analytics/frequency", get(session_frequency))
        .route("/analytics/e1rm-movers", get(e1rm_movers))
        .route("/analytics/stale-exercises", get(stale_exercises))
        .route("/analytics/session-prs/:session_id", get(session_prs))
        .route("/analytics/exercise-volume", get(exercise_volume))
        .route("/analytics/summary", get(analytics_summary))
        .route("/analytics/report", get(analytics_report))
        .route("/preferences/e1rm-spider", get(get_e1rm_spider_prefs).put(set_e1rm_spider_prefs))
}

async fn heatmap(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<lightweight_core::analytics::DayActivity>>, StatusCode> {
    lightweight_core::analytics::activity_heatmap(&state.db, user_id, 365)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn heatmap_templates(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<lightweight_core::analytics::DayTemplateActivity>>, StatusCode> {
    lightweight_core::analytics::activity_heatmap_by_template(&state.db, user_id, 365)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn heatmap_prs(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<lightweight_core::analytics::DayPR>>, StatusCode> {
    lightweight_core::analytics::heatmap_prs(&state.db, user_id, 365)
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

#[derive(Deserialize)]
struct DateRangeQuery {
    since: Option<String>,
    until: Option<String>,
}

async fn e1rm_progression(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(exercise_id): Path<i64>,
    Query(query): Query<DateRangeQuery>,
) -> Result<Json<lightweight_core::analytics::ExerciseE1rm>, StatusCode> {
    lightweight_core::analytics::e1rm_progression(
        &state.db, user_id, exercise_id,
        query.since.as_deref(), query.until.as_deref(),
    )
        .map(Json)
        .map_err(|e| match e {
            lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        })
}

async fn weekly_volume(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Query(query): Query<DateRangeQuery>,
) -> Result<Json<Vec<lightweight_core::analytics::WeeklyVolume>>, StatusCode> {
    lightweight_core::analytics::weekly_volume(
        &state.db, user_id,
        query.since.as_deref(), query.until.as_deref(),
    )
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn session_frequency(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<lightweight_core::analytics::WeeklyFrequency>>, StatusCode> {
    lightweight_core::analytics::session_frequency(&state.db, user_id)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

#[derive(Deserialize)]
struct MoversQuery {
    days: Option<i64>,
}

async fn e1rm_movers(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Query(query): Query<MoversQuery>,
) -> Result<Json<Vec<lightweight_core::analytics::E1rmMover>>, StatusCode> {
    let days = query.days.unwrap_or(30);
    lightweight_core::analytics::e1rm_movers(&state.db, user_id, days)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

#[derive(Deserialize)]
struct StaleQuery {
    days: Option<i64>,
}

async fn stale_exercises(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Query(query): Query<StaleQuery>,
) -> Result<Json<Vec<lightweight_core::analytics::StaleExercise>>, StatusCode> {
    let days = query.days.unwrap_or(30);
    lightweight_core::analytics::stale_exercises(&state.db, user_id, days)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

#[derive(Deserialize)]
struct E1rmSpiderQuery {
    exercise_ids: String,
    weeks: Option<i64>,
}

async fn e1rm_spider(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Query(query): Query<E1rmSpiderQuery>,
) -> Result<Json<Vec<lightweight_core::analytics::E1rmSpiderPoint>>, StatusCode> {
    let exercise_ids: Vec<i64> = query.exercise_ids
        .split(',')
        .filter_map(|s| s.trim().parse().ok())
        .collect();
    let weeks = query.weeks.unwrap_or(4);
    lightweight_core::analytics::e1rm_spider(&state.db, user_id, &exercise_ids, weeks)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn session_prs(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(session_id): Path<i64>,
) -> Result<Json<Vec<lightweight_core::analytics::ExercisePRData>>, StatusCode> {
    lightweight_core::analytics::session_prs(&state.db, user_id, session_id)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

#[derive(Deserialize)]
struct ExerciseVolumeQuery {
    exercise_id: Option<i64>,
    since: Option<String>,
    until: Option<String>,
}

async fn exercise_volume(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Query(query): Query<ExerciseVolumeQuery>,
) -> Result<Json<Vec<lightweight_core::analytics::ExerciseWeeklyVolume>>, StatusCode> {
    lightweight_core::analytics::exercise_volume(
        &state.db, user_id, query.exercise_id,
        query.since.as_deref(), query.until.as_deref(),
    )
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

async fn analytics_summary(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<lightweight_core::analytics::AnalyticsSummary>>, StatusCode> {
    lightweight_core::analytics::summary(&state.db, user_id)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

const WATCHED_EXERCISES_KEY: &str = "watched_exercises";

async fn analytics_report(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<lightweight_core::analytics::Report>, StatusCode> {
    // Read watched exercise IDs from preferences
    let watched_ids: Vec<i64> = match lightweight_core::preferences::get_preference(
        &state.db, user_id, WATCHED_EXERCISES_KEY,
    ) {
        Ok(Some(val)) => serde_json::from_str(&val).unwrap_or_default(),
        _ => vec![],
    };

    lightweight_core::analytics::report(&state.db, user_id, &watched_ids)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

const E1RM_SPIDER_PREF_KEY: &str = "e1rm_spider_exercises";

async fn get_e1rm_spider_prefs(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<lightweight_core::preferences::E1rmSpiderPrefs>, StatusCode> {
    match lightweight_core::preferences::get_preference(&state.db, user_id, E1RM_SPIDER_PREF_KEY) {
        Ok(Some(val)) => {
            let prefs: lightweight_core::preferences::E1rmSpiderPrefs =
                serde_json::from_str(&val).unwrap_or(lightweight_core::preferences::E1rmSpiderPrefs { exercise_ids: vec![] });
            Ok(Json(prefs))
        }
        Ok(None) => Ok(Json(lightweight_core::preferences::E1rmSpiderPrefs { exercise_ids: vec![] })),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

async fn set_e1rm_spider_prefs(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Json(prefs): Json<lightweight_core::preferences::E1rmSpiderPrefs>,
) -> Result<StatusCode, StatusCode> {
    let val = serde_json::to_string(&prefs).map_err(|_| StatusCode::BAD_REQUEST)?;
    lightweight_core::preferences::set_preference(&state.db, user_id, E1RM_SPIDER_PREF_KEY, &val)
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
