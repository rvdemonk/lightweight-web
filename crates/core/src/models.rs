use serde::{Deserialize, Serialize};

// ── Exercises ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Exercise {
    pub id: i64,
    pub name: String,
    pub muscle_group: Option<String>,
    pub equipment: Option<String>,
    pub notes: Option<String>,
    pub archived: bool,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateExercise {
    pub name: String,
    pub muscle_group: Option<String>,
    pub equipment: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateExercise {
    pub name: Option<String>,
    pub muscle_group: Option<String>,
    pub equipment: Option<String>,
    pub notes: Option<String>,
}

// ── Templates ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Template {
    pub id: i64,
    pub name: String,
    pub notes: Option<String>,
    pub archived: bool,
    pub created_at: String,
    pub updated_at: String,
    pub exercises: Vec<TemplateExercise>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TemplateExercise {
    pub id: i64,
    pub exercise_id: i64,
    pub exercise_name: String,
    pub position: i32,
    pub target_sets: Option<i32>,
    pub target_reps_min: Option<i32>,
    pub target_reps_max: Option<i32>,
    pub rest_seconds: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTemplate {
    pub name: String,
    pub notes: Option<String>,
    pub exercises: Vec<CreateTemplateExercise>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTemplateExercise {
    pub exercise_id: i64,
    pub position: i32,
    pub target_sets: Option<i32>,
    pub target_reps_min: Option<i32>,
    pub target_reps_max: Option<i32>,
    pub rest_seconds: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTemplate {
    pub name: Option<String>,
    pub notes: Option<String>,
    pub exercises: Option<Vec<CreateTemplateExercise>>,
}

// ── Sessions ──

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Session {
    pub id: i64,
    pub template_id: Option<i64>,
    pub template_name: Option<String>,
    pub name: Option<String>,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub paused_duration: i64,
    pub notes: Option<String>,
    pub status: String,
    pub exercises: Vec<SessionExerciseWithSets>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionSummary {
    pub id: i64,
    pub template_id: Option<i64>,
    pub template_name: Option<String>,
    pub name: Option<String>,
    pub started_at: String,
    pub ended_at: Option<String>,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionExerciseWithSets {
    pub id: i64,
    pub exercise_id: i64,
    pub exercise_name: String,
    pub position: i32,
    pub notes: Option<String>,
    pub sets: Vec<Set>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Set {
    pub id: i64,
    pub session_exercise_id: i64,
    pub set_number: i32,
    pub weight_kg: Option<f64>,
    pub reps: i32,
    pub set_type: String,
    pub completed_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateSession {
    pub template_id: Option<i64>,
    pub name: Option<String>,
    pub started_at: Option<String>,
    pub ended_at: Option<String>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSession {
    pub status: Option<String>,
    pub notes: Option<String>,
    pub paused_duration: Option<i64>,
    pub started_at: Option<String>,
    pub ended_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AddSessionExercise {
    pub exercise_id: i64,
    pub position: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSessionExercise {
    pub position: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSet {
    pub weight_kg: Option<f64>,
    pub reps: i32,
    pub set_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSet {
    pub weight_kg: Option<f64>,
    pub reps: Option<i32>,
    pub set_type: Option<String>,
}

// ── Import ──

#[derive(Debug, Deserialize)]
pub struct ImportSession {
    pub template: Option<String>,
    pub date: String,
    pub notes: Option<String>,
    pub exercises: Vec<ImportExercise>,
}

#[derive(Debug, Deserialize)]
pub struct ImportExercise {
    pub name: String,
    pub notes: Option<String>,
    pub sets: Vec<ImportSet>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ImportSet {
    pub weight_kg: Option<f64>,
    pub reps: i32,
    pub set_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub sessions: Vec<Session>,
    pub exercises_created: Vec<String>,
    pub warnings: Vec<String>,
}

// ── Auth ──

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
}

// ── Query params ──

#[derive(Debug, Deserialize)]
pub struct SessionListParams {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub template_id: Option<i64>,
}

// ── History ──

#[derive(Debug, Serialize, Clone)]
pub struct ExerciseHistory {
    pub exercise_id: i64,
    pub exercise_name: String,
    pub sessions: Vec<ExerciseHistoryEntry>,
}

#[derive(Debug, Serialize, Clone)]
pub struct ExerciseHistoryEntry {
    pub session_id: i64,
    pub session_name: Option<String>,
    pub date: String,
    pub sets: Vec<Set>,
}
