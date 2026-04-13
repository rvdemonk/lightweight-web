package xyz.rigby3.lightweight.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import xyz.rigby3.lightweight.ui.theme.ButtonRadius
import xyz.rigby3.lightweight.ui.theme.CutCornerShape
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.MinTouchTarget

enum class LwButtonStyle {
    Primary,
    Secondary,
    Danger,
    Success,
    Ghost,
}

@Composable
fun LwButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    style: LwButtonStyle = LwButtonStyle.Primary,
    enabled: Boolean = true,
    fullWidth: Boolean = false,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    val containerColor: Color
    val contentColor: Color
    val border: BorderStroke?
    val shape: androidx.compose.ui.graphics.Shape
    val disabledContainerColor: Color
    val disabledContentColor: Color

    when (style) {
        LwButtonStyle.Primary -> {
            containerColor = colors.accentPrimary
            contentColor = colors.btnFilledText
            border = null
            shape = CutCornerShape(8.dp)
            disabledContainerColor = colors.accentPrimary.copy(alpha = 0.4f)
            disabledContentColor = colors.btnFilledText.copy(alpha = 0.5f)
        }
        LwButtonStyle.Secondary -> {
            containerColor = colors.bgElevated
            contentColor = colors.textPrimary
            border = BorderStroke(1.dp, colors.borderSubtle)
            shape = RoundedCornerShape(ButtonRadius)
            disabledContainerColor = colors.bgElevated.copy(alpha = 0.5f)
            disabledContentColor = colors.textSecondary
        }
        LwButtonStyle.Danger -> {
            containerColor = Color.Transparent
            contentColor = colors.accentRed
            border = BorderStroke(1.dp, colors.accentRed.copy(alpha = 0.5f))
            shape = RoundedCornerShape(ButtonRadius)
            disabledContainerColor = Color.Transparent
            disabledContentColor = colors.accentRed.copy(alpha = 0.3f)
        }
        LwButtonStyle.Success -> {
            containerColor = colors.accentGreen
            contentColor = colors.btnFilledText
            border = null
            shape = CutCornerShape(8.dp)
            disabledContainerColor = colors.accentGreen.copy(alpha = 0.4f)
            disabledContentColor = colors.btnFilledText.copy(alpha = 0.5f)
        }
        LwButtonStyle.Ghost -> {
            containerColor = Color.Transparent
            contentColor = colors.textSecondary
            border = null
            shape = RoundedCornerShape(ButtonRadius)
            disabledContainerColor = Color.Transparent
            disabledContentColor = colors.textSecondary.copy(alpha = 0.3f)
        }
    }

    // Glow shadow for filled buttons in dark theme
    val glowModifier = if (colors.isDark && style in listOf(LwButtonStyle.Primary, LwButtonStyle.Success)) {
        val glowColor = if (style == LwButtonStyle.Primary) colors.accentPrimary else colors.accentGreen
        modifier.shadow(
            elevation = 8.dp,
            shape = shape,
            ambientColor = glowColor.copy(alpha = 0.3f),
            spotColor = glowColor.copy(alpha = 0.3f),
        )
    } else {
        modifier
    }

    val widthModifier = if (fullWidth) glowModifier.fillMaxWidth() else glowModifier

    Button(
        onClick = onClick,
        modifier = widthModifier.defaultMinSize(minHeight = MinTouchTarget),
        enabled = enabled,
        shape = shape,
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = contentColor,
            disabledContainerColor = disabledContainerColor,
            disabledContentColor = disabledContentColor,
        ),
        border = border,
        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp),
        elevation = null,
    ) {
        Text(
            text = text.uppercase(),
            style = typography.button,
            textAlign = TextAlign.Center,
        )
    }
}
