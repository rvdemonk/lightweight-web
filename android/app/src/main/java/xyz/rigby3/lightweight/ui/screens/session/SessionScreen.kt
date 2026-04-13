package xyz.rigby3.lightweight.ui.screens.session

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.rigby3.lightweight.domain.model.Session
import xyz.rigby3.lightweight.domain.model.SessionExercise
import xyz.rigby3.lightweight.ui.components.LwButton
import xyz.rigby3.lightweight.ui.components.LwButtonStyle
import xyz.rigby3.lightweight.ui.components.LwCard
import xyz.rigby3.lightweight.ui.components.SetBars
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.PagePadding
import java.time.Duration
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun SessionScreen(
    sessionId: Long,
    onNavigateBack: () -> Unit = {},
    viewModel: SessionViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(sessionId) {
        viewModel.loadSession(sessionId)
    }

    SessionContent(
        state = state,
        onDelete = { viewModel.showDeleteConfirm() },
        onConfirmDelete = { viewModel.deleteSession(onDeleted = onNavigateBack) },
        onDismissDelete = { viewModel.dismissDeleteConfirm() },
    )
}

@Composable
private fun SessionContent(
    state: SessionDetailState,
    onDelete: () -> Unit,
    onConfirmDelete: () -> Unit,
    onDismissDelete: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    if (state.showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = onDismissDelete,
            containerColor = colors.bgElevated,
            titleContentColor = colors.textPrimary,
            textContentColor = colors.textSecondary,
            title = {
                Text(
                    text = "DELETE SESSION",
                    style = typography.cardTitle,
                    color = colors.textPrimary,
                )
            },
            text = {
                Text(
                    text = "This session and all its data will be permanently removed.",
                    style = typography.body,
                    color = colors.textSecondary,
                )
            },
            confirmButton = {
                LwButton(
                    text = "DELETE",
                    onClick = onConfirmDelete,
                    style = LwButtonStyle.Danger,
                )
            },
            dismissButton = {
                LwButton(
                    text = "CANCEL",
                    onClick = onDismissDelete,
                    style = LwButtonStyle.Ghost,
                )
            },
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary),
    ) {
        if (state.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = colors.accentPrimary)
            }
        } else if (state.session == null) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "Session not found",
                    style = typography.body,
                    color = colors.textSecondary,
                )
            }
        } else {
            SessionDetail(
                session = state.session,
                onDelete = onDelete,
            )
        }
    }
}

@Composable
private fun SessionDetail(
    session: Session,
    onDelete: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    val title = (session.templateName ?: session.name).uppercase()
    val dateText = formatDetailDate(session.startedAt)
    val durationText = formatDuration(session.startedAt, session.endedAt, session.pausedDuration)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = PagePadding),
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        // Session name
        Text(
            text = title,
            style = typography.pageTitle,
            color = colors.textPrimary,
        )

        // Date
        Text(
            text = dateText,
            style = typography.label,
            color = colors.textSecondary,
            modifier = Modifier.padding(top = 4.dp),
        )

        // Duration
        if (durationText != null) {
            Text(
                text = durationText,
                style = typography.data,
                color = colors.accentCyan,
                modifier = Modifier.padding(top = 4.dp),
            )
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Exercise cards — all expanded
        session.exercises.forEach { exercise ->
            ExerciseCard(exercise = exercise)
        }

        // Session notes
        if (!session.notes.isNullOrBlank()) {
            Text(
                text = session.notes,
                style = typography.body,
                color = colors.textSecondary,
                modifier = Modifier.padding(bottom = 16.dp),
            )
        }

        // Delete button
        LwButton(
            text = "DELETE SESSION",
            onClick = onDelete,
            style = LwButtonStyle.Danger,
            fullWidth = true,
        )

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun ExerciseCard(exercise: SessionExercise) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    LwCard(expanded = true) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = exercise.exerciseName.uppercase(),
                style = typography.cardTitle,
                color = colors.textPrimary,
            )

            if (exercise.sets.isNotEmpty()) {
                SetBars(
                    sets = exercise.sets,
                    onDeleteSet = null,
                )
            }

            if (!exercise.notes.isNullOrBlank()) {
                Text(
                    text = exercise.notes,
                    style = typography.body,
                    color = colors.textSecondary,
                )
            }
        }
    }
}

private val detailDateFormatter = DateTimeFormatter.ofPattern(
    "EEEE, d MMMM yyyy",
    Locale.ENGLISH,
)

private fun formatDetailDate(isoString: String): String =
    try {
        val dateTime = LocalDateTime.parse(isoString.replace("Z", "").replace(" ", "T"))
        dateTime.format(detailDateFormatter).uppercase()
    } catch (_: Exception) {
        isoString
    }

private fun formatDuration(startedAt: String, endedAt: String?, pausedDuration: Int): String? {
    if (endedAt == null) return null
    return try {
        val start = LocalDateTime.parse(startedAt.replace("Z", "").replace(" ", "T"))
        val end = LocalDateTime.parse(endedAt.replace("Z", "").replace(" ", "T"))
        val totalSeconds = Duration.between(start, end).seconds - pausedDuration
        if (totalSeconds <= 0) return null

        val hours = totalSeconds / 3600
        val minutes = (totalSeconds % 3600) / 60

        when {
            hours > 0 -> "${hours}h ${minutes}m"
            else -> "${minutes}m"
        }
    } catch (_: Exception) {
        null
    }
}
