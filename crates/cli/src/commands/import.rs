use crate::client::Client;

pub async fn handle(client: &Client, file: &str) -> Result<(), String> {
    let auth = client.auth_header().ok_or("Not logged in")?;

    let content = std::fs::read_to_string(file)
        .map_err(|e| format!("Cannot read file: {}", e))?;

    let data: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Invalid JSON: {}", e))?;

    let sessions = data
        .as_array()
        .ok_or("Expected JSON array of sessions")?;

    for (i, session) in sessions.iter().enumerate() {
        let resp = client
            .http
            .post(client.url("/sessions"))
            .header("Authorization", &auth)
            .json(session)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if resp.status().is_success() {
            println!("Imported session {}/{}", i + 1, sessions.len());
        } else {
            eprintln!(
                "Failed to import session {}: {}",
                i + 1,
                resp.status()
            );
        }
    }

    println!("Import complete.");
    Ok(())
}
