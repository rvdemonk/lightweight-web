package xyz.rigby3.lightweight.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.PagePadding

@Composable
fun NoteInput(
    note: String?,
    exerciseName: String,
    onSave: (String?) -> Unit,
    modifier: Modifier = Modifier,
) {
    var isOpen by remember { mutableStateOf(false) }

    if (isOpen) {
        Dialog(
            onDismissRequest = { isOpen = false },
            properties = DialogProperties(usePlatformDefaultWidth = false),
        ) {
            NoteModal(
                initialNote = note.orEmpty(),
                exerciseName = exerciseName,
                onSave = { text -> onSave(text.ifBlank { null }); isOpen = false },
                onCancel = { isOpen = false },
            )
        }
    }

    LwButton(
        text = if (note.isNullOrBlank()) "NOTE" else "EDIT NOTE",
        onClick = { isOpen = true },
        style = LwButtonStyle.Secondary,
        fullWidth = true,
        modifier = modifier,
    )
}

@Composable
private fun NoteModal(
    initialNote: String,
    exerciseName: String,
    onSave: (String) -> Unit,
    onCancel: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography
    var text by remember { mutableStateOf(initialNote) }
    val focusManager = LocalFocusManager.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary)
            .padding(PagePadding)
            .imePadding(),
    ) {
        Text(
            text = exerciseName.uppercase(),
            style = typography.pageTitle,
            color = colors.accentPrimary.copy(alpha = 0.7f),
            modifier = Modifier.padding(top = 48.dp, bottom = 16.dp),
        )

        BasicTextField(
            value = text,
            onValueChange = { text = it },
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            textStyle = typography.body.copy(color = colors.textPrimary),
            cursorBrush = SolidColor(colors.accentPrimary),
            decorationBox = { innerTextField ->
                if (text.isEmpty()) {
                    Text("Add a note...", style = typography.body, color = colors.textSecondary)
                }
                innerTextField()
            },
        )

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            LwButton(
                text = "SAVE",
                onClick = { focusManager.clearFocus(); onSave(text) },
                style = LwButtonStyle.Primary,
                modifier = Modifier.weight(1f),
            )
            LwButton(
                text = "CANCEL",
                onClick = { focusManager.clearFocus(); onCancel() },
                style = LwButtonStyle.Secondary,
                modifier = Modifier.weight(1f),
            )
        }
    }
}
