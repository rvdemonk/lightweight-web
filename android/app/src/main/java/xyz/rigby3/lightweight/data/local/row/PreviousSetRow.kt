package xyz.rigby3.lightweight.data.local.row

import androidx.room.ColumnInfo

data class PreviousSetRow(
    @ColumnInfo(name = "weight_kg") val weightKg: Double?,
    @ColumnInfo(name = "reps") val reps: Int?,
    @ColumnInfo(name = "rir") val rir: Int?,
    @ColumnInfo(name = "set_number") val setNumber: Int,
)
