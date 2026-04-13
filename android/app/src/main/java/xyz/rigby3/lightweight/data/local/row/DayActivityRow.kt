package xyz.rigby3.lightweight.data.local.row

import androidx.room.ColumnInfo

data class DayActivityRow(
    @ColumnInfo(name = "date") val date: String,
    @ColumnInfo(name = "set_count") val setCount: Int,
)
