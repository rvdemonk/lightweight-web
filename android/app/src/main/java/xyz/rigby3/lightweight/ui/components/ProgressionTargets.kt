package xyz.rigby3.lightweight.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import xyz.rigby3.lightweight.domain.model.TemplateExercise
import xyz.rigby3.lightweight.domain.util.ExercisePRData
import xyz.rigby3.lightweight.domain.util.ProgressionTarget
import xyz.rigby3.lightweight.domain.util.progressionTargets
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

    val repMin = templateExercise?.targetRepsMin
    val repMax = templateExercise?.targetRepsMax
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    // Set position target: reps needed at current weight to beat this set position's best
    val setTargets = setProgressionTargets(
        prData = prData,
        setNumber = nextSetNumber,
        currentWeight = baseWeight,
        stepsBelow = 1,
        stepsAbove = 20,
    )
    val setAtWeight = setTargets.find { it.isCurrentWeight }

    // Exercise PR target: reps needed at current weight to beat all-time best
    val prAtWeight = if (prData.bestE1rmEver != null) {
        progressionTargets(
            targetE1rm = prData.bestE1rmEver,
            currentWeight = baseWeight,
            stepsBelow = 0,
            stepsAbove = 0,
        ).firstOrNull()
    } else null

    // Only show exercise PR line if it differs from set target
    val showExercisePR = prAtWeight != null &&
        (setAtWeight == null || prAtWeight.repsNeeded != setAtWeight.repsNeeded)

    if (setAtWeight == null && prAtWeight == null) return

    Column(modifier = modifier.fillMaxWidth()) {
        // Set position target
        if (setAtWeight != null) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 3.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = "SET $nextSetNumber",
                    style = typography.data.copy(fontSize = 14.sp, fontWeight = FontWeight.W700),
                    color = colors.accentCyan,
                )
                Text(
                    text = "${setAtWeight.repsNeeded}R × ${formatWeight(baseWeight)}KG",
                    style = typography.data.copy(fontSize = 14.sp, fontWeight = FontWeight.W700),
                    color = targetColor(setAtWeight, repMin, repMax, colors),
                )
            }
        }

        // Exercise PR target (when different from set target, or no set target exists)
        val showPR = (showExercisePR || setAtWeight == null) && prAtWeight != null
        if (showPR) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 3.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = "PR",
                    style = typography.data.copy(fontSize = 14.sp, fontWeight = FontWeight.W700),
                    color = colors.accentPrimary,
                )
                Text(
                    text = "${prAtWeight!!.repsNeeded}R × ${formatWeight(baseWeight)}KG",
                    style = typography.data.copy(fontSize = 14.sp, fontWeight = FontWeight.W700),
                    color = targetColor(prAtWeight, repMin, repMax, colors),
                )
            }
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
