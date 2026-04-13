package xyz.rigby3.lightweight.data.local.row

import androidx.room.ColumnInfo

data class AllExerciseSetRow(
    @ColumnInfo(name = "exercise_id") val exerciseId: Long,
    @ColumnInfo(name = "exercise_name") val exerciseName: String,
    @ColumnInfo(name = "muscle_group") val muscleGroup: String?,
    @ColumnInfo(name = "set_number") val setNumber: Int,
    @ColumnInfo(name = "weight_kg") val weightKg: Double,
    @ColumnInfo(name = "reps") val reps: Int,
    @ColumnInfo(name = "rir") val rir: Int?,
    @ColumnInfo(name = "date") val date: String,
)
