use crate::db::DbPool;
use crate::error::AppError;
use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ExportMeta {
    pub session_count: i64,
    pub set_count: i64,
    pub first_session: Option<String>,
    pub last_session: Option<String>,
}

pub fn export_meta(db: &DbPool, user_id: i64) -> Result<ExportMeta, AppError> {
    let conn = db.lock().unwrap();
    let (session_count, set_count, first_session, last_session) = conn.query_row(
        "SELECT
            (SELECT COUNT(*) FROM sessions WHERE user_id = ?1 AND status = 'completed'),
            (SELECT COUNT(*) FROM sets st
             JOIN session_exercises se ON se.id = st.session_exercise_id
             JOIN sessions s ON s.id = se.session_id
             WHERE s.user_id = ?1 AND s.status = 'completed'),
            (SELECT MIN(started_at) FROM sessions WHERE user_id = ?1 AND status = 'completed'),
            (SELECT MAX(started_at) FROM sessions WHERE user_id = ?1 AND status = 'completed')",
        [user_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
    )?;

    Ok(ExportMeta { session_count, set_count, first_session, last_session })
}

pub fn export_csv(db: &DbPool, user_id: i64) -> Result<String, AppError> {
    let conn = db.lock().unwrap();

    let mut stmt = conn.prepare(
        "SELECT
            DATE(s.started_at) as date,
            COALESCE(s.name, '') as session_name,
            COALESCE(t.name, '') as template_name,
            e.name as exercise_name,
            COALESCE(e.muscle_group, '') as muscle_group,
            st.set_number,
            st.weight_kg,
            st.reps,
            st.rir,
            st.set_type,
            st.completed_at
         FROM sets st
         JOIN session_exercises se ON se.id = st.session_exercise_id
         JOIN sessions s ON s.id = se.session_id
         JOIN exercises e ON e.id = se.exercise_id
         LEFT JOIN templates t ON t.id = s.template_id
         WHERE s.user_id = ?1 AND s.status = 'completed'
         ORDER BY s.started_at, se.position, st.set_number"
    )?;

    let mut csv = String::from("date,session_name,template_name,exercise_name,muscle_group,set_number,weight_kg,reps,rir,set_type,completed_at\n");

    let rows = stmt.query_map([user_id], |row| {
        let date: String = row.get(0)?;
        let session_name: String = row.get(1)?;
        let template_name: String = row.get(2)?;
        let exercise_name: String = row.get(3)?;
        let muscle_group: String = row.get(4)?;
        let set_number: i32 = row.get(5)?;
        let weight_kg: Option<f64> = row.get(6)?;
        let reps: i32 = row.get(7)?;
        let rir: Option<i32> = row.get(8)?;
        let set_type: String = row.get(9)?;
        let completed_at: String = row.get(10)?;

        Ok(format!(
            "{},{},{},{},{},{},{},{},{},{},{}\n",
            csv_escape(&date),
            csv_escape(&session_name),
            csv_escape(&template_name),
            csv_escape(&exercise_name),
            csv_escape(&muscle_group),
            set_number,
            weight_kg.map(|w| format!("{:.1}", w)).unwrap_or_else(|| "0.0".to_string()),
            reps,
            rir.map(|r| r.to_string()).unwrap_or_default(),
            csv_escape(&set_type),
            csv_escape(&completed_at),
        ))
    })?;

    for row in rows {
        csv.push_str(&row?);
    }

    Ok(csv)
}

fn csv_escape(s: &str) -> String {
    if s.contains(',') || s.contains('"') || s.contains('\n') {
        format!("\"{}\"", s.replace('"', "\"\""))
    } else {
        s.to_string()
    }
}
