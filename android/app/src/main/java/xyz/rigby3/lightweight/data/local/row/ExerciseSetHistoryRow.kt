package xyz.rigby3.lightweight.data.local.row

import androidx.room.ColumnInfo

/** For PR detection: all historical sets for an exercise, chronological. */
data class ExerciseSetHistoryRow(
    @ColumnInfo(name = "set_number") val setNumber: Int,
    @ColumnInfo(name = "weight_kg") val weightKg: Double,
    @ColumnInfo(name = "reps") val reps: Int,
    @ColumnInfo(name = "rir") val rir: Int?,
    @ColumnInfo(name = "date") val date: String,
)
