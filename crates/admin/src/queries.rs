use rusqlite::Connection;

pub struct OverviewStats {
    pub total_users: i64,
    pub invites_created: i64,
    pub invites_claimed: i64,
    pub active_auth_sessions: i64,
}

pub struct Registration {
    pub username: String,
    pub created_at: String,
    pub invited_by: Option<String>,
}

pub struct UserRow {
    pub id: i64,
    pub username: String,
    pub created_at: String,
    pub invited_by: Option<String>,
    pub auth_sessions: i64,
    pub workout_count: i64,
    pub last_workout: Option<String>,
}

pub struct InviteDistRow {
    pub username: String,
    pub created: i64,
    pub claimed: i64,
    pub quota: i64,
}

pub struct InviteRow {
    pub code_short: String,
    pub creator: String,
    pub claimed_by: Option<String>,
    pub created_at: String,
    pub claimed_at: Option<String>,
}

pub struct WorkoutRow {
    pub date: String,
    pub username: String,
    pub workout_name: String,
    pub duration_min: Option<i64>,
    pub set_count: i64,
}

fn map_err(e: rusqlite::Error) -> String {
    format!("Query failed: {e}")
}

pub fn overview_stats(conn: &Connection) -> Result<OverviewStats, String> {
    let total_users: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))
        .map_err(map_err)?;

    let invites_created: i64 = conn
        .query_row("SELECT COUNT(*) FROM invites", [], |r| r.get(0))
        .map_err(map_err)?;

    let invites_claimed: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM invites WHERE used_by IS NOT NULL",
            [],
            |r| r.get(0),
        )
        .map_err(map_err)?;

    let active_auth_sessions: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM auth_sessions WHERE expires_at > datetime('now')",
            [],
            |r| r.get(0),
        )
        .map_err(map_err)?;

    Ok(OverviewStats {
        total_users,
        invites_created,
        invites_claimed,
        active_auth_sessions,
    })
}

pub fn recent_registrations(conn: &Connection, days: u32) -> Result<Vec<Registration>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT u.username, u.created_at, inv.username
             FROM users u
             LEFT JOIN invites i ON i.used_by = u.id
             LEFT JOIN users inv ON inv.id = i.created_by
             WHERE u.created_at > datetime('now', ?1)
             ORDER BY u.created_at DESC",
        )
        .map_err(map_err)?;

    let modifier = format!("-{days} days");
    let rows = stmt
        .query_map([&modifier], |row| {
            Ok(Registration {
                username: row.get(0)?,
                created_at: row.get(1)?,
                invited_by: row.get(2)?,
            })
        })
        .map_err(map_err)?;

    rows.collect::<Result<Vec<_>, _>>().map_err(map_err)
}

pub fn all_users(conn: &Connection) -> Result<Vec<UserRow>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT
                u.id,
                u.username,
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
        .map_err(map_err)?;

    let rows = stmt
        .query_map([], |row| {
            Ok(UserRow {
                id: row.get(0)?,
                username: row.get(1)?,
                created_at: row.get(2)?,
                invited_by: row.get(3)?,
                auth_sessions: row.get(4)?,
                workout_count: row.get(5)?,
                last_workout: row.get(6)?,
            })
        })
        .map_err(map_err)?;

    rows.collect::<Result<Vec<_>, _>>().map_err(map_err)
}

pub fn invite_distribution(conn: &Connection) -> Result<Vec<InviteDistRow>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT
                u.username,
                (SELECT COUNT(*) FROM invites i WHERE i.created_by = u.id) as created,
                (SELECT COUNT(*) FROM invites i WHERE i.created_by = u.id AND i.used_by IS NOT NULL),
                u.invite_quota
             FROM users u
             WHERE created > 0
             ORDER BY u.username",
        )
        .map_err(map_err)?;

    let rows = stmt
        .query_map([], |row| {
            Ok(InviteDistRow {
                username: row.get(0)?,
                created: row.get(1)?,
                claimed: row.get(2)?,
                quota: row.get(3)?,
            })
        })
        .map_err(map_err)?;

    rows.collect::<Result<Vec<_>, _>>().map_err(map_err)
}

pub fn all_invites(conn: &Connection) -> Result<Vec<InviteRow>, String> {
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
        .map_err(map_err)?;

    let rows = stmt
        .query_map([], |row| {
            Ok(InviteRow {
                code_short: row.get(0)?,
                creator: row.get(1)?,
                claimed_by: row.get(2)?,
                created_at: row.get(3)?,
                claimed_at: row.get(4)?,
            })
        })
        .map_err(map_err)?;

    rows.collect::<Result<Vec<_>, _>>().map_err(map_err)
}

pub fn recent_activity(conn: &Connection, days: u32) -> Result<Vec<WorkoutRow>, String> {
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
        .map_err(map_err)?;

    let modifier = format!("-{days} days");
    let rows = stmt
        .query_map([&modifier], |row| {
            Ok(WorkoutRow {
                date: row.get(0)?,
                username: row.get(1)?,
                workout_name: row.get(2)?,
                duration_min: row.get(3)?,
                set_count: row.get(4)?,
            })
        })
        .map_err(map_err)?;

    rows.collect::<Result<Vec<_>, _>>().map_err(map_err)
}
