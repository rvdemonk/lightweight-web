package xyz.rigby3.lightweight.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import xyz.rigby3.lightweight.domain.model.Exercise
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.MinTouchTarget
import xyz.rigby3.lightweight.ui.theme.PagePadding

val MUSCLE_GROUPS = listOf(
    "Back", "Biceps", "Calves", "Chest", "Core", "Forearms",
    "Glutes", "Hamstrings", "Neck", "Quads", "Shoulders", "Triceps", "Other"
)

val EQUIPMENT = listOf(
    "Barbell", "Bodyweight", "Cable", "Dumbbells", "Kettlebell", "Machine", "Band", "Other"
)

@Composable
fun ExercisePicker(
    exercises: List<Exercise>,
    onSelect: (Exercise) -> Unit,
    onCreate: (name: String, muscleGroup: String?, equipment: String?) -> Unit,
    onClose: () -> Unit,
    excludeIds: Set<Long> = emptySet(),
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    var query by remember { mutableStateOf("") }
    var showCreateForm by remember { mutableStateOf(false) }

    val filtered = remember(exercises, query, excludeIds) {
        exercises.filter { ex ->
            ex.id !in excludeIds && (query.isBlank() ||
                ex.name.contains(query, ignoreCase = true) ||
                ex.muscleGroup?.contains(query, ignoreCase = true) == true)
        }
    }

    val canCreate = query.isNotBlank() && filtered.none {
        it.name.equals(query.trim(), ignoreCase = true)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary)
            .padding(PagePadding),
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            LwTextField(
                value = query,
                onValueChange = { query = it; showCreateForm = false },
                placeholder = "Search or create exercise...",
                modifier = Modifier.weight(1f),
                keyboardOptions = KeyboardOptions(
                    autoCorrectEnabled = false,
                    capitalization = KeyboardCapitalization.Characters,
                ),
            )
            IconButton(onClick = onClose, modifier = Modifier.size(MinTouchTarget)) {
                Icon(Icons.Filled.Close, "Close", tint = colors.textSecondary)
            }
        }

        // Exercise list
        LazyColumn(
            modifier = Modifier
                .weight(1f)
                .padding(top = 8.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            items(filtered, key = { it.id }) { exercise ->
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(2.dp),
                    color = colors.bgSurface,
                    border = BorderStroke(1.dp, colors.borderSubtle),
                    onClick = { onSelect(exercise) },
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            text = exercise.name.uppercase(),
                            style = typography.cardTitle,
                            color = colors.textPrimary,
                        )
                        val detail = listOfNotNull(exercise.muscleGroup, exercise.equipment).joinToString(" · ")
                        if (detail.isNotBlank()) {
                            Text(
                                text = "  ·  $detail",
                                style = typography.data,
                                color = colors.textSecondary,
                            )
                        }
                    }
                }
            }

            // Create option
            if (canCreate) {
                item {
                    if (!showCreateForm) {
                        LwButton(
                            text = "CREATE: ${query.trim().uppercase()}",
                            onClick = { showCreateForm = true },
                            style = LwButtonStyle.Secondary,
                            fullWidth = true,
                        )
                    } else {
                        CreateExerciseForm(
                            name = query.trim().uppercase(),
                            onCreate = { muscleGroup, equipment ->
                                onCreate(query.trim().uppercase(), muscleGroup, equipment)
                            },
                        )
                    }
                }
            }

            if (filtered.isEmpty() && !canCreate) {
                item {
                    Text(
                        "No exercises found",
                        style = typography.body,
                        color = colors.textSecondary,
                        modifier = Modifier.padding(vertical = 24.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun CreateExerciseForm(
    name: String,
    onCreate: (muscleGroup: String?, equipment: String?) -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography
    var muscleGroup by remember { mutableStateOf<String?>(null) }
    var equipment by remember { mutableStateOf<String?>(null) }

    LwCard {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("NEW: $name", style = typography.cardTitle, color = colors.accentPrimary)

            PickerDropdown(
                label = "MUSCLE GROUP",
                options = MUSCLE_GROUPS,
                selected = muscleGroup,
                onSelect = { muscleGroup = it },
            )

            PickerDropdown(
                label = "EQUIPMENT",
                options = EQUIPMENT,
                selected = equipment,
                onSelect = { equipment = it },
            )

            LwButton(
                text = "CREATE & ADD",
                onClick = { onCreate(muscleGroup, equipment) },
                style = LwButtonStyle.Primary,
                fullWidth = true,
            )
        }
    }
}

@Composable
private fun PickerDropdown(
    label: String,
    options: List<String>,
    selected: String?,
    onSelect: (String?) -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography
    var expanded by remember { mutableStateOf(false) }

    Column(modifier = Modifier.padding(vertical = 4.dp)) {
        Text(label, style = typography.label, color = colors.textSecondary)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = true }
                .background(colors.bgElevated)
                .padding(12.dp),
        ) {
            Text(
                selected ?: "Select...",
                style = typography.body,
                color = if (selected != null) colors.textPrimary else colors.textSecondary,
            )
        }
        if (expanded) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.bgElevated),
            ) {
                options.forEach { option ->
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onSelect(option); expanded = false }
                            .padding(12.dp),
                    ) {
                        Text(option, style = typography.body, color = colors.textPrimary)
                    }
                }
            }
        }
    }
}
