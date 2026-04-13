package xyz.rigby3.lightweight.domain.model

data class Session(
    val id: Long,
    val templateId: Long?,
    val templateName: String?,
    val name: String,
    val startedAt: String,
    val endedAt: String?,
    val pausedDuration: Int,
    val notes: String?,
    val status: String,
    val templateVersion: Int?,
    val exercises: List<SessionExercise>,
)

data class SessionExercise(
    val id: Long,
    val exerciseId: Long,
    val exerciseName: String,
    val position: Int,
    val notes: String?,
    val sets: List<WorkoutSet>,
)

data class WorkoutSet(
    val id: Long,
    val setNumber: Int,
    val weightKg: Double?,
    val reps: Int?,
    val setType: String,
    val rir: Int?,
    val completedAt: String?,
)
