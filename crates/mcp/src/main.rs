mod client;
mod tools;

use rmcp::ServiceExt;
use rmcp::transport::stdio;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Log to stderr so it doesn't corrupt the stdio JSON-RPC protocol
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .init();

    let client = client::Client::from_config().map_err(|e| {
        anyhow::anyhow!(
            "Config error: {}. Run `lw login` or set LW_SERVER_URL + LW_AUTH_TOKEN env vars.",
            e
        )
    })?;

    let server = tools::LightweightMcp::new(client);
    let service = server.serve(stdio()).await?;
    service.waiting().await?;

    Ok(())
}
