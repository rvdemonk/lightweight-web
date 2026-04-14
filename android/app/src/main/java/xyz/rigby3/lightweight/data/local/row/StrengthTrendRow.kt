package xyz.rigby3.lightweight.data.local.row

import androidx.room.ColumnInfo

data class StrengthTrendRow(
    @ColumnInfo(name = "exercise_id") val exerciseId: Long,
    @ColumnInfo(name = "exercise_name") val exerciseName: String,
    @ColumnInfo(name = "short_name") val shortName: String?,
    @ColumnInfo(name = "muscle_group") val muscleGroup: String,
    @ColumnInfo(name = "session_count") val sessionCount: Int,
    @ColumnInfo(name = "period") val period: String,
    @ColumnInfo(name = "best_e1rm") val bestE1rm: Double,
)
