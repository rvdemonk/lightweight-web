package xyz.rigby3.lightweight.ui.screens.templates

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.rigby3.lightweight.domain.model.Template
import xyz.rigby3.lightweight.domain.model.TemplateExercise
import xyz.rigby3.lightweight.ui.components.LwButton
import xyz.rigby3.lightweight.ui.components.LwButtonStyle
import xyz.rigby3.lightweight.ui.components.LwCard
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.PagePadding

@Composable
fun TemplatesScreen(
    onNavigateToTemplate: (Long) -> Unit = {},
    onNavigateToNewTemplate: () -> Unit = {},
    onNavigateToWorkout: () -> Unit = {},
    viewModel: TemplatesViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                TemplatesEvent.NavigateToWorkout -> onNavigateToWorkout()
            }
        }
    }

    TemplatesContent(
        state = state,
        onToggleExpanded = viewModel::toggleExpanded,
        onStartWorkout = viewModel::startWorkout,
        onEdit = onNavigateToTemplate,
        onNewTemplate = onNavigateToNewTemplate,
    )
}

@Composable
private fun TemplatesContent(
    state: TemplatesState,
    onToggleExpanded: (Int) -> Unit,
    onStartWorkout: (Template) -> Unit,
    onEdit: (Long) -> Unit,
    onNewTemplate: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary)
            .padding(horizontal = PagePadding),
    ) {
        item {
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "TEMPLATES",
                style = typography.pageTitle,
                color = colors.textPrimary,
            )
            Spacer(modifier = Modifier.height(16.dp))
        }

        if (!state.isLoading && state.templates.isEmpty()) {
            item {
                Text(
                    text = "No templates yet",
                    style = typography.body,
                    color = colors.textSecondary,
                    modifier = Modifier.padding(vertical = 24.dp),
                )
            }
        }

        itemsIndexed(state.templates, key = { _, t -> t.id }) { index, template ->
            val expanded = state.expandedIndex == index

            LwCard(
                expanded = expanded,
                onClick = { onToggleExpanded(index) },
            ) {
                Column {
                    // Header: name + exercise count
                    Text(
                        text = template.name.uppercase(),
                        style = typography.cardTitle,
                        color = colors.textPrimary,
                    )
                    Text(
                        text = "${template.exercises.size} EXERCISES",
                        style = typography.data,
                        color = colors.textSecondary,
                        modifier = Modifier.padding(top = 4.dp),
                    )

                    if (expanded) {
                        Spacer(modifier = Modifier.height(12.dp))

                        // Exercise list
                        template.exercises.forEach { exercise ->
                            ExerciseRow(exercise = exercise)
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Action buttons
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            LwButton(
                                text = "START WORKOUT",
                                onClick = { onStartWorkout(template) },
                                style = LwButtonStyle.Primary,
                                modifier = Modifier.weight(1f),
                            )
                            LwButton(
                                text = "EDIT",
                                onClick = { onEdit(template.id) },
                                style = LwButtonStyle.Secondary,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }
        }

        item {
            LwButton(
                text = "+ NEW TEMPLATE",
                onClick = onNewTemplate,
                style = LwButtonStyle.Secondary,
                fullWidth = true,
            )
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun ExerciseRow(exercise: TemplateExercise) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    val setsText = exercise.targetSets?.toString() ?: "—"
    val repsText = when {
        exercise.targetRepsMin != null && exercise.targetRepsMax != null ->
            "${exercise.targetRepsMin}-${exercise.targetRepsMax}"
        exercise.targetRepsMin != null -> "${exercise.targetRepsMin}"
        exercise.targetRepsMax != null -> "${exercise.targetRepsMax}"
        else -> "—"
    }
    val programming = "${setsText}s | ${repsText}r"

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Row(modifier = Modifier.weight(1f)) {
            Text(
                text = "${exercise.position}",
                style = typography.data,
                color = colors.textSecondary,
                modifier = Modifier.padding(end = 8.dp),
                textAlign = TextAlign.End,
            )
            Text(
                text = exercise.exerciseName.uppercase(),
                style = typography.body,
                color = colors.textPrimary,
            )
        }
        Text(
            text = programming,
            style = typography.data,
            color = colors.textSecondary,
        )
    }
}
