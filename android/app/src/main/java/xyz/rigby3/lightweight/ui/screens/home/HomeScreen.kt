package xyz.rigby3.lightweight.ui.screens.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import xyz.rigby3.lightweight.domain.model.DayActivity
import xyz.rigby3.lightweight.domain.model.SessionSummary
import xyz.rigby3.lightweight.domain.model.Template
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import xyz.rigby3.lightweight.ui.components.LwButton
import xyz.rigby3.lightweight.ui.components.LwButtonStyle
import xyz.rigby3.lightweight.ui.components.LwCard
import xyz.rigby3.lightweight.ui.theme.CardRadius
import xyz.rigby3.lightweight.ui.theme.CutCornerShape
import xyz.rigby3.lightweight.ui.theme.LightweightTheme
import xyz.rigby3.lightweight.ui.theme.PagePadding
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import kotlin.math.abs

@Composable
fun HomeScreen(
    onNavigateToWorkout: () -> Unit = {},
    onNavigateToTemplates: () -> Unit = {},
    onNavigateToSession: (Long) -> Unit = {},
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.reload() }

    HomeContent(
        state = state,
        onStartFromTemplate = { templateId ->
            viewModel.startFromTemplate(templateId, onNavigateToWorkout)
        },
        onStartFreeform = {
            viewModel.startFreeform(onNavigateToWorkout)
        },
        onSessionTap = onNavigateToSession,
        onNavigateToTemplates = onNavigateToTemplates,
    )
}

@Composable
private fun HomeContent(
    state: HomeState,
    onStartFromTemplate: (Long) -> Unit,
    onStartFreeform: () -> Unit,
    onSessionTap: (Long) -> Unit,
    onNavigateToTemplates: () -> Unit,
) {
    val colors = LightweightTheme.colors
    var showTemplates by remember { mutableStateOf(false) }

    val isNewUser = state.recentSessions.isEmpty() && state.heatmapData.isEmpty()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(colors.bgPrimary)
            .padding(horizontal = PagePadding),
    ) {
        if (!showTemplates) {
            if (isNewUser) {
                WelcomeContent(
                    hasTemplates = state.templates.isNotEmpty(),
                    onNavigateToTemplates = onNavigateToTemplates,
                    modifier = Modifier.weight(1f),
                )
            } else {
                DashboardContent(
                    state = state,
                    onSessionTap = onSessionTap,
                    modifier = Modifier.weight(1f),
                )
            }

            // Subtle separator
            Box(modifier = Modifier.fillMaxWidth()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    colors.textSecondary.copy(alpha = 0.12f),
                                    Color.Transparent,
                                )
                            )
                        ),
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            HeroButton(
                text = "START WORKOUT",
                onClick = { showTemplates = true },
                enabled = !state.isCreatingSession,
            )

            Spacer(modifier = Modifier.height(16.dp))
        } else {
            TemplatePicker(
                state = state,
                onStartFromTemplate = onStartFromTemplate,
                onStartFreeform = onStartFreeform,
                onCancel = { showTemplates = false },
                modifier = Modifier.weight(1f),
            )
        }
    }
}

// ── Welcome (new user) ──

