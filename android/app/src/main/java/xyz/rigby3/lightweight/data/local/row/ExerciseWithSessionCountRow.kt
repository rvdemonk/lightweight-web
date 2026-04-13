package xyz.rigby3.lightweight.data.local.row

import androidx.room.ColumnInfo

data class ExerciseWithSessionCountRow(
    @ColumnInfo(name = "id") val id: Long,
    @ColumnInfo(name = "name") val name: String,
    @ColumnInfo(name = "muscle_group") val muscleGroup: String?,
    @ColumnInfo(name = "session_count") val sessionCount: Int,
)
