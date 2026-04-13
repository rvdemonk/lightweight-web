package xyz.rigby3.lightweight.ui.screens.home

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.rigby3.lightweight.domain.model.DayActivity
import xyz.rigby3.lightweight.domain.model.Template
import xyz.rigby3.lightweight.ui.components.LwButton
import xyz.rigby3.lightweight.ui.components.LwButtonStyle
import xyz.rigby3.lightweight.ui.components.LwCard
import xyz.rigby3.lightweight.ui.theme.CardRadius
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.PagePadding
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters

@Composable
fun HomeScreen(
    onNavigateToWorkout: () -> Unit = {},
    onNavigateToTemplates: () -> Unit = {},
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    // Reload heatmap and templates when screen becomes visible
    LaunchedEffect(Unit) { viewModel.reload() }

    HomeContent(
        state = state,
        onStartFromTemplate = { templateId ->
            viewModel.startFromTemplate(templateId, onNavigateToWorkout)
        },
        onStartFreeform = {
            viewModel.startFreeform(onNavigateToWorkout)
        },
    )
}

@Composable
private fun HomeContent(
    state: HomeState,
    onStartFromTemplate: (Long) -> Unit,
    onStartFreeform: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    var showTemplates by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = PagePadding),
    ) {
        Spacer(modifier = Modifier.height(32.dp))

        // --- Mini Heatmap ---
        MiniHeatmap(
            data = state.heatmapData,
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
        )

        Spacer(modifier = Modifier.height(24.dp))

        // --- Start Buttons ---
        LwButton(
            text = "START FROM TEMPLATE",
            onClick = { showTemplates = !showTemplates },
            style = LwButtonStyle.Primary,
            fullWidth = true,
            enabled = !state.isCreatingSession,
        )

        Spacer(modifier = Modifier.height(12.dp))

        // --- Inline Template List ---
        AnimatedVisibility(
            visible = showTemplates,
            enter = expandVertically(),
            exit = shrinkVertically(),
        ) {
            Column(modifier = Modifier.padding(bottom = 4.dp).heightIn(max = 400.dp)) {
                if (state.templates.isEmpty()) {
                    LwCard {
                        Text(
                            text = "No templates yet",
                            style = typography.body,
                            color = colors.textSecondary,
                        )
                    }
                } else {
                    state.templates.forEach { template ->
                        TemplateSelectionCard(
                            template = template,
                            enabled = !state.isCreatingSession,
                            onClick = { onStartFromTemplate(template.id) },
                        )
                    }
                }
            }
        }

        LwButton(
            text = "FREEFORM",
            onClick = onStartFreeform,
            style = LwButtonStyle.Secondary,
            fullWidth = true,
            enabled = !state.isCreatingSession,
        )

        Spacer(modifier = Modifier.height(32.dp))
    }
}

@Composable
private fun TemplateSelectionCard(
    template: Template,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    LwCard(onClick = if (enabled) onClick else null) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = template.name.uppercase(),
                    style = typography.cardTitle,
                    color = colors.textPrimary,
                )
                val totalSets = template.exercises.sumOf { it.targetSets ?: 0 }
                Text(
                    text = "${template.exercises.size} EXERCISES · ${totalSets} SETS",
                    style = typography.data,
                    color = colors.textSecondary,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
            Text(
                text = "\u203A",
                style = typography.pageTitle,
                color = colors.textSecondary,
            )
        }
    }
}

@Composable
private fun MiniHeatmap(
    data: List<DayActivity>,
    modifier: Modifier = Modifier,
) {
    val colors = LightweightTheme.colors
    val weeks = 12
    val cellSize = 12.dp
    val cellGap = 2.dp

    // Build a lookup map: date string -> set count
    val activityMap = remember(data) {
        data.associate { it.date to it.setCount }
    }

    // Compute the grid: 12 weeks ending on the current week
    val today = remember { LocalDate.now() }
    val endOfWeek = remember(today) {
        today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
    }
    val startDate = remember(endOfWeek) {
        endOfWeek.minusWeeks(weeks.toLong() - 1).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    }

    val maxSets = remember(data) {
        data.maxOfOrNull { it.setCount } ?: 1
    }

    val dateFormatter = remember { DateTimeFormatter.ISO_LOCAL_DATE }

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // 7 rows (Mon=0 .. Sun=6) x 12 columns (weeks)
        for (dayOfWeekIndex in 0 until 7) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(cellGap),
            ) {
                for (weekIndex in 0 until weeks) {
                    val cellDate = startDate
                        .plusWeeks(weekIndex.toLong())
                        .plusDays(dayOfWeekIndex.toLong())

                    val dateStr = cellDate.format(dateFormatter)
                    val setCount = activityMap[dateStr] ?: 0

                    val cellColor = if (setCount == 0 || cellDate.isAfter(today)) {
                        colors.bgElevated
                    } else {
                        val intensity = (setCount.toFloat() / maxSets).coerceIn(0.2f, 1f)
                        colors.accentPrimary.copy(alpha = intensity)
                    }

                    Box(
                        modifier = Modifier
                            .size(cellSize)
                            .clip(RoundedCornerShape(CardRadius))
                            .background(cellColor),
                    )
                }
            }
            if (dayOfWeekIndex < 6) {
                Spacer(modifier = Modifier.height(cellGap))
            }
        }
    }
}
