package xyz.rigby3.lightweight.data.local.row

import androidx.room.ColumnInfo

data class SessionSummaryRow(
    @ColumnInfo(name = "id") val id: Long,
    @ColumnInfo(name = "template_id") val templateId: Long?,
    @ColumnInfo(name = "name") val name: String,
    @ColumnInfo(name = "started_at") val startedAt: String,
    @ColumnInfo(name = "ended_at") val endedAt: String?,
    @ColumnInfo(name = "status") val status: String,
    @ColumnInfo(name = "exercise_count") val exerciseCount: Int,
    @ColumnInfo(name = "set_count") val setCount: Int,
)
