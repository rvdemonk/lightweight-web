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
import xyz.rigby3.lightweight.data.repository.TemplateRepository
import xyz.rigby3.lightweight.domain.model.DayActivity
import xyz.rigby3.lightweight.domain.model.Template
import xyz.rigby3.lightweight.domain.model.TemplateExercise
import javax.inject.Inject

data class HomeState(
    val heatmapData: List<DayActivity> = emptyList(),
    val templates: List<Template> = emptyList(),
    val isCreatingSession: Boolean = false,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
    private val templateRepository: TemplateRepository,
    private val analyticsDao: AnalyticsDao,
    private val templateDao: TemplateDao,
) : ViewModel() {

    private val _state = MutableStateFlow(HomeState())
    val state: StateFlow<HomeState> = _state.asStateFlow()

    init {
        reload()
    }

    fun reload() {
        loadHeatmap()
        loadTemplates()
    }

    private fun loadHeatmap() {
        viewModelScope.launch {
            val rows = analyticsDao.getActivityHeatmap(
                userId = TokenStore.LOCAL_USER_ID,
                days = 84,
            )
            val data = rows.map { DayActivity(date = it.date, setCount = it.setCount) }
            _state.update { it.copy(heatmapData = data) }
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
}
