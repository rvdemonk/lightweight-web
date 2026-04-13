package xyz.rigby3.lightweight.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.PrimaryKey

@Entity(
    tableName = "template_exercises",
    foreignKeys = [
        ForeignKey(
            entity = TemplateEntity::class,
            parentColumns = ["id"],
            childColumns = ["template_id"],
            onDelete = ForeignKey.CASCADE
        ),
        ForeignKey(
            entity = ExerciseEntity::class,
            parentColumns = ["id"],
            childColumns = ["exercise_id"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class TemplateExerciseEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0L,

    @ColumnInfo(name = "template_id", index = true)
    val templateId: Long,

    @ColumnInfo(name = "exercise_id", index = true)
    val exerciseId: Long,

    @ColumnInfo(name = "position")
    val position: Int,

    @ColumnInfo(name = "target_sets")
    val targetSets: Int? = null,

    @ColumnInfo(name = "target_reps_min")
    val targetRepsMin: Int? = null,

    @ColumnInfo(name = "target_reps_max")
    val targetRepsMax: Int? = null,

    @ColumnInfo(name = "rest_seconds")
    val restSeconds: Int? = null,

    @ColumnInfo(name = "notes")
    val notes: String? = null
)
