package xyz.rigby3.lightweight.ui.screens.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import xyz.rigby3.lightweight.data.repository.SessionRepository
import xyz.rigby3.lightweight.domain.model.SessionSummary
import javax.inject.Inject

data class HistoryState(
    val sessions: List<SessionSummary> = emptyList(),
    val isLoading: Boolean = true,
)

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(HistoryState())
    val state: StateFlow<HistoryState> = _state.asStateFlow()

    init {
        loadSessions()
    }

    fun loadSessions() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val summaries = sessionRepository.getSummaries(limit = 50)
            _state.update { it.copy(sessions = summaries, isLoading = false) }
        }
    }

    fun deleteSession(id: Long) {
        viewModelScope.launch {
            sessionRepository.delete(id)
            loadSessions()
        }
    }
}
