package xyz.rigby3.lightweight.ui.screens.analytics

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import xyz.rigby3.lightweight.data.local.row.WeeklyVolumeRow
import xyz.rigby3.lightweight.ui.chart.ChartColors
import xyz.rigby3.lightweight.ui.chart.ChartDefaults
import xyz.rigby3.lightweight.ui.chart.ChartPalette
import xyz.rigby3.lightweight.ui.chart.ChartTextStyles
import xyz.rigby3.lightweight.ui.chart.computeViewport
import xyz.rigby3.lightweight.ui.chart.niceTicks
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

private val UPPER = setOf("Back", "Chest", "Shoulders", "Biceps", "Triceps", "Forearms")
private val LOWER = setOf("Quads", "Hamstrings", "Glutes", "Calves")
private val CORE = setOf("Core")

@Composable
fun VolumeBarChart(
    data: List<WeeklyVolumeRow>,
    mode: VolumeMode,
    colors: ChartColors,
    textStyles: ChartTextStyles,
    modifier: Modifier = Modifier,
) {
    val density = LocalDensity.current
    val textMeasurer = rememberTextMeasurer()
    val isProportional = mode != VolumeMode.Total

    val yAxisWidth = with(density) { if (isProportional) 48.dp.toPx() else ChartDefaults.YAxisWidth.toPx() }
    val xAxisHeight = with(density) { ChartDefaults.XAxisHeight.toPx() }
    val topInset = with(density) { 24.dp.toPx() }
    val gridStroke = with(density) { ChartDefaults.GridStrokeWidth.toPx() }
    val barCornerRadius = with(density) { ChartDefaults.BarCornerRadius.toPx() }

    // Group data by week, then by segment depending on mode
    val weeklySegments = remember(data, mode) {
        val byWeek = data.groupBy { it.week }
        val weeks = byWeek.keys.sorted()

        weeks.map { week ->
            val rows = byWeek[week] ?: emptyList()
            val segments: List<Pair<String, Int>> = when (mode) {
                VolumeMode.Total -> listOf("Total" to rows.sumOf { it.setCount })
                VolumeMode.Split -> listOf(
                    "Upper" to rows.filter { it.muscleGroup in UPPER }.sumOf { it.setCount },
                    "Lower" to rows.filter { it.muscleGroup in LOWER }.sumOf { it.setCount },
                    "Core" to rows.filter { it.muscleGroup in CORE || it.muscleGroup !in UPPER && it.muscleGroup !in LOWER }.sumOf { it.setCount },
                ).filter { it.second > 0 }
                VolumeMode.Muscle -> rows.map { it.muscleGroup to it.setCount }
            }
            week to segments
        }
    }

    val maxTotal = remember(weeklySegments) {
        weeklySegments.maxOfOrNull { (_, segs) -> segs.sumOf { it.second } } ?: 1
    }
    val yTicks = remember(maxTotal, isProportional) {
        if (isProportional) listOf(0f, 25f, 50f, 75f, 100f)
        else niceTicks(0f, maxTotal.toFloat(), 4)
    }
    val yMax = if (isProportional) 100f else (yTicks.lastOrNull() ?: maxTotal.toFloat())
    val yRange = 0f..yMax

    val dateFormatter = remember { DateTimeFormatter.ofPattern("d/M") }

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(280.dp),
    ) {
        val viewport = computeViewport(size, yAxisWidth, xAxisHeight, topInset)
        val weekCount = weeklySegments.size.coerceAtLeast(1)
        val barGroupWidth = viewport.width / weekCount
        val barWidth = (barGroupWidth * 0.7f).coerceAtMost(with(density) { 24.dp.toPx() })
        val barGap = (barGroupWidth - barWidth) / 2f

        // Grid + Y labels (unit embedded in top tick)
        for ((index, tick) in yTicks.withIndex()) {
            val y = viewport.mapY(tick, yRange)
            drawLine(colors.grid, Offset(viewport.left, y), Offset(viewport.right, y), gridStroke)
            val label = when {
                isProportional && index == yTicks.lastIndex -> "100%"
                isProportional -> "${tick.roundToInt()}%"
                index == yTicks.lastIndex -> "${tick.roundToInt()} sets"
                else -> tick.roundToInt().toString()
            }
            val measured = textMeasurer.measure(label, textStyles.axisLabel)
            drawText(measured, topLeft = Offset(viewport.left - measured.size.width - 6f, y - measured.size.height / 2f))
        }

        // Bars + X labels
        weeklySegments.forEachIndexed { i, (week, segments) ->
            val x = viewport.left + i * barGroupWidth + barGap
            val total = segments.sumOf { it.second }

            // Stacked bars from bottom up
            var stackY = viewport.bottom
            for ((group, count) in segments) {
                val fraction = if (isProportional && total > 0) {
                    count.toFloat() / total
                } else {
                    count.toFloat() / yMax
                }
                val barHeight = fraction * viewport.height
                val color = when (mode) {
                    VolumeMode.Total -> colors.primary
                    VolumeMode.Split -> when (group) {
                        "Upper" -> ChartPalette.UpperColor
                        "Lower" -> ChartPalette.LowerColor
                        else -> ChartPalette.CoreColor
                    }
                    VolumeMode.Muscle -> ChartPalette.muscleGroupColors[group] ?: colors.primary
                }
                val top = stackY - barHeight
                drawRoundRect(
                    color = color,
                    topLeft = Offset(x, top),
                    size = Size(barWidth, barHeight),
                    cornerRadius = CornerRadius(barCornerRadius),
                )
                stackY = top
            }

            // Total count above bar in proportional mode
            if (isProportional && total > 0) {
                val totalLabel = textMeasurer.measure(total.toString(), textStyles.axisLabel)
                drawText(totalLabel, topLeft = Offset(
                    x + barWidth / 2f - totalLabel.size.width / 2f,
                    stackY - totalLabel.size.height - 2f,
                ))
            }

            // X label — show every other week if crowded
            val showLabel = weekCount <= 8 || i % 2 == 0
            if (showLabel) {
                try {
                    val date = LocalDate.parse(week)
                    val label = date.format(dateFormatter)
                    val measured = textMeasurer.measure(label, textStyles.axisLabel)
                    val labelX = x + barWidth / 2f - measured.size.width / 2f
                    if (labelX >= viewport.left - 4f) {
                        drawText(measured, topLeft = Offset(labelX, viewport.bottom + 4f))
                    }
                } catch (_: Exception) {}
            }
        }
    }
}
