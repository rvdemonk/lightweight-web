package xyz.rigby3.lightweight.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import xyz.rigby3.lightweight.domain.model.TemplateExercise
import xyz.rigby3.lightweight.domain.util.ExercisePRData
import xyz.rigby3.lightweight.domain.util.ProgressionTarget
import xyz.rigby3.lightweight.domain.util.setProgressionTargets
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

@Composable
fun ProgressionTargets(
    prData: ExercisePRData?,
    nextSetNumber: Int,
    baseWeight: Double?,
    templateExercise: TemplateExercise?,
    modifier: Modifier = Modifier,
) {
    if (prData == null || baseWeight == null || baseWeight <= 0) return

    val targets = setProgressionTargets(
        prData = prData,
        setNumber = nextSetNumber,
        currentWeight = baseWeight,
        stepsBelow = 1,
        stepsAbove = 20,
    )
    if (targets.isEmpty()) return

    val repMin = templateExercise?.targetRepsMin
    val repMax = templateExercise?.targetRepsMax

    // In-range target: first weight where repsNeeded falls within template rep range
    val inRange = if (repMin != null && repMax != null) {
        targets.find { it.repsNeeded in repMin..repMax }
    } else null

    // At-weight target: target at the base weight
    val atWeight = targets.find { it.isCurrentWeight }

    if (inRange == null && atWeight == null) return

    // Don't show both if same weight
    val showBoth = atWeight != null && inRange != null && atWeight.weight != inRange.weight

    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            text = "SET $nextSetNumber TO BEAT",
            style = typography.data.copy(fontSize = 12.sp),
            color = colors.accentPrimary,
        )

        if (inRange != null) {
            Text(
                text = "${inRange.repsNeeded}R × ${formatWeight(inRange.weight)}KG",
                style = typography.data.copy(fontSize = 12.sp),
                color = targetColor(inRange, repMin, repMax, colors),
            )
        }

        @Suppress("KotlinConstantConditions")
        if (showBoth && atWeight != null) {
            Text(
                text = "${atWeight.repsNeeded}R × ${formatWeight(atWeight.weight)}KG",
                style = typography.data.copy(fontSize = 12.sp),
                color = targetColor(atWeight, repMin, repMax, colors),
            )
        }

        if (inRange == null && atWeight != null) {
            Text(
                text = "${atWeight.repsNeeded}R × ${formatWeight(atWeight.weight)}KG",
                style = typography.data.copy(fontSize = 12.sp),
                color = targetColor(atWeight, repMin, repMax, colors),
            )
        }
    }
}

private fun targetColor(
    target: ProgressionTarget,
    repMin: Int?,
    repMax: Int?,
    colors: xyz.rigby3.lightweight.ui.theme.LightweightColors,
): Color {
    if (repMin == null || repMax == null) return colors.accentCyan
    return when {
        target.repsNeeded > repMax -> colors.accentCyan
        target.repsNeeded >= repMin -> colors.accentGreen
        target.repsNeeded == repMin - 1 -> colors.accentPrimary
        else -> colors.accentRed
    }
}
