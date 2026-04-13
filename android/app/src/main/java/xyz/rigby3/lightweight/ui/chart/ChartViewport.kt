package xyz.rigby3.lightweight.ui.chart

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size

data class ChartViewport(
    val left: Float,
    val top: Float,
    val right: Float,
    val bottom: Float,
) {
    val width: Float get() = right - left
    val height: Float get() = bottom - top

    /** Map a data value to an X pixel coordinate within the viewport. */
    fun mapX(value: Float, range: ClosedFloatingPointRange<Float>): Float {
        val span = range.endInclusive - range.start
        if (span == 0f) return left
        return left + ((value - range.start) / span) * width
    }

    /** Map a data value to a Y pixel coordinate (inverted: higher values → lower Y). */
    fun mapY(value: Float, range: ClosedFloatingPointRange<Float>): Float {
        val span = range.endInclusive - range.start
        if (span == 0f) return bottom
        return bottom - ((value - range.start) / span) * height
    }

    /** Map a data point to pixel coordinates. */
    fun mapPoint(
        x: Float,
        y: Float,
        xRange: ClosedFloatingPointRange<Float>,
        yRange: ClosedFloatingPointRange<Float>,
    ): Offset = Offset(mapX(x, xRange), mapY(y, yRange))
}

/** Compute the drawable chart area after reserving space for axes and padding. */
fun computeViewport(
    canvasSize: Size,
    yAxisWidth: Float,
    xAxisHeight: Float,
    contentInset: Float,
): ChartViewport = ChartViewport(
    left = yAxisWidth,
    top = contentInset,
    right = canvasSize.width - contentInset,
    bottom = canvasSize.height - xAxisHeight,
)
