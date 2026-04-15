use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct Config {
    pub server_url: String,
    pub auth_token: Option<String>,
}

pub struct Client {
    pub config: Config,
    pub http: reqwest::Client,
}

impl Client {
    pub fn from_config() -> Result<Self, String> {
        let config_path = config_path();
        let mut config = if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)
                .map_err(|e| format!("Cannot read config: {}", e))?;
            toml::from_str(&content).map_err(|e| format!("Invalid config: {}", e))?
        } else {
            Config {
                server_url: "http://localhost:3000".to_string(),
                auth_token: None,
            }
        };

        // Env var overrides — lets Claude Desktop pass creds without requiring CLI install
        if let Ok(url) = std::env::var("LW_SERVER_URL") {
            config.server_url = url;
        }
        if let Ok(token) = std::env::var("LW_AUTH_TOKEN") {
            config.auth_token = Some(token);
        }

        Ok(Client {
            config,
            http: reqwest::Client::new(),
        })
    }

    pub fn url(&self, path: &str) -> String {
        format!("{}/api/v1{}", self.config.server_url, path)
    }

    fn auth_header(&self) -> Result<String, String> {
        self.config
            .auth_token
            .as_ref()
            .map(|t| format!("Bearer {}", t))
            .ok_or_else(|| "Not logged in. Run `lw login` first, or set LW_AUTH_TOKEN.".to_string())
    }

    pub async fn get(&self, path: &str) -> Result<serde_json::Value, String> {
        let auth = self.auth_header()?;
        let resp = self
            .http
            .get(self.url(path))
            .header("Authorization", &auth)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("API error {}: {}", status, text));
        }

        resp.json().await.map_err(|e| format!("Parse error: {}", e))
    }

    pub async fn get_with_query(
        &self,
        path: &str,
        query: &[(&str, &str)],
    ) -> Result<serde_json::Value, String> {
        let auth = self.auth_header()?;
        let resp = self
            .http
            .get(self.url(path))
            .header("Authorization", &auth)
            .query(query)
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("API error {}: {}", status, text));
        }

        resp.json().await.map_err(|e| format!("Parse error: {}", e))
    }

    /// Fuzzy-match exercise name to ID. Returns error if ambiguous or not found.
    pub async fn resolve_exercise(&self, name: &str) -> Result<i64, String> {
        let exercises: Vec<serde_json::Value> = serde_json::from_value(
            self.get("/exercises").await?,
        )
        .map_err(|e| format!("Parse error: {}", e))?;

        let query_tokens: Vec<String> = name.to_lowercase().split_whitespace().map(String::from).collect();
        let matches: Vec<&serde_json::Value> = exercises
            .iter()
            .filter(|e| {
                e["name"].as_str().map_or(false, |n| {
                    let lower = n.to_lowercase();
                    query_tokens.iter().all(|t| lower.contains(t.as_str()))
                })
            })
            .collect();

        match matches.len() {
            0 => Err(format!("No exercise matching '{}'", name)),
            1 => matches[0]["id"]
                .as_i64()
                .ok_or_else(|| "Bad exercise ID".to_string()),
            _ => {
                let names: Vec<&str> = matches
                    .iter()
                    .filter_map(|e| e["name"].as_str())
                    .collect();
                Err(format!(
                    "Ambiguous '{}' — matches: {}",
                    name,
                    names.join(", ")
                ))
            }
        }
    }
}

fn config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("lightweight")
        .join("cli.toml")
}
