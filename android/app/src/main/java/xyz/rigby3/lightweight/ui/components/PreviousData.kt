package xyz.rigby3.lightweight.ui.components

import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import xyz.rigby3.lightweight.domain.model.WorkoutSet
import xyz.rigby3.lightweight.ui.theme.LightweightTheme

@Composable
fun PreviousData(
    previousSets: List<WorkoutSet>,
    modifier: Modifier = Modifier,
) {
    if (previousSets.isEmpty()) return

    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Text(
        text = "LAST  ${formatSets(previousSets)}",
        style = typography.data,
        color = colors.textPrimary,
        modifier = modifier,
    )
}

private fun formatSets(sets: List<WorkoutSet>): String =
    sets.mapNotNull { set ->
        val reps = set.reps ?: return@mapNotNull null
        val w = if (set.weightKg != null) formatWeight(set.weightKg) else "BW"
        "${w}×${reps}"
    }.joinToString(", ")

internal fun formatWeight(kg: Double): String =
    if (kg == kg.toLong().toDouble()) kg.toLong().toString()
    else "%.1f".format(kg)
