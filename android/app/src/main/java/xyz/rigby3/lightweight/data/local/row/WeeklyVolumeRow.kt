package xyz.rigby3.lightweight.data.local.row

import androidx.room.ColumnInfo

data class WeeklyVolumeRow(
    @ColumnInfo(name = "week") val week: String,
    @ColumnInfo(name = "muscle_group") val muscleGroup: String,
    @ColumnInfo(name = "set_count") val setCount: Int,
)
