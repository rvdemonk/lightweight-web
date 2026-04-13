package xyz.rigby3.lightweight.domain.model

data class Template(
    val id: Long,
    val name: String,
    val notes: String?,
    val version: Int,
    val exercises: List<TemplateExercise>,
)

data class TemplateExercise(
    val id: Long,
    val exerciseId: Long,
    val exerciseName: String,
    val position: Int,
    val targetSets: Int?,
    val targetRepsMin: Int?,
    val targetRepsMax: Int?,
    val restSeconds: Int?,
    val notes: String?,
)
