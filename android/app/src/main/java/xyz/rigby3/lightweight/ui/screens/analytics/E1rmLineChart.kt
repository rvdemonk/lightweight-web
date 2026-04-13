package xyz.rigby3.lightweight.ui.screens.analytics

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import xyz.rigby3.lightweight.ui.chart.ChartColors
import xyz.rigby3.lightweight.ui.chart.ChartDefaults
import xyz.rigby3.lightweight.ui.chart.ChartTextStyles
import xyz.rigby3.lightweight.ui.chart.computeViewport
import xyz.rigby3.lightweight.ui.chart.niceTicks
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.roundToInt

@Composable
fun E1rmLineChart(
    dataPoints: List<E1rmDataPoint>,
    rollingBest: List<E1rmDataPoint>,
    colors: ChartColors,
    textStyles: ChartTextStyles,
    modifier: Modifier = Modifier,
) {
    val density = LocalDensity.current
    val textMeasurer = rememberTextMeasurer()
    val chartHeight = 380.dp

    val yAxisWidth = with(density) { ChartDefaults.YAxisWidth.toPx() }
    val xAxisHeight = with(density) { ChartDefaults.XAxisHeight.toPx() }
    val topInset = with(density) { 24.dp.toPx() }  // extra room for KG label
    val contentInset = with(density) { ChartDefaults.ContentInset.toPx() }
    val gridStroke = with(density) { ChartDefaults.GridStrokeWidth.toPx() }
    val dataStroke = with(density) { ChartDefaults.DataStrokeWidth.toPx() }
    val pointRadius = with(density) { ChartDefaults.PointRadius.toPx() }

    // Pre-compute data ranges
    val e1rms = remember(dataPoints) { dataPoints.map { it.e1rm.toFloat() } }
    val rawMin = remember(e1rms) { e1rms.minOrNull() ?: 0f }
    val rawMax = remember(e1rms) { e1rms.maxOrNull() ?: 100f }
    val rangePad = remember(rawMin, rawMax) { ((rawMax - rawMin) * 0.1f).coerceAtLeast(5f) }
    val yMin = remember(rawMin, rangePad) { floor((rawMin - rangePad) / 5f) * 5f }
    val yMax = remember(rawMax, rangePad) { ceil((rawMax + rangePad) / 5f) * 5f }
    val yTicks = remember(yMin, yMax) { niceTicks(yMin, yMax, 5) }
    val yRange = yMin..yMax

    // Date range: first data point to today
    val firstDate = remember(dataPoints) {
        if (dataPoints.isEmpty()) LocalDate.now() else LocalDate.parse(dataPoints.first().date)
    }
    val lastDate = remember(dataPoints) {
        val dataLast = if (dataPoints.isEmpty()) LocalDate.now()
        else LocalDate.parse(dataPoints.last().date)
        maxOf(dataLast, LocalDate.now())
    }
    val totalDays = remember(firstDate, lastDate) {
        ChronoUnit.DAYS.between(firstDate, lastDate).toFloat().coerceAtLeast(1f)
    }
    val xRange = 0f..totalDays

    // Grid date labels — d/M format, less frequent
    val gridLabels = remember(firstDate, lastDate, totalDays) {
        val intervalDays = when {
            totalDays < 60 -> 14
            totalDays < 120 -> 21
            totalDays < 240 -> 30
            else -> 60
        }
        val formatter = DateTimeFormatter.ofPattern("d/M")
        val labels = mutableListOf<Pair<Float, String>>()
        var d = firstDate
        while (!d.isAfter(lastDate)) {
            val dayOffset = ChronoUnit.DAYS.between(firstDate, d).toFloat()
            labels.add(dayOffset to d.format(formatter))
            d = d.plusDays(intervalDays.toLong())
        }
        labels
    }

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(chartHeight),
    ) {
        val viewport = computeViewport(size, yAxisWidth, xAxisHeight, topInset)

        // Horizontal grid lines + Y-axis labels (unit embedded in top tick)
        for ((index, tick) in yTicks.withIndex()) {
            val y = viewport.mapY(tick, yRange)
            drawLine(
                color = colors.grid,
                start = Offset(viewport.left, y),
                end = Offset(viewport.right, y),
                strokeWidth = gridStroke,
            )
            val label = if (index == yTicks.lastIndex) "${tick.roundToInt()} kg" else tick.roundToInt().toString()
            val measured = textMeasurer.measure(label, textStyles.axisLabel)
            drawText(
                textLayoutResult = measured,
                topLeft = Offset(viewport.left - measured.size.width - 6f, y - measured.size.height / 2f),
            )
        }

        // Vertical grid lines + X-axis labels
        for ((dayOffset, label) in gridLabels) {
            val x = viewport.mapX(dayOffset, xRange)
            if (x < viewport.left || x > viewport.right) continue
            drawLine(
                color = colors.grid,
                start = Offset(x, viewport.top),
                end = Offset(x, viewport.bottom),
                strokeWidth = gridStroke,
            )
            val measured = textMeasurer.measure(label, textStyles.axisLabel)
            val labelX = x - measured.size.width / 2f
            // Skip label if it would overlap the Y-axis gutter
            if (labelX >= viewport.left - 4f) {
                drawText(
                    textLayoutResult = measured,
                    topLeft = Offset(labelX, viewport.bottom + 4f),
                )
            }
        }

        // Helper to convert a data point to canvas offset
        fun dataToOffset(pt: E1rmDataPoint): Offset {
            val dayOffset = ChronoUnit.DAYS.between(firstDate, LocalDate.parse(pt.date)).toFloat()
            return viewport.mapPoint(dayOffset, pt.e1rm.toFloat(), xRange, yRange)
        }

        // Rolling best line (amber) — extended to today
        if (rollingBest.size >= 2) {
            val rollingPath = Path()
            val firstOffset = dataToOffset(rollingBest.first())
            rollingPath.moveTo(firstOffset.x, firstOffset.y)
            for (i in 1 until rollingBest.size) {
                val o = dataToOffset(rollingBest[i])
                rollingPath.lineTo(o.x, o.y)
            }
            // Extend flat to today if last data point is before today
            val lastPt = rollingBest.last()
            val lastPtDate = LocalDate.parse(lastPt.date)
            if (lastPtDate.isBefore(LocalDate.now())) {
                val todayX = viewport.mapX(totalDays, xRange)
                val lastY = viewport.mapY(lastPt.e1rm.toFloat(), yRange)
                rollingPath.lineTo(todayX, lastY)
            }

            drawPath(
                path = rollingPath,
                color = colors.primary,
                style = Stroke(width = dataStroke, cap = StrokeCap.Round),
            )
        }

        // Data points (cyan dots)
        for (pt in dataPoints) {
            val offset = dataToOffset(pt)
            drawCircle(
                color = colors.secondary.copy(alpha = 0.7f),
                radius = pointRadius,
                center = offset,
            )
        }
    }
}
