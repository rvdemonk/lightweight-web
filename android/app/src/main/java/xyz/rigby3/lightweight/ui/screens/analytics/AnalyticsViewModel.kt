package xyz.rigby3.lightweight.ui.screens.analytics

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.local.dao.AnalyticsDao
import xyz.rigby3.lightweight.data.local.row.ExerciseWithSessionCountRow
import xyz.rigby3.lightweight.data.local.row.WeeklyFrequencyRow
import xyz.rigby3.lightweight.data.local.row.WeeklyVolumeRow
import xyz.rigby3.lightweight.domain.calc.Trend
import xyz.rigby3.lightweight.domain.calc.computeTrend
import xyz.rigby3.lightweight.domain.calc.e1rm
import xyz.rigby3.lightweight.domain.calc.filterDeloads
import xyz.rigby3.lightweight.domain.calc.pctChange
import xyz.rigby3.lightweight.domain.calc.round1
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject

// -- Enums ----------------------------------------------------------------

enum class AnalyticsTab { Progression, Volume }
enum class ProgressionMode { Single, Compare }
enum class VolumeMode { Total, Split, Muscle }

// -- Domain models --------------------------------------------------------

data class MoverItem(
    val exerciseName: String,
    val muscleGroup: String?,
    val currentE1rm: Double,
    val pctChange: Double,
)

data class MoversData(
    val gainers: List<MoverItem>,
    val losers: List<MoverItem>,
)

data class E1rmDataPoint(
    val date: String,
    val e1rm: Double,
    val weightKg: Double,
    val reps: Int,
)

data class ExerciseStats(
    val currentE1rm: Double,
    val allTimeBest: Double,
    val delta30d: Double?,
    val bestSetSpec: String,
)

data class ComparisonSeries(
    val exerciseId: Long,
    val exerciseName: String,
    val points: List<E1rmDataPoint>,
)

// -- State ----------------------------------------------------------------

data class AnalyticsState(
    val selectedTab: AnalyticsTab = AnalyticsTab.Progression,
    val isLoading: Boolean = true,

    // Progression — shared
    val exercises: List<ExerciseWithSessionCountRow> = emptyList(),
    val progressionMode: ProgressionMode = ProgressionMode.Single,
    val movers: MoversData? = null,

    // Progression — single mode
    val selectedExerciseId: Long? = null,
    val selectedExerciseName: String = "",
    val e1rmHistory: List<E1rmDataPoint> = emptyList(),
    val e1rmRollingBest: List<E1rmDataPoint> = emptyList(),
    val e1rmTrend: Trend? = null,
    val exerciseStats: ExerciseStats? = null,

    // Progression — compare mode
    val comparisonExerciseIds: List<Long> = emptyList(),
    val comparisonData: List<ComparisonSeries> = emptyList(),

    // Volume
    val weeklyVolume: List<WeeklyVolumeRow> = emptyList(),
    val weeklyFrequency: List<WeeklyFrequencyRow> = emptyList(),
    val volumeMode: VolumeMode = VolumeMode.Total,

    // Flags
    val progressionLoaded: Boolean = false,
    val volumeLoaded: Boolean = false,
)

// -- ViewModel ------------------------------------------------------------

