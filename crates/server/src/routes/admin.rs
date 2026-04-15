use axum::{extract::{Path, State}, http::StatusCode, Extension, Json, Router, routing::get};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::app::AppState;
use crate::auth::UserId;

const ADMIN_USER_ID: i64 = 1;

fn require_admin(user_id: i64) -> Result<(), StatusCode> {
    if user_id == ADMIN_USER_ID {
        Ok(())
    } else {
        Err(StatusCode::FORBIDDEN)
    }
}

pub fn routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/admin/beta", get(beta).post(add_beta))
        .route("/admin/beta/:id", axum::routing::patch(update_beta_status))
        .route("/admin/users", get(users))
        .route("/admin/activity", get(activity))
}

// ── Response types ──

#[derive(Serialize)]
struct AdminBetaSignup {
    id: i64,
    email: String,
    username: Option<String>,
    platform: String,
    referrer: Option<String>,
    status: String,
    created_at: String,
}

#[derive(Serialize)]
struct AdminUser {
    id: i64,
    username: Option<String>,
    email: Option<String>,
    platform: Option<String>,
    created_at: String,
    workout_count: i64,
    last_workout: Option<String>,
}

#[derive(Serialize)]
struct AdminActivity {
    date: String,
    username: String,
    workout_name: String,
    duration_min: Option<i64>,
    set_count: i64,
}

// ── Request types ──

#[derive(Deserialize)]
struct AddBetaRequest {
    email: String,
    platform: String,
    referrer: Option<String>,
}

#[derive(Deserialize)]
struct UpdateBetaStatusRequest {
    status: String,
}

#[derive(Deserialize)]
struct ActivityParams {
    days: Option<u32>,
}

// ── Handlers ──

async fn beta(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<AdminBetaSignup>>, StatusCode> {
    require_admin(user_id)?;
    let conn = state.db.lock().unwrap();

    let mut stmt = conn
        .prepare(
            "SELECT b.id, b.email, u.username, b.platform, b.referrer, b.status, b.created_at
             FROM beta_signups b
             LEFT JOIN users u ON u.id = b.user_id
             ORDER BY b.created_at DESC",
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let rows = stmt
        .query_map([], |row| {
            Ok(AdminBetaSignup {
                id: row.get(0)?,
                email: row.get(1)?,
                username: row.get(2)?,
                platform: row.get(3)?,
                referrer: row.get(4)?,
                status: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rows))
}

async fn add_beta(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Json(body): Json<AddBetaRequest>,
) -> Result<(StatusCode, Json<AdminBetaSignup>), StatusCode> {
    require_admin(user_id)?;

    let id = lightweight_core::beta::admin_add_signup(
        &state.db,
        &body.email,
        &body.platform,
        body.referrer.as_deref(),
    )
    .map_err(|e| match e {
        lightweight_core::error::AppError::AlreadyExists => StatusCode::CONFLICT,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    let conn = state.db.lock().unwrap();
    let signup = conn
        .query_row(
            "SELECT b.id, b.email, u.username, b.platform, b.referrer, b.status, b.created_at
             FROM beta_signups b
             LEFT JOIN users u ON u.id = b.user_id
             WHERE b.id = ?1",
            [id],
            |row| {
                Ok(AdminBetaSignup {
                    id: row.get(0)?,
                    email: row.get(1)?,
                    username: row.get(2)?,
                    platform: row.get(3)?,
                    referrer: row.get(4)?,
                    status: row.get(5)?,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok((StatusCode::CREATED, Json(signup)))
}

async fn update_beta_status(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    Path(id): Path<i64>,
    Json(body): Json<UpdateBetaStatusRequest>,
) -> Result<StatusCode, StatusCode> {
    require_admin(user_id)?;

    lightweight_core::beta::admin_update_status(&state.db, id, &body.status).map_err(|e| match e {
        lightweight_core::error::AppError::NotFound => StatusCode::NOT_FOUND,
        lightweight_core::error::AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
        _ => StatusCode::INTERNAL_SERVER_ERROR,
    })?;

    Ok(StatusCode::NO_CONTENT)
}

async fn users(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<AdminUser>>, StatusCode> {
    require_admin(user_id)?;
    let conn = state.db.lock().unwrap();

    let mut stmt = conn
        .prepare(
            "SELECT
                u.id,
                u.username,
                u.email,
                (SELECT a.platform FROM auth_sessions a
                 WHERE a.user_id = u.id
                 ORDER BY a.created_at DESC LIMIT 1),
                u.created_at,
                (SELECT COUNT(*) FROM sessions s
                 WHERE s.user_id = u.id AND s.status = 'completed'),
                (SELECT MAX(s.started_at) FROM sessions s
                 WHERE s.user_id = u.id AND s.status = 'completed')
             FROM users u
             ORDER BY u.id",
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let rows = stmt
        .query_map([], |row| {
            Ok(AdminUser {
                id: row.get(0)?,
                username: row.get(1)?,
                email: row.get(2)?,
                platform: row.get(3)?,
                created_at: row.get(4)?,
                workout_count: row.get(5)?,
                last_workout: row.get(6)?,
            })
        })
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rows))
}

async fn activity(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
    axum::extract::Query(params): axum::extract::Query<ActivityParams>,
) -> Result<Json<Vec<AdminActivity>>, StatusCode> {
    require_admin(user_id)?;
    let days = params.days.unwrap_or(7);
    let conn = state.db.lock().unwrap();

    let modifier = format!("-{days} days");
    let mut stmt = conn
        .prepare(
            "SELECT
                date(s.started_at),
                COALESCE(u.username, u.email, 'Unknown'),
                COALESCE(s.name, t.name, 'Freeform'),
                CASE WHEN s.ended_at IS NOT NULL THEN
                    CAST((julianday(s.ended_at) - julianday(s.started_at)) * 1440 - s.paused_duration / 60.0 AS INTEGER)
                ELSE NULL END,
                (SELECT COUNT(*) FROM sets st
                 JOIN session_exercises se ON se.id = st.session_exercise_id
                 WHERE se.session_id = s.id)
             FROM sessions s
             JOIN users u ON u.id = s.user_id
             LEFT JOIN templates t ON t.id = s.template_id
             WHERE s.started_at > datetime('now', ?1)
               AND s.status = 'completed'
             ORDER BY s.started_at DESC",
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let rows = stmt
        .query_map([&modifier], |row| {
            Ok(AdminActivity {
                date: row.get(0)?,
                username: row.get(1)?,
                workout_name: row.get(2)?,
                duration_min: row.get(3)?,
                set_count: row.get(4)?,
            })
        })
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rows))
}
