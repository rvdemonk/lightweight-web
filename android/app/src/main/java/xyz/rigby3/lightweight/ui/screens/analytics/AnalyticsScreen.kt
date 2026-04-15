package xyz.rigby3.lightweight.ui.screens.analytics

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.rigby3.lightweight.domain.calc.Trend
import xyz.rigby3.lightweight.ui.chart.ChartColors
import xyz.rigby3.lightweight.ui.chart.ChartPalette
import xyz.rigby3.lightweight.ui.chart.ChartTextStyles
import xyz.rigby3.lightweight.ui.chart.chartColors
import xyz.rigby3.lightweight.ui.chart.chartTextStyles
import xyz.rigby3.lightweight.ui.theme.CardRadius
import xyz.rigby3.lightweight.ui.theme.DataFamily
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.MinTouchTarget
import xyz.rigby3.lightweight.ui.theme.PagePadding

@Composable
fun AnalyticsScreen(
    viewModel: AnalyticsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val colors = LightweightTheme.colors
    val chartColors = chartColors()
    val chartTextStyles = chartTextStyles()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary),
    ) {
        // 2-tab bar
        TabBar(
            selectedTab = state.selectedTab,
            onTabSelected = viewModel::selectTab,
        )

        val contentVisible = remember { MutableTransitionState(false) }
        contentVisible.targetState = !state.isLoading

        AnimatedVisibility(
            visibleState = contentVisible,
            enter = fadeIn(tween(150)),
            modifier = Modifier.weight(1f),
        ) {
            when (state.selectedTab) {
                AnalyticsTab.Progression -> ProgressionTab(
                    state = state,
                    chartColors = chartColors,
                    chartTextStyles = chartTextStyles,
                    onExerciseSelected = viewModel::selectExercise,
                    onModeChanged = viewModel::setProgressionMode,
                    onToggleComparison = viewModel::toggleComparisonExercise,
                )
                AnalyticsTab.Volume -> VolumeTab(
                    state = state,
                    chartColors = chartColors,
                    chartTextStyles = chartTextStyles,
                    onVolumeModeChanged = viewModel::setVolumeMode,
                )
            }
        }
    }
}

// =============================================================================
// Tab Bar
// =============================================================================

@Composable
private fun TabBar(
    selectedTab: AnalyticsTab,
    onTabSelected: (AnalyticsTab) -> Unit,
) {
    val colors = LightweightTheme.colors
    val typo = LightweightTheme.typography
    val accentColor = colors.accentPrimary

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colors.bgSurface)
            .padding(horizontal = PagePadding),
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        AnalyticsTab.entries.forEach { tab ->
            val isSelected = tab == selectedTab
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(MinTouchTarget)
                    .clickable { onTabSelected(tab) }
                    .then(
                        if (isSelected) Modifier.drawBehind {
                            drawLine(accentColor, Offset(0f, size.height - 1f), Offset(size.width, size.height - 1f), 2.dp.toPx())
                        } else Modifier
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = tab.name.uppercase(),
                    style = typo.label,
                    color = if (isSelected) colors.textPrimary else colors.textSecondary,
                )
            }
        }
    }
}

