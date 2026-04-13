package xyz.rigby3.lightweight.ui.screens.workout

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.rigby3.lightweight.domain.model.SessionExercise
import xyz.rigby3.lightweight.domain.model.TemplateExercise
import xyz.rigby3.lightweight.domain.model.WorkoutSet
import xyz.rigby3.lightweight.ui.components.ExercisePicker
import xyz.rigby3.lightweight.ui.components.LwButton
import xyz.rigby3.lightweight.ui.components.LwButtonStyle
import xyz.rigby3.lightweight.ui.components.LwCard
import xyz.rigby3.lightweight.ui.components.NoteInput
import xyz.rigby3.lightweight.ui.components.PreviousData
import xyz.rigby3.lightweight.ui.components.ProgressionTargets
import xyz.rigby3.lightweight.ui.components.SetBars
import xyz.rigby3.lightweight.ui.components.SetLogger
import xyz.rigby3.lightweight.ui.components.SetPRData
import xyz.rigby3.lightweight.ui.components.Timer
import xyz.rigby3.lightweight.ui.components.formatWeight
import xyz.rigby3.lightweight.domain.util.ExercisePRData
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.PagePadding

@Composable
fun WorkoutScreen(
    onNavigateBack: () -> Unit = {},
    viewModel: WorkoutViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    // Full-screen exercise picker overlay
    if (state.showExercisePicker) {
        val excludeIds = state.session?.exercises?.map { it.exerciseId }?.toSet() ?: emptySet()
        ExercisePicker(
            exercises = state.exercises,
            onSelect = { exercise -> viewModel.addExercise(exercise.id) },
            onCreate = { name, muscleGroup, equipment ->
                viewModel.createAndAddExercise(name, muscleGroup, equipment)
            },
            onClose = { viewModel.hideExercisePicker() },
            excludeIds = excludeIds,
        )
        return
    }

    // End workout confirmation dialog
    if (state.showEndConfirmation) {
        EndWorkoutDialog(
            onConfirm = {
                viewModel.hideEndConfirmation()
                viewModel.endWorkout(onEnd = onNavigateBack)
            },
            onDismiss = { viewModel.hideEndConfirmation() },
        )
    }

    WorkoutContent(
        state = state,
        onLogSet = viewModel::logSet,
        onDeleteSet = viewModel::deleteSet,
        onUpdateNotes = viewModel::updateExerciseNotes,
        onExpandExercise = viewModel::expandExercise,
        onTogglePause = viewModel::togglePause,
        onEndWorkout = viewModel::showEndConfirmation,
        onAddExercise = viewModel::showExercisePicker,
        onWeightChange = viewModel::updateWeight,
    )
}

