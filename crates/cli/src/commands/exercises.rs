use clap::Subcommand;

use crate::client::Client;

#[derive(Subcommand)]
pub enum ExerciseCommands {
    /// List all exercises
    List,
    /// Add a new exercise
    Add {
        name: String,
        #[arg(long)]
        muscle_group: Option<String>,
        #[arg(long)]
        equipment: Option<String>,
    },
}

pub async fn handle(client: &Client, cmd: ExerciseCommands) -> Result<(), String> {
    let auth = client.auth_header().ok_or("Not logged in")?;

    match cmd {
        ExerciseCommands::List => {
            let resp = client
                .http
                .get(client.url("/exercises"))
                .header("Authorization", &auth)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            let exercises: Vec<serde_json::Value> =
                resp.json().await.map_err(|e| format!("Parse error: {}", e))?;

            for ex in exercises {
                let name = ex["name"].as_str().unwrap_or("?");
                let mg = ex["muscle_group"].as_str().unwrap_or("-");
                let eq = ex["equipment"].as_str().unwrap_or("-");
                println!("{:<30} {:<15} {}", name, mg, eq);
            }
            Ok(())
        }
        ExerciseCommands::Add {
            name,
            muscle_group,
            equipment,
        } => {
            let mut body = serde_json::json!({ "name": name });
            if let Some(mg) = muscle_group {
                body["muscle_group"] = serde_json::Value::String(mg);
            }
            if let Some(eq) = equipment {
                body["equipment"] = serde_json::Value::String(eq);
            }

            let resp = client
                .http
                .post(client.url("/exercises"))
                .header("Authorization", &auth)
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            if resp.status().is_success() {
                println!("Exercise '{}' created.", name);
                Ok(())
            } else {
                Err(format!("Failed: {}", resp.status()))
            }
        }
    }
}
