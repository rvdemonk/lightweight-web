mod app;
mod auth;
mod google;
mod routes;
mod static_files;

use tracing_subscriber;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let db_path = std::env::var("LW_DB_PATH").unwrap_or_else(|_| "lightweight.db".to_string());
    let port = std::env::var("LW_PORT").unwrap_or_else(|_| "3000".to_string());
    let host = std::env::var("LW_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let addr = format!("{}:{}", host, port);

    let db = lightweight_core::db::init_db(&db_path).expect("Failed to initialize database");
    let app = app::create_app(db.clone());

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind");

    tracing::info!("Lightweight server running on {}", addr);

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .unwrap();

    // Server has stopped accepting connections — checkpoint the WAL
    tracing::info!("Shutting down: checkpointing WAL...");
    {
        let conn = db.lock().unwrap();
        match conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);") {
            Ok(_) => tracing::info!("WAL checkpoint complete"),
            Err(e) => tracing::error!("WAL checkpoint failed: {}", e),
        }
    }
    tracing::info!("Shutdown complete");
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => { tracing::info!("Received SIGINT"); },
        _ = terminate => { tracing::info!("Received SIGTERM"); },
    }
}