@Composable
private fun WelcomeContent(
    hasTemplates: Boolean,
    onNavigateToTemplates: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(modifier = Modifier.height(48.dp))

        Text(
            text = "SYSTEM INITIALISED",
            style = typography.heroTitle,
            color = colors.textPrimary,
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Ready for first session",
            style = typography.body,
            color = colors.textSecondary,
        )

        Spacer(modifier = Modifier.height(40.dp))

        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            StepCard(
                number = "01",
                title = "CREATE A TEMPLATE",
                subtitle = "Define exercises, sets, and rep targets",
                done = hasTemplates,
            )
            StepCard(
                number = "02",
                title = "START A WORKOUT",
                subtitle = "Use the button below to begin logging",
                done = false,
            )
            StepCard(
                number = "03",
                title = "TRACK PROGRESSION",
                subtitle = "Stats and trends populate as you train",
                done = false,
            )
        }

        if (!hasTemplates) {
            Spacer(modifier = Modifier.height(24.dp))
            LwButton(
                text = "CREATE TEMPLATE",
                onClick = onNavigateToTemplates,
                style = LwButtonStyle.Secondary,
                fullWidth = true,
            )
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun StepCard(
    number: String,
    title: String,
    subtitle: String,
    done: Boolean,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    LwCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.Top,
        ) {
            Text(
                text = number,
                style = typography.dataLarge,
                color = if (done) colors.accentGreen else colors.textSecondary,
                modifier = Modifier.padding(end = 16.dp),
            )
            Column {
                Text(
                    text = title,
                    style = typography.cardTitle,
                    color = if (done) colors.accentGreen else colors.textPrimary,
                )
                Text(
                    text = subtitle,
                    style = typography.body,
                    color = colors.textSecondary,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
    }
}

// ── Dashboard ──

@Composable
private fun DashboardContent(
    state: HomeState,
    onSessionTap: (Long) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.verticalScroll(rememberScrollState()),
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        StatsRow(
            sessionsThisWeek = state.sessionsThisWeek,
            weekStreak = state.weekStreak,
            daysSinceLast = state.daysSinceLast,
        )

        if (state.strengthTrendPercent != null) {
            Spacer(modifier = Modifier.height(12.dp))
            StrengthTrendCard(state.strengthTrendPercent)
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Bento: heatmap + movers
        if (state.exerciseMovers.isNotEmpty()) {
            HeatmapBento(
                heatmapData = state.heatmapData,
                movers = state.exerciseMovers,
            )
        } else {
            SectionLabel("12-WEEK ACTIVITY")
            Spacer(modifier = Modifier.height(8.dp))
            MiniHeatmap(
                data = state.heatmapData,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        if (state.recentSessions.isNotEmpty()) {
            Spacer(modifier = Modifier.height(24.dp))
            SectionLabel("RECENT SESSIONS")
            Spacer(modifier = Modifier.height(8.dp))
            state.recentSessions.forEach { session ->
                SessionCard(
                    session = session,
                    onClick = { onSessionTap(session.id) },
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = LightweightTheme.typography.label,
        color = LightweightTheme.colors.textSecondary,
    )
}

@Composable
private fun StatsRow(
    sessionsThisWeek: Int,
    weekStreak: Int,
    daysSinceLast: Int?,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        StatCell(
            value = sessionsThisWeek.toString(),
            label = "THIS WEEK",
            modifier = Modifier.weight(1f),
        )
        StatCell(
            value = if (weekStreak > 0) "${weekStreak}W" else "\u2014",
            label = "STREAK",
            modifier = Modifier.weight(1f),
        )
        StatCell(
            value = when (daysSinceLast) {
                null -> "\u2014"
                0 -> "TODAY"
                1 -> "1D"
                else -> "${daysSinceLast}D"
            },
            label = "LAST",
            modifier = Modifier.weight(1f),
        )
    }
}

// ── Bento: heatmap + movers ──

@Composable
private fun HeatmapBento(
    heatmapData: List<DayActivity>,
    movers: List<ExerciseMover>,
) {
    val colors = LightweightTheme.colors
    var moversExpanded by remember { mutableStateOf(false) }

    // Fixed height: 12dp pad + ~16dp label + 8dp spacer + 96dp grid (7×12 + 6×2) + 12dp pad
    val bentoHeight = 144.dp
    val heatmapWeeks = if (moversExpanded) 4 else 12

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(bentoHeight),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Heatmap: wraps content width (no weight — grid drives width)
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .clip(RoundedCornerShape(CardRadius))
                .background(colors.bgSurface)
                .clickable { if (moversExpanded) moversExpanded = false }
                .padding(12.dp),
        ) {
            SectionLabel(if (moversExpanded) "4W ACTIVITY" else "12-WEEK ACTIVITY")
            Spacer(modifier = Modifier.height(8.dp))
            MiniHeatmap(data = heatmapData, weeks = heatmapWeeks)
        }

        // Movers: fills remaining width
        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .clip(RoundedCornerShape(CardRadius))
                .background(colors.bgSurface)
                .clickable { if (!moversExpanded) moversExpanded = true }
                .padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            SectionLabel("MOVERS")
            Spacer(modifier = Modifier.height(6.dp))
            movers.forEach { mover ->
                MoverRow(mover, expanded = moversExpanded)
            }
        }
    }
}

@Composable
private fun MoverRow(mover: ExerciseMover, expanded: Boolean = false) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography
    val isPositive = mover.pctChange >= 0.0

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = if (expanded) mover.name.uppercase() else (mover.shortName ?: shortenName(mover.name)),
            style = typography.data.copy(fontSize = 11.sp),
            color = colors.textSecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        Text(
            text = formatMoverPct(mover.pctChange),
            style = typography.data.copy(fontSize = 11.sp),
            color = if (isPositive) colors.accentGreen else colors.accentRed,
            modifier = Modifier.padding(start = 4.dp),
        )
    }
}

private fun shortenName(name: String): String {
    val abbreviated = name
        .replace("Barbell ", "BB ", ignoreCase = true)
        .replace("Dumbbell ", "DB ", ignoreCase = true)
        .replace("Cable ", "C ", ignoreCase = true)
    // Drop common trailing noise words to surface the distinctive part
    val dropSuffixes = listOf("press", "row", "curl", "curls", "raise", "raises",
        "extension", "extensions", "fly", "flys", "flyes", "pulldown", "pushdown")
    val words = abbreviated.split(" ").filter { it.isNotBlank() }
    val trimmed = words.dropLastWhile { it.lowercase() in dropSuffixes }
        .ifEmpty { words }
    val result = trimmed.take(2).joinToString(" ").uppercase()
    return if (result.length > 14) trimmed.first().uppercase() else result
}

private fun formatMoverPct(percent: Double): String {
    val sign = if (percent >= 0) "+" else ""
    return if (abs(percent) >= 10.0) {
        "${sign}${percent.toInt()}%"
    } else {
        "${sign}${"%.1f".format(percent)}%"
    }
}

// ── Strength trend card ──

@Composable
private fun StrengthTrendCard(percent: Double) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography
    val isPositive = percent >= 0.0

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(CardRadius))
            .background(colors.bgSurface)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "STRENGTH TREND",
                style = typography.cardTitle,
                color = colors.textPrimary,
            )
            Text(
                text = "E1RM across top lifts",
                style = typography.data,
                color = colors.textSecondary,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
        Column(
            horizontalAlignment = Alignment.End,
            modifier = Modifier.padding(start = 12.dp),
        ) {
            Text(
                text = formatMoverPct(percent),
                style = typography.dataLarge,
                color = if (isPositive) colors.accentGreen else colors.accentRed,
            )
            Text(
                text = "4 WEEKS",
                style = typography.label,
                color = colors.textSecondary,
            )
        }
    }
}

