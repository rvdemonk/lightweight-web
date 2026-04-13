package xyz.rigby3.lightweight.ui.theme

import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp

val CardRadius = 2.dp
val ButtonRadius = 2.dp
val MinTouchTarget = 44.dp
val CardPadding = 16.dp
val PagePadding = 16.dp

/** Chamfers top-left and bottom-right corners — signature Lightweight button shape. */
class CutCornerShape(private val cut: Dp = 8.dp) : Shape {
    override fun createOutline(
        size: Size,
        layoutDirection: LayoutDirection,
        density: Density
    ): Outline {
        val cutPx = with(density) { cut.toPx() }
        val path = Path().apply {
            moveTo(cutPx, 0f)
            lineTo(size.width, 0f)
            lineTo(size.width, size.height - cutPx)
            lineTo(size.width - cutPx, size.height)
            lineTo(0f, size.height)
            lineTo(0f, cutPx)
            close()
        }
        return Outline.Generic(path)
    }
}
