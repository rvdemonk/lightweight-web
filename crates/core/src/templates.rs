use rusqlite::OptionalExtension;

use crate::db::DbPool;
use crate::error::AppError;
use crate::models::{
    CreateTemplate, SyncTemplate, Template, TemplateExercise, TemplateSnapshot, TemplateSyncResult,
    UpdateTemplate,
};

/// Comparable content of one template exercise, ordered by position:
/// (exercise_id, position, target_sets, reps_min, reps_max, rest_seconds, notes).
/// Used to decide create/update/unchanged on a re-push.
type ExerciseSig = (i64, i32, Option<i32>, Option<i32>, Option<i32>, Option<i32>, Option<String>);

pub fn list(db: &DbPool, user_id: i64) -> Result<Vec<Template>, AppError> {
    let conn = db.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id, name, notes, archived, created_at, updated_at, version
         FROM templates WHERE archived = 0 AND user_id = ?1 ORDER BY name"
    )?;

    let templates: Vec<(i64, String, Option<String>, i32, String, String, i64)> = stmt
        .query_map([user_id], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
            ))
        })?
        .filter_map(|r| r.ok())
        .collect();

    let mut result = Vec::new();
    for (id, name, notes, archived, created_at, updated_at, version) in templates {
        let exercises = get_template_exercises(&conn, id)?;
        result.push(Template {
            id,
            name,
            notes,
            archived: archived != 0,
            created_at,
            updated_at,
            version,
            exercises,
        });
    }
    Ok(result)
}

pub fn get(db: &DbPool, user_id: i64, id: i64) -> Result<Template, AppError> {
    let conn = db.lock().unwrap();
    let (name, notes, archived, created_at, updated_at, version) = conn
        .query_row(
            "SELECT name, notes, archived, created_at, updated_at, version FROM templates WHERE id = ?1 AND user_id = ?2",
            rusqlite::params![id, user_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, Option<String>>(1)?,
                    row.get::<_, i32>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, i64>(5)?,
                ))
            },
        )
        .map_err(|_| AppError::NotFound)?;

    let exercises = get_template_exercises(&conn, id)?;

    Ok(Template {
        id,
        name,
        notes,
        archived: archived != 0,
        created_at,
        updated_at,
        version,
        exercises,
    })
}

pub fn create(db: &DbPool, user_id: i64, input: &CreateTemplate) -> Result<Template, AppError> {
    let conn = db.lock().unwrap();

    // Verify all referenced exercise_ids belong to the user
    for ex in &input.exercises {
        let owns: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM exercises WHERE id = ?1 AND user_id = ?2",
            rusqlite::params![ex.exercise_id, user_id],
            |row| row.get(0),
        )?;
        if !owns {
            return Err(AppError::NotFound);
        }
    }

    conn.execute(
        "INSERT INTO templates (user_id, name, notes) VALUES (?1, ?2, ?3)",
        rusqlite::params![user_id, input.name, input.notes],
    )
    .map_err(|e| match e {
        rusqlite::Error::SqliteFailure(_, _) => AppError::AlreadyExists,
        other => AppError::Database(other),
    })?;

    let template_id = conn.last_insert_rowid();

    for ex in &input.exercises {
        conn.execute(
            "INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![
                template_id, ex.exercise_id, ex.position, ex.target_sets,
                ex.target_reps_min, ex.target_reps_max, ex.rest_seconds, ex.notes
            ],
        )?;
    }

    drop(conn);
    get(db, user_id, template_id)
}

