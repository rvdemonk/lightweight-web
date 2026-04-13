package xyz.rigby3.lightweight.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import xyz.rigby3.lightweight.domain.model.TemplateExercise
import xyz.rigby3.lightweight.domain.model.WorkoutSet
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

@Composable
fun PreviousData(
    previousSets: List<WorkoutSet>,
    templateExercise: TemplateExercise?,
    modifier: Modifier = Modifier,
) {
    if (previousSets.isEmpty() && templateExercise == null) return

    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        if (previousSets.isNotEmpty()) {
            val weight = previousSets.first().weightKg
            val weightText = if (weight != null) "${formatWeight(weight)}KG" else "BW"
            val repsText = previousSets.mapNotNull { it.reps }.joinToString(", ")
            Text(
                text = "LAST $weightText × $repsText",
                style = typography.data,
                color = colors.textPrimary,
            )
        }

        if (templateExercise != null && templateExercise.targetSets != null) {
            val sets = templateExercise.targetSets
            val min = templateExercise.targetRepsMin
            val max = templateExercise.targetRepsMax
            val repsRange = when {
                min != null && max != null && min != max -> "${min}–${max}R"
                min != null -> "${min}R"
                else -> ""
            }
            Text(
                text = "TARGET ${sets}S $repsRange",
                style = typography.data,
                color = colors.textSecondary,
            )
        }
    }
}

internal fun formatWeight(kg: Double): String =
    if (kg == kg.toLong().toDouble()) kg.toLong().toString()
    else "%.1f".format(kg)
