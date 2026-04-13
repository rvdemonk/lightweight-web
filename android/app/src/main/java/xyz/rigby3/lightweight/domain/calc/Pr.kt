package xyz.rigby3.lightweight.domain.calc

data class TimedSet(
    val exerciseId: Long,
    val setNumber: Int,
    val weightKg: Double,
    val reps: Int,
    val rir: Int? = null,
    val date: String,
)

data class DayPR(
    val date: String,
    val hasAbsolutePr: Boolean,
    val hasSetPr: Boolean,
)

/**
 * Single-pass PR detection over chronologically-ordered sets.
 * Only reports PRs on or after [cutoffDate], but processes all sets for running bests.
 * First session ever for an exercise produces no PRs (requires prior history > 0).
 */
fun detectPrs(sets: List<TimedSet>, cutoffDate: String): List<DayPR> {
    val bestAbsolute = mutableMapOf<Long, Double>()
    val bestByPos = mutableMapOf<Long, MutableMap<Int, Double>>()
    val dayPrs = mutableMapOf<String, Pair<Boolean, Boolean>>()

    for (s in sets) {
        val e = e1rm(s.weightKg, s.reps, s.rir)

        val absBest = bestAbsolute.getOrPut(s.exerciseId) { 0.0 }
        val posMap = bestByPos.getOrPut(s.exerciseId) { mutableMapOf() }
        val posBest = posMap.getOrPut(s.setNumber) { 0.0 }

        if (s.date >= cutoffDate) {
            if (e > absBest && absBest > 0.0) {
                val entry = dayPrs.getOrPut(s.date) { false to false }
                dayPrs[s.date] = true to entry.second
            } else if (e > posBest && posBest > 0.0) {
                val entry = dayPrs.getOrPut(s.date) { false to false }
                dayPrs[s.date] = entry.first to true
            }
        }

        if (e > absBest) {
            bestAbsolute[s.exerciseId] = e
        }
        if (e > posBest) {
            posMap[s.setNumber] = e
        }
    }

    return dayPrs.entries
        .map { (date, flags) -> DayPR(date, flags.first, flags.second) }
        .sortedBy { it.date }
}

/**
 * All-time best e1RM and best per set_number for a single exercise's historical sets.
 * Values are rounded to 1 decimal place.
 */
fun historicalBests(sets: List<TimedSet>): Pair<Double?, Map<Int, Double>> {
    var bestEver: Double? = null
    val bestByPosition = mutableMapOf<Int, Double>()

    for (s in sets) {
        val e = e1rm(s.weightKg, s.reps, s.rir)

        if (bestEver == null || e > bestEver) {
            bestEver = e
        }

        val posBest = bestByPosition[s.setNumber] ?: 0.0
        if (e > posBest) {
            bestByPosition[s.setNumber] = e
        }
    }

    return Pair(
        bestEver?.let { round1(it) },
        bestByPosition.mapValues { round1(it.value) },
    )
}
