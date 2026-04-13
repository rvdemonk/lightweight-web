package xyz.rigby3.lightweight.ui.screens.workout

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
import xyz.rigby3.lightweight.data.local.entity.ExerciseEntity
import xyz.rigby3.lightweight.data.local.entity.SessionExerciseEntity
import xyz.rigby3.lightweight.data.local.entity.SetEntity
import xyz.rigby3.lightweight.data.repository.ExerciseRepository
import xyz.rigby3.lightweight.data.repository.SessionRepository
import xyz.rigby3.lightweight.data.repository.TemplateRepository
import xyz.rigby3.lightweight.domain.model.Exercise
import xyz.rigby3.lightweight.domain.model.Session
import xyz.rigby3.lightweight.domain.model.TemplateExercise
import xyz.rigby3.lightweight.domain.model.WorkoutSet
import java.time.Instant
import javax.inject.Inject

data class WorkoutState(
    val session: Session? = null,
    val expandedExerciseIndex: Int = 0,
    val previousSets: Map<Long, List<WorkoutSet>> = emptyMap(),
    val templateExercises: Map<Long, TemplateExercise> = emptyMap(),
    val exercises: List<Exercise> = emptyList(),
    val showExercisePicker: Boolean = false,
    val isLoading: Boolean = true,
    val isPaused: Boolean = false,
    val pausedAt: Long? = null,
    val showEndConfirmation: Boolean = false,
)

