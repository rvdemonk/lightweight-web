package xyz.rigby3.lightweight.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.PrimaryKey

@Entity(
    tableName = "session_exercises",
    foreignKeys = [
        ForeignKey(
            entity = SessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["session_id"],
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
data class SessionExerciseEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0L,

    @ColumnInfo(name = "session_id", index = true)
    val sessionId: Long,

    @ColumnInfo(name = "exercise_id", index = true)
    val exerciseId: Long,

    @ColumnInfo(name = "position")
    val position: Int,

    @ColumnInfo(name = "notes")
    val notes: String? = null
)