@Composable
private fun WorkoutContent(
    state: WorkoutState,
    onLogSet: (sessionExerciseId: Long, weightKg: Double?, reps: Int, rir: Int?) -> Unit,
    onDeleteSet: (Long) -> Unit,
    onUpdateNotes: (sessionExerciseId: Long, notes: String?) -> Unit,
    onExpandExercise: (Int) -> Unit,
    onTogglePause: () -> Unit,
    onEndWorkout: () -> Unit,
    onAddExercise: () -> Unit,
    onWeightChange: (sessionExerciseId: Long, weight: Double?) -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    if (state.isLoading) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(colors.bgPrimary),
            contentAlignment = Alignment.Center,
        ) {
            CircularProgressIndicator(color = colors.accentPrimary)
        }
        return
    }

    val session = state.session
    if (session == null) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(colors.bgPrimary),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = "NO ACTIVE SESSION",
                style = typography.cardTitle,
                color = colors.textSecondary,
            )
        }
        return
    }

    val completedSets = session.exercises.sumOf { it.sets.size }
    val targetSets = if (state.templateExercises.isNotEmpty()) {
        state.templateExercises.values.sumOf { it.targetSets ?: 0 }
    } else 0

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary)
            .padding(horizontal = PagePadding),
    ) {
        // Sticky header
        item {
            Spacer(modifier = Modifier.height(24.dp))

            // Row 1: session name + timer
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = (session.name.ifBlank { "FREEFORM" }).uppercase(),
                    style = typography.heroTitle,
                    color = colors.textPrimary,
                    modifier = Modifier.weight(1f),
                )
                Timer(
                    startedAt = session.startedAt,
                    pausedDuration = session.pausedDuration,
                    isPaused = state.isPaused,
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Row 2: progress bar (only if template)
            if (targetSets > 0) {
                val fraction = (completedSets.toFloat() / targetSets).coerceIn(0f, 1f)
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(10.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(colors.bgElevated),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraction)
                            .height(10.dp)
                            .background(colors.accentGreen),
                    )
                }
                Spacer(modifier = Modifier.height(8.dp))
            }

            // Row 3: action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                LwButton(
                    text = if (state.isPaused) "RESUME" else "PAUSE",
                    onClick = onTogglePause,
                    style = LwButtonStyle.Secondary,
                    modifier = Modifier.weight(1f),
                )
                LwButton(
                    text = "END WORKOUT",
                    onClick = onEndWorkout,
                    style = LwButtonStyle.Danger,
                    modifier = Modifier.weight(1f),
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }

        // Exercise cards
        itemsIndexed(
            items = session.exercises,
            key = { _, ex -> ex.id },
        ) { index, exercise ->
            val isExpanded = index == state.expandedExerciseIndex
            val templateExercise = state.templateExercises[exercise.exerciseId]
            val previousSets = state.previousSets[exercise.exerciseId] ?: emptyList()
            val prData = state.prData[exercise.exerciseId]
            val setPRData = state.setPRData[exercise.exerciseId]
            val weightOverride = state.weightOverrides[exercise.id]

            ExerciseCard(
                exercise = exercise,
                isExpanded = isExpanded,
                templateExercise = templateExercise,
                previousSets = previousSets,
                prData = prData,
                setPRData = setPRData,
                weightOverride = weightOverride,
                onClick = {
                    onExpandExercise(if (isExpanded) -1 else index)
                },
                onLogSet = { weightKg, reps, rir ->
                    onLogSet(exercise.id, weightKg, reps, rir)
                },
                onDeleteSet = onDeleteSet,
                onUpdateNotes = { notes -> onUpdateNotes(exercise.id, notes) },
                onWeightChange = { weight -> onWeightChange(exercise.id, weight) },
            )
        }

        // Add exercise button
        item {
            LwButton(
                text = "+ ADD EXERCISE",
                onClick = onAddExercise,
                style = LwButtonStyle.Secondary,
                fullWidth = true,
            )
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun ExerciseCard(
    exercise: SessionExercise,
    isExpanded: Boolean,
    templateExercise: TemplateExercise?,
    previousSets: List<WorkoutSet>,
    prData: ExercisePRData?,
    setPRData: SetPRData?,
    weightOverride: Double?,
    onClick: () -> Unit,
    onLogSet: (weightKg: Double?, reps: Int, rir: Int?) -> Unit,
    onDeleteSet: (Long) -> Unit,
    onUpdateNotes: (String?) -> Unit,
    onWeightChange: (Double?) -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    if (isExpanded) {
        // Expanded card — only title is clickable to collapse
        LwCard(expanded = true) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Exercise name + target spec
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .pointerInput(Unit) { detectTapGestures { onClick() } },
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = exercise.exerciseName.uppercase(),
                        style = typography.exerciseName,
                        color = colors.textPrimary,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    if (templateExercise?.targetSets != null) {
                        val sets = templateExercise.targetSets
                        val min = templateExercise.targetRepsMin
                        val max = templateExercise.targetRepsMax
                        val repsRange = when {
                            min != null && max != null && min != max -> "${min}–${max}R"
                            min != null -> "${min}R"
                            else -> ""
                        }
                        Text(
                            text = "${sets}S $repsRange",
                            style = typography.data,
                            color = colors.textSecondary,
                        )
                    }
                }

                // Previous session data
                PreviousData(previousSets = previousSets)

                // Progression targets — uses current weight for reactive updates
                val nextSetNum = exercise.sets.size + 1
                val resolvedWeight = resolveDefaultWeight(exercise, previousSets)
                val currentWeight = weightOverride ?: resolvedWeight

                ProgressionTargets(
                    prData = prData,
                    nextSetNumber = nextSetNum,
                    baseWeight = currentWeight,
                    templateExercise = templateExercise,
                )

                // Logged sets
                if (exercise.sets.isNotEmpty()) {
                    SetBars(
                        sets = exercise.sets,
                        templateExercise = templateExercise,
                        prData = setPRData,
                        onDeleteSet = onDeleteSet,
                    )
                }

                // Set logger
                val defaultReps = resolveDefaultReps(exercise, previousSets)

                SetLogger(
                    defaultWeight = currentWeight,
                    defaultReps = defaultReps,
                    onLog = onLogSet,
                    onWeightChange = onWeightChange,
                )

                // Note input
                NoteInput(
                    note = exercise.notes,
                    exerciseName = exercise.exerciseName,
                    onSave = onUpdateNotes,
                )
            }
        }
    } else {
        // Collapsed card
        LwCard(expanded = false, onClick = onClick) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                // Exercise name
                Text(
                    text = exercise.exerciseName.uppercase(),
                    style = typography.exerciseName,
                    color = colors.textPrimary,
                    modifier = Modifier.weight(1f, fill = false),
                )

                // Set counter
                val targetCount = templateExercise?.targetSets
                val setCountText = if (targetCount != null) {
                    "${exercise.sets.size}/$targetCount"
                } else {
                    "${exercise.sets.size}"
                }
                Text(
                    text = setCountText,
                    style = typography.data,
                    color = colors.textSecondary,
                )
            }
        }
    }
}

@Composable
private fun EndWorkoutDialog(
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = colors.bgElevated,
        shape = RoundedCornerShape(4.dp),
        title = {
            Text(
                text = "END WORKOUT",
                style = typography.pageTitle,
                color = colors.textPrimary,
            )
        },
        text = {
            Text(
                text = "End the current workout session?",
                style = typography.body,
                color = colors.textSecondary,
            )
        },
        confirmButton = {
            LwButton(
                text = "END",
                onClick = onConfirm,
                style = LwButtonStyle.Danger,
            )
        },
        dismissButton = {
            LwButton(
                text = "CANCEL",
                onClick = onDismiss,
                style = LwButtonStyle.Ghost,
            )
        },
    )
}

/**
 * Default weight: last set in this session for this exercise, or previous session's first set weight, or null.
 */
private fun resolveDefaultWeight(
    exercise: SessionExercise,
    previousSets: List<WorkoutSet>,
): Double? {
    // Last set in current session
    exercise.sets.lastOrNull()?.weightKg?.let { return it }
    // Previous session's first set
    previousSets.firstOrNull()?.weightKg?.let { return it }
    return null
}

/**
 * Default reps: last set's reps, or previous session's first set reps, or 8.
 */
private fun resolveDefaultReps(
    exercise: SessionExercise,
    previousSets: List<WorkoutSet>,
): Int {
    exercise.sets.lastOrNull()?.reps?.let { return it }
    previousSets.firstOrNull()?.reps?.let { return it }
    return 8
}