@HiltViewModel
class WorkoutViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val exerciseRepository: ExerciseRepository,
    private val templateRepository: TemplateRepository,
    private val analyticsDao: AnalyticsDao,
) : ViewModel() {

    private val userId = TokenStore.LOCAL_USER_ID

    private val _state = MutableStateFlow(WorkoutState())
    val state: StateFlow<WorkoutState> = _state.asStateFlow()

    init {
        loadSession()
    }

    fun loadSession() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }

            val session = sessionRepository.getActiveSession()
            if (session == null) {
                _state.update { it.copy(isLoading = false, session = null) }
                return@launch
            }

            val isPaused = session.status == "paused"

            // Load template exercises if session is from a template
            val templateExerciseMap = loadTemplateExercises(session.templateId)

            // Load previous sets for each exercise
            val previousSets = mutableMapOf<Long, List<WorkoutSet>>()
            for (exercise in session.exercises) {
                previousSets[exercise.exerciseId] = loadPreviousSets(
                    exercise.exerciseId, session.id
                )
            }

            // Load exercise list for the picker
            val exercises = exerciseRepository.getAll().first().map { it.toDomain() }

            _state.update {
                it.copy(
                    session = session,
                    isPaused = isPaused,
                    pausedAt = if (isPaused) Instant.now().epochSecond else null,
                    previousSets = previousSets,
                    templateExercises = templateExerciseMap,
                    exercises = exercises,
                    isLoading = false,
                )
            }
        }
    }

    fun logSet(sessionExerciseId: Long, weightKg: Double?, reps: Int, rir: Int?) {
        viewModelScope.launch {
            val session = _state.value.session ?: return@launch
            val exercise = session.exercises.find { it.id == sessionExerciseId } ?: return@launch
            val setNumber = exercise.sets.size + 1

            sessionRepository.addSet(
                SetEntity(
                    sessionExerciseId = sessionExerciseId,
                    setNumber = setNumber,
                    weightKg = weightKg,
                    reps = reps,
                    setType = "working",
                    rir = rir,
                    completedAt = Instant.now().toString(),
                )
            )
            reloadSession()
        }
    }

    fun deleteSet(setId: Long) {
        viewModelScope.launch {
            sessionRepository.deleteSet(setId)
            reloadSession()
        }
    }

    fun updateExerciseNotes(sessionExerciseId: Long, notes: String?) {
        viewModelScope.launch {
            sessionRepository.updateExerciseNotes(sessionExerciseId, notes)
            reloadSession()
        }
    }

    fun addExercise(exerciseId: Long) {
        viewModelScope.launch {
            val session = _state.value.session ?: return@launch
            val position = session.exercises.size + 1

            sessionRepository.addExercise(
                SessionExerciseEntity(
                    sessionId = session.id,
                    exerciseId = exerciseId,
                    position = position,
                )
            )

            // Load previous sets for the new exercise
            val prevSets = loadPreviousSets(exerciseId, session.id)
            _state.update {
                it.copy(
                    previousSets = it.previousSets + (exerciseId to prevSets),
                    showExercisePicker = false,
                )
            }

            reloadSession()

            // Expand the newly added exercise
            _state.update {
                it.copy(expandedExerciseIndex = (it.session?.exercises?.size ?: 1) - 1)
            }
        }
    }

    fun createAndAddExercise(name: String, muscleGroup: String?, equipment: String?) {
        viewModelScope.launch {
            val entity = ExerciseEntity(
                userId = userId,
                name = name,
                muscleGroup = muscleGroup,
                equipment = equipment,
                createdAt = Instant.now().toString(),
            )
            val newId = exerciseRepository.save(entity)

            // Refresh exercise list
            val exercises = exerciseRepository.getAll().first().map { it.toDomain() }
            _state.update { it.copy(exercises = exercises) }

            addExercise(newId)
        }
    }

    fun togglePause() {
        viewModelScope.launch {
            val session = _state.value.session ?: return@launch
            val currentlyPaused = _state.value.isPaused

            if (currentlyPaused) {
                // Resume: add elapsed pause time to pausedDuration
                val pausedAt = _state.value.pausedAt
                if (pausedAt != null) {
                    val additionalPause = (Instant.now().epochSecond - pausedAt).toInt()
                    val newDuration = session.pausedDuration + additionalPause
                    sessionRepository.updatePausedDuration(session.id, newDuration)
                }
                sessionRepository.updateStatus(session.id, "active")
                _state.update { it.copy(isPaused = false, pausedAt = null) }
            } else {
                // Pause
                sessionRepository.updateStatus(session.id, "paused")
                _state.update { it.copy(isPaused = true, pausedAt = Instant.now().epochSecond) }
            }

            reloadSession()
        }
    }

    fun endWorkout(onEnd: () -> Unit) {
        viewModelScope.launch {
            val session = _state.value.session ?: return@launch

            // If paused, account for remaining pause time
            val pausedAt = _state.value.pausedAt
            if (_state.value.isPaused && pausedAt != null) {
                val additionalPause = (Instant.now().epochSecond - pausedAt).toInt()
                val newDuration = session.pausedDuration + additionalPause
                sessionRepository.updatePausedDuration(session.id, newDuration)
            }

            sessionRepository.updateStatus(session.id, "completed")

            // Delete session if no sets were logged
            val totalSets = session.exercises.sumOf { it.sets.size }
            if (totalSets == 0) {
                sessionRepository.deleteIfEmpty(session.id)
            }

            // Verify session is no longer active before navigating
            val stillActive = sessionRepository.getActive()
            if (stillActive?.id == session.id) {
                // Fallback: force delete if status update didn't stick
                sessionRepository.delete(session.id)
            }

            // Clear local state so ViewModel doesn't hold stale data
            _state.update { it.copy(session = null, isLoading = false) }

            onEnd()
        }
    }

    fun expandExercise(index: Int) {
        _state.update { it.copy(expandedExerciseIndex = index) }
    }

    fun showExercisePicker() {
        viewModelScope.launch {
            // Refresh exercise list when opening picker
            val exercises = exerciseRepository.getAll().first().map { it.toDomain() }
            _state.update { it.copy(exercises = exercises, showExercisePicker = true) }
        }
    }

    fun hideExercisePicker() {
        _state.update { it.copy(showExercisePicker = false) }
    }

    fun showEndConfirmation() {
        _state.update { it.copy(showEndConfirmation = true) }
    }

    fun hideEndConfirmation() {
        _state.update { it.copy(showEndConfirmation = false) }
    }

    // --- Private helpers ---

    private suspend fun reloadSession() {
        val session = sessionRepository.getActiveSession() ?: return
        _state.update { it.copy(session = session) }
    }

    private suspend fun loadPreviousSets(exerciseId: Long, excludeSessionId: Long): List<WorkoutSet> {
        val rows = analyticsDao.getPreviousSets(userId, exerciseId, excludeSessionId)
        return rows.map { row ->
            WorkoutSet(
                id = 0L,
                setNumber = row.setNumber,
                weightKg = row.weightKg,
                reps = row.reps,
                setType = "working",
                rir = row.rir,
                completedAt = null,
            )
        }
    }

    private suspend fun loadTemplateExercises(templateId: Long?): Map<Long, TemplateExercise> {
        if (templateId == null) return emptyMap()
        val rows = templateRepository.getExercisesWithNames(templateId)
        return rows.associate { row ->
            row.exerciseId to TemplateExercise(
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
        }
    }
}

private fun ExerciseEntity.toDomain() = Exercise(
    id = id,
    name = name,
    muscleGroup = muscleGroup,
    equipment = equipment,
)
