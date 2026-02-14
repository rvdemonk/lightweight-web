pub mod exercises;
pub mod import;
pub mod sessions;
pub mod templates;

use crate::client::Client;

pub async fn login(client: &Client) -> Result<(), String> {
    print!("Password: ");
    use std::io::Write;
    std::io::stdout().flush().unwrap();

    let mut password = String::new();
    std::io::stdin()
        .read_line(&mut password)
        .map_err(|e| format!("Read error: {}", e))?;
    let password = password.trim();

    let resp = client
        .http
        .post(client.url("/auth/login"))
        .json(&serde_json::json!({ "password": password }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if resp.status().is_success() {
        let body: serde_json::Value = resp.json().await.map_err(|e| format!("Parse error: {}", e))?;
        let token = body["token"].as_str().ok_or("No token in response")?;
        client.save_token(token)?;
        println!("Logged in successfully. Token saved.");
        Ok(())
    } else {
        Err(format!("Login failed: {}", resp.status()))
    }
}
