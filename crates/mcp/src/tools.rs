use std::sync::Arc;

use rmcp::handler::server::wrapper::Parameters;
use rmcp::{schemars, tool, tool_handler, tool_router};
use rmcp::ServerHandler;
use schemars::JsonSchema;
use serde::Deserialize;

use crate::client::Client;

#[derive(Clone)]
pub struct LightweightMcp {
    client: Arc<Client>,
}

impl LightweightMcp {
    pub fn new(client: Client) -> Self {
        Self {
            client: Arc::new(client),
        }
    }
}

// -- Parameter structs --

#[derive(Deserialize, JsonSchema)]
pub struct TemplateNameParam {
    /// Template name (exact match)
    pub name: String,
}

#[derive(Deserialize, JsonSchema)]
pub struct SessionIdParam {
    /// Session ID
    pub session_id: i64,
}

#[derive(Deserialize, JsonSchema)]
pub struct ExerciseParam {
    /// Exercise name (fuzzy match, e.g. "bench press")
    pub exercise: String,
    /// Start date YYYY-MM-DD
    pub since: Option<String>,
    /// End date YYYY-MM-DD
    pub until: Option<String>,
}

#[derive(Deserialize, JsonSchema)]
pub struct DaysParam {
    /// Number of days to look back (default 30)
    pub days: Option<i64>,
}

#[derive(Deserialize, JsonSchema)]
pub struct DateRangeParam {
    /// Start date YYYY-MM-DD
    pub since: Option<String>,
    /// End date YYYY-MM-DD
    pub until: Option<String>,
}

#[derive(Deserialize, JsonSchema)]
pub struct ExerciseVolumeParam {
    /// Exercise name to filter by (fuzzy match, optional)
    pub exercise: Option<String>,
    /// Start date YYYY-MM-DD
    pub since: Option<String>,
    /// End date YYYY-MM-DD
    pub until: Option<String>,
}

// -- Helpers --

fn json_out(val: &serde_json::Value) -> String {
    serde_json::to_string_pretty(val).unwrap_or_default()
}

fn date_query<'a>(since: &'a Option<String>, until: &'a Option<String>) -> Vec<(&'a str, &'a str)> {
    let mut q: Vec<(&str, &str)> = vec![];
    if let Some(s) = since {
        q.push(("since", s.as_str()));
    }
    if let Some(u) = until {
        q.push(("until", u.as_str()));
    }
    q
}

// -- Tools --

#[tool_router]
impl LightweightMcp {
    // ── Exercises ──

