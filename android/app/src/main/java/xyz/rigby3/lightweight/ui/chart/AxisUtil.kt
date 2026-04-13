package xyz.rigby3.lightweight.ui.chart

import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.log10
import kotlin.math.pow

/**
 * Find the nearest "nice" step size (1, 2, or 5 × 10^n) for axis ticks.
 * [range] is the data range (max - min), [targetTicks] is the desired number of ticks.
 */
fun niceStep(range: Float, targetTicks: Int): Float {
    if (range <= 0f || targetTicks <= 0) return 1f
    val rough = range / targetTicks
    val magnitude = 10f.pow(floor(log10(rough)))
    val normalized = rough / magnitude
    val nice = when {
        normalized <= 1.5f -> 1f
        normalized <= 3.5f -> 2f
        normalized <= 7.5f -> 5f
        else -> 10f
    }
    return nice * magnitude
}

/**
 * Generate a list of "nice" tick values spanning [min]..[max].
 */
fun niceTicks(min: Float, max: Float, targetTicks: Int): List<Float> {
    val step = niceStep(max - min, targetTicks)
    val start = floor(min / step) * step
    val ticks = mutableListOf<Float>()
    var v = start
    while (v <= max + step * 0.001f) {
        ticks.add(v)
        v += step
    }
    return ticks
}

private val monthDayFormatter = DateTimeFormatter.ofPattern("MMM d")

/** Format a date as "Mar 17" style for axis labels. */
fun weekLabel(date: LocalDate): String = date.format(monthDayFormatter)

/**
 * Generate evenly spaced date labels that don't overcrowd.
 * Returns pairs of (date, formatted label).
 */
fun dateLabels(start: LocalDate, end: LocalDate, maxLabels: Int): List<Pair<LocalDate, String>> {
    val totalDays = ChronoUnit.DAYS.between(start, end).toInt()
    if (totalDays <= 0 || maxLabels <= 0) return emptyList()

    val step = maxOf(1, ceil(totalDays.toFloat() / maxLabels).toInt())
    val labels = mutableListOf<Pair<LocalDate, String>>()
    var d = start
    while (!d.isAfter(end)) {
        labels.add(d to weekLabel(d))
        d = d.plusDays(step.toLong())
    }
    return labels
}
