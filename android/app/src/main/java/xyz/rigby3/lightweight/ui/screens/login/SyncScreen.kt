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
import androidx.compose.ui.unit.dp
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun SyncScreen() {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography
    val t = rememberInfiniteTransition(label = "sync")

    val amber = colors.accentPrimary
    val cyan = colors.accentCyan

    // Mark pulse
    val markScale by t.animateFloat(
        initialValue = 0.93f, targetValue = 1.07f,
        animationSpec = infiniteRepeatable(
            tween(1400, easing = EaseInOutSine), RepeatMode.Reverse,
        ), label = "markScale",
    )
    val markGlow by t.animateFloat(
        initialValue = 0.15f, targetValue = 0.45f,
        animationSpec = infiniteRepeatable(
            tween(1400, easing = EaseInOutSine), RepeatMode.Reverse,
        ), label = "markGlow",
    )

    // Three octagon rings, staggered phase
    val ring1 by t.animateFloat(
        initialValue = 0.08f, targetValue = 0.5f,
        animationSpec = infiniteRepeatable(
            tween(2400, easing = EaseInOutSine), RepeatMode.Reverse,
        ), label = "r1",
    )
    val ring2 by t.animateFloat(
        initialValue = 0.5f, targetValue = 0.08f,
        animationSpec = infiniteRepeatable(
            tween(2400, delayMillis = 800, easing = EaseInOutSine), RepeatMode.Reverse,
        ), label = "r2",
    )
    val ring3 by t.animateFloat(
        initialValue = 0.08f, targetValue = 0.5f,
        animationSpec = infiniteRepeatable(
            tween(2400, delayMillis = 1600, easing = EaseInOutSine), RepeatMode.Reverse,
        ), label = "r3",
    )

    // Slow rotation for outer elements
    val rotation by t.animateFloat(
        initialValue = 0f, targetValue = 360f,
        animationSpec = infiniteRepeatable(
            tween(24000, easing = LinearEasing), RepeatMode.Restart,
        ), label = "rot",
    )

    // Vertical scan line
    val scanY by t.animateFloat(
        initialValue = -0.1f, targetValue = 1.1f,
        animationSpec = infiniteRepeatable(
            tween(3500, easing = LinearEasing), RepeatMode.Restart,
        ), label = "scan",
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
            val unit = size.width.coerceAtMost(size.height)

            // Concentric octagons
            val radii = listOf(unit * 0.16f, unit * 0.25f, unit * 0.34f)
            val alphas = listOf(ring1, ring2, ring3)
            radii.forEachIndexed { i, r ->
                drawOctagon(
                    center = Offset(cx, cy),
                    radius = r,
                    color = amber.copy(alpha = alphas[i]),
                    strokeWidth = if (i == 0) 1.8f else 1.2f,
                    rotationDeg = rotation * if (i % 2 == 0) 1f else -0.6f,
                )
            }

            // Tick marks around outer ring
            val tickRadius = unit * 0.38f
            val tickCount = 48
            for (j in 0 until tickCount) {
                val angle = Math.toRadians((rotation * 0.3 + j * 360.0 / tickCount))
                val major = j % 6 == 0
                val len = if (major) 10f else 5f
                val a = if (major) 0.35f else 0.12f
                val inner = tickRadius - len
                drawLine(
                    color = amber.copy(alpha = a),
                    start = Offset(
                        cx + inner * cos(angle).toFloat(),
                        cy + inner * sin(angle).toFloat(),
                    ),
                    end = Offset(
                        cx + tickRadius * cos(angle).toFloat(),
                        cy + tickRadius * sin(angle).toFloat(),
                    ),
                    strokeWidth = if (major) 1.2f else 0.8f,
                )
            }

            // Corner brackets (NERV-style framing)
            val bracketInset = unit * 0.06f
            val bracketLen = unit * 0.08f
            val bracketAlpha = 0.2f
            val bracketStroke = 1.2f
            // Top-left
            drawLine(cyan.copy(alpha = bracketAlpha), Offset(bracketInset, bracketInset), Offset(bracketInset + bracketLen, bracketInset), bracketStroke)
            drawLine(cyan.copy(alpha = bracketAlpha), Offset(bracketInset, bracketInset), Offset(bracketInset, bracketInset + bracketLen), bracketStroke)
            // Top-right
            drawLine(cyan.copy(alpha = bracketAlpha), Offset(size.width - bracketInset, bracketInset), Offset(size.width - bracketInset - bracketLen, bracketInset), bracketStroke)
            drawLine(cyan.copy(alpha = bracketAlpha), Offset(size.width - bracketInset, bracketInset), Offset(size.width - bracketInset, bracketInset + bracketLen), bracketStroke)
            // Bottom-left
            drawLine(cyan.copy(alpha = bracketAlpha), Offset(bracketInset, size.height - bracketInset), Offset(bracketInset + bracketLen, size.height - bracketInset), bracketStroke)
            drawLine(cyan.copy(alpha = bracketAlpha), Offset(bracketInset, size.height - bracketInset), Offset(bracketInset, size.height - bracketInset - bracketLen), bracketStroke)
            // Bottom-right
            drawLine(cyan.copy(alpha = bracketAlpha), Offset(size.width - bracketInset, size.height - bracketInset), Offset(size.width - bracketInset - bracketLen, size.height - bracketInset), bracketStroke)
            drawLine(cyan.copy(alpha = bracketAlpha), Offset(size.width - bracketInset, size.height - bracketInset), Offset(size.width - bracketInset, size.height - bracketInset - bracketLen), bracketStroke)

            // Horizontal scan line with trailing glow
            val lineY = size.height * scanY
            val scanHalf = unit * 0.38f
            drawLine(
                cyan.copy(alpha = 0.4f),
                Offset(cx - scanHalf, lineY),
                Offset(cx + scanHalf, lineY),
                1.5f,
            )
            for (k in 1..6) {
                drawLine(
                    cyan.copy(alpha = 0.4f * (1f - k / 6f) * 0.4f),
                    Offset(cx - scanHalf, lineY - k * 4f),
                    Offset(cx + scanHalf, lineY - k * 4f),
                    1.5f,
                )
            }

            // Central logomark
            drawMark(
                center = Offset(cx, cy),
                markSize = 72f * markScale,
                color = amber,
                glowAlpha = markGlow,
            )
        }

    }
}

private fun DrawScope.drawOctagon(
    center: Offset,
    radius: Float,
    color: Color,
    strokeWidth: Float,
    rotationDeg: Float,
) {
    val path = Path().apply {
        for (i in 0 until 8) {
            val angle = Math.toRadians((rotationDeg + i * 45.0 + 22.5))
            val x = center.x + radius * cos(angle).toFloat()
            val y = center.y + radius * sin(angle).toFloat()
            if (i == 0) moveTo(x, y) else lineTo(x, y)
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
