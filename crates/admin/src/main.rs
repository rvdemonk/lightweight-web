mod display;
mod queries;

use clap::{Parser, Subcommand};
use rusqlite::Connection;
use std::env;

#[derive(Parser)]
#[command(name = "lw-admin", about = "Lightweight admin dashboard")]
struct Cli {
    /// Path to SQLite database (or set LW_DB_PATH)
    #[arg(long)]
    db: Option<String>,

    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// System overview (default)
    Overview,
    /// List all users with activity stats
    Users,
    /// Invite distribution and status
    Invites,
    /// Recent workout activity
    Activity {
        /// Number of days to look back
        #[arg(long, default_value = "7")]
        days: u32,
    },
}

fn open_db(cli: &Cli) -> Result<Connection, String> {
    let path = cli
        .db
        .clone()
        .or_else(|| env::var("LW_DB_PATH").ok())
        .ok_or("No database path. Use --db <path> or set LW_DB_PATH")?;

    let conn = Connection::open_with_flags(
        &path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|e| format!("Cannot open database at {path}: {e}"))?;

    conn.execute_batch("PRAGMA query_only=ON;")
        .map_err(|e| format!("Failed to set read-only mode: {e}"))?;

    Ok(conn)
}

fn main() {
    let cli = Cli::parse();
    let conn = match open_db(&cli) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    };

    let result = match cli.command.unwrap_or(Commands::Overview) {
        Commands::Overview => run_overview(&conn),
        Commands::Users => run_users(&conn),
        Commands::Invites => run_invites(&conn),
        Commands::Activity { days } => run_activity(&conn, days),
    };

    if let Err(e) = result {
        eprintln!("Error: {e}");
        std::process::exit(1);
    }
}

fn run_overview(conn: &Connection) -> Result<(), String> {
    let stats = queries::overview_stats(conn)?;
    let registrations = queries::recent_registrations(conn, 7)?;
    let workouts = queries::recent_activity(conn, 7)?;
    display::overview(&stats, &registrations, &workouts);
    Ok(())
}

fn run_users(conn: &Connection) -> Result<(), String> {
    let users = queries::all_users(conn)?;
    display::users(&users);
    Ok(())
}

fn run_invites(conn: &Connection) -> Result<(), String> {
    let dist = queries::invite_distribution(conn)?;
    let invites = queries::all_invites(conn)?;
    display::invites(&dist, &invites);
    Ok(())
}

fn run_activity(conn: &Connection, days: u32) -> Result<(), String> {
    let workouts = queries::recent_activity(conn, days)?;
    display::activity(&workouts, days);
    Ok(())
}