// ── Hero CTA ──

@Composable
private fun HeroButton(
    text: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography
    val shape = CutCornerShape(8.dp)

    Button(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = 12.dp,
                shape = shape,
                ambientColor = colors.accentPrimary.copy(alpha = 0.5f),
                spotColor = colors.accentPrimary.copy(alpha = 0.5f),
            )
            .defaultMinSize(minHeight = 52.dp),
        enabled = enabled,
        shape = shape,
        colors = ButtonDefaults.buttonColors(
            containerColor = colors.accentPrimary,
            contentColor = colors.btnFilledText,
            disabledContainerColor = colors.accentPrimary.copy(alpha = 0.4f),
            disabledContentColor = colors.btnFilledText.copy(alpha = 0.5f),
        ),
        contentPadding = PaddingValues(horizontal = 24.dp, vertical = 14.dp),
        elevation = null,
    ) {
        Text(
            text = text.uppercase(),
            style = typography.button.copy(
                fontSize = 15.sp,
                fontWeight = FontWeight.W700,
                letterSpacing = 1.sp,
            ),
        )
    }
}

// ── Stat cell ──

@Composable
private fun StatCell(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(CardRadius))
            .background(colors.bgSurface)
            .padding(horizontal = 12.dp, vertical = 14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = value,
            style = typography.dataLarge,
            color = colors.accentPrimary,
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            style = typography.label,
            color = colors.textSecondary,
        )
    }
}

