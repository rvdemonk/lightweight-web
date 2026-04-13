package xyz.rigby3.lightweight.ui.screens.analytics

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import xyz.rigby3.lightweight.ui.chart.ChartColors
import xyz.rigby3.lightweight.ui.chart.ChartDefaults
import xyz.rigby3.lightweight.ui.chart.ChartPalette
import xyz.rigby3.lightweight.ui.chart.ChartTextStyles
import xyz.rigby3.lightweight.ui.chart.monotoneCubicPath
import xyz.rigby3.lightweight.ui.chart.niceTicks
import xyz.rigby3.lightweight.ui.theme.DataFamily
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.roundToInt

@Composable
fun E1rmComparisonChart(
    series: List<ComparisonSeries>,
    colors: ChartColors,
    textStyles: ChartTextStyles,
    modifier: Modifier = Modifier,
) {
    val density = LocalDensity.current
    val textMeasurer = rememberTextMeasurer()
    val chartHeight = 380.dp

    val leftPad = with(density) { 36.dp.toPx() }
    val rightPad = with(density) { 80.dp.toPx() }  // room for end labels
    val xAxisHeight = with(density) { ChartDefaults.XAxisHeight.toPx() }
    val topInset = with(density) { 16.dp.toPx() }
    val gridStroke = with(density) { ChartDefaults.GridStrokeWidth.toPx() }
    val dataStroke = with(density) { 2.5.dp.toPx() }
    val dotRadius = with(density) { 4.dp.toPx() }

    // Normalize: % change from origin
    val normalizedSeries = remember(series) {
        series.map { s ->
            val origin = s.points.firstOrNull()?.e1rm ?: 1.0
            val points = s.points.map { pt -> pt.date to ((pt.e1rm - origin) / origin * 100.0).toFloat() }
            val finalPct = points.lastOrNull()?.second ?: 0f
            Triple(s, points, finalPct)
        }.sortedByDescending { it.third } // sorted by final % for label ordering
    }

    // Stable index mapping: original series index for color
    val colorIndices = remember(series) {
        series.mapIndexed { i, s -> s.exerciseId to i }.toMap()
    }

    // Y range
    val allNorm = remember(normalizedSeries) { normalizedSeries.flatMap { it.second.map { p -> p.second } } }
    val rawMin = remember(allNorm) { allNorm.minOrNull() ?: 0f }
    val rawMax = remember(allNorm) { allNorm.maxOrNull() ?: 10f }
    val yPad = remember(rawMin, rawMax) { ((rawMax - rawMin) * 0.1f).coerceAtLeast(2f) }
    val yMin = remember(rawMin, yPad) { floor((rawMin - yPad) / 5f) * 5f }
    val yMax = remember(rawMax, yPad) { ceil((rawMax + yPad) / 5f) * 5f }
    val yTicks = remember(yMin, yMax) { niceTicks(yMin, yMax, 5) }
    val yRange = yMin..(yTicks.lastOrNull() ?: yMax)

    // X range
    val allPoints = remember(series) { series.flatMap { it.points } }
    val firstDate = remember(allPoints) {
        allPoints.minByOrNull { it.date }?.let { LocalDate.parse(it.date) } ?: LocalDate.now()
    }
    val lastDate = remember(allPoints) {
        val dataLast = allPoints.maxByOrNull { it.date }?.let { LocalDate.parse(it.date) } ?: LocalDate.now()
        maxOf(dataLast, LocalDate.now())
    }
    val totalDays = remember(firstDate, lastDate) {
        ChronoUnit.DAYS.between(firstDate, lastDate).toFloat().coerceAtLeast(1f)
    }
    val xRange = 0f..totalDays

    val gridLabels = remember(firstDate, lastDate, totalDays) {
        val intervalDays = when {
            totalDays < 60 -> 14; totalDays < 120 -> 21; totalDays < 240 -> 30; else -> 60
        }
        val formatter = DateTimeFormatter.ofPattern("d/M")
        val labels = mutableListOf<Pair<Float, String>>()
        var d = firstDate
        while (!d.isAfter(lastDate)) {
            labels.add(ChronoUnit.DAYS.between(firstDate, d).toFloat() to d.format(formatter))
            d = d.plusDays(intervalDays.toLong())
        }
        labels
    }

    if (allPoints.isEmpty()) return

    // Label style for end-of-line labels
    val labelStyle = remember {
        androidx.compose.ui.text.TextStyle(
            fontFamily = DataFamily,
            fontSize = 11.sp,
            fontWeight = FontWeight.W600,
        )
    }

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(chartHeight),
    ) {
        val viewportLeft = leftPad
        val viewportRight = size.width - rightPad
        val viewportTop = topInset
        val viewportBottom = size.height - xAxisHeight
        val viewportWidth = viewportRight - viewportLeft
        val viewportHeight = viewportBottom - viewportTop

        fun mapX(dayOffset: Float): Float {
            val span = xRange.endInclusive - xRange.start
            if (span == 0f) return viewportLeft
            return viewportLeft + ((dayOffset - xRange.start) / span) * viewportWidth
        }
        fun mapY(value: Float): Float {
            val span = yRange.endInclusive - yRange.start
            if (span == 0f) return viewportBottom
            return viewportBottom - ((value - yRange.start) / span) * viewportHeight
        }

        // Faint horizontal grid lines only (no vertical)
        for (tick in yTicks) {
            val y = mapY(tick)
            drawLine(colors.grid.copy(alpha = 0.12f), Offset(viewportLeft, y), Offset(viewportRight, y), gridStroke)
            val sign = if (tick > 0) "+" else ""
            val label = "$sign${tick.roundToInt()}%"
            val measured = textMeasurer.measure(label, textStyles.axisLabel)
            drawText(measured, topLeft = Offset(viewportLeft - measured.size.width - 6f, y - measured.size.height / 2f))
        }

        // Subtle x-axis date labels (no grid lines)
        for ((dayOffset, label) in gridLabels) {
            val x = mapX(dayOffset)
            if (x < viewportLeft || x > viewportRight) continue
            val measured = textMeasurer.measure(label, textStyles.axisLabel)
            val labelX = x - measured.size.width / 2f
            if (labelX >= viewportLeft - 4f) {
                drawText(measured, topLeft = Offset(labelX, viewportBottom + 4f))
            }
        }

        // Draw each series: smooth line + highlighted end dot
        normalizedSeries.forEach { (s, points, finalPct) ->
            if (points.size < 2) return@forEach
            val seriesIdx = colorIndices[s.exerciseId] ?: 0
            val lineColor = ChartPalette.seriesColor(seriesIdx)

            val offsets = points.map { (date, pct) ->
                val dayOff = ChronoUnit.DAYS.between(firstDate, LocalDate.parse(date)).toFloat()
                Offset(mapX(dayOff), mapY(pct))
            }

            // Smooth spline path
            val path = monotoneCubicPath(offsets)
            drawPath(path, lineColor.copy(alpha = 0.7f), style = Stroke(width = dataStroke, cap = StrokeCap.Round))

            // Highlighted end dot
            val endPt = offsets.last()
            drawCircle(lineColor, dotRadius, endPt)
        }

        // End labels: drawn right of the end dot, sorted by finalPct descending
        // Vertically spaced to avoid overlap
        val labelHeight = with(density) { 14.dp.toPx() }
        val endLabelX = viewportRight + with(density) { 6.dp.toPx() }

        // Collect desired Y positions, then resolve overlaps
        val desiredPositions = normalizedSeries.map { (s, points, finalPct) ->
            val lastPt = points.lastOrNull()
            val y = if (lastPt != null) mapY(lastPt.second) else viewportBottom
            Triple(s, finalPct, y)
        }

        // Simple overlap resolution: push labels apart
        val resolvedY = desiredPositions.map { it.third }.toMutableList()
        for (pass in 0..5) {
            for (i in 1 until resolvedY.size) {
                val gap = resolvedY[i] - resolvedY[i - 1]
                if (gap < labelHeight && gap > -labelHeight) {
                    val push = (labelHeight - gap.coerceAtLeast(-labelHeight)) / 2f
                    resolvedY[i - 1] -= push
                    resolvedY[i] += push
                }
            }
        }

        desiredPositions.forEachIndexed { i, (s, finalPct, _) ->
            val seriesIdx = colorIndices[s.exerciseId] ?: 0
            val lineColor = ChartPalette.seriesColor(seriesIdx)
            val sign = if (finalPct >= 0) "+" else ""
            val abbrev = abbreviate(s.exerciseName)
            val text = "$sign${finalPct.roundToInt()}% $abbrev"
            val measured = textMeasurer.measure(
                text,
                labelStyle.copy(color = lineColor),
            )
            drawText(measured, topLeft = Offset(endLabelX, resolvedY[i] - measured.size.height / 2f))
        }
    }
}

/** "Incline Barbell Bench" → "IBB", "DB Curls" → "DBC" */
private fun abbreviate(name: String): String {
    val words = name.split(" ").filter { it.isNotBlank() }
    return if (words.size <= 2) {
        // Short name: take first 3 chars
        name.take(3).uppercase()
    } else {
        words.map { it.first().uppercaseChar() }.joinToString("")
    }
}
