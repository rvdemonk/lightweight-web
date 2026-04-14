package xyz.rigby3.lightweight.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ExerciseDto(
    val id: Long,
    val name: String,
    @SerialName("muscle_group") val muscleGroup: String? = null,
    val equipment: String? = null,
    val notes: String? = null,
    val archived: Boolean = false,
    @SerialName("created_at") val createdAt: String,
)

@Serializable
data class TemplateDto(
    val id: Long,
    val name: String,
    val notes: String? = null,
    val archived: Boolean = false,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
    val version: Int = 1,
    val exercises: List<TemplateExerciseDto> = emptyList(),
)

@Serializable
data class TemplateExerciseDto(
    val id: Long,
    @SerialName("exercise_id") val exerciseId: Long,
    @SerialName("exercise_name") val exerciseName: String,
    val position: Int,
    @SerialName("target_sets") val targetSets: Int? = null,
    @SerialName("target_reps_min") val targetRepsMin: Int? = null,
    @SerialName("target_reps_max") val targetRepsMax: Int? = null,
    @SerialName("rest_seconds") val restSeconds: Int? = null,
    val notes: String? = null,
)

@Serializable
data class SessionSummaryDto(
    val id: Long,
    @SerialName("template_id") val templateId: Long? = null,
    @SerialName("template_name") val templateName: String? = null,
    val name: String? = null,
    @SerialName("started_at") val startedAt: String,
    @SerialName("ended_at") val endedAt: String? = null,
    val status: String,
    @SerialName("set_count") val setCount: Long = 0,
    @SerialName("exercise_count") val exerciseCount: Long = 0,
    @SerialName("target_set_count") val targetSetCount: Long? = null,
    @SerialName("template_version") val templateVersion: Int? = null,
)

@Serializable
data class SessionDto(
    val id: Long,
    @SerialName("template_id") val templateId: Long? = null,
    @SerialName("template_name") val templateName: String? = null,
    val name: String? = null,
    @SerialName("started_at") val startedAt: String,
    @SerialName("ended_at") val endedAt: String? = null,
    @SerialName("paused_duration") val pausedDuration: Long = 0,
    val notes: String? = null,
    val status: String,
    @SerialName("template_version") val templateVersion: Int? = null,
    val exercises: List<SessionExerciseDto> = emptyList(),
)

@Serializable
data class SessionExerciseDto(
    val id: Long,
    @SerialName("exercise_id") val exerciseId: Long,
    @SerialName("exercise_name") val exerciseName: String,
    val position: Int,
    val notes: String? = null,
    val sets: List<SetDto> = emptyList(),
)

@Serializable
data class SetDto(
    val id: Long,
    @SerialName("session_exercise_id") val sessionExerciseId: Long,
    @SerialName("set_number") val setNumber: Int,
    @SerialName("weight_kg") val weightKg: Double? = null,
    val reps: Int,
    @SerialName("set_type") val setType: String = "working",
    val rir: Int? = null,
    @SerialName("completed_at") val completedAt: String? = null,
)

// -- Sync (push to server) --

@Serializable
data class CreateSessionDto(
    @SerialName("template_id") val templateId: Long? = null,
    val name: String? = null,
    @SerialName("started_at") val startedAt: String? = null,
    @SerialName("ended_at") val endedAt: String? = null,
    val status: String? = null,
    val notes: String? = null,
    @SerialName("paused_duration") val pausedDuration: Long? = null,
)

@Serializable
data class AddSessionExerciseDto(
    @SerialName("exercise_id") val exerciseId: Long,
    val position: Int? = null,
    val notes: String? = null,
)

@Serializable
data class CreateSetDto(
    @SerialName("weight_kg") val weightKg: Double? = null,
    val reps: Int,
    @SerialName("set_type") val setType: String? = null,
    val rir: Int? = null,
)
