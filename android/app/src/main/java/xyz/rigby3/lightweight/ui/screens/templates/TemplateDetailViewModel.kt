package xyz.rigby3.lightweight.ui.screens.templates

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.local.entity.ExerciseEntity
import xyz.rigby3.lightweight.data.repository.EditableTemplateExercise
import xyz.rigby3.lightweight.data.repository.ExerciseRepository
import xyz.rigby3.lightweight.data.repository.TemplateRepository
import xyz.rigby3.lightweight.domain.model.Exercise
import javax.inject.Inject

data class TemplateEditState(
    val isNew: Boolean = false,
    val name: String = "",
    val notes: String? = null,
    val exercises: List<EditableTemplateExercise> = emptyList(),
    val allExercises: List<Exercise> = emptyList(),
    val showExercisePicker: Boolean = false,
    val isSaving: Boolean = false,
    val isLoading: Boolean = true,
    val showArchiveConfirm: Boolean = false,
    val expandedIndex: Int = -1,
)

sealed interface TemplateDetailEvent {
    data object Saved : TemplateDetailEvent
    data object Archived : TemplateDetailEvent
}

@HiltViewModel
class TemplateDetailViewModel @Inject constructor(
    private val templateRepository: TemplateRepository,
    private val exerciseRepository: ExerciseRepository,
    private val tokenStore: TokenStore,
) : ViewModel() {

    private val _state = MutableStateFlow(TemplateEditState())
    val state: StateFlow<TemplateEditState> = _state.asStateFlow()

    private val _events = MutableSharedFlow<TemplateDetailEvent>()
    val events: SharedFlow<TemplateDetailEvent> = _events.asSharedFlow()

    private var templateId: Long = 0L

    fun load(id: Long) {
        templateId = id
        viewModelScope.launch {
            val allExercises = exerciseRepository.getAll().first().map { it.toDomain() }

            if (id == 0L) {
                _state.update {
                    it.copy(
                        isNew = true,
                        isLoading = false,
                        allExercises = allExercises,
                    )
                }
            } else {
                val template = templateRepository.getById(id)
                val rows = templateRepository.getExercisesWithNames(id)
                _state.update {
                    it.copy(
                        isNew = false,
                        name = template?.name ?: "",
                        notes = template?.notes,
                        exercises = rows.map { row ->
                            EditableTemplateExercise(
                                exerciseId = row.exerciseId,
                                exerciseName = row.exerciseName,
                                targetSets = row.targetSets ?: 3,
                                targetRepsMin = row.targetRepsMin ?: 8,
                                targetRepsMax = row.targetRepsMax ?: 12,
                            )
                        },
                        isLoading = false,
                        allExercises = allExercises,
                    )
                }
            }
        }
    }

    fun updateName(name: String) {
        _state.update { it.copy(name = name) }
    }

    fun showExercisePicker() {
        _state.update { it.copy(showExercisePicker = true) }
    }

    fun hideExercisePicker() {
        _state.update { it.copy(showExercisePicker = false) }
    }

    fun addExercise(exercise: Exercise) {
        _state.update {
            val newExercises = it.exercises + EditableTemplateExercise(
                exerciseId = exercise.id,
                exerciseName = exercise.name,
            )
            it.copy(
                exercises = newExercises,
                showExercisePicker = false,
                expandedIndex = newExercises.lastIndex,
            )
        }
    }

    fun createAndAddExercise(name: String, muscleGroup: String?, equipment: String?) {
        viewModelScope.launch {
            val id = exerciseRepository.save(
                ExerciseEntity(
                    userId = tokenStore.userId,
                    name = name,
                    muscleGroup = muscleGroup,
                    equipment = equipment,
                    createdAt = java.time.Instant.now().toString(),
                )
            )
            val allExercises = exerciseRepository.getAll().first().map { it.toDomain() }
            _state.update {
                val newExercises = it.exercises + EditableTemplateExercise(
                    exerciseId = id,
                    exerciseName = name,
                )
                it.copy(
                    exercises = newExercises,
                    showExercisePicker = false,
                    allExercises = allExercises,
                    expandedIndex = newExercises.lastIndex,
                )
            }
        }
    }

    fun toggleExpanded(index: Int) {
        _state.update {
            it.copy(expandedIndex = if (it.expandedIndex == index) -1 else index)
        }
    }

    fun removeExercise(index: Int) {
        _state.update {
            it.copy(exercises = it.exercises.toMutableList().also { list -> list.removeAt(index) })
        }
    }

    fun updateExerciseSets(index: Int, sets: Int) {
        _state.update {
            it.copy(
                exercises = it.exercises.toMutableList().also { list ->
                    list[index] = list[index].copy(targetSets = sets)
                }
            )
        }
    }

    fun updateExerciseRepsMin(index: Int, repsMin: Int) {
        _state.update {
            it.copy(
                exercises = it.exercises.toMutableList().also { list ->
                    list[index] = list[index].copy(targetRepsMin = repsMin)
                }
            )
        }
    }

    fun updateExerciseRepsMax(index: Int, repsMax: Int) {
        _state.update {
            it.copy(
                exercises = it.exercises.toMutableList().also { list ->
                    list[index] = list[index].copy(targetRepsMax = repsMax)
                }
            )
        }
    }

    fun save() {
        val current = _state.value
        if (current.name.isBlank() || current.isSaving) return

        _state.update { it.copy(isSaving = true) }

        viewModelScope.launch {
            if (current.isNew) {
                templateRepository.createNew(
                    name = current.name.trim(),
                    notes = current.notes?.takeIf { it.isNotBlank() },
                    exercises = current.exercises,
                )
            } else {
                templateRepository.saveWithVersioning(
                    templateId = templateId,
                    name = current.name.trim(),
                    notes = current.notes?.takeIf { it.isNotBlank() },
                    exercises = current.exercises,
                )
            }
            _events.emit(TemplateDetailEvent.Saved)
        }
    }

    fun showArchiveConfirm() {
        _state.update { it.copy(showArchiveConfirm = true) }
    }

    fun hideArchiveConfirm() {
        _state.update { it.copy(showArchiveConfirm = false) }
    }

    fun archive() {
        viewModelScope.launch {
            templateRepository.archive(templateId)
            _events.emit(TemplateDetailEvent.Archived)
        }
    }

    private fun ExerciseEntity.toDomain() = Exercise(
        id = id,
        name = name,
        muscleGroup = muscleGroup,
        equipment = equipment,
    )
}
