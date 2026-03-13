use clap::Subcommand;

use crate::client::Client;

#[derive(Subcommand)]
pub enum AnalyticsCommands {
    /// Full report: watched exercises with e1RM history, trends, movers, frequency
    Report,
    /// Add exercise to watch list
    Watch {
        #[arg(long)]
        exercise_id: Option<i64>,
        #[arg(long, help = "Exercise name (fuzzy match)")]
        exercise: Option<String>,
    },
    /// Remove exercise from watch list
    Unwatch {
        #[arg(long)]
        exercise_id: Option<i64>,
        #[arg(long, help = "Exercise name (fuzzy match)")]
        exercise: Option<String>,
    },
    /// Show current watch list
    Watchlist,
    /// One-shot overview: all exercises with e1RM, trend, last trained, session count
    Summary,
    /// Exercise list with session counts
    Exercises,
    /// e1RM progression for an exercise
    E1rm {
        #[arg(long)]
        exercise_id: Option<i64>,
        #[arg(long, help = "Exercise name (fuzzy match)")]
        exercise: Option<String>,
        #[arg(long, help = "Start date (YYYY-MM-DD)")]
        since: Option<String>,
        #[arg(long, help = "End date (YYYY-MM-DD)")]
        until: Option<String>,
    },
    /// Biggest e1RM gainers/losers
    Movers {
        #[arg(long, default_value = "30")]
        days: i64,
    },
    /// Weekly volume by muscle group
    Volume {
        #[arg(long, help = "Start date (YYYY-MM-DD)")]
        since: Option<String>,
        #[arg(long, help = "End date (YYYY-MM-DD)")]
        until: Option<String>,
    },
    /// Per-exercise weekly volume (sets, reps, tonnage)
    ExerciseVolume {
        #[arg(long)]
        exercise_id: Option<i64>,
        #[arg(long, help = "Exercise name (fuzzy match)")]
        exercise: Option<String>,
        #[arg(long, help = "Start date (YYYY-MM-DD)")]
        since: Option<String>,
        #[arg(long, help = "End date (YYYY-MM-DD)")]
        until: Option<String>,
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

    match cmd {
        AnalyticsCommands::Watch { exercise_id, exercise } => {
            let id = resolve_exercise(client, &auth, exercise_id, exercise.as_deref()).await?;
            let mut ids = get_watched_ids(client, &auth).await?;
            if ids.contains(&id) {
                println!("Already watching exercise {}", id);
            } else {
                ids.push(id);
                set_watched_ids(client, &auth, &ids).await?;
                let name = lookup_exercise_name(client, &auth, id).await.unwrap_or_default();
                println!("Watching: {} (ID: {})", name, id);
            }
            return Ok(());
        }
        AnalyticsCommands::Unwatch { exercise_id, exercise } => {
            let id = resolve_exercise(client, &auth, exercise_id, exercise.as_deref()).await?;
            let mut ids = get_watched_ids(client, &auth).await?;
            let before = ids.len();
            ids.retain(|&x| x != id);
            if ids.len() == before {
                println!("Exercise {} was not being watched", id);
            } else {
                set_watched_ids(client, &auth, &ids).await?;
                let name = lookup_exercise_name(client, &auth, id).await.unwrap_or_default();
                println!("Unwatched: {} (ID: {})", name, id);
            }
            return Ok(());
        }
        AnalyticsCommands::Watchlist => {
            let ids = get_watched_ids(client, &auth).await?;
            if ids.is_empty() {
                println!("No watched exercises. Use `lw analytics watch --exercise \"bench\"` to add.");
                return Ok(());
            }
            // Fetch exercise names
            let resp = client.http.get(client.url("/exercises"))
                .header("Authorization", &auth)
                .send().await.map_err(|e| format!("Request failed: {}", e))?;
            let exercises: Vec<serde_json::Value> = resp.json().await.map_err(|e| format!("Parse error: {}", e))?;

            println!("Watched exercises:");
            for id in &ids {
                let name = exercises.iter()
                    .find(|e| e["id"].as_i64() == Some(*id))
                    .and_then(|e| e["name"].as_str())
                    .unwrap_or("?");
                println!("  {} (ID: {})", name, id);
            }
            return Ok(());
        }
        _ => {}
    }

    let (url, query_params): (String, Vec<(&str, String)>) = match &cmd {
        AnalyticsCommands::Report => (client.url("/analytics/report"), vec![]),
        AnalyticsCommands::Summary => (client.url("/analytics/summary"), vec![]),
        AnalyticsCommands::Exercises => (client.url("/analytics/exercises"), vec![]),
        AnalyticsCommands::E1rm { exercise_id, exercise, since, until } => {
            let id = resolve_exercise(client, &auth, *exercise_id, exercise.as_deref()).await?;
            let params = date_params(since, until);
            (client.url(&format!("/analytics/e1rm/{}", id)), params)
        }
        AnalyticsCommands::Movers { days } => {
            (client.url("/analytics/e1rm-movers"), vec![("days", days.to_string())])
        }
        AnalyticsCommands::Volume { since, until } => {
            (client.url("/analytics/volume"), date_params(since, until))
        }
        AnalyticsCommands::ExerciseVolume { exercise_id, exercise, since, until } => {
            let mut params = date_params(since, until);
            if let Some(id) = resolve_exercise_optional(client, &auth, *exercise_id, exercise.as_deref()).await? {
                params.push(("exercise_id", id.to_string()));
            }
            (client.url("/analytics/exercise-volume"), params)
        }
        AnalyticsCommands::Frequency => (client.url("/analytics/frequency"), vec![]),
        AnalyticsCommands::Stale { days } => {
            (client.url("/analytics/stale-exercises"), vec![("days", days.to_string())])
        }
        // Watch/Unwatch/Watchlist handled above
        _ => unreachable!(),
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

fn date_params<'a>(since: &'a Option<String>, until: &'a Option<String>) -> Vec<(&'a str, String)> {
    let mut params = vec![];
    if let Some(s) = since {
        params.push(("since", s.clone()));
    }
    if let Some(u) = until {
        params.push(("until", u.clone()));
    }
    params
}

/// Resolve exercise ID from --exercise-id or --exercise name. One must be provided.
async fn resolve_exercise(
    client: &Client,
    auth: &str,
    exercise_id: Option<i64>,
    exercise_name: Option<&str>,
) -> Result<i64, String> {
    if let Some(id) = exercise_id {
        return Ok(id);
    }
    if let Some(name) = exercise_name {
        return lookup_exercise_by_name(client, auth, name).await;
    }
    Err("Provide --exercise-id or --exercise".to_string())
}

/// Resolve exercise ID optionally (for commands where exercise is optional).
async fn resolve_exercise_optional(
    client: &Client,
    auth: &str,
    exercise_id: Option<i64>,
    exercise_name: Option<&str>,
) -> Result<Option<i64>, String> {
    if let Some(id) = exercise_id {
        return Ok(Some(id));
    }
    if let Some(name) = exercise_name {
        return lookup_exercise_by_name(client, auth, name).await.map(Some);
    }
    Ok(None)
}

/// Fetch exercise list and fuzzy-match by name (case-insensitive substring).
async fn lookup_exercise_by_name(client: &Client, auth: &str, query: &str) -> Result<i64, String> {
    let resp = client
        .http
        .get(client.url("/exercises"))
        .header("Authorization", auth)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let exercises: Vec<serde_json::Value> = resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    let query_tokens: Vec<String> = query.to_lowercase().split_whitespace().map(String::from).collect();
    let matches: Vec<&serde_json::Value> = exercises
        .iter()
        .filter(|e| {
            e["name"]
                .as_str()
                .map_or(false, |n| {
                    let name_lower = n.to_lowercase();
                    query_tokens.iter().all(|t| name_lower.contains(t.as_str()))
                })
        })
        .collect();

    match matches.len() {
        0 => Err(format!("No exercise matching '{}'", query)),
        1 => matches[0]["id"].as_i64().ok_or("Bad exercise ID".to_string()),
        _ => {
            let names: Vec<&str> = matches
                .iter()
                .filter_map(|e| e["name"].as_str())
                .collect();
            Err(format!(
                "Ambiguous '{}' — matches: {}",
                query,
                names.join(", ")
            ))
        }
    }
}

/// Look up a single exercise name by ID.
async fn lookup_exercise_name(client: &Client, auth: &str, id: i64) -> Result<String, String> {
    let resp = client
        .http
        .get(client.url("/exercises"))
        .header("Authorization", auth)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let exercises: Vec<serde_json::Value> = resp
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    exercises.iter()
        .find(|e| e["id"].as_i64() == Some(id))
        .and_then(|e| e["name"].as_str())
        .map(|s| s.to_string())
        .ok_or(format!("Exercise {} not found", id))
}

const WATCHED_PREF_KEY: &str = "watched_exercises";

async fn get_watched_ids(client: &Client, auth: &str) -> Result<Vec<i64>, String> {
    let resp = client
        .http
        .get(client.url(&format!("/preferences/{}", WATCHED_PREF_KEY)))
        .header("Authorization", auth)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if resp.status() == 404 {
        return Ok(vec![]);
    }

    let body: serde_json::Value = resp.json().await.map_err(|e| format!("Parse error: {}", e))?;
    let value_str = body["value"].as_str().unwrap_or("[]");
    serde_json::from_str(value_str).map_err(|e| format!("Parse error: {}", e))
}

async fn set_watched_ids(client: &Client, auth: &str, ids: &[i64]) -> Result<(), String> {
    let value = serde_json::to_string(ids).map_err(|e| format!("Serialize error: {}", e))?;

    let resp = client
        .http
        .put(client.url(&format!("/preferences/{}", WATCHED_PREF_KEY)))
        .header("Authorization", auth)
        .json(&serde_json::json!({ "value": value }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if resp.status().is_success() {
        Ok(())
    } else {
        Err(format!("Failed to update watchlist: {}", resp.status()))
    }
}
