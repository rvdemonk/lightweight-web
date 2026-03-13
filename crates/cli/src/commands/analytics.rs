use clap::Subcommand;

use crate::client::Client;

#[derive(Subcommand)]
pub enum AnalyticsCommands {
    /// One-shot overview: all exercises with e1RM, last trained, session count
    Summary,
    /// Exercise list with session counts
    Exercises,
    /// e1RM progression for an exercise
    E1rm {
        #[arg(long)]
        exercise_id: i64,
    },
    /// Biggest e1RM gainers/losers
    Movers {
        #[arg(long, default_value = "30")]
        days: i64,
    },
    /// Weekly volume by muscle group
    Volume,
    /// Per-exercise weekly volume (sets, reps, tonnage)
    ExerciseVolume {
        #[arg(long)]
        exercise_id: Option<i64>,
    },
    /// Sessions per week
    Frequency,
    /// Exercises not trained recently
    Stale {
        #[arg(long, default_value = "30")]
        days: i64,
    },
}

pub async fn handle(client: &Client, cmd: AnalyticsCommands) -> Result<(), String> {
    let auth = client.auth_header().ok_or("Not logged in")?;

    let (url, query_params): (String, Vec<(&str, String)>) = match &cmd {
        AnalyticsCommands::Summary => (client.url("/analytics/summary"), vec![]),
        AnalyticsCommands::Exercises => (client.url("/analytics/exercises"), vec![]),
        AnalyticsCommands::E1rm { exercise_id } => {
            (client.url(&format!("/analytics/e1rm/{}", exercise_id)), vec![])
        }
        AnalyticsCommands::Movers { days } => {
            (client.url("/analytics/e1rm-movers"), vec![("days", days.to_string())])
        }
        AnalyticsCommands::Volume => (client.url("/analytics/volume"), vec![]),
        AnalyticsCommands::ExerciseVolume { exercise_id } => {
            let mut params = vec![];
            if let Some(id) = exercise_id {
                params.push(("exercise_id", id.to_string()));
            }
            (client.url("/analytics/exercise-volume"), params)
        }
        AnalyticsCommands::Frequency => (client.url("/analytics/frequency"), vec![]),
        AnalyticsCommands::Stale { days } => {
            (client.url("/analytics/stale-exercises"), vec![("days", days.to_string())])
        }
    };

    let resp = client
        .http
        .get(&url)
        .header("Authorization", &auth)
        .query(&query_params)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Failed: {} - {}", status, text));
    }

    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    println!(
        "{}",
        serde_json::to_string_pretty(&data).unwrap_or_default()
    );

    Ok(())
}
