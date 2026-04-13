package xyz.rigby3.lightweight.domain.model

data class SessionSummary(
    val id: Long,
    val templateName: String?,
    val name: String,
    val startedAt: String,
    val endedAt: String?,
    val status: String,
    val exerciseCount: Int,
    val setCount: Int,
    val targetSetCount: Int?,
)