pub fn update(db: &DbPool, user_id: i64, id: i64, input: &UpdateTemplate) -> Result<Template, AppError> {
    let conn = db.lock().unwrap();

    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM templates WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![id, user_id],
        |row| row.get(0),
    )?;
    if !exists {
        return Err(AppError::NotFound);
    }

    // Snapshot current state before mutation
    let (current_name, current_notes, current_version): (String, Option<String>, i64) = conn.query_row(
        "SELECT name, notes, version FROM templates WHERE id = ?1",
        [id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    )?;

    let current_exercises = get_template_exercises(&conn, id)?;

    let snapshot = serde_json::json!({
        "name": current_name,
        "notes": current_notes,
        "version": current_version,
        "exercises": current_exercises,
    });
    let snapshot_json = serde_json::to_string(&snapshot)
        .map_err(|_| AppError::BadRequest("Failed to serialize snapshot".into()))?;

    conn.execute(
        "INSERT INTO template_snapshots (template_id, version, snapshot_json) VALUES (?1, ?2, ?3)",
        rusqlite::params![id, current_version, snapshot_json],
    )?;

    conn.execute(
        "UPDATE templates SET version = version + 1 WHERE id = ?1",
        [id],
    )?;

    // Apply mutations
    if let Some(ref name) = input.name {
        conn.execute("UPDATE templates SET name = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![name, id])?;
    }
    if let Some(ref notes) = input.notes {
        conn.execute("UPDATE templates SET notes = ?1, updated_at = datetime('now') WHERE id = ?2", rusqlite::params![notes, id])?;
    }

    if let Some(ref exercises) = input.exercises {
        // Verify all referenced exercise_ids belong to the user
        for ex in exercises {
            let owns: bool = conn.query_row(
                "SELECT COUNT(*) > 0 FROM exercises WHERE id = ?1 AND user_id = ?2",
                rusqlite::params![ex.exercise_id, user_id],
                |row| row.get(0),
            )?;
            if !owns {
                return Err(AppError::NotFound);
            }
        }

        conn.execute("DELETE FROM template_exercises WHERE template_id = ?1", [id])?;
        for ex in exercises {
            conn.execute(
                "INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                rusqlite::params![
                    id, ex.exercise_id, ex.position, ex.target_sets,
                    ex.target_reps_min, ex.target_reps_max, ex.rest_seconds, ex.notes
                ],
            )?;
        }
        conn.execute("UPDATE templates SET updated_at = datetime('now') WHERE id = ?1", [id])?;
    }

    drop(conn);
    get(db, user_id, id)
}

pub fn archive(db: &DbPool, user_id: i64, id: i64) -> Result<(), AppError> {
    let conn = db.lock().unwrap();
    let rows = conn.execute(
        "UPDATE templates SET archived = 1 WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![id, user_id],
    )?;
    if rows == 0 {
        return Err(AppError::NotFound);
    }
    Ok(())
}

