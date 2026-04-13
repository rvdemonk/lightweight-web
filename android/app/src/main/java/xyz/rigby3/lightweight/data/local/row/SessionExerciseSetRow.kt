package xyz.rigby3.lightweight.data.local.row

import androidx.room.ColumnInfo

/** Raw row from session exercise + sets join query. Repository maps to domain model. */
data class SessionExerciseSetRow(
    @ColumnInfo(name = "se_id") val seId: Long,
    @ColumnInfo(name = "exercise_id") val exerciseId: Long,
    @ColumnInfo(name = "exercise_name") val exerciseName: String,
    @ColumnInfo(name = "position") val position: Int,
    @ColumnInfo(name = "se_notes") val seNotes: String?,
    @ColumnInfo(name = "set_id") val setId: Long?,
    @ColumnInfo(name = "set_number") val setNumber: Int?,
    @ColumnInfo(name = "weight_kg") val weightKg: Double?,
    @ColumnInfo(name = "reps") val reps: Int?,
    @ColumnInfo(name = "set_type") val setType: String?,
    @ColumnInfo(name = "rir") val rir: Int?,
    @ColumnInfo(name = "completed_at") val completedAt: String?,
)