// =============================================================================
// Progression Tab
// =============================================================================

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
private fun ProgressionTab(
    state: AnalyticsState,
    chartColors: ChartColors,
    chartTextStyles: ChartTextStyles,
    onExerciseSelected: (Long) -> Unit,
    onModeChanged: (ProgressionMode) -> Unit,
    onToggleComparison: (Long) -> Unit,
) {
    val colors = LightweightTheme.colors
    val typo = LightweightTheme.typography
    var showPicker by remember { mutableStateOf(false) }
    var showComparePicker by remember { mutableStateOf(false) }

    // Any exercise with 2+ sessions means there's enough data for progression controls
    val hasProgressionData = state.exercises.any { it.sessionCount >= 2 }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = PagePadding, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        // Heading
        Text("ESTIMATED 1RM", style = typo.heroTitle, color = colors.textPrimary, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)

        if (!hasProgressionData) {
            InsufficientDataMessage("Log 2+ sessions of an exercise to see progression")
        } else {
            // Slot 1: Selector (content varies by mode)
            if (state.progressionMode == ProgressionMode.Single) {
                SelectorButton(
                    text = state.selectedExerciseName.ifEmpty { "SELECT EXERCISE" },
                    hasValue = state.selectedExerciseName.isNotEmpty(),
                    onClick = { showPicker = true },
                ) {
                    state.e1rmTrend?.let { trend ->
                        val (text, color) = when (trend) {
                            Trend.Up -> "UP" to chartColors.positive
                            Trend.Down -> "DOWN" to chartColors.negative
                            Trend.Flat -> "FLAT" to colors.textSecondary
                        }
                        Text(text, fontFamily = DataFamily, fontSize = 11.sp, fontWeight = FontWeight.W700, color = color)
                    }
                }
            } else {
                val selectedCount = state.comparisonExerciseIds.size
                SelectorButton(
                    text = if (selectedCount > 0) "$selectedCount EXERCISES SELECTED" else "SELECT EXERCISES",
                    hasValue = selectedCount > 0,
                    onClick = { showComparePicker = true },
                )
            }

            // Slot 2: Stats / legend area (fixed height — prevents bounce)
            Box(modifier = Modifier.fillMaxWidth().heightIn(min = 56.dp), contentAlignment = Alignment.Center) {
                if (state.progressionMode == ProgressionMode.Single) {
                    state.exerciseStats?.let { stats ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                            StatCell("CURRENT", "${"%.1f".format(stats.currentE1rm)}", "kg", chartColors.primary)
                            StatCell("ALL-TIME BEST", "${"%.1f".format(stats.allTimeBest)}", "kg", chartColors.secondary, stats.bestSetSpec)
                            stats.delta30d?.let { d ->
                                val sign = if (d >= 0) "+" else ""
                                StatCell("30D", "$sign${"%.1f".format(d)}%", null, if (d >= 0) chartColors.positive else chartColors.negative)
                            }
                        }
                    }
                } else {
                    // Compare mode: chart has inline end-labels, keep slot for spacing consistency
                    val count = state.comparisonExerciseIds.size
                    if (count > 0) {
                        Text(
                            "% IMPROVEMENT FROM FIRST SESSION",
                            fontFamily = DataFamily,
                            fontSize = 10.sp,
                            color = colors.textSecondary,
                            modifier = Modifier.fillMaxWidth(),
                            textAlign = TextAlign.Center,
                        )
                    }
                }
            }

            // Slot 3: Chart (requires 2+ sessions for meaningful progression data)
            if (state.progressionMode == ProgressionMode.Single) {
                if (state.e1rmHistory.size >= 2) {
                    E1rmLineChart(dataPoints = state.e1rmHistory, rollingBest = state.e1rmRollingBest, colors = chartColors, textStyles = chartTextStyles)
                } else if (state.progressionLoaded && state.selectedExerciseId != null) {
                    InsufficientDataMessage("Log 2+ sessions of this exercise to see progression")
                }
            } else {
                if (state.comparisonData.any { it.points.size >= 2 }) {
                    E1rmComparisonChart(series = state.comparisonData, colors = chartColors, textStyles = chartTextStyles)
                } else if (state.progressionLoaded && state.comparisonExerciseIds.isNotEmpty()) {
                    InsufficientDataMessage("Need 2+ sessions per exercise for comparison")
                }
            }

            // Mode toggle below chart
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)) {
                ProgressionMode.entries.forEach { mode ->
                    val isSelected = mode == state.progressionMode
                    Box(
                        modifier = Modifier
                            .background(if (isSelected) colors.bgElevated else colors.bgSurface, RoundedCornerShape(CardRadius))
                            .border(1.dp, if (isSelected) colors.borderActive else colors.borderSubtle, RoundedCornerShape(CardRadius))
                            .clickable { onModeChanged(mode) }
                            .padding(horizontal = 20.dp, vertical = 10.dp),
                    ) {
                        Text(mode.name.uppercase(), style = typo.label, color = if (isSelected) colors.textPrimary else colors.textSecondary)
                    }
                }
            }

            // Movers
            state.movers?.let { movers ->
                Spacer(Modifier.height(8.dp))
                Text("E1RM MOVERS (30D)", style = typo.label, color = colors.textSecondary)
                E1rmMovers(movers = movers, colors = chartColors)
            }
        }

        Spacer(Modifier.height(24.dp))
    }

    // Single exercise picker bottom sheet
    if (showPicker) {
        ExercisePickerSheet(
            title = "SELECT EXERCISE",
            exercises = state.exercises,
            selectedIds = state.selectedExerciseId?.let { setOf(it) } ?: emptySet(),
            multiSelect = false,
            onToggle = { id -> onExerciseSelected(id); showPicker = false },
            onDismiss = { showPicker = false },
        )
    }

    // Compare multi-select bottom sheet
    if (showComparePicker) {
        ExercisePickerSheet(
            title = "SELECT EXERCISES (UP TO 6)",
            exercises = state.exercises,
            selectedIds = state.comparisonExerciseIds.toSet(),
            multiSelect = true,
            seriesColors = state.comparisonExerciseIds,
            onToggle = onToggleComparison,
            onDismiss = { showComparePicker = false },
        )
    }
}