pub fn list_versions(db: &DbPool, user_id: i64, template_id: i64) -> Result<Vec<TemplateSnapshot>, AppError> {
    let conn = db.lock().unwrap();

    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM templates WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![template_id, user_id],
        |row| row.get(0),
    )?;
    if !exists {
        return Err(AppError::NotFound);
    }

    let mut stmt = conn.prepare(
        "SELECT id, template_id, version, snapshot_json, created_at
         FROM template_snapshots WHERE template_id = ?1
         ORDER BY version DESC"
    )?;

    let rows = stmt.query_map([template_id], |row| {
        Ok(TemplateSnapshot {
            id: row.get(0)?,
            template_id: row.get(1)?,
            version: row.get(2)?,
            snapshot_json: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;

    let mut snapshots = Vec::new();
    for row in rows {
        snapshots.push(row?);
    }
    Ok(snapshots)
}

pub fn get_version(db: &DbPool, user_id: i64, template_id: i64, version: i64) -> Result<TemplateSnapshot, AppError> {
    let conn = db.lock().unwrap();

    let exists: bool = conn.query_row(
        "SELECT COUNT(*) > 0 FROM templates WHERE id = ?1 AND user_id = ?2",
        rusqlite::params![template_id, user_id],
        |row| row.get(0),
    )?;
    if !exists {
        return Err(AppError::NotFound);
    }

    conn.query_row(
        "SELECT id, template_id, version, snapshot_json, created_at
         FROM template_snapshots WHERE template_id = ?1 AND version = ?2",
        rusqlite::params![template_id, version],
        |row| {
            Ok(TemplateSnapshot {
                id: row.get(0)?,
                template_id: row.get(1)?,
                version: row.get(2)?,
                snapshot_json: row.get(3)?,
                created_at: row.get(4)?,
            })
        },
    )
    .map_err(|_| AppError::NotFound)
}

// ── Template sync (client push) ──

/// Push client-authored templates to the server (the missing half of sync).
///
/// Symmetric with `sessions::sync_sessions`: dedup key is the template name
/// (case-insensitive — the `UNIQUE(user_id, name)` natural key), exercises
/// resolve by name against the user's catalog (auto-created if absent), and the
/// whole batch is one transaction that rolls back on any failure.
///
/// Per template: absent name → create; present name with differing content →
/// update (snapshot old version + `version + 1`, mirroring `update`); present
/// name with identical content → unchanged (no bump). An archived match is
/// un-archived via the update path. Version numbers are server-authoritative —
/// the client's `version` is advisory and ignored here; the client adopts the
/// returned (id, version) from the full-Template response.
pub fn sync_templates(db: &DbPool, user_id: i64, input: Vec<SyncTemplate>) -> Result<TemplateSyncResult, AppError> {
    let conn = db.lock().unwrap();
    let mut warnings: Vec<String> = Vec::new();

    // Refuse duplicate names within one batch — a client bug we fail loudly on
    // rather than silently collapsing to a last-write-wins.
    {
        let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
        for tpl in &input {
            let key = tpl.name.trim().to_lowercase();
            if !seen.insert(key) {
                return Err(AppError::BadRequest(format!(
                    "Duplicate template name in batch: '{}'",
                    tpl.name
                )));
            }
        }
    }

    // Resolve every exercise name upfront (read-only, before any write). An
    // ambiguous name aborts the whole push here; unknown names are queued for
    // auto-create inside the transaction, same as sync_sessions.
    let mut exercise_cache: std::collections::HashMap<String, Option<(i64, String)>> = std::collections::HashMap::new();
    let mut exercises_to_create: Vec<String> = Vec::new();
    for tpl in &input {
        for ex in &tpl.exercises {
            let key = ex.name.to_lowercase();
            if exercise_cache.contains_key(&key) {
                continue;
            }
            let resolved = crate::sessions::resolve_exercise(&conn, user_id, &ex.name, &mut warnings)?;
            if resolved.is_none() {
                exercises_to_create.push(ex.name.clone());
            }
            exercise_cache.insert(key, resolved);
        }
    }

    // ── Single transaction ──
    conn.execute_batch("BEGIN")?;
    let outcome = apply_template_sync(&conn, user_id, &input, &mut exercise_cache, &exercises_to_create);

    match outcome {
        Ok((template_ids, exercises_created)) => {
            conn.execute_batch("COMMIT")?;
            let mut templates = Vec::new();
            for id in template_ids {
                templates.push(read_template(&conn, id)?);
            }
            Ok(TemplateSyncResult { templates, exercises_created })
        }
        Err(e) => {
            let _ = conn.execute_batch("ROLLBACK");
            Err(e)
        }
    }
}

/// The write half of `sync_templates`. Assumes a transaction is already open;
/// returns the ordered server template ids (one per input) and the names of
/// exercises auto-created along the way. Any `Err` leaves rollback to the caller.
fn apply_template_sync(
    conn: &rusqlite::Connection,
    user_id: i64,
    input: &[SyncTemplate],
    exercise_cache: &mut std::collections::HashMap<String, Option<(i64, String)>>,
    exercises_to_create: &[String],
) -> Result<(Vec<i64>, Vec<String>), AppError> {
    // Auto-create missing exercises (uppercase), same convention as sync_sessions.
    // This runs before any template references them so a template can both create
    // an exercise and use it (possibly at multiple positions) in one transaction.
    let mut exercises_created: Vec<String> = Vec::new();
    for name in exercises_to_create {
        let key = name.to_lowercase();
        let upper_name = name.to_uppercase();
        conn.execute(
            "INSERT INTO exercises (user_id, name) VALUES (?1, ?2)",
            rusqlite::params![user_id, upper_name],
        )?;
        let id = conn.last_insert_rowid();
        exercise_cache.insert(key, Some((id, upper_name.clone())));
        exercises_created.push(upper_name);
    }

    let mut template_ids: Vec<i64> = Vec::new();

    for tpl in input {
        // Build the incoming content signature with resolved exercise ids.
        let mut incoming_sig: Vec<ExerciseSig> = Vec::new();
        for ex in &tpl.exercises {
            let key = ex.name.to_lowercase();
            let (exercise_id, _) = exercise_cache
                .get(&key)
                .and_then(|v| v.clone())
                .ok_or_else(|| AppError::BadRequest(format!("Exercise resolution failed: '{}'", ex.name)))?;
            incoming_sig.push((
                exercise_id,
                ex.position,
                ex.target_sets,
                ex.target_reps_min,
                ex.target_reps_max,
                ex.rest_seconds,
                ex.notes.clone(),
            ));
        }
        incoming_sig.sort_by_key(|t| t.1);

        // Match an existing template by case-insensitive name (archived included —
        // the UNIQUE constraint ignores archived, so we must too, or a re-push of
        // an archived template would hit a constraint violation on create).
        let existing: Option<(i64, i32)> = conn
            .query_row(
                "SELECT id, archived FROM templates WHERE LOWER(name) = LOWER(?1) AND user_id = ?2",
                rusqlite::params![tpl.name, user_id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()?;

        match existing {
            None => {
                conn.execute(
                    "INSERT INTO templates (user_id, name, notes) VALUES (?1, ?2, ?3)",
                    rusqlite::params![user_id, tpl.name, tpl.notes],
                )?;
                let template_id = conn.last_insert_rowid();
                insert_template_exercises(conn, template_id, &incoming_sig)?;
                template_ids.push(template_id);
            }
            Some((tid, archived)) => {
                let current = read_template(conn, tid)?;
                let current_sig = exercise_signature(&current.exercises);
                let content_same = current.notes == tpl.notes && current_sig == incoming_sig;

                if archived == 0 && content_same {
                    // Idempotent no-op — nothing changed, no version bump.
                    template_ids.push(tid);
                } else {
                    // Update: snapshot the current version, bump, un-archive, and
                    // replace exercises — mirroring `update`'s snapshot discipline.
                    let snapshot = serde_json::json!({
                        "name": current.name,
                        "notes": current.notes,
                        "version": current.version,
                        "exercises": current.exercises,
                    });
                    let snapshot_json = serde_json::to_string(&snapshot)
                        .map_err(|_| AppError::BadRequest("Failed to serialize snapshot".into()))?;
                    conn.execute(
                        "INSERT INTO template_snapshots (template_id, version, snapshot_json) VALUES (?1, ?2, ?3)",
                        rusqlite::params![tid, current.version, snapshot_json],
                    )?;
                    conn.execute(
                        "UPDATE templates SET version = version + 1, notes = ?1, archived = 0, updated_at = datetime('now') WHERE id = ?2",
                        rusqlite::params![tpl.notes, tid],
                    )?;
                    conn.execute("DELETE FROM template_exercises WHERE template_id = ?1", [tid])?;
                    insert_template_exercises(conn, tid, &incoming_sig)?;
                    template_ids.push(tid);
                }
            }
        }
    }

    Ok((template_ids, exercises_created))
}

fn insert_template_exercises(conn: &rusqlite::Connection, template_id: i64, sig: &[ExerciseSig]) -> Result<(), AppError> {
    for (exercise_id, position, target_sets, reps_min, reps_max, rest_seconds, notes) in sig {
        conn.execute(
            "INSERT INTO template_exercises (template_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            rusqlite::params![template_id, exercise_id, position, target_sets, reps_min, reps_max, rest_seconds, notes],
        )?;
    }
    Ok(())
}

fn exercise_signature(exercises: &[TemplateExercise]) -> Vec<ExerciseSig> {
    let mut sig: Vec<ExerciseSig> = exercises
        .iter()
        .map(|e| {
            (
                e.exercise_id,
                e.position,
                e.target_sets,
                e.target_reps_min,
                e.target_reps_max,
                e.rest_seconds,
                e.notes.clone(),
            )
        })
        .collect();
    sig.sort_by_key(|t| t.1);
    sig
}

/// Read a full `Template` from an already-locked connection (the `get` public
/// API locks the pool itself, which would deadlock mid-transaction).
fn read_template(conn: &rusqlite::Connection, id: i64) -> Result<Template, AppError> {
    let (name, notes, archived, created_at, updated_at, version) = conn.query_row(
        "SELECT name, notes, archived, created_at, updated_at, version FROM templates WHERE id = ?1",
        [id],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, i32>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, i64>(5)?,
            ))
        },
    )?;
    let exercises = get_template_exercises(conn, id)?;
    Ok(Template {
        id,
        name,
        notes,
        archived: archived != 0,
        created_at,
        updated_at,
        version,
        exercises,
    })
}

fn get_template_exercises(conn: &rusqlite::Connection, template_id: i64) -> Result<Vec<TemplateExercise>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT te.id, te.exercise_id, e.name, te.position, te.target_sets,
                te.target_reps_min, te.target_reps_max, te.rest_seconds, te.notes
         FROM template_exercises te
         JOIN exercises e ON e.id = te.exercise_id
         WHERE te.template_id = ?1
         ORDER BY te.position"
    )?;

    let rows = stmt.query_map([template_id], |row| {
        Ok(TemplateExercise {
            id: row.get(0)?,
            exercise_id: row.get(1)?,
            exercise_name: row.get(2)?,
            position: row.get(3)?,
            target_sets: row.get(4)?,
            target_reps_min: row.get(5)?,
            target_reps_max: row.get(6)?,
            rest_seconds: row.get(7)?,
            notes: row.get(8)?,
        })
    })?;

    let mut exercises = Vec::new();
    for row in rows {
        exercises.push(row?);
    }
    Ok(exercises)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{SyncTemplate, SyncTemplateExercise};

    /// Tests for template push (`sync_templates`) — the missing half of sync
    /// that stops sessions' `template_id` being nulled server-side (the Android
    /// structural failure the iOS port must not reinherit).
    fn test_db() -> crate::db::DbPool {
        let db = crate::db::init_memory_db().expect("in-memory db with migrations");
        {
            let conn = db.lock().unwrap();
            conn.execute(
                "INSERT INTO users (id, username, password_hash) VALUES (42, 'testuser', 'x')",
                [],
            )
            .unwrap();
            for name in [
                "INCLINE BARBELL BENCH",
                "DB CHEST FLIES",
                "INCLINE DUMBBELL CURL",
                "SEATED INCLINE DB CURLS",
            ] {
                conn.execute("INSERT INTO exercises (user_id, name) VALUES (42, ?1)", [name]).unwrap();
            }
        }
        db
    }

    fn ex(name: &str, position: i32, sets: Option<i32>) -> SyncTemplateExercise {
        SyncTemplateExercise {
            name: name.into(),
            position,
            target_sets: sets,
            target_reps_min: None,
            target_reps_max: None,
            rest_seconds: None,
            notes: None,
        }
    }

    fn tpl(name: &str, exercises: Vec<SyncTemplateExercise>) -> SyncTemplate {
        SyncTemplate { name: name.into(), notes: None, version: None, exercises }
    }

    #[test]
    fn new_template_is_created() {
        let db = test_db();
        let result = sync_templates(
            &db,
            42,
            vec![tpl("Push A", vec![ex("Incline Barbell Bench", 1, Some(4)), ex("DB Chest Flies", 2, Some(3))])],
        )
        .unwrap();

        assert_eq!(result.templates.len(), 1);
        assert!(result.exercises_created.is_empty());
        let t = &result.templates[0];
        assert_eq!(t.name, "Push A");
        assert_eq!(t.version, 1);
        assert_eq!(t.exercises.len(), 2);
        assert_eq!(t.exercises[0].exercise_name, "INCLINE BARBELL BENCH");
        assert_eq!(t.exercises[0].target_sets, Some(4));
        // Round-trips through the public list API.
        assert_eq!(list(&db, 42).unwrap().len(), 1);
    }

    #[test]
    fn re_push_is_idempotent() {
        let db = test_db();
        let build = || vec![tpl("Push A", vec![ex("Incline Barbell Bench", 1, Some(4))])];

        let first = sync_templates(&db, 42, build()).unwrap();
        let id = first.templates[0].id;
        assert_eq!(first.templates[0].version, 1);

        let second = sync_templates(&db, 42, build()).unwrap();
        // Same id, no version bump, no snapshot written.
        assert_eq!(second.templates[0].id, id);
        assert_eq!(second.templates[0].version, 1);
        assert!(list_versions(&db, 42, id).unwrap().is_empty());
        // No duplicate template rows.
        assert_eq!(list(&db, 42).unwrap().len(), 1);
    }

    #[test]
    fn edited_push_bumps_version_and_snapshots() {
        let db = test_db();
        let first = sync_templates(&db, 42, vec![tpl("Push A", vec![ex("Incline Barbell Bench", 1, Some(4))])]).unwrap();
        let id = first.templates[0].id;

        // Edit: change target_sets and append a second exercise.
        let second = sync_templates(
            &db,
            42,
            vec![tpl("Push A", vec![ex("Incline Barbell Bench", 1, Some(5)), ex("DB Chest Flies", 2, Some(3))])],
        )
        .unwrap();

        assert_eq!(second.templates[0].id, id);
        assert_eq!(second.templates[0].version, 2);
        assert_eq!(second.templates[0].exercises.len(), 2);
        assert_eq!(second.templates[0].exercises[0].target_sets, Some(5));

        // The pre-edit v1 is preserved as a snapshot.
        let snaps = list_versions(&db, 42, id).unwrap();
        assert_eq!(snaps.len(), 1);
        assert_eq!(snaps[0].version, 1);
    }

    #[test]
    fn unknown_exercise_name_is_auto_created() {
        let db = test_db();
        let result = sync_templates(&db, 42, vec![tpl("Push A", vec![ex("Cable Fly", 1, Some(3))])]).unwrap();

        assert_eq!(result.exercises_created, vec!["CABLE FLY".to_string()]);
        assert_eq!(result.templates[0].exercises[0].exercise_name, "CABLE FLY");
    }

    #[test]
    fn same_push_creates_and_references_exercise_twice() {
        // One push both auto-creates a novel exercise and references it at two
        // positions — the create-then-resolve-within-one-transaction case.
        let db = test_db();
        let result = sync_templates(
            &db,
            42,
            vec![tpl("Push A", vec![ex("Cable Fly", 1, Some(3)), ex("Cable Fly", 2, Some(2))])],
        )
        .unwrap();

        // Auto-created once, not twice.
        assert_eq!(result.exercises_created, vec!["CABLE FLY".to_string()]);
        let t = &result.templates[0];
        assert_eq!(t.exercises.len(), 2);
        assert_eq!(t.exercises[0].exercise_id, t.exercises[1].exercise_id);
    }

    #[test]
    fn ambiguous_exercise_name_rolls_back_whole_batch() {
        let db = test_db();
        // "incline curl" fuzzy-matches both INCLINE DUMBBELL CURL and SEATED
        // INCLINE DB CURLS. It sits in the second template of the batch; the
        // first is valid — nothing may persist.
        let result = sync_templates(
            &db,
            42,
            vec![
                tpl("Push A", vec![ex("Incline Barbell Bench", 1, Some(4))]),
                tpl("Push B", vec![ex("incline curl", 1, Some(3))]),
            ],
        );
        assert!(matches!(result, Err(AppError::BadRequest(_))));
        // Batch atomicity: the valid first template was not committed either.
        assert!(list(&db, 42).unwrap().is_empty());
    }

    #[test]
    fn duplicate_names_in_batch_are_refused() {
        let db = test_db();
        let result = sync_templates(
            &db,
            42,
            vec![
                tpl("Push A", vec![ex("Incline Barbell Bench", 1, Some(4))]),
                tpl("push a", vec![ex("DB Chest Flies", 1, Some(3))]),
            ],
        );
        assert!(matches!(result, Err(AppError::BadRequest(_))));
        assert!(list(&db, 42).unwrap().is_empty());
    }

    #[test]
    fn archived_name_is_unarchived() {
        let db = test_db();
        let first = sync_templates(&db, 42, vec![tpl("Push A", vec![ex("Incline Barbell Bench", 1, Some(4))])]).unwrap();
        let id = first.templates[0].id;
        archive(&db, 42, id).unwrap();
        // Archived templates drop out of the list.
        assert!(list(&db, 42).unwrap().is_empty());

        let second = sync_templates(&db, 42, vec![tpl("Push A", vec![ex("Incline Barbell Bench", 1, Some(4))])]).unwrap();
        assert_eq!(second.templates[0].id, id);
        assert!(!second.templates[0].archived);
        assert_eq!(second.templates[0].version, 2); // un-archive travels the update path
        assert_eq!(list(&db, 42).unwrap().len(), 1);
    }

    #[test]
    fn cross_user_isolation() {
        let db = test_db();
        {
            let conn = db.lock().unwrap();
            conn.execute("INSERT INTO users (id, username, password_hash) VALUES (7, 'other', 'x')", []).unwrap();
            conn.execute("INSERT INTO exercises (user_id, name) VALUES (7, 'FRONT SQUAT')", []).unwrap();
        }

        // Same template name for both users → two distinct templates, no collision.
        let a = sync_templates(&db, 42, vec![tpl("Push A", vec![ex("Incline Barbell Bench", 1, Some(4))])]).unwrap();
        let b = sync_templates(&db, 7, vec![tpl("Push A", vec![ex("Front Squat", 1, Some(5))])]).unwrap();
        assert_ne!(a.templates[0].id, b.templates[0].id);

        // Each user sees only their own.
        assert_eq!(list(&db, 42).unwrap().len(), 1);
        assert_eq!(list(&db, 7).unwrap().len(), 1);
        assert_eq!(list(&db, 7).unwrap()[0].exercises[0].exercise_name, "FRONT SQUAT");

        // User 7 pushing an exercise name only user 42 owns auto-creates it for 7,
        // rather than resolving onto 42's row.
        let c = sync_templates(&db, 7, vec![tpl("Push B", vec![ex("DB Chest Flies", 1, Some(3))])]).unwrap();
        assert_eq!(c.exercises_created, vec!["DB CHEST FLIES".to_string()]);
    }
}
