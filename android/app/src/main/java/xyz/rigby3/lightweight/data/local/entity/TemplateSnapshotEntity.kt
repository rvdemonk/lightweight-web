package xyz.rigby3.lightweight.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "template_snapshots",
    indices = [Index(value = ["template_id", "version"], unique = true)],
    foreignKeys = [
        ForeignKey(
            entity = TemplateEntity::class,
            parentColumns = ["id"],
            childColumns = ["template_id"],
            onDelete = ForeignKey.CASCADE
        )
    ]
)
data class TemplateSnapshotEntity(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "id")
    val id: Long = 0L,

    @ColumnInfo(name = "template_id", index = true)
    val templateId: Long,

    @ColumnInfo(name = "version")
    val version: Int,

    @ColumnInfo(name = "snapshot_json")
    val snapshotJson: String,

    @ColumnInfo(name = "created_at")
    val createdAt: String
)
