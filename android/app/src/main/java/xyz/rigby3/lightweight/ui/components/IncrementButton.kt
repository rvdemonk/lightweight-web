package xyz.rigby3.lightweight.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import xyz.rigby3.lightweight.ui.theme.ButtonRadius
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.MinTouchTarget

@Composable
fun IncrementButton(
    value: Double?,
    onValueChange: (Double?) -> Unit,
    step: Double = 1.0,
    min: Double = 0.0,
    decimal: Boolean = false,
    nullable: Boolean = false,
    muted: Boolean = false,
    label: String,
    modifier: Modifier = Modifier,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography
    var isEditing by remember { mutableStateOf(false) }

    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = label.uppercase(),
            style = typography.label,
            color = colors.textSecondary,
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Decrement
            Box(
                modifier = Modifier
                    .size(MinTouchTarget)
                    .background(colors.bgElevated, RoundedCornerShape(ButtonRadius))
                    .clickable {
                        if (value != null) {
                            val next = value - step
                            if (nullable && next < min) onValueChange(null)
                            else if (next >= min) onValueChange(next)
                        }
                    },
                contentAlignment = Alignment.Center,
            ) {
                Text("−", style = typography.dataLarge, color = colors.textPrimary)
            }

            // Value display / edit
            if (isEditing) {
                EditField(
                    value = value,
                    decimal = decimal,
                    min = min,
                    onCommit = { newValue ->
                        onValueChange(newValue)
                        isEditing = false
                    },
                    onCancel = { isEditing = false },
                )
            } else {
                val displayText = when {
                    value == null -> "—"
                    decimal -> "%.1f".format(value)
                    else -> value.toInt().toString()
                }
                Text(
                    text = displayText,
                    style = typography.dataLarge,
                    color = if (muted) colors.textSecondary else colors.textPrimary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .widthIn(min = 80.dp)
                        .clickable { if (value != null || !nullable) isEditing = true },
                )
            }

            // Increment
            Box(
                modifier = Modifier
                    .size(MinTouchTarget)
                    .background(colors.bgElevated, RoundedCornerShape(ButtonRadius))
                    .clickable {
                        if (value == null) onValueChange(min)
                        else onValueChange(value + step)
                    },
                contentAlignment = Alignment.Center,
            ) {
                Text("+", style = typography.dataLarge, color = colors.textPrimary)
            }
        }
    }
}

@Composable
private fun EditField(
    value: Double?,
    decimal: Boolean,
    min: Double,
    onCommit: (Double?) -> Unit,
    onCancel: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography
    val focusRequester = remember { FocusRequester() }
    val initialText = when {
        value == null -> ""
        decimal -> "%.1f".format(value)
        else -> value.toInt().toString()
    }
    var textFieldValue by remember {
        mutableStateOf(TextFieldValue(initialText, TextRange(0, initialText.length)))
    }

    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    BasicTextField(
        value = textFieldValue,
        onValueChange = { textFieldValue = it },
        modifier = Modifier
            .widthIn(min = 80.dp)
            .focusRequester(focusRequester),
        textStyle = typography.dataLarge.copy(
            color = colors.textPrimary,
            textAlign = TextAlign.Center,
        ),
        singleLine = true,
        cursorBrush = SolidColor(colors.accentPrimary),
        keyboardOptions = KeyboardOptions(
            keyboardType = if (decimal) KeyboardType.Decimal else KeyboardType.Number,
            imeAction = ImeAction.Done,
        ),
        keyboardActions = KeyboardActions(
            onDone = {
                val parsed = textFieldValue.text.toDoubleOrNull()
                if (parsed != null && parsed >= min) onCommit(parsed)
                else onCancel()
            },
        ),
    )
}
