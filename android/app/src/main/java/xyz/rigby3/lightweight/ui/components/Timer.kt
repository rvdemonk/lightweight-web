package xyz.rigby3.lightweight.ui.components

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import kotlinx.coroutines.delay
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import java.time.Instant
import java.time.format.DateTimeParseException

@Composable
fun Timer(
    startedAt: String,
    pausedDuration: Int,
    isPaused: Boolean,
    modifier: Modifier = Modifier,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    val startEpoch = remember(startedAt) {
        try {
            Instant.parse(startedAt).epochSecond
        } catch (_: DateTimeParseException) {
            Instant.now().epochSecond
        }
    }

    var elapsed by remember { mutableLongStateOf(0L) }

    LaunchedEffect(isPaused, startEpoch, pausedDuration) {
        while (true) {
            elapsed = if (!isPaused) {
                Instant.now().epochSecond - startEpoch - pausedDuration
            } else {
                elapsed
            }
            delay(1000)
        }
    }

    val hours = elapsed / 3600
    val minutes = (elapsed % 3600) / 60
    val seconds = elapsed % 60
    val formatted = if (hours > 0) {
        "%d:%02d:%02d".format(hours, minutes, seconds)
    } else {
        "%d:%02d".format(minutes, seconds)
    }

    Text(
        text = if (isPaused) "PAUSED" else formatted,
        style = typography.dataLarge,
        color = if (isPaused) colors.accentPrimary else colors.textPrimary,
        modifier = modifier,
    )
}
