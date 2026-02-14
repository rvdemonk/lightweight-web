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
    config_path: PathBuf,
}

impl Client {
    pub fn from_config() -> Result<Self, String> {
        let config_path = config_path();
        let config = if config_path.exists() {
            let content = std::fs::read_to_string(&config_path)
                .map_err(|e| format!("Cannot read config: {}", e))?;
            toml::from_str(&content).map_err(|e| format!("Invalid config: {}", e))?
        } else {
            Config {
                server_url: "http://localhost:3000".to_string(),
                auth_token: None,
            }
        };

        Ok(Client {
            config,
            http: reqwest::Client::new(),
            config_path,
        })
    }

    pub fn url(&self, path: &str) -> String {
        format!("{}/api/v1{}", self.config.server_url, path)
    }

    pub fn auth_header(&self) -> Option<String> {
        self.config
            .auth_token
            .as_ref()
            .map(|t| format!("Bearer {}", t))
    }

    pub fn save_token(&self, token: &str) -> Result<(), String> {
        let config = Config {
            server_url: self.config.server_url.clone(),
            auth_token: Some(token.to_string()),
        };
        let content = toml::to_string_pretty(&config)
            .map_err(|e| format!("Serialize error: {}", e))?;

        if let Some(parent) = self.config_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Cannot create config dir: {}", e))?;
        }

        std::fs::write(&self.config_path, content)
            .map_err(|e| format!("Cannot write config: {}", e))?;

        Ok(())
    }
}

fn config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("lightweight")
        .join("cli.toml")
}
