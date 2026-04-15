use axum::{extract::State, http::StatusCode, Extension, Json, Router, routing::get};
use serde::Serialize;
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
        .route("/admin/overview", get(overview))
        .route("/admin/users", get(users))
        .route("/admin/beta", get(beta))
        .route("/admin/invites", get(invites))
        .route("/admin/activity", get(activity))
}

// ── Response types ──

#[derive(Serialize)]
struct OverviewStats {
    total_users: i64,
    total_beta_signups: i64,
    invites_created: i64,
    invites_claimed: i64,
    active_auth_sessions: i64,
    recent_registrations: Vec<Registration>,
}

#[derive(Serialize)]
struct Registration {
    username: Option<String>,
    created_at: String,
    invited_by: Option<String>,
}

#[derive(Serialize)]
struct AdminUser {
    id: i64,
    username: Option<String>,
    email: Option<String>,
    created_at: String,
    invited_by: Option<String>,
    auth_sessions: i64,
    workout_count: i64,
    last_workout: Option<String>,
}

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
struct AdminInvite {
    code_short: String,
    creator: String,
    claimed_by: Option<String>,
    created_at: String,
    claimed_at: Option<String>,
}

#[derive(Serialize)]
struct AdminActivity {
    date: String,
    username: String,
    workout_name: String,
    duration_min: Option<i64>,
    set_count: i64,
}

// ── Handlers ──

async fn overview(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<OverviewStats>, StatusCode> {
    require_admin(user_id)?;
    let conn = state.db.lock().unwrap();

    let total_users: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let total_beta_signups: i64 = conn
        .query_row("SELECT COUNT(*) FROM beta_signups", [], |r| r.get(0))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let invites_created: i64 = conn
        .query_row("SELECT COUNT(*) FROM invites", [], |r| r.get(0))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let invites_claimed: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM invites WHERE used_by IS NOT NULL",
            [],
            |r| r.get(0),
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let active_auth_sessions: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM auth_sessions WHERE expires_at > datetime('now')",
            [],
            |r| r.get(0),
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut stmt = conn
        .prepare(
            "SELECT u.username, u.created_at, inv.username
             FROM users u
             LEFT JOIN invites i ON i.used_by = u.id
             LEFT JOIN users inv ON inv.id = i.created_by
             WHERE u.created_at > datetime('now', '-7 days')
             ORDER BY u.created_at DESC",
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let recent_registrations = stmt
        .query_map([], |row| {
            Ok(Registration {
                username: row.get(0)?,
                created_at: row.get(1)?,
                invited_by: row.get(2)?,
            })
        })
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(OverviewStats {
        total_users,
        total_beta_signups,
        invites_created,
        invites_claimed,
        active_auth_sessions,
        recent_registrations,
    }))
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
                u.created_at,
                inv.username,
                (SELECT COUNT(*) FROM auth_sessions a
                 WHERE a.user_id = u.id AND a.expires_at > datetime('now')),
                (SELECT COUNT(*) FROM sessions s
                 WHERE s.user_id = u.id AND s.status = 'completed'),
                (SELECT MAX(s.started_at) FROM sessions s
                 WHERE s.user_id = u.id AND s.status = 'completed')
             FROM users u
             LEFT JOIN invites i ON i.used_by = u.id
             LEFT JOIN users inv ON inv.id = i.created_by
             ORDER BY u.id",
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let rows = stmt
        .query_map([], |row| {
            Ok(AdminUser {
                id: row.get(0)?,
                username: row.get(1)?,
                email: row.get(2)?,
                created_at: row.get(3)?,
                invited_by: row.get(4)?,
                auth_sessions: row.get(5)?,
                workout_count: row.get(6)?,
                last_workout: row.get(7)?,
            })
        })
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(rows))
}

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
             JOIN users u ON u.id = b.user_id
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

async fn invites(
    State(state): State<Arc<AppState>>,
    Extension(UserId(user_id)): Extension<UserId>,
) -> Result<Json<Vec<AdminInvite>>, StatusCode> {
    require_admin(user_id)?;
    let conn = state.db.lock().unwrap();

    let mut stmt = conn
        .prepare(
            "SELECT
                substr(i.code, 1, 8),
                creator.username,
                claimer.username,
                i.created_at,
                i.used_at
             FROM invites i
             JOIN users creator ON creator.id = i.created_by
             LEFT JOIN users claimer ON claimer.id = i.used_by
             ORDER BY i.created_at DESC",
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let rows = stmt
        .query_map([], |row| {
            Ok(AdminInvite {
                code_short: row.get(0)?,
                creator: row.get(1)?,
                claimed_by: row.get(2)?,
                created_at: row.get(3)?,
                claimed_at: row.get(4)?,
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
                u.username,
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

#[derive(serde::Deserialize)]
struct ActivityParams {
    days: Option<u32>,
}
