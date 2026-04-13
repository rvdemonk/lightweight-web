package xyz.rigby3.lightweight.ui.screens.templates

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.rigby3.lightweight.data.repository.EditableTemplateExercise
import xyz.rigby3.lightweight.ui.components.ExercisePicker
import xyz.rigby3.lightweight.ui.components.IncrementButton
import xyz.rigby3.lightweight.ui.components.LwButton
import xyz.rigby3.lightweight.ui.components.LwButtonStyle
import xyz.rigby3.lightweight.ui.components.LwCard
import xyz.rigby3.lightweight.ui.components.LwTextField
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.MinTouchTarget
import xyz.rigby3.lightweight.ui.theme.PagePadding

@Composable
fun TemplateDetailScreen(
    templateId: Long,
    onNavigateBack: () -> Unit = {},
    viewModel: TemplateDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(templateId) {
        viewModel.load(templateId)
    }

    LaunchedEffect(Unit) {
        viewModel.events.collect { event ->
            when (event) {
                TemplateDetailEvent.Saved -> onNavigateBack()
                TemplateDetailEvent.Archived -> onNavigateBack()
            }
        }
    }

    if (state.showExercisePicker) {
        val excludeIds = state.exercises.map { it.exerciseId }.toSet()
        ExercisePicker(
            exercises = state.allExercises,
            onSelect = { viewModel.addExercise(it) },
            onCreate = { name, muscleGroup, equipment ->
                viewModel.createAndAddExercise(name, muscleGroup, equipment)
            },
            onClose = { viewModel.hideExercisePicker() },
            excludeIds = excludeIds,
        )
    } else {
        TemplateDetailContent(
            state = state,
            onNameChange = viewModel::updateName,
            onUpdateSets = viewModel::updateExerciseSets,
            onUpdateRepsMin = viewModel::updateExerciseRepsMin,
            onUpdateRepsMax = viewModel::updateExerciseRepsMax,
            onRemoveExercise = viewModel::removeExercise,
            onAddExercise = viewModel::showExercisePicker,
            onSave = viewModel::save,
            onArchive = viewModel::showArchiveConfirm,
            onConfirmArchive = viewModel::archive,
            onDismissArchive = viewModel::hideArchiveConfirm,
        )
    }
}

@Composable
private fun TemplateDetailContent(
    state: TemplateEditState,
    onNameChange: (String) -> Unit,
    onUpdateSets: (Int, Int) -> Unit,
    onUpdateRepsMin: (Int, Int) -> Unit,
    onUpdateRepsMax: (Int, Int) -> Unit,
    onRemoveExercise: (Int) -> Unit,
    onAddExercise: () -> Unit,
    onSave: () -> Unit,
    onArchive: () -> Unit,
    onConfirmArchive: () -> Unit,
    onDismissArchive: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    if (state.showArchiveConfirm) {
        AlertDialog(
            onDismissRequest = onDismissArchive,
            containerColor = colors.bgSurface,
            titleContentColor = colors.textPrimary,
            textContentColor = colors.textSecondary,
            title = {
                Text(
                    text = "ARCHIVE TEMPLATE",
                    style = typography.cardTitle,
                )
            },
            text = {
                Text(
                    text = "This template will be hidden from the list. Existing workout sessions using it will not be affected.",
                    style = typography.body,
                )
            },
            confirmButton = {
                TextButton(onClick = onConfirmArchive) {
                    Text(
                        text = "ARCHIVE",
                        style = typography.button,
                        color = colors.accentRed,
                    )
                }
            },
            dismissButton = {
                TextButton(onClick = onDismissArchive) {
                    Text(
                        text = "CANCEL",
                        style = typography.button,
                        color = colors.textSecondary,
                    )
                }
            },
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = PagePadding),
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = if (state.isNew) "NEW TEMPLATE" else "EDIT TEMPLATE",
            style = typography.pageTitle,
            color = colors.textPrimary,
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Template name input
        LwTextField(
            value = state.name,
            onValueChange = onNameChange,
            placeholder = "Template name",
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Exercise cards
        state.exercises.forEachIndexed { index, exercise ->
            ExerciseEditCard(
                exercise = exercise,
                onUpdateSets = { sets -> onUpdateSets(index, sets) },
                onUpdateRepsMin = { reps -> onUpdateRepsMin(index, reps) },
                onUpdateRepsMax = { reps -> onUpdateRepsMax(index, reps) },
                onRemove = { onRemoveExercise(index) },
            )
        }

        // Add exercise button
        LwButton(
            text = "+ ADD EXERCISE",
            onClick = onAddExercise,
            style = LwButtonStyle.Secondary,
            fullWidth = true,
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Save button
        LwButton(
            text = "SAVE TEMPLATE",
            onClick = onSave,
            style = LwButtonStyle.Primary,
            fullWidth = true,
            enabled = state.name.isNotBlank() && !state.isSaving,
        )

        // Archive button (only for existing templates)
        if (!state.isNew) {
            Spacer(modifier = Modifier.height(8.dp))
            LwButton(
                text = "ARCHIVE",
                onClick = onArchive,
                style = LwButtonStyle.Danger,
                fullWidth = true,
            )
        }

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun ExerciseEditCard(
    exercise: EditableTemplateExercise,
    onUpdateSets: (Int) -> Unit,
    onUpdateRepsMin: (Int) -> Unit,
    onUpdateRepsMax: (Int) -> Unit,
    onRemove: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    LwCard {
        Column {
            // Header row: exercise name + remove button
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = exercise.exerciseName.uppercase(),
                    style = typography.cardTitle,
                    color = colors.textPrimary,
                    modifier = Modifier.weight(1f),
                )
                Box(
                    modifier = Modifier
                        .size(MinTouchTarget)
                        .clickable(onClick = onRemove),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = "\u00D7",
                        style = typography.dataLarge,
                        color = colors.accentRed,
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Increment buttons for sets, min reps, max reps
            IncrementButton(
                value = exercise.targetSets.toDouble(),
                onValueChange = { it?.toInt()?.let(onUpdateSets) },
                step = 1.0,
                min = 1.0,
                label = "SETS",
            )

            Spacer(modifier = Modifier.height(4.dp))

            IncrementButton(
                value = exercise.targetRepsMin.toDouble(),
                onValueChange = { it?.toInt()?.let(onUpdateRepsMin) },
                step = 1.0,
                min = 1.0,
                label = "MIN REPS",
            )

            Spacer(modifier = Modifier.height(4.dp))

            IncrementButton(
                value = exercise.targetRepsMax.toDouble(),
                onValueChange = { it?.toInt()?.let(onUpdateRepsMax) },
                step = 1.0,
                min = 1.0,
                label = "MAX REPS",
            )
        }
    }
}
