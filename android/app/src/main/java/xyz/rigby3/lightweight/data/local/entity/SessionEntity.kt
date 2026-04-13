package xyz.rigby3.lightweight.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sessions")
data class SessionEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0L,

    @ColumnInfo(name = "user_id")
    val userId: Long,

    @ColumnInfo(name = "template_id")
    val templateId: Long? = null,

    @ColumnInfo(name = "name")
    val name: String,

    @ColumnInfo(name = "started_at")
    val startedAt: String,

    @ColumnInfo(name = "ended_at")
    val endedAt: String? = null,

    @ColumnInfo(name = "paused_duration")
    val pausedDuration: Int = 0,

    @ColumnInfo(name = "notes")
    val notes: String? = null,

    @ColumnInfo(name = "status")
    val status: String = "active",

    @ColumnInfo(name = "template_version")
    val templateVersion: Int? = null
)
