use clap::Subcommand;

use crate::client::Client;

#[derive(Subcommand)]
pub enum SessionCommands {
    /// List recent sessions
    List,
    /// Start a new workout
    Start {
        #[arg(long)]
        template: Option<String>,
    },
    /// Log a set in the active session
    Log {
        #[arg(short, long)]
        exercise: String,
        #[arg(short, long)]
        weight: Option<f64>,
        #[arg(short, long)]
        reps: i32,
    },
    /// End the active session
    End,
}

pub async fn handle(client: &Client, cmd: SessionCommands) -> Result<(), String> {
    let auth = client.auth_header().ok_or("Not logged in")?;

    match cmd {
        SessionCommands::List => {
            let resp = client
                .http
                .get(client.url("/sessions"))
                .header("Authorization", &auth)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            let sessions: Vec<serde_json::Value> =
                resp.json().await.map_err(|e| format!("Parse error: {}", e))?;

            for s in sessions {
                let name = s["template_name"]
                    .as_str()
                    .or(s["name"].as_str())
                    .unwrap_or("Freeform");
                let date = s["started_at"].as_str().unwrap_or("?");
                let status = s["status"].as_str().unwrap_or("?");
                println!("{:<25} {:<20} {}", name, date, status);
            }
            Ok(())
        }
        SessionCommands::Start { template } => {
            let body = if let Some(ref name) = template {
                // Lookup template ID by name
                let resp = client
                    .http
                    .get(client.url("/templates"))
                    .header("Authorization", &auth)
                    .send()
                    .await
                    .map_err(|e| format!("Request failed: {}", e))?;

                let templates: Vec<serde_json::Value> =
                    resp.json().await.map_err(|e| format!("Parse error: {}", e))?;

                let t = templates
                    .iter()
                    .find(|t| t["name"].as_str() == Some(name))
                    .ok_or(format!("Template '{}' not found", name))?;

                serde_json::json!({ "template_id": t["id"] })
            } else {
                serde_json::json!({})
            };

            let resp = client
                .http
                .post(client.url("/sessions"))
                .header("Authorization", &auth)
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            if resp.status().is_success() {
                println!("Workout started!");
                Ok(())
            } else {
                Err(format!("Failed: {}", resp.status()))
            }
        }
        SessionCommands::Log {
            exercise,
            weight,
            reps,
        } => {
            // Get active session
            let resp = client
                .http
                .get(client.url("/sessions/active"))
                .header("Authorization", &auth)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            let session: serde_json::Value =
                resp.json().await.map_err(|e| format!("Parse error: {}", e))?;

            if session.is_null() {
                return Err("No active session".to_string());
            }

            let session_id = session["id"].as_i64().ok_or("Bad session")?;

            // Find exercise in session
            let exercises = session["exercises"]
                .as_array()
                .ok_or("No exercises")?;

            let se = exercises
                .iter()
                .find(|e| {
                    e["exercise_name"]
                        .as_str()
                        .map_or(false, |n| n.to_lowercase().contains(&exercise.to_lowercase()))
                })
                .ok_or(format!("Exercise '{}' not in session", exercise))?;

            let se_id = se["id"].as_i64().ok_or("Bad exercise")?;

            let body = serde_json::json!({
                "weight_kg": weight,
                "reps": reps,
            });

            let resp = client
                .http
                .post(client.url(&format!(
                    "/sessions/{}/exercises/{}/sets",
                    session_id, se_id
                )))
                .header("Authorization", &auth)
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            if resp.status().is_success() {
                let set: serde_json::Value =
                    resp.json().await.map_err(|e| format!("Parse error: {}", e))?;
                let w = weight.map_or("BW".to_string(), |w| format!("{}kg", w));
                println!(
                    "Set {} logged: {} × {}",
                    set["set_number"], w, reps
                );
                Ok(())
            } else {
                Err(format!("Failed: {}", resp.status()))
            }
        }
        SessionCommands::End => {
            let resp = client
                .http
                .get(client.url("/sessions/active"))
                .header("Authorization", &auth)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            let session: serde_json::Value =
                resp.json().await.map_err(|e| format!("Parse error: {}", e))?;

            if session.is_null() {
                return Err("No active session".to_string());
            }

            let session_id = session["id"].as_i64().ok_or("Bad session")?;

            let resp = client
                .http
                .put(client.url(&format!("/sessions/{}", session_id)))
                .header("Authorization", &auth)
                .json(&serde_json::json!({ "status": "completed" }))
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            if resp.status().is_success() {
                println!("Workout ended!");
                Ok(())
            } else {
                Err(format!("Failed: {}", resp.status()))
            }
        }
    }
}
