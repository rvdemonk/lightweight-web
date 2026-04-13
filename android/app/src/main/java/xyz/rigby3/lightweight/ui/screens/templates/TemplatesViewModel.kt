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
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import xyz.rigby3.lightweight.data.local.row.TemplateExerciseRow
import xyz.rigby3.lightweight.data.repository.SessionRepository
import xyz.rigby3.lightweight.data.repository.TemplateRepository
import xyz.rigby3.lightweight.domain.model.Template
import xyz.rigby3.lightweight.domain.model.TemplateExercise
import javax.inject.Inject

data class TemplatesState(
    val templates: List<Template> = emptyList(),
    val expandedIndex: Int = -1,
    val isLoading: Boolean = true,
)

sealed interface TemplatesEvent {
    data object NavigateToWorkout : TemplatesEvent
}

@HiltViewModel
class TemplatesViewModel @Inject constructor(
    private val templateRepository: TemplateRepository,
    private val sessionRepository: SessionRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(TemplatesState())
    val state: StateFlow<TemplatesState> = _state.asStateFlow()

    private val _events = MutableSharedFlow<TemplatesEvent>()
    val events: SharedFlow<TemplatesEvent> = _events.asSharedFlow()

    init {
        loadTemplates()
    }

    private fun loadTemplates() {
        viewModelScope.launch {
            templateRepository.getAll().collect { entities ->
                val templates = entities.map { entity ->
                    val rows = templateRepository.getExercisesWithNames(entity.id)
                    Template(
                        id = entity.id,
                        name = entity.name,
                        notes = entity.notes,
                        version = entity.version,
                        exercises = rows.map { it.toDomain() },
                    )
                }
                _state.update {
                    it.copy(
                        templates = templates,
                        isLoading = false,
                    )
                }
            }
        }
    }

    fun toggleExpanded(index: Int) {
        _state.update {
            it.copy(expandedIndex = if (it.expandedIndex == index) -1 else index)
        }
    }

    fun startWorkout(template: Template) {
        viewModelScope.launch {
            val entity = templateRepository.getById(template.id) ?: return@launch
            val exercises = templateRepository.getExercises(template.id)
            sessionRepository.createFromTemplate(entity, exercises)
            _events.emit(TemplatesEvent.NavigateToWorkout)
        }
    }

    private fun TemplateExerciseRow.toDomain() = TemplateExercise(
        id = id,
        exerciseId = exerciseId,
        exerciseName = exerciseName,
        position = position,
        targetSets = targetSets,
        targetRepsMin = targetRepsMin,
        targetRepsMax = targetRepsMax,
        restSeconds = restSeconds,
        notes = notes,
    )
}
