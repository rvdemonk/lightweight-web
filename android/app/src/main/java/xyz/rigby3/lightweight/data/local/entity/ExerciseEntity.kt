package xyz.rigby3.lightweight.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "exercises",
    indices = [Index(value = ["user_id", "name"], unique = true)]
)
data class ExerciseEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0L,

    @ColumnInfo(name = "user_id")
    val userId: Long,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "muscle_group")
    val muscleGroup: String? = null,

    @ColumnInfo(name = "equipment")
    val equipment: String? = null,

    @ColumnInfo(name = "short_name")
    val shortName: String? = null,

    @ColumnInfo(name = "notes")
    val notes: String? = null,

    @ColumnInfo(name = "archived")
    val archived: Boolean = false,

    @ColumnInfo(name = "created_at")
    val createdAt: String
)