// =============================================================================
// Volume Tab
// =============================================================================

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun VolumeTab(
    state: AnalyticsState,
    chartColors: ChartColors,
    chartTextStyles: ChartTextStyles,
    onVolumeModeChanged: (VolumeMode) -> Unit,
) {
    val colors = LightweightTheme.colors
    val typo = LightweightTheme.typography

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = PagePadding, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        // Volume heading
        Text("WEEKLY VOLUME", style = typo.heroTitle, color = colors.textPrimary, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)

        // Volume chart (requires 2+ weeks for meaningful trends)
        val distinctWeeks = state.weeklyVolume.map { it.week }.distinct().size
        if (distinctWeeks >= 2) {
            VolumeBarChart(data = state.weeklyVolume, mode = state.volumeMode, colors = chartColors, textStyles = chartTextStyles)

            // Mode selector below chart
            SelectorButton(
                text = state.volumeMode.name.uppercase(),
                hasValue = true,
                onClick = { onVolumeModeChanged(
                    when (state.volumeMode) {
                        VolumeMode.Total -> VolumeMode.Split
                        VolumeMode.Split -> VolumeMode.Muscle
                        VolumeMode.Muscle -> VolumeMode.Total
                    }
                ) },
            )

            // Legend — fixed height container, content changes but space is reserved
            Box(modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp), contentAlignment = Alignment.Center) {
                when (state.volumeMode) {
                    VolumeMode.Split -> {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally)) {
                            LegendItem("Upper", ChartPalette.UpperColor)
                            LegendItem("Lower", ChartPalette.LowerColor)
                            LegendItem("Core", ChartPalette.CoreColor)
                        }
                    }
                    VolumeMode.Muscle -> {
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            ChartPalette.muscleGroupColors.forEach { (name, color) ->
                                LegendItem(name, color)
                            }
                        }
                    }
                    VolumeMode.Total -> {
                        // Empty but space reserved
                    }
                }
            }
        } else if (state.volumeLoaded) {
            InsufficientDataMessage("Keep training for 2+ weeks to see volume trends")
        }

        // Frequency heading
        Text("SESSION FREQUENCY", style = typo.heroTitle, color = colors.textPrimary, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)

        // Frequency chart
        val distinctFreqWeeks = state.weeklyFrequency.map { it.week }.distinct().size
        if (distinctFreqWeeks >= 2) {
            FrequencyChart(data = state.weeklyFrequency, colors = chartColors, textStyles = chartTextStyles)
        } else if (state.volumeLoaded) {
            InsufficientDataMessage("Keep training for 2+ weeks to see frequency trends")
        }

        Spacer(Modifier.height(24.dp))
    }
}

// =============================================================================
// Shared Components
// =============================================================================

