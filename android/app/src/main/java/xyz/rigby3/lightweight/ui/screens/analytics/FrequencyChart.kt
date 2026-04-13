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
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.dp
import xyz.rigby3.lightweight.data.local.row.WeeklyFrequencyRow
import xyz.rigby3.lightweight.ui.chart.ChartColors
import xyz.rigby3.lightweight.ui.chart.ChartDefaults
import xyz.rigby3.lightweight.ui.chart.ChartTextStyles
import xyz.rigby3.lightweight.ui.chart.computeViewport
import xyz.rigby3.lightweight.ui.chart.niceTicks
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

@Composable
fun FrequencyChart(
    data: List<WeeklyFrequencyRow>,
    colors: ChartColors,
    textStyles: ChartTextStyles,
    modifier: Modifier = Modifier,
) {
    val density = LocalDensity.current
    val textMeasurer = rememberTextMeasurer()

    val yAxisWidth = with(density) { ChartDefaults.YAxisWidth.toPx() }
    val xAxisHeight = with(density) { ChartDefaults.XAxisHeight.toPx() }
    val topInset = with(density) { 24.dp.toPx() }
    val gridStroke = with(density) { ChartDefaults.GridStrokeWidth.toPx() }
    val dataStroke = with(density) { ChartDefaults.DataStrokeWidth.toPx() }
    val barCornerRadius = with(density) { ChartDefaults.BarCornerRadius.toPx() }

    val maxCount = remember(data) { data.maxOfOrNull { it.sessionCount } ?: 1 }
    val yTicks = remember(maxCount) { niceTicks(0f, maxCount.toFloat(), 4) }
    val yMax = yTicks.lastOrNull() ?: maxCount.toFloat()
    val yRange = 0f..yMax

    // 4-week rolling average (exclude current incomplete week — last entry)
    val rollingAvg = remember(data) {
        if (data.size < 2) emptyList()
        else {
            val completed = data.dropLast(1) // exclude current week
            completed.mapIndexed { i, _ ->
                val window = completed.subList(maxOf(0, i - 3), i + 1)
                window.map { it.sessionCount.toFloat() }.average().toFloat()
            }
        }
    }

    val dateFormatter = remember { DateTimeFormatter.ofPattern("d/M") }

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(220.dp),
    ) {
        val viewport = computeViewport(size, yAxisWidth, xAxisHeight, topInset)
        val weekCount = data.size.coerceAtLeast(1)
        val barGroupWidth = viewport.width / weekCount
        val barWidth = (barGroupWidth * 0.6f).coerceAtMost(with(density) { 20.dp.toPx() })
        val barGap = (barGroupWidth - barWidth) / 2f

        // Grid + Y labels (unit embedded in top tick)
        for ((index, tick) in yTicks.withIndex()) {
            val y = viewport.mapY(tick, yRange)
            drawLine(colors.grid, Offset(viewport.left, y), Offset(viewport.right, y), gridStroke)
            val label = if (index == yTicks.lastIndex) "${tick.roundToInt()} /wk" else tick.roundToInt().toString()
            val measured = textMeasurer.measure(label, textStyles.axisLabel)
            drawText(measured, topLeft = Offset(viewport.left - measured.size.width - 6f, y - measured.size.height / 2f))
        }

        // Bars
        data.forEachIndexed { i, row ->
            val x = viewport.left + i * barGroupWidth + barGap
            val barHeight = (row.sessionCount.toFloat() / yMax) * viewport.height
            drawRoundRect(
                color = colors.secondary.copy(alpha = 0.6f),
                topLeft = Offset(x, viewport.bottom - barHeight),
                size = Size(barWidth, barHeight),
                cornerRadius = CornerRadius(barCornerRadius),
            )

            // X label
            val showLabel = weekCount <= 8 || i % 2 == 0
            if (showLabel) {
                try {
                    val date = LocalDate.parse(row.week)
                    val label = date.format(dateFormatter)
                    val measured = textMeasurer.measure(label, textStyles.axisLabel)
                    val labelX = x + barWidth / 2f - measured.size.width / 2f
                    if (labelX >= viewport.left - 4f) {
                        drawText(measured, topLeft = Offset(labelX, viewport.bottom + 4f))
                    }
                } catch (_: Exception) {}
            }
        }

        // Rolling average line (over completed weeks only)
        if (rollingAvg.size >= 2) {
            val path = Path()
            for (i in rollingAvg.indices) {
                val x = viewport.left + i * barGroupWidth + barGroupWidth / 2f
                val y = viewport.mapY(rollingAvg[i], yRange)
                if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            drawPath(path, colors.primary, style = Stroke(width = dataStroke, cap = StrokeCap.Round))
        }
    }
}