@HiltViewModel
class AnalyticsViewModel @Inject constructor(
    private val analyticsDao: AnalyticsDao,
    private val tokenStore: TokenStore,
) : ViewModel() {

    private val _state = MutableStateFlow(AnalyticsState())
    val state: StateFlow<AnalyticsState> = _state.asStateFlow()

    private val userId get() = tokenStore.userId

    init {
        loadProgression()
    }

    fun selectTab(tab: AnalyticsTab) {
        _state.update { it.copy(selectedTab = tab) }
        when (tab) {
            AnalyticsTab.Progression -> if (!_state.value.progressionLoaded) loadProgression()
            AnalyticsTab.Volume -> if (!_state.value.volumeLoaded) loadVolume()
        }
    }

    fun setProgressionMode(mode: ProgressionMode) {
        _state.update { it.copy(progressionMode = mode) }
        if (mode == ProgressionMode.Compare && _state.value.comparisonData.isEmpty()) {
            // Auto-select top 4 exercises for comparison
            val top = _state.value.exercises.take(4).map { it.id }
            _state.update { it.copy(comparisonExerciseIds = top) }
            loadComparison(top)
        }
    }

    fun setVolumeMode(mode: VolumeMode) {
        _state.update { it.copy(volumeMode = mode) }
    }

    fun selectExercise(exerciseId: Long) {
        val name = _state.value.exercises.find { it.id == exerciseId }?.name ?: ""
        _state.update { it.copy(selectedExerciseId = exerciseId, selectedExerciseName = name) }
        loadExerciseE1rm(exerciseId)
    }

    fun toggleComparisonExercise(exerciseId: Long) {
        val current = _state.value.comparisonExerciseIds.toMutableList()
        if (current.contains(exerciseId)) {
            current.remove(exerciseId)
        } else if (current.size < 6) {
            current.add(exerciseId)
        }
        _state.update { it.copy(comparisonExerciseIds = current) }
        loadComparison(current)
    }

    // -- Progression ----------------------------------------------------------

    private fun loadProgression() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }

            val exercises = analyticsDao.getExercisesWithSessionCount(userId)
            val first = exercises.firstOrNull()

            // Movers from all working sets
            val moversData = computeMovers()

            _state.update {
                it.copy(
                    isLoading = false,
                    progressionLoaded = true,
                    exercises = exercises,
                    selectedExerciseId = first?.id,
                    selectedExerciseName = first?.name ?: "",
                    movers = moversData,
                )
            }
            first?.let { loadExerciseE1rm(it.id) }
        }
    }

    private suspend fun computeMovers(): MoversData {
        val allSets = analyticsDao.getAllWorkingSets(userId)
        val cutoff30d = LocalDate.now().minusDays(30).format(DateTimeFormatter.ISO_LOCAL_DATE)

        data class ExerciseWindow(
            val exerciseName: String,
            val muscleGroup: String?,
            var currentBest: Double = 0.0,
            var previousBest: Double = 0.0,
        )
        val windows = mutableMapOf<Long, ExerciseWindow>()

        for (row in allSets) {
            val e = e1rm(row.weightKg.toDouble(), row.reps, row.rir)
            val w = windows.getOrPut(row.exerciseId) {
                ExerciseWindow(row.exerciseName, row.muscleGroup)
            }
            if (row.date >= cutoff30d) {
                if (e > w.currentBest) w.currentBest = e
            } else {
                if (e > w.previousBest) w.previousBest = e
            }
        }

        val movers = windows.values
            .filter { it.currentBest > 0.0 && it.previousBest > 0.0 }
            .mapNotNull { w ->
                val pct = pctChange(w.currentBest, w.previousBest) ?: return@mapNotNull null
                MoverItem(w.exerciseName, w.muscleGroup, round1(w.currentBest), round1(pct))
            }
            .sortedByDescending { it.pctChange }

        return MoversData(
            gainers = movers.filter { it.pctChange > 0.0 }.take(3),
            losers = movers.filter { it.pctChange < 0.0 }.takeLast(3).reversed(),
        )
    }

    private fun loadExerciseE1rm(exerciseId: Long) {
        viewModelScope.launch {
            val sets = analyticsDao.getAllSetsForExercise(userId, exerciseId)

            val byDate = sets
                .filter { it.weightKg > 0 && it.reps > 0 }
                .groupBy { it.date }
                .map { (date, dateSets) ->
                    val best = dateSets.maxBy { e1rm(it.weightKg, it.reps, it.rir) }
                    E1rmDataPoint(
                        date = date,
                        e1rm = round1(e1rm(best.weightKg, best.reps, best.rir)),
                        weightKg = best.weightKg,
                        reps = best.reps,
                    )
                }
                .sortedBy { it.date }

            val rollingBest = computeRollingBest(byDate, windowDays = 21)

            val recentFirst = byDate.reversed().map { it.e1rm }
            val filtered = filterDeloads(recentFirst)
            val trend = computeTrend(filtered)

            val stats = if (byDate.isNotEmpty()) {
                val current = byDate.last()
                val allTimeBest = byDate.maxBy { it.e1rm }
                val cutoff30d = LocalDate.now().minusDays(30)
                    .format(DateTimeFormatter.ISO_LOCAL_DATE)
                val best30dAgo = byDate.filter { it.date < cutoff30d }
                    .maxByOrNull { it.e1rm }?.e1rm
                val delta = best30dAgo?.let { pctChange(current.e1rm, it) }?.let { round1(it) }
                ExerciseStats(current.e1rm, allTimeBest.e1rm, delta, "${allTimeBest.weightKg}kg × ${allTimeBest.reps}")
            } else null

            _state.update {
                it.copy(
                    e1rmHistory = byDate,
                    e1rmRollingBest = rollingBest,
                    e1rmTrend = trend,
                    exerciseStats = stats,
                )
            }
        }
    }

    // -- Comparison -----------------------------------------------------------

    private fun loadComparison(exerciseIds: List<Long>) {
        viewModelScope.launch {
            val series = exerciseIds.mapNotNull { id ->
                val exercise = _state.value.exercises.find { it.id == id } ?: return@mapNotNull null
                val sets = analyticsDao.getAllSetsForExercise(userId, id)
                val byDate = sets
                    .filter { it.weightKg > 0 && it.reps > 0 }
                    .groupBy { it.date }
                    .map { (date, dateSets) ->
                        val best = dateSets.maxBy { e1rm(it.weightKg, it.reps, it.rir) }
                        E1rmDataPoint(date, round1(e1rm(best.weightKg, best.reps, best.rir)), best.weightKg, best.reps)
                    }
                    .sortedBy { it.date }

                // EMA-smoothed for comparison (smoother than rolling best)
                val smoothed = smoothEma(byDate, alpha = 0.3)
                ComparisonSeries(id, exercise.name, smoothed)
            }
            _state.update { it.copy(comparisonData = series) }
        }
    }

    /** Exponential moving average of e1rm values. Lower alpha = smoother. */
    private fun smoothEma(data: List<E1rmDataPoint>, alpha: Double): List<E1rmDataPoint> {
        if (data.isEmpty()) return emptyList()
        val result = mutableListOf<E1rmDataPoint>()
        var ema = data[0].e1rm
        for (pt in data) {
            ema = alpha * pt.e1rm + (1 - alpha) * ema
            result.add(pt.copy(e1rm = round1(ema)))
        }
        return result
    }

    // -- Volume ---------------------------------------------------------------

    private fun loadVolume() {
        viewModelScope.launch {
            val volume = analyticsDao.getWeeklyVolume(userId, 84)
            val frequency = analyticsDao.getWeeklyFrequency(userId, 84)
            _state.update {
                it.copy(volumeLoaded = true, weeklyVolume = volume, weeklyFrequency = frequency)
            }
        }
    }

    // -- Shared utilities -----------------------------------------------------

    private fun computeRollingBest(data: List<E1rmDataPoint>, windowDays: Int): List<E1rmDataPoint> {
        if (data.isEmpty()) return emptyList()
        val result = mutableListOf<E1rmDataPoint>()
        for (i in data.indices) {
            val cutoff = LocalDate.parse(data[i].date).minusDays(windowDays.toLong())
                .format(DateTimeFormatter.ISO_LOCAL_DATE)
            var best = 0.0
            var bestPoint = data[i]
            for (j in 0..i) {
                if (data[j].date >= cutoff && data[j].e1rm > best) {
                    best = data[j].e1rm
                    bestPoint = data[j]
                }
            }
            result.add(E1rmDataPoint(data[i].date, best, bestPoint.weightKg, bestPoint.reps))
        }
        return result
    }
}
