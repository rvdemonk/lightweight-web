package xyz.rigby3.lightweight.domain.util

import xyz.rigby3.lightweight.data.local.row.ExerciseSetHistoryRow
import kotlin.math.ceil
import kotlin.math.max

/**
 * Epley formula: weight × (1 + effectiveReps / 30)
 * RIR adds to effective reps for a more accurate estimate.
 */
fun calcE1rm(weightKg: Double, reps: Int, rir: Int? = null): Double {
    val effectiveReps = reps + (rir ?: 0)
    return weightKg * (1.0 + effectiveReps / 30.0)
}

/**
 * Historical bests for an exercise, computed from all completed sets.
 * Returns best e1RM ever and best e1RM per set position.
 */
data class ExercisePRData(
    val bestE1rmEver: Double?,
    val bestE1rmByPosition: Map<Int, Double>,
)

fun historicalBests(sets: List<ExerciseSetHistoryRow>): ExercisePRData {
    var bestEver: Double? = null
    val bestByPosition = mutableMapOf<Int, Double>()

    for (set in sets) {
        if (set.weightKg <= 0 || set.reps <= 0) continue

        val e1rm = calcE1rm(set.weightKg, set.reps, set.rir)

        if (bestEver == null || e1rm > bestEver) {
            bestEver = e1rm
        }

        val positionBest = bestByPosition[set.setNumber]
        if (positionBest == null || e1rm > positionBest) {
            bestByPosition[set.setNumber] = e1rm
        }
    }

    return ExercisePRData(bestEver, bestByPosition)
}

/**
 * Progression target: reps needed at a given weight to beat a target e1RM.
 */
data class ProgressionTarget(
    val weight: Double,
    val repsNeeded: Int,
    val isCurrentWeight: Boolean,
)

fun progressionTargets(
    targetE1rm: Double,
    currentWeight: Double,
    increment: Double = 2.5,
    maxReps: Int = 30,
    stepsBelow: Int = 1,
    stepsAbove: Int = 3,
): List<ProgressionTarget> {
    if (targetE1rm <= 0 || currentWeight <= 0) return emptyList()

    val results = mutableListOf<ProgressionTarget>()

    for (step in -stepsBelow..stepsAbove) {
        val weight = currentWeight + step * increment
        if (weight <= 0) continue

        // reps to strictly beat: weight * (1 + reps/30) > targetE1rm
        // reps > (targetE1rm/weight - 1) * 30
        val exactRepsToBeat = (targetE1rm / weight - 1.0) * 30.0
        val repsNeeded = max(1, ceil(exactRepsToBeat + 0.001).toInt())

        if (repsNeeded > maxReps) continue

        results.add(
            ProgressionTarget(
                weight = weight,
                repsNeeded = repsNeeded,
                isCurrentWeight = step == 0,
            )
        )
    }

    return results
}

/**
 * Get progression targets for a specific set position.
 */
fun setProgressionTargets(
    prData: ExercisePRData?,
    setNumber: Int,
    currentWeight: Double,
    stepsBelow: Int = 1,
    stepsAbove: Int = 3,
): List<ProgressionTarget> {
    if (prData == null) return emptyList()
    val targetE1rm = prData.bestE1rmByPosition[setNumber] ?: return emptyList()
    return progressionTargets(targetE1rm, currentWeight, stepsBelow = stepsBelow, stepsAbove = stepsAbove)
}

enum class PRBadge { ABSOLUTE, SET }

/**
 * Check if a logged set is a PR compared to historical bests.
 */
fun getPRBadge(
    weightKg: Double?,
    reps: Int?,
    rir: Int?,
    setNumber: Int,
    prData: ExercisePRData?,
): PRBadge? {
    if (prData == null || weightKg == null || weightKg <= 0 || reps == null || reps <= 0) return null

    val e1rm = calcE1rm(weightKg, reps, rir)

    // Absolute PR: beats all-time best (or first ever set)
    if (prData.bestE1rmEver == null || e1rm > prData.bestE1rmEver) return PRBadge.ABSOLUTE

    // Set position PR: beats best at this set number (or first at this position)
    val positionBest = prData.bestE1rmByPosition[setNumber]
    if (positionBest == null || e1rm > positionBest) return PRBadge.SET

    return null
}
