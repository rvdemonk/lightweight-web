package xyz.rigby3.lightweight.ui.screens.session

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import xyz.rigby3.lightweight.data.repository.SessionRepository
import xyz.rigby3.lightweight.domain.model.Session
import javax.inject.Inject

data class SessionDetailState(
    val session: Session? = null,
    val isLoading: Boolean = true,
    val showDeleteConfirm: Boolean = false,
)

@HiltViewModel
class SessionViewModel @Inject constructor(
    private val sessionRepository: SessionRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(SessionDetailState())
    val state: StateFlow<SessionDetailState> = _state.asStateFlow()

    fun loadSession(sessionId: Long) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            val session = sessionRepository.getFullSession(sessionId)
            _state.update { it.copy(session = session, isLoading = false) }
        }
    }

    fun showDeleteConfirm() {
        _state.update { it.copy(showDeleteConfirm = true) }
    }

    fun dismissDeleteConfirm() {
        _state.update { it.copy(showDeleteConfirm = false) }
    }

    fun deleteSession(onDeleted: () -> Unit) {
        val session = _state.value.session ?: return
        viewModelScope.launch {
            sessionRepository.delete(session.id)
            _state.update { it.copy(showDeleteConfirm = false) }
            onDeleted()
        }
    }
}