    #[tool(description = "List all exercises with name, muscle group, and equipment")]
    async fn list_exercises(&self) -> String {
        match self.client.get("/exercises").await {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    // ── Templates ──

    #[tool(description = "List all workout templates with exercise counts")]
    async fn list_templates(&self) -> String {
        match self.client.get("/templates").await {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    #[tool(description = "Show a specific workout template with exercises, target sets and rep ranges")]
    async fn get_template(&self, Parameters(p): Parameters<TemplateNameParam>) -> String {
        match self.client.get("/templates").await {
            Ok(data) => {
                let found = data
                    .as_array()
                    .and_then(|arr| arr.iter().find(|t| t["name"].as_str() == Some(&p.name)));
                match found {
                    Some(t) => json_out(t),
                    None => format!("Template '{}' not found", p.name),
                }
            }
            Err(e) => format!("Error: {e}"),
        }
    }

    // ── Sessions ──

    #[tool(description = "List recent workout sessions with template name, date, and status")]
    async fn list_sessions(&self) -> String {
        match self.client.get("/sessions").await {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    #[tool(description = "Get full details for a specific workout session including exercises and sets")]
    async fn get_session(&self, Parameters(p): Parameters<SessionIdParam>) -> String {
        match self.client.get(&format!("/sessions/{}", p.session_id)).await {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    // ── Analytics ──

    #[tool(description = "Full analytics report: watched exercise e1RM history, trends, biggest movers, and session frequency")]
    async fn analytics_report(&self) -> String {
        match self.client.get("/analytics/report").await {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    #[tool(description = "All exercises with estimated 1RM, trend direction, last trained date, and session count")]
    async fn analytics_summary(&self) -> String {
        match self.client.get("/analytics/summary").await {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    #[tool(description = "Exercise list with total session counts")]
    async fn analytics_exercises(&self) -> String {
        match self.client.get("/analytics/exercises").await {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    #[tool(description = "Estimated 1RM progression over time for a specific exercise")]
    async fn e1rm_progression(&self, Parameters(p): Parameters<ExerciseParam>) -> String {
        let id = match self.client.resolve_exercise(&p.exercise).await {
            Ok(id) => id,
            Err(e) => return format!("Error: {e}"),
        };
        let query = date_query(&p.since, &p.until);
        match self
            .client
            .get_with_query(&format!("/analytics/e1rm/{}", id), &query)
            .await
        {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    #[tool(description = "Biggest estimated 1RM gainers and losers over a period")]
    async fn e1rm_movers(&self, Parameters(p): Parameters<DaysParam>) -> String {
        let d = p.days.unwrap_or(30).to_string();
        match self
            .client
            .get_with_query("/analytics/e1rm-movers", &[("days", d.as_str())])
            .await
        {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    #[tool(description = "Weekly training volume broken down by muscle group")]
    async fn weekly_volume(&self, Parameters(p): Parameters<DateRangeParam>) -> String {
        let query = date_query(&p.since, &p.until);
        match self.client.get_with_query("/analytics/volume", &query).await {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    #[tool(description = "Per-exercise weekly volume: sets, reps, and tonnage. Optionally filter to one exercise.")]
    async fn exercise_volume(&self, Parameters(p): Parameters<ExerciseVolumeParam>) -> String {
        let mut query = date_query(&p.since, &p.until);

        let exercise_id_str;
        if let Some(ref name) = p.exercise {
            match self.client.resolve_exercise(name).await {
                Ok(id) => {
                    exercise_id_str = id.to_string();
                    query.push(("exercise_id", &exercise_id_str));
                }
                Err(e) => return format!("Error: {e}"),
            }
        }

        match self
            .client
            .get_with_query("/analytics/exercise-volume", &query)
            .await
        {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    #[tool(description = "Session frequency: sessions per week over time")]
    async fn session_frequency(&self) -> String {
        match self.client.get("/analytics/frequency").await {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    #[tool(description = "Exercises not trained in the last N days")]
    async fn stale_exercises(&self, Parameters(p): Parameters<DaysParam>) -> String {
        let d = p.days.unwrap_or(30).to_string();
        match self
            .client
            .get_with_query("/analytics/stale-exercises", &[("days", d.as_str())])
            .await
        {
            Ok(data) => json_out(&data),
            Err(e) => format!("Error: {e}"),
        }
    }

    #[tool(description = "Show the current watched exercises list (exercises tracked in analytics report)")]
    async fn watchlist(&self) -> String {
        let ids: Vec<i64> = match self.client.get("/preferences/watched_exercises").await {
            Ok(body) => {
                let value_str = body["value"].as_str().unwrap_or("[]");
                serde_json::from_str(value_str).unwrap_or_default()
            }
            Err(_) => vec![],
        };

        if ids.is_empty() {
            return "No watched exercises.".to_string();
        }

        let exercises = match self.client.get("/exercises").await {
            Ok(data) => data,
            Err(e) => return format!("Error: {e}"),
        };

        let watched: Vec<serde_json::Value> = ids
            .iter()
            .filter_map(|id| {
                exercises
                    .as_array()
                    .and_then(|a| a.iter().find(|e| e["id"].as_i64() == Some(*id)))
                    .cloned()
            })
            .collect();

        json_out(&serde_json::Value::Array(watched))
    }
}

#[tool_handler(
    name = "lightweight",
    version = "0.1.0",
    instructions = "Lightweight workout tracker. Query exercises, sessions, templates, and training analytics for the authenticated user."
)]
impl ServerHandler for LightweightMcp {}
