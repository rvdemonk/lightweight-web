package xyz.rigby3.lightweight.ui.screens.login

import androidx.compose.animation.core.EaseInOutSine
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import kotlin.math.abs
import kotlin.math.sin
import kotlin.math.sqrt

@Composable
fun SyncScreen() {
    val colors = LightweightTheme.colors
    val t = rememberInfiniteTransition(label = "sync")

    val amber = colors.accentPrimary

    // Glow pulse on center mark
    val markGlow by t.animateFloat(
        initialValue = 0.15f, targetValue = 0.45f,
        animationSpec = infiniteRepeatable(
            tween(1400, easing = EaseInOutSine), RepeatMode.Reverse,
        ), label = "markGlow",
    )

    // Ripple phase — drives triangle pulse outward from center
    val ripple by t.animateFloat(
        initialValue = 0f, targetValue = 8f,
        animationSpec = infiniteRepeatable(
            tween(3500, easing = LinearEasing), RepeatMode.Restart,
        ), label = "ripple",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val cx = size.width / 2
            val cy = size.height / 2

            // Triangle grid tessellation
            val triSide = size.width.coerceAtMost(size.height) * 0.075f
            val triH = triSide * sqrt(3f) / 2f
            val colStep = triSide / 2f
            val rowStep = triH

            // How many rows/cols to cover the screen
            val cols = (size.width / colStep).toInt() + 4
            val rows = (size.height / rowStep).toInt() + 4

            // Center mark exclusion radius (don't draw triangles over the logo)
            val exclusion = 68f

            for (row in -rows / 2..rows / 2) {
                for (col in -cols / 2..cols / 2) {
                    val pointsUp = (row + col) % 2 == 0

                    // Triangle center position
                    val tx = cx + col * colStep
                    val ty = cy + row * rowStep + if (pointsUp) triH / 3f else -triH / 3f + triH

                    // Distance from center for ripple + exclusion
                    val dx = tx - cx
                    val dy = ty - cy
                    val dist = sqrt(dx * dx + dy * dy)

                    // Skip triangles that overlap the center logo
                    if (dist < exclusion) continue

                    // Ripple wave based on distance
                    val normDist = dist / (size.width * 0.3f)
                    val phase = ripple - normDist * 4f
                    val wave = sin(phase * Math.PI).toFloat().coerceAtLeast(0f)
                    val alpha = 0.06f + wave * 0.4f

                    drawTriangle(
                        center = Offset(tx, ty),
                        side = triSide,
                        pointsUp = pointsUp,
                        color = amber.copy(alpha = alpha),
                        strokeWidth = if (dist < size.width * 0.2f) 1.2f else 0.8f,
                    )
                }
            }

            // Central logomark — fixed size, no pulse
            drawMark(
                center = Offset(cx, cy),
                markSize = 100f,
                color = amber,
                glowAlpha = markGlow,
            )
        }
    }
}

private fun DrawScope.drawTriangle(
    center: Offset,
    side: Float,
    pointsUp: Boolean,
    color: Color,
    strokeWidth: Float,
) {
    val h = side * sqrt(3f) / 2f
    val path = Path().apply {
        if (pointsUp) {
            moveTo(center.x, center.y - h * 2f / 3f)
            lineTo(center.x - side / 2f, center.y + h / 3f)
            lineTo(center.x + side / 2f, center.y + h / 3f)
        } else {
            moveTo(center.x, center.y + h * 2f / 3f)
            lineTo(center.x - side / 2f, center.y - h / 3f)
            lineTo(center.x + side / 2f, center.y - h / 3f)
        }
        close()
    }
    drawPath(path, color, style = Stroke(width = strokeWidth, join = StrokeJoin.Miter))
}

private fun DrawScope.drawMark(
    center: Offset,
    markSize: Float,
    color: Color,
    glowAlpha: Float,
) {
    val half = markSize / 2
    val left = center.x - half
    val top = center.y - half
    val r = markSize * 0.04f

    val triPath = Path().apply {
        moveTo(left, top)
        lineTo(left + markSize, top + markSize * 0.239f)
        lineTo(left + markSize * 0.239f, top + markSize)
        close()
    }

    val glowColor = color.copy(alpha = glowAlpha)
    val glowStroke = Stroke(width = markSize * 0.08f, join = StrokeJoin.Round)
    drawRoundRect(
        color = glowColor,
        topLeft = Offset(left, top),
        size = Size(markSize, markSize),
        cornerRadius = CornerRadius(r, r),
        style = glowStroke,
    )
    drawPath(triPath, glowColor, style = glowStroke)

    val crispStroke = Stroke(width = markSize * 0.045f, join = StrokeJoin.Round)
    drawRoundRect(
        color = color,
        topLeft = Offset(left, top),
        size = Size(markSize, markSize),
        cornerRadius = CornerRadius(r, r),
        style = crispStroke,
    )
    drawPath(triPath, color, style = crispStroke)
}
