use clap::Subcommand;

use crate::client::Client;

#[derive(Subcommand)]
pub enum TemplateCommands {
    /// List all templates
    List,
    /// Show template details
    Show { name: String },
}

pub async fn handle(client: &Client, cmd: TemplateCommands) -> Result<(), String> {
    let auth = client.auth_header().ok_or("Not logged in")?;

    match cmd {
        TemplateCommands::List => {
            let resp = client
                .http
                .get(client.url("/templates"))
                .header("Authorization", &auth)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            let templates: Vec<serde_json::Value> =
                resp.json().await.map_err(|e| format!("Parse error: {}", e))?;

            for t in templates {
                let name = t["name"].as_str().unwrap_or("?");
                let count = t["exercises"].as_array().map_or(0, |a| a.len());
                println!("{:<25} ({} exercises)", name, count);
            }
            Ok(())
        }
        TemplateCommands::Show { name } => {
            let resp = client
                .http
                .get(client.url("/templates"))
                .header("Authorization", &auth)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            let templates: Vec<serde_json::Value> =
                resp.json().await.map_err(|e| format!("Parse error: {}", e))?;

            let template = templates
                .iter()
                .find(|t| t["name"].as_str() == Some(&name))
                .ok_or(format!("Template '{}' not found", name))?;

            println!("Template: {}", name);
            if let Some(exercises) = template["exercises"].as_array() {
                for ex in exercises {
                    let ename = ex["exercise_name"].as_str().unwrap_or("?");
                    let sets = ex["target_sets"].as_i64().unwrap_or(0);
                    let rmin = ex["target_reps_min"].as_i64().unwrap_or(0);
                    let rmax = ex["target_reps_max"].as_i64().unwrap_or(0);
                    println!("  {} — {}×{}-{}", ename, sets, rmin, rmax);
                }
            }
            Ok(())
        }
    }
}
