package xyz.rigby3.lightweight.data.local.row

import androidx.room.ColumnInfo

/** Template exercise joined with exercise name. */
data class TemplateExerciseRow(
    @ColumnInfo(name = "id") val id: Long,
    @ColumnInfo(name = "exercise_id") val exerciseId: Long,
    @ColumnInfo(name = "exercise_name") val exerciseName: String,
    @ColumnInfo(name = "position") val position: Int,
    @ColumnInfo(name = "target_sets") val targetSets: Int?,
    @ColumnInfo(name = "target_reps_min") val targetRepsMin: Int?,
    @ColumnInfo(name = "target_reps_max") val targetRepsMax: Int?,
    @ColumnInfo(name = "rest_seconds") val restSeconds: Int?,
    @ColumnInfo(name = "notes") val notes: String?,
)
