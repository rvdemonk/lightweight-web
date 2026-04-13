package xyz.rigby3.lightweight.ui.chart

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path

/**
 * Build a Path using Fritsch–Carlson monotone cubic interpolation.
 * Produces smooth curves that never overshoot between data points.
 * Requires at least 2 points.
 */
fun monotoneCubicPath(points: List<Offset>): Path {
    val path = Path()
    if (points.isEmpty()) return path
    path.moveTo(points[0].x, points[0].y)
    if (points.size == 1) return path
    if (points.size == 2) {
        path.lineTo(points[1].x, points[1].y)
        return path
    }

    val n = points.size

    // Step 1: compute slopes between consecutive points
    val dx = FloatArray(n - 1) { points[it + 1].x - points[it].x }
    val dy = FloatArray(n - 1) { points[it + 1].y - points[it].y }
    val slopes = FloatArray(n - 1) { if (dx[it] != 0f) dy[it] / dx[it] else 0f }

    // Step 2: compute tangents using Fritsch–Carlson method
    val tangents = FloatArray(n)
    tangents[0] = slopes[0]
    tangents[n - 1] = slopes[n - 2]
    for (i in 1 until n - 1) {
        if (slopes[i - 1] * slopes[i] <= 0f) {
            // Sign change or zero — flat tangent to prevent overshoot
            tangents[i] = 0f
        } else {
            // Harmonic mean of adjacent slopes
            tangents[i] = 2f * slopes[i - 1] * slopes[i] / (slopes[i - 1] + slopes[i])
        }
    }

    // Step 3: build cubic bezier segments
    for (i in 0 until n - 1) {
        val segDx = dx[i] / 3f
        val cp1 = Offset(points[i].x + segDx, points[i].y + tangents[i] * segDx)
        val cp2 = Offset(points[i + 1].x - segDx, points[i + 1].y - tangents[i + 1] * segDx)
        path.cubicTo(cp1.x, cp1.y, cp2.x, cp2.y, points[i + 1].x, points[i + 1].y)
    }

    return path
}
