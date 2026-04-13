package xyz.rigby3.lightweight.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import xyz.rigby3.lightweight.ui.theme.ButtonRadius
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.MinTouchTarget

@Composable
fun LwTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    placeholder: String? = null,
    isError: Boolean = false,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    singleLine: Boolean = true,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()

    val borderColor = when {
        isError -> colors.accentRed
        isFocused -> colors.accentPrimary
        else -> colors.borderSubtle
    }

    val shape = RoundedCornerShape(ButtonRadius)

    val textStyle = TextStyle(
        fontFamily = typography.bodyFamily,
        fontSize = 16.sp,
        color = colors.textPrimary,
    )

    Column(modifier = modifier.fillMaxWidth()) {
        if (label != null) {
            Text(
                text = label.uppercase(),
                style = typography.label,
                color = if (isError) colors.accentRed else colors.textSecondary,
                modifier = Modifier.padding(bottom = 6.dp),
            )
        }

        // Glow on focus in dark theme
        val fieldModifier = if (isFocused && colors.isDark && !isError) {
            Modifier.shadow(
                elevation = 4.dp,
                shape = shape,
                ambientColor = colors.accentPrimary.copy(alpha = 0.2f),
                spotColor = colors.accentPrimary.copy(alpha = 0.2f),
            )
        } else {
            Modifier
        }

        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = fieldModifier
                .fillMaxWidth()
                .defaultMinSize(minHeight = MinTouchTarget)
                .background(colors.bgSurface, shape)
                .border(1.dp, borderColor, shape)
                .padding(horizontal = 12.dp, vertical = 12.dp),
            textStyle = textStyle,
            singleLine = singleLine,
            keyboardOptions = keyboardOptions,
            interactionSource = interactionSource,
            cursorBrush = SolidColor(colors.accentPrimary),
            decorationBox = { innerTextField ->
                Box {
                    if (value.isEmpty() && placeholder != null) {
                        Text(
                            text = placeholder,
                            style = textStyle.copy(color = colors.textSecondary),
                        )
                    }
                    innerTextField()
                }
            },
        )
    }
}
