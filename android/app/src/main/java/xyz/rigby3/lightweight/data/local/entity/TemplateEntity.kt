package xyz.rigby3.lightweight.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "templates",
    indices = [Index(value = ["user_id", "name"], unique = true)]
)
data class TemplateEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0L,

    @ColumnInfo(name = "user_id")
    val userId: Long,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "notes")
    val notes: String? = null,

    @ColumnInfo(name = "archived")
    val archived: Boolean = false,

    @ColumnInfo(name = "created_at")
    val createdAt: String,

    @ColumnInfo(name = "updated_at")
    val updatedAt: String,

    @ColumnInfo(name = "version")
    val version: Int = 1
)