@Composable
private fun StatCell(
    label: String,
    value: String,
    unit: String?,
    valueColor: androidx.compose.ui.graphics.Color,
    subtext: String? = null,
) {
    val colors = LightweightTheme.colors
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontFamily = DataFamily, fontSize = 10.sp, fontWeight = FontWeight.W400, color = colors.textSecondary, letterSpacing = 0.5.sp)
        Spacer(Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(value, fontFamily = DataFamily, fontSize = 20.sp, fontWeight = FontWeight.W700, color = valueColor)
            if (unit != null) {
                Text(unit, fontFamily = DataFamily, fontSize = 11.sp, fontWeight = FontWeight.W400, color = colors.textSecondary, modifier = Modifier.padding(start = 2.dp, bottom = 2.dp))
            }
        }
        if (subtext != null) {
            Text(subtext, fontFamily = DataFamily, fontSize = 10.sp, color = colors.textSecondary, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

@Composable
private fun LegendItem(name: String, color: androidx.compose.ui.graphics.Color) {
    val textColor = LightweightTheme.colors.textSecondary
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(Modifier.size(8.dp).clip(RoundedCornerShape(1.dp)).background(color))
        Text(name, fontFamily = DataFamily, fontSize = 10.sp, color = textColor)
    }
}

@Composable
private fun InsufficientDataMessage(message: String) {
    val colors = LightweightTheme.colors
    val typo = LightweightTheme.typography
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(160.dp)
            .background(colors.bgSurface, RoundedCornerShape(CardRadius))
            .padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = message,
            style = typo.body,
            color = colors.textSecondary,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun SelectorButton(
    text: String,
    hasValue: Boolean,
    onClick: () -> Unit,
    trailing: @Composable (() -> Unit)? = null,
) {
    val colors = LightweightTheme.colors
    val typo = LightweightTheme.typography
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(MinTouchTarget)
            .background(colors.bgSurface, RoundedCornerShape(CardRadius))
            .border(1.dp, colors.borderSubtle, RoundedCornerShape(CardRadius))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(text, style = typo.cardTitle, color = if (hasValue) colors.textPrimary else colors.textSecondary)
            trailing?.invoke()
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExercisePickerSheet(
    title: String,
    exercises: List<xyz.rigby3.lightweight.data.local.row.ExerciseWithSessionCountRow>,
    selectedIds: Set<Long>,
    multiSelect: Boolean,
    seriesColors: List<Long> = emptyList(),
    onToggle: (Long) -> Unit,
    onDismiss: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typo = LightweightTheme.typography
    val sheetState = rememberModalBottomSheetState()

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = colors.bgSurface,
    ) {
        Text(title, style = typo.pageTitle, color = colors.textPrimary, modifier = Modifier.padding(horizontal = PagePadding, vertical = 8.dp))
        LazyColumn(modifier = Modifier.fillMaxWidth().heightIn(max = 400.dp)) {
            items(exercises) { exercise ->
                val isSelected = exercise.id in selectedIds
                val seriesIndex = if (multiSelect) seriesColors.indexOf(exercise.id) else -1
                val accentColor = if (multiSelect && seriesIndex >= 0) ChartPalette.seriesColor(seriesIndex) else colors.accentPrimary

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(if (isSelected) colors.bgElevated else colors.bgSurface)
                        .clickable { onToggle(exercise.id) }
                        .padding(horizontal = PagePadding, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (multiSelect) {
                            Box(
                                modifier = Modifier
                                    .size(16.dp)
                                    .background(
                                        if (isSelected) accentColor else colors.bgSurface,
                                        RoundedCornerShape(2.dp),
                                    )
                                    .border(1.dp, if (isSelected) accentColor else colors.borderSubtle, RoundedCornerShape(2.dp)),
                            )
                        }
                        Column {
                            Text(exercise.name, style = typo.body, fontWeight = FontWeight.W500, color = if (isSelected) accentColor else colors.textPrimary)
                            exercise.muscleGroup?.let { Text(it, fontFamily = DataFamily, fontSize = 10.sp, color = colors.textSecondary) }
                        }
                    }
                    Text("${exercise.sessionCount}", fontFamily = DataFamily, fontSize = 12.sp, color = colors.textSecondary)
                }
            }
        }
        Spacer(Modifier.height(32.dp))
    }
}
