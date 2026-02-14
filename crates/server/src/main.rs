mod app;
mod auth;
mod routes;
mod static_files;

use tracing_subscriber;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let db_path = std::env::var("LW_DB_PATH").unwrap_or_else(|_| "lightweight.db".to_string());
    let port = std::env::var("LW_PORT").unwrap_or_else(|_| "3000".to_string());
    let addr = format!("0.0.0.0:{}", port);

    let db = lightweight_core::db::init_db(&db_path).expect("Failed to initialize database");
    let app = app::create_app(db);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind");

    tracing::info!("Lightweight server running on {}", addr);

    axum::serve(listener, app).await.unwrap();
}
