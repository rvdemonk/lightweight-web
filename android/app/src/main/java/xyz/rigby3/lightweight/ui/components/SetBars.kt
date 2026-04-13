package xyz.rigby3.lightweight.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import xyz.rigby3.lightweight.domain.model.TemplateExercise
import xyz.rigby3.lightweight.domain.model.WorkoutSet
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

data class SetPRData(
    val absolutePRSetIds: Set<Long> = emptySet(),
    val setPRSetIds: Set<Long> = emptySet(),
)

@Composable
fun SetBars(
    sets: List<WorkoutSet>,
    templateExercise: TemplateExercise? = null,
    prData: SetPRData? = null,
    onDeleteSet: ((Long) -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    if (sets.isEmpty()) return

    val colors = LightweightTheme.colors
    var deleteTargetId by remember { mutableLongStateOf(-1L) }

    val maxReps = templateExercise?.targetRepsMax
        ?: maxOf(12, sets.mapNotNull { it.reps }.maxOrNull() ?: 12)

    val anyHasRir = sets.any { it.rir != null }

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        sets.forEach { set ->
            if (deleteTargetId == set.id && onDeleteSet != null) {
                DeleteOverlay(
                    setNumber = set.setNumber,
                    onConfirm = { onDeleteSet(set.id); deleteTargetId = -1L },
                    onCancel = { deleteTargetId = -1L },
                )
            } else {
                SetRow(
                    set = set,
                    maxReps = maxReps,
                    templateExercise = templateExercise,
                    prData = prData,
                    reserveRirSpace = anyHasRir,
                    onLongPress = if (onDeleteSet != null) {
                        { deleteTargetId = set.id }
                    } else null,
                )
            }
        }
    }
}

@Composable
private fun SetRow(
    set: WorkoutSet,
    maxReps: Int,
    templateExercise: TemplateExercise?,
    prData: SetPRData?,
    reserveRirSpace: Boolean,
    onLongPress: (() -> Unit)?,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    val isAbsolutePR = prData?.absolutePRSetIds?.contains(set.id) == true
    val isSetPR = prData?.setPRSetIds?.contains(set.id) == true
    val repStatus = getRepStatus(set.reps, templateExercise)
    val barColor = repStatusColor(repStatus, colors)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .then(
                if (onLongPress != null) {
                    Modifier.pointerInput(set.id) {
                        detectTapGestures(onLongPress = { onLongPress() })
                    }
                } else Modifier
            ),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        // Badge column
        Box(modifier = Modifier.width(32.dp), contentAlignment = Alignment.CenterEnd) {
            when {
                isAbsolutePR -> Text(
                    "PR",
                    style = typography.button.copy(
                        shadow = androidx.compose.ui.graphics.Shadow(
                            color = colors.accentPrimary.copy(alpha = 0.7f),
                            blurRadius = 12f,
                        ),
                    ),
                    color = colors.accentPrimary,
                )
                isSetPR -> Text(
                    "SPR",
                    style = typography.button.copy(
                        shadow = androidx.compose.ui.graphics.Shadow(
                            color = colors.accentCyan.copy(alpha = 0.7f),
                            blurRadius = 12f,
                        ),
                    ),
                    color = colors.accentCyan,
                )
                else -> Text(
                    "%02d".format(set.setNumber),
                    style = typography.data,
                    color = colors.textSecondary,
                )
            }
        }

        // Bar
        Box(
            modifier = Modifier
                .weight(1f)
                .height(10.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(barColor.copy(alpha = 0.15f)),
        ) {
            val fillFraction = ((set.reps ?: 0).toFloat() / maxReps).coerceIn(0f, 1f)
            Box(
                modifier = Modifier
                    .fillMaxWidth(fillFraction)
                    .height(10.dp)
                    .background(barColor),
            )
        }

        // Data — monospace font, so fixed-width char padding guarantees alignment
        Row(verticalAlignment = Alignment.CenterVertically) {
            val weightText = if (set.weightKg != null) "${formatWeight(set.weightKg)}kg" else "BW"
            Text(weightText, style = typography.data, color = colors.textPrimary)
            Text("×", style = typography.data, color = colors.textSecondary)
            // Pad reps to 2 chars so single/double digits take same width
            Text("%2d".format(set.reps ?: 0), style = typography.data, color = colors.textPrimary)
            if (reserveRirSpace) {
                val rirColor = if (set.rir != null) colors.textSecondary else Color.Transparent
                Text(" R%d".format(set.rir ?: 0), style = typography.data, color = rirColor)
            }
        }
    }
}

@Composable
private fun DeleteOverlay(
    setNumber: Int,
    onConfirm: () -> Unit,
    onCancel: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.bgElevated, RoundedCornerShape(2.dp))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(
            "DELETE SET %02d?".format(setNumber),
            style = typography.data,
            color = colors.accentRed,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            LwButton("DELETE", onClick = onConfirm, style = LwButtonStyle.Danger)
            LwButton("CANCEL", onClick = onCancel, style = LwButtonStyle.Ghost)
        }
    }
}

private enum class RepStatus { InRange, OneBelow, Under, Over, NoTarget }

private fun getRepStatus(reps: Int?, template: TemplateExercise?): RepStatus {
    if (reps == null || template == null) return RepStatus.NoTarget
    val min = template.targetRepsMin ?: return RepStatus.NoTarget
    val max = template.targetRepsMax ?: min
    return when {
        reps in min..max -> RepStatus.InRange
        reps == min - 1 -> RepStatus.OneBelow
        reps < min - 1 -> RepStatus.Under
        reps > max -> RepStatus.Over
        else -> RepStatus.NoTarget
    }
}

@Composable
private fun repStatusColor(status: RepStatus, colors: xyz.rigby3.lightweight.ui.theme.LightweightColors): Color =
    when (status) {
        RepStatus.InRange -> colors.accentGreen
        RepStatus.OneBelow -> colors.accentPrimary
        RepStatus.Under -> colors.accentRed
        RepStatus.Over -> colors.accentCyan
        RepStatus.NoTarget -> colors.accentGreen
    }
