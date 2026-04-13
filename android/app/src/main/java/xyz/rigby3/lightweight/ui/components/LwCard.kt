package xyz.rigby3.lightweight.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import xyz.rigby3.lightweight.ui.theme.CardPadding
import xyz.rigby3.lightweight.ui.theme.CardRadius
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

@Composable
fun LwCard(
    modifier: Modifier = Modifier,
    expanded: Boolean = false,
    onClick: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    val colors = LightweightTheme.colors

    val backgroundColor = if (expanded) colors.bgElevated else colors.bgSurface
    val borderColor = if (expanded) colors.borderActive else colors.borderSubtle

    val cardModifier = modifier
        .fillMaxWidth()
        .padding(bottom = 12.dp)

    val clickableModifier = if (onClick != null) {
        Modifier.pointerInput(onClick) { detectTapGestures { onClick() } }
    } else {
        Modifier
    }

    Surface(
        modifier = cardModifier,
        shape = RoundedCornerShape(CardRadius),
        color = backgroundColor,
        border = BorderStroke(1.dp, borderColor),
    ) {
        Box(
            modifier = clickableModifier.padding(CardPadding),
        ) {
            content()
        }
    }
}
