package xyz.rigby3.lightweight.ui.screens.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.local.dao.AnalyticsDao
import xyz.rigby3.lightweight.data.local.dao.TemplateDao
import xyz.rigby3.lightweight.data.repository.SessionRepository
import xyz.rigby3.lightweight.data.repository.SyncRepository
import xyz.rigby3.lightweight.data.repository.TemplateRepository
import xyz.rigby3.lightweight.domain.model.DayActivity
import xyz.rigby3.lightweight.domain.model.SessionSummary
import xyz.rigby3.lightweight.domain.model.Template
import xyz.rigby3.lightweight.domain.model.TemplateExercise
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters
import javax.inject.Inject

data class ExerciseMover(
    val name: String,
    val shortName: String?,
    val muscleGroup: String,
    val pctChange: Double,
)

data class HomeState(
    val loading: Boolean = true,
    val heatmapData: List<DayActivity> = emptyList(),
    val templates: List<Template> = emptyList(),
    val isCreatingSession: Boolean = false,
    val recentSessions: List<SessionSummary> = emptyList(),
    val sessionsThisWeek: Int = 0,
    val weekStreak: Int = 0,
    val daysSinceLast: Int? = null,
    val strengthTrendPercent: Double? = null,
    val exerciseMovers: List<ExerciseMover> = emptyList(),
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val templateRepository: TemplateRepository,
    private val analyticsDao: AnalyticsDao,
    private val templateDao: TemplateDao,
    private val tokenStore: TokenStore,
    private val syncRepository: SyncRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(HomeState())
    val state: StateFlow<HomeState> = _state.asStateFlow()

    init {
        reload()
        retryUnsynced()
    }

    private fun retryUnsynced() {
        if (!tokenStore.autoSyncEnabled) return
        viewModelScope.launch {
            try { syncRepository.pushUnsyncedSessions() }
            catch (_: Exception) { }
        }
    }

    fun reload() {
        loadCriticalPath()
        loadTemplates()
        loadStrengthTrend()
    }

    /** Heatmap + recent sessions in one shot — resolves welcome vs dashboard before first frame. */
    private fun loadCriticalPath() {
        viewModelScope.launch {
            val rows = analyticsDao.getActivityHeatmap(
                userId = tokenStore.userId,
                days = 84,
            )
            val data = rows.map { DayActivity(date = it.date, setCount = it.setCount) }
            val stats = computeStats(data)
            val recent = sessionRepository.getRecentCompleted()
            _state.update {
                it.copy(
                    heatmapData = data,
                    sessionsThisWeek = stats.thisWeek,
                    weekStreak = stats.weekStreak,
                    daysSinceLast = stats.daysSinceLast,
                    recentSessions = recent,
                    loading = false,
                )
            }
        }
    }

    private fun loadTemplates() {
        viewModelScope.launch {
            val entities = templateRepository.getAll().first()
            val templates = entities.map { entity ->
                val exerciseRows = templateDao.getExercisesWithNames(entity.id)
                Template(
                    id = entity.id,
                    name = entity.name,
                    notes = entity.notes,
                    version = entity.version,
                    exercises = exerciseRows.map { row ->
                        TemplateExercise(
                            id = row.id,
                            exerciseId = row.exerciseId,
                            exerciseName = row.exerciseName,
                            position = row.position,
                            targetSets = row.targetSets,
                            targetRepsMin = row.targetRepsMin,
                            targetRepsMax = row.targetRepsMax,
                            restSeconds = row.restSeconds,
                            notes = row.notes,
                        )
                    },
                )
            }
            _state.update { it.copy(templates = templates) }
        }
    }

    private fun loadStrengthTrend() {
        viewModelScope.launch {
            val rows = analyticsDao.getStrengthTrend(tokenStore.userId)
            val byExercise = rows.groupBy { it.exerciseId }

            // Compute per-exercise % changes (ordered by session_count from query)
            val allMovers = byExercise.entries.mapNotNull { (_, exerciseRows) ->
                val recent = exerciseRows.find { it.period == "recent" }?.bestE1rm
                    ?: return@mapNotNull null
                val previous = exerciseRows.find { it.period == "previous" }?.bestE1rm
                    ?: return@mapNotNull null
                if (previous <= 0.0) return@mapNotNull null
                val first = exerciseRows.first()
                ExerciseMover(
                    name = first.exerciseName,
                    shortName = first.shortName,
                    muscleGroup = first.muscleGroup,
                    pctChange = (recent - previous) / previous * 100.0,
                )
            }

            // One per muscle group (most frequent first, thanks to query ordering)
            // then sorted by % change descending for the leaderboard
            val movers = allMovers
                .distinctBy { it.muscleGroup }
                .take(5)
                .sortedByDescending { it.pctChange }

            val aggregate = if (movers.isNotEmpty()) movers.map { it.pctChange }.average() else null

            _state.update {
                it.copy(
                    strengthTrendPercent = aggregate,
                    exerciseMovers = movers,
                )
            }
        }
    }

    fun startFromTemplate(templateId: Long, onSessionCreated: () -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(isCreatingSession = true) }
            try {
                val template = templateRepository.getById(templateId) ?: return@launch
                val exercises = templateRepository.getExercises(templateId)
                sessionRepository.createFromTemplate(template, exercises)
                onSessionCreated()
            } finally {
                _state.update { it.copy(isCreatingSession = false) }
            }
        }
    }

    fun startFreeform(onSessionCreated: () -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(isCreatingSession = true) }
            try {
                sessionRepository.createFreeform()
                onSessionCreated()
            } finally {
                _state.update { it.copy(isCreatingSession = false) }
            }
        }
    }

    private data class Stats(
        val thisWeek: Int,
        val weekStreak: Int,
        val daysSinceLast: Int?,
    )

    private fun computeStats(data: List<DayActivity>): Stats {
        if (data.isEmpty()) return Stats(0, 0, null)

        val today = LocalDate.now()
        val activityDates = data.map { LocalDate.parse(it.date) }.toSet()

        val monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val thisWeek = activityDates.count { !it.isBefore(monday) && !it.isAfter(today) }

        var streak = 0
        var weekStart = monday
        while (true) {
            val weekEnd = weekStart.plusDays(6).let { if (it.isAfter(today)) today else it }
            val hasActivity = activityDates.any { !it.isBefore(weekStart) && !it.isAfter(weekEnd) }
            if (hasActivity) {
                streak++
                weekStart = weekStart.minusWeeks(1)
            } else {
                break
            }
        }

        val lastDate = activityDates.max()
        val daysSince = ChronoUnit.DAYS.between(lastDate, today).toInt()

        return Stats(thisWeek, streak, daysSince)
    }
}
