package xyz.rigby3.lightweight.data.local.row

import androidx.room.ColumnInfo

data class WeeklyFrequencyRow(
    @ColumnInfo(name = "week") val week: String,
    @ColumnInfo(name = "session_count") val sessionCount: Int,
)
