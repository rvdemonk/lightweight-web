use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct GoogleTokenClaims {
    pub sub: String,
    pub email: Option<String>,
    pub aud: String,
}

pub async fn verify_google_id_token(
    client: &reqwest::Client,
    id_token: &str,
    expected_client_id: &str,
) -> Result<GoogleTokenClaims, String> {
    let url = format!(
        "https://oauth2.googleapis.com/tokeninfo?id_token={}",
        id_token
    );

    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Google verification request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err("Google token verification failed".into());
    }

    let claims: GoogleTokenClaims = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse Google response: {}", e))?;

    if claims.aud != expected_client_id {
        return Err("Token audience mismatch".into());
    }

    Ok(claims)
}
