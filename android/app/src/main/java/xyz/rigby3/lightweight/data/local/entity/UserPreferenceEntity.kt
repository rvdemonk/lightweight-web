package xyz.rigby3.lightweight.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity

@Entity(
    tableName = "user_preferences",
    primaryKeys = ["user_id", "key"]
)
data class UserPreferenceEntity(
    @ColumnInfo(name = "user_id")
    val userId: Long,

    @ColumnInfo(name = "key")
    val key: String,

    @ColumnInfo(name = "value")
    val value: String
)
