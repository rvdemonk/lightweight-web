package xyz.rigby3.lightweight.domain.calc

enum class Trend {
    Up, Down, Flat;

    fun asStr(): String = name.lowercase()
}

/**
 * Filter out deload sessions from an e1RM series (ordered most recent first).
 * Deload = e1RM < 85% of series max. Returns at most 4 values.
 * Falls back to unfiltered if filtering leaves < 3.
 */
fun filterDeloads(e1rms: List<Double>): List<Double> {
    if (e1rms.size < 3) return e1rms.toList()

    val max = e1rms.max()
    val threshold = max * 0.85
    val filtered = e1rms.filter { it >= threshold }

    return if (filtered.size < 3) {
        e1rms.toList()
    } else {
        filtered.take(4)
    }
}

/**
 * Compute trend from session e1RMs (ordered most recent first).
 * Requires >= 3 points. Compares avg of last 2 vs avg of prior.
 * Up (>2%), Down (<-2%), Flat otherwise. Null if insufficient data.
 */
fun computeTrend(e1rms: List<Double>): Trend? {
    if (e1rms.size < 3) return null

    val recentAvg = (e1rms[0] + e1rms[1]) / 2.0
    val prior = e1rms.subList(2, e1rms.size)
    val priorAvg = prior.sum() / prior.size

    if (priorAvg == 0.0) return null

    val pct = (recentAvg - priorAvg) / priorAvg
    return when {
        pct > 0.02 -> Trend.Up
        pct < -0.02 -> Trend.Down
        else -> Trend.Flat
    }
}
