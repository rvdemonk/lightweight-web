package xyz.rigby3.lightweight.domain.calc

import kotlin.math.roundToLong

data class SetData(
    val weightKg: Double,
    val reps: Int,
    val rir: Int? = null,
)

/** Epley formula e1RM with optional RIR adjustment. */
fun e1rm(weightKg: Double, reps: Int, rir: Int? = null): Double {
    val effectiveReps = reps + (rir ?: 0)
    return weightKg * (1.0 + effectiveReps / 30.0)
}

/** Round to 1 decimal place. */
fun round1(value: Double): Double =
    (value * 10.0).roundToLong() / 10.0

/** Best e1RM from a collection of sets. Null if empty. */
fun bestE1rm(sets: List<SetData>): Double? {
    if (sets.isEmpty()) return null
    return sets.maxOf { e1rm(it.weightKg, it.reps, it.rir) }
}

/** Percentage change. Null if previous is zero. */
fun pctChange(current: Double, previous: Double): Double? {
    if (previous == 0.0) return null
    return ((current - previous) / previous) * 100.0
}
