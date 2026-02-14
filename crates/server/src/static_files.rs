use axum::{
    http::{header, StatusCode, Uri},
    response::{Html, IntoResponse, Response},
};
use rust_embed::Embed;

#[derive(Embed)]
#[folder = "../../frontend/dist/"]
struct Asset;

pub async fn static_handler(uri: Uri) -> Response {
    let path = uri.path().trim_start_matches('/');

    // Try exact file match
    if let Some(content) = Asset::get(path) {
        let mime = mime_guess::from_path(path).first_or_octet_stream();
        (
            StatusCode::OK,
            [(header::CONTENT_TYPE, mime.as_ref())],
            content.data.into_owned(),
        )
            .into_response()
    }
    // SPA fallback: serve index.html for client-side routing
    else if let Some(content) = Asset::get("index.html") {
        Html(String::from_utf8_lossy(&content.data).to_string()).into_response()
    } else {
        StatusCode::NOT_FOUND.into_response()
    }
}
