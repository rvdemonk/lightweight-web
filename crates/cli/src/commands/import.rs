use crate::client::Client;

pub async fn handle(client: &Client, file: &str) -> Result<(), String> {
    let auth = client.auth_header().ok_or("Not logged in")?;

    let content = std::fs::read_to_string(file)
        .map_err(|e| format!("Cannot read file: {}", e))?;

    let data: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Invalid JSON: {}", e))?;

    if !data.is_array() {
        return Err("Expected JSON array of sessions".to_string());
    }

    let resp = client
        .http
        .post(client.url("/sessions/import"))
        .header("Authorization", &auth)
        .json(&data)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if resp.status().is_success() {
        let result: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| format!("Invalid response: {}", e))?;

        let session_count = result["sessions"].as_array().map(|a| a.len()).unwrap_or(0);
        println!("Imported {} session(s).", session_count);

        if let Some(created) = result["exercises_created"].as_array() {
            if !created.is_empty() {
                println!("Created exercises: {}", created.iter()
                    .filter_map(|v| v.as_str())
                    .collect::<Vec<_>>()
                    .join(", "));
            }
        }

        if let Some(warnings) = result["warnings"].as_array() {
            for w in warnings {
                if let Some(msg) = w.as_str() {
                    println!("  warning: {}", msg);
                }
            }
        }
    } else {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Import failed ({}): {}", status, body));
    }

    Ok(())
}
