use rusqlite::Connection;
use std::path::Path;
use std::sync::{Arc, Mutex};

use crate::error::AppError;

pub type DbPool = Arc<Mutex<Connection>>;

pub fn init_db(path: &str) -> Result<DbPool, AppError> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
    run_migrations(&conn)?;
    Ok(Arc::new(Mutex::new(conn)))
}

pub fn init_memory_db() -> Result<DbPool, AppError> {
    let conn = Connection::open_in_memory()?;
    conn.execute_batch("PRAGMA foreign_keys=ON;")?;
    run_migrations(&conn)?;
    Ok(Arc::new(Mutex::new(conn)))
}

fn run_migrations(conn: &Connection) -> Result<(), AppError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )"
    )?;

    let migrations_dir = find_migrations_dir();
    let mut entries: Vec<_> = std::fs::read_dir(&migrations_dir)
        .map(|rd| rd.filter_map(|e| e.ok()).collect())
        .unwrap_or_default();
    entries.sort_by_key(|e| e.file_name());

    for entry in entries {
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".sql") {
            continue;
        }

        let already_applied: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM _migrations WHERE name = ?1",
            [&name],
            |row| row.get(0),
        )?;

        if already_applied {
            continue;
        }

        let sql = std::fs::read_to_string(entry.path())
            .map_err(|_| AppError::BadRequest(format!("Cannot read migration: {}", name)))?;

        conn.execute_batch(&sql)?;
        conn.execute(
            "INSERT INTO _migrations (name) VALUES (?1)",
            [&name],
        )?;
    }

    Ok(())
}

fn find_migrations_dir() -> std::path::PathBuf {
    // Check relative to current dir, then up a few levels (for workspace builds)
    let candidates = [
        "migrations",
        "../migrations",
        "../../migrations",
        "../../../migrations",
    ];
    for candidate in &candidates {
        let p = Path::new(candidate);
        if p.is_dir() {
            return p.to_path_buf();
        }
    }
    // Fallback — will just skip if empty
    Path::new("migrations").to_path_buf()
}
