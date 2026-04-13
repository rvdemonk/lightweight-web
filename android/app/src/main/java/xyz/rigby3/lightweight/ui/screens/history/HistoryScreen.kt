package xyz.rigby3.lightweight.ui.screens.history

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.rigby3.lightweight.domain.model.SessionSummary
import xyz.rigby3.lightweight.ui.components.LwCard
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.PagePadding
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun HistoryScreen(
    onNavigateToSession: (Long) -> Unit = {},
    onNavigateToWorkout: () -> Unit = {},
    viewModel: HistoryViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    // Reload when screen becomes visible (e.g. after ending a workout)
    LaunchedEffect(Unit) { viewModel.loadSessions() }

    HistoryContent(
        state = state,
        onNavigateToSession = onNavigateToSession,
        onNavigateToWorkout = onNavigateToWorkout,
    )
}

@Composable
private fun HistoryContent(
    state: HistoryState,
    onNavigateToSession: (Long) -> Unit,
    onNavigateToWorkout: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary),
    ) {
        Spacer(modifier = Modifier.height(8.dp))

        if (state.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = colors.accentPrimary)
            }
        } else if (state.sessions.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "No sessions yet",
                    style = typography.body,
                    color = colors.textSecondary,
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = PagePadding),
            ) {
                items(state.sessions, key = { it.id }) { summary ->
                    SessionCard(
                        summary = summary,
                        onClick = {
                            if (summary.status == "active" || summary.status == "paused") {
                                onNavigateToWorkout()
                            } else {
                                onNavigateToSession(summary.id)
                            }
                        },
                    )
                }
                item { Spacer(modifier = Modifier.height(16.dp)) }
            }
        }
    }
}

@Composable
private fun SessionCard(
    summary: SessionSummary,
    onClick: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    val title = (summary.templateName ?: "FREEFORM").uppercase()
    val isActive = summary.status == "active" || summary.status == "paused"

    val badgeText: String
    val badgeColor: Color

    if (isActive) {
        badgeText = summary.status.uppercase()
        badgeColor = colors.accentPrimary
    } else {
        badgeText = "${summary.exerciseCount} EX \u00B7 ${summary.setCount} SETS"
        badgeColor = statsColor(summary, colors)
    }

    val dateText = formatSessionDate(summary.startedAt)
    val durationText = formatDuration(summary.startedAt, summary.endedAt)

    LwCard(onClick = onClick) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = title,
                    style = typography.cardTitle,
                    color = colors.textPrimary,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = badgeText,
                    style = typography.data,
                    color = badgeColor,
                )
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    text = dateText,
                    style = typography.data,
                    color = colors.textSecondary,
                )
                if (durationText != null) {
                    Text(
                        text = durationText,
                        style = typography.data,
                        color = colors.textSecondary,
                    )
                }
            }
        }
    }
}

private fun statsColor(
    summary: SessionSummary,
    colors: xyz.rigby3.lightweight.ui.theme.LightweightColors,
): Color {
    if (summary.status == "abandoned") return colors.accentRed

    val target = summary.targetSetCount
    if (target == null || summary.templateName == null) return colors.accentGreen

    val deficit = target - summary.setCount
    return when {
        deficit <= 0 -> colors.accentGreen
        deficit in 1..2 -> colors.accentPrimary
        else -> colors.accentRed
    }
}

private val sessionDateFormatter = DateTimeFormatter.ofPattern(
    "EEE dd MMM yyyy",
    Locale.ENGLISH,
)

private fun formatSessionDate(isoString: String): String =
    try {
        val dateTime = LocalDateTime.parse(isoString.replace("Z", "").replace(" ", "T"))
        dateTime.format(sessionDateFormatter).uppercase()
    } catch (_: Exception) {
        isoString
    }

private fun formatDuration(startedAt: String, endedAt: String?): String? {
    if (endedAt == null) return null
    return try {
        val start = LocalDateTime.parse(startedAt.replace("Z", "").replace(" ", "T"))
        val end = LocalDateTime.parse(endedAt.replace("Z", "").replace(" ", "T"))
        val minutes = java.time.Duration.between(start, end).toMinutes()
        when {
            minutes < 60 -> "${minutes}M"
            else -> "${minutes / 60}H ${minutes % 60}M"
        }
    } catch (_: Exception) {
        null
    }
}