// ── Session card ──

@Composable
private fun SessionCard(
    session: SessionSummary,
    onClick: () -> Unit,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    LwCard(onClick = onClick) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = (session.templateName ?: session.name).uppercase(),
                    style = typography.cardTitle,
                    color = colors.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                val dateLabel = formatSessionDate(session.startedAt)
                Text(
                    text = "$dateLabel \u00B7 ${session.setCount} SETS \u00B7 ${session.exerciseCount} EX",
                    style = typography.data,
                    color = colors.textSecondary,
                    modifier = Modifier.padding(top = 4.dp),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Text(
                text = "\u203A",
                style = typography.pageTitle,
                color = colors.textSecondary,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
    }
}

private fun formatSessionDate(isoDate: String): String {
    return try {
        val date = if (isoDate.contains("T")) {
            LocalDate.parse(isoDate.substringBefore("T"))
        } else {
            LocalDate.parse(isoDate.take(10))
        }
        date.format(DateTimeFormatter.ofPattern("d MMM")).uppercase()
    } catch (_: Exception) {
        isoDate.take(10)
    }
}

// ── Template picker ──

@Composable
private fun TemplatePicker(
    state: HomeState,
    onStartFromTemplate: (Long) -> Unit,
    onStartFreeform: () -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = LightweightTheme.colors
    val typography = LightweightTheme.typography

    Column(modifier = Modifier.fillMaxSize()) {
        Spacer(modifier = Modifier.height(16.dp))

        SectionLabel("CHOOSE TEMPLATE")

        Spacer(modifier = Modifier.height(12.dp))

        Column(
            modifier = modifier.verticalScroll(rememberScrollState()),
        ) {
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

        // Freeform as a card-sized option
        LwCard(onClick = if (!state.isCreatingSession) onStartFreeform else null) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = "FREEFORM",
                    style = typography.cardTitle,
                    color = colors.textPrimary,
                )
                Text(
                    text = "Start without a template",
                    style = typography.data,
                    color = colors.textSecondary,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        LwButton(
            text = "CANCEL",
            onClick = onCancel,
            style = LwButtonStyle.Ghost,
            fullWidth = true,
        )

        Spacer(modifier = Modifier.height(16.dp))
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
                    text = "${template.exercises.size} EXERCISES \u00B7 ${totalSets} SETS",
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

// ── Heatmap ──

@Composable
private fun MiniHeatmap(
    data: List<DayActivity>,
    weeks: Int = 12,
    modifier: Modifier = Modifier,
) {
    val colors = LightweightTheme.colors
    val cellSize = 12.dp
    val cellGap = 2.dp

    val activityMap = remember(data) {
        data.associate { it.date to it.setCount }
    }

    val today = remember { LocalDate.now() }
    val endOfWeek = remember(today) {
        today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY))
    }
    val startDate = remember(endOfWeek, weeks) {
        endOfWeek.minusWeeks(weeks.toLong() - 1).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    }

    val maxSets = remember(data) {
        data.maxOfOrNull { it.setCount } ?: 1
    }

    val dateFormatter = remember { DateTimeFormatter.ISO_LOCAL_DATE }

    Column(modifier = modifier) {
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
