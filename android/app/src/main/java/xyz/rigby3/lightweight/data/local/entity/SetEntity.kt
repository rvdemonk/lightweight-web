package xyz.rigby3.lightweight.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "sets",
    indices = [Index(value = ["session_exercise_id", "set_number"], unique = true)],
    foreignKeys = [
        ForeignKey(
            entity = SessionExerciseEntity::class,
            parentColumns = ["id"],
            childColumns = ["session_exercise_id"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class SetEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0L,

    @ColumnInfo(name = "session_exercise_id", index = true)
    val sessionExerciseId: Long,

    @ColumnInfo(name = "set_number")
    val setNumber: Int,

    @ColumnInfo(name = "weight_kg")
    val weightKg: Double? = null,

    @ColumnInfo(name = "reps")
    val reps: Int? = null,

    @ColumnInfo(name = "set_type")
    val setType: String = "working",

    @ColumnInfo(name = "rir")
    val rir: Int? = null,

    @ColumnInfo(name = "completed_at")
    val completedAt: String? = null
)
