package xyz.rigby3.lightweight.domain.model

data class Exercise(
    val id: Long,
    val name: String,
    val muscleGroup: String?,
    val equipment: String?,
)
