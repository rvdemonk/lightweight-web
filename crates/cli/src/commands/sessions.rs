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
        #[arg(long, help = "Start time (ISO 8601, e.g. 2026-02-02T10:00:00Z)")]
        started_at: Option<String>,
        #[arg(long, help = "End time (ISO 8601, e.g. 2026-02-02T11:30:00Z)")]
        ended_at: Option<String>,
        #[arg(long, help = "Mark session as completed immediately")]
        completed: bool,
        #[arg(long, help = "Session notes")]
        notes: Option<String>,
    },
    /// Add an exercise to a session
    AddExercise {
        #[arg(short, long, help = "Session ID (defaults to active session)")]
        session: Option<i64>,
        #[arg(short, long, help = "Exercise name or ID")]
        exercise: String,
        #[arg(long, help = "Position in workout order")]
        position: Option<i32>,
        #[arg(long, help = "Exercise notes")]
        notes: Option<String>,
    },
    /// Log a set in the active session
    Log {
        #[arg(short, long)]
        exercise: String,
        #[arg(short, long)]
        weight: Option<f64>,
        #[arg(short, long)]
        reps: i32,
        #[arg(long, help = "Set type (e.g. warmup, working, drop)")]
        set_type: Option<String>,
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
        SessionCommands::Start {
            template,
            started_at,
            ended_at,
            completed,
            notes,
        } => {
            let mut body = serde_json::json!({});

            // Lookup template ID if provided
            if let Some(ref name) = template {
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

                body["template_id"] = t["id"].clone();
            }

            // Add optional fields
            if let Some(ref start) = started_at {
                body["started_at"] = serde_json::json!(start);
            }
            if let Some(ref end) = ended_at {
                body["ended_at"] = serde_json::json!(end);
            }
            if completed {
                body["status"] = serde_json::json!("completed");
            }
            if let Some(ref n) = notes {
                body["notes"] = serde_json::json!(n);
            }

            let resp = client
                .http
                .post(client.url("/sessions"))
                .header("Authorization", &auth)
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            if resp.status().is_success() {
                let session: serde_json::Value =
                    resp.json().await.map_err(|e| format!("Parse error: {}", e))?;
                let status_msg = if completed { "completed" } else { "started" };
                println!("Workout {} (ID: {})", status_msg, session["id"]);
                Ok(())
            } else {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                Err(format!("Failed: {} - {}", status, text))
            }
        }
        SessionCommands::AddExercise {
            session,
            exercise,
            position,
            notes,
        } => {
            // Determine session ID
            let session_id = if let Some(sid) = session {
                sid
            } else {
                // Get active session
                let resp = client
                    .http
                    .get(client.url("/sessions/active"))
                    .header("Authorization", &auth)
                    .send()
                    .await
                    .map_err(|e| format!("Request failed: {}", e))?;

                let active: serde_json::Value =
                    resp.json().await.map_err(|e| format!("Parse error: {}", e))?;

                if active.is_null() {
                    return Err("No active session. Use --session <ID> or start a session first.".to_string());
                }

                active["id"].as_i64().ok_or("Bad session")?
            };

            // Lookup exercise by name or parse as ID
            let exercise_id = if let Ok(id) = exercise.parse::<i64>() {
                id
            } else {
                // Lookup by name
                let resp = client
                    .http
                    .get(client.url("/exercises"))
                    .header("Authorization", &auth)
                    .send()
                    .await
                    .map_err(|e| format!("Request failed: {}", e))?;

                let exercises: Vec<serde_json::Value> =
                    resp.json().await.map_err(|e| format!("Parse error: {}", e))?;

                let ex = exercises
                    .iter()
                    .find(|e| {
                        e["name"]
                            .as_str()
                            .map_or(false, |n| n.to_lowercase().contains(&exercise.to_lowercase()))
                    })
                    .ok_or(format!("Exercise '{}' not found", exercise))?;

                ex["id"].as_i64().ok_or("Bad exercise ID")?
            };

            let mut body = serde_json::json!({
                "exercise_id": exercise_id,
            });

            if let Some(pos) = position {
                body["position"] = serde_json::json!(pos);
            }
            if let Some(ref n) = notes {
                body["notes"] = serde_json::json!(n);
            }

            let resp = client
                .http
                .post(client.url(&format!("/sessions/{}/exercises", session_id)))
                .header("Authorization", &auth)
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            if resp.status().is_success() {
                let se: serde_json::Value =
                    resp.json().await.map_err(|e| format!("Parse error: {}", e))?;
                println!(
                    "Added exercise: {} (session exercise ID: {})",
                    se["exercise_name"].as_str().unwrap_or("?"),
                    se["id"]
                );
                Ok(())
            } else {
                let status = resp.status();
                let text = resp.text().await.unwrap_or_default();
                Err(format!("Failed: {} - {}", status, text))
            }
        }
        SessionCommands::Log {
            exercise,
            weight,
            reps,
            set_type,
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

            let mut body = serde_json::json!({
                "weight_kg": weight,
                "reps": reps,
            });

            if let Some(ref st) = set_type {
                body["set_type"] = serde_json::json!(st);
            }

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
