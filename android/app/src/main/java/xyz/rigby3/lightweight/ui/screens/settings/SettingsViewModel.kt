package xyz.rigby3.lightweight.ui.screens.settings

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
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.repository.AuthRepository
import xyz.rigby3.lightweight.data.repository.DataImportRepository
import xyz.rigby3.lightweight.data.repository.ImportResult
import javax.inject.Inject

data class SettingsState(
    val username: String? = null,
    val displayName: String? = null,
    val email: String? = null,
    val isDarkTheme: Boolean = true,
    val importStatus: ImportStatus = ImportStatus.Idle,
)

sealed interface ImportStatus {
    data object Idle : ImportStatus
    data class InProgress(val phase: String, val current: Int = 0, val total: Int = 0) : ImportStatus
    data class Success(val result: ImportResult) : ImportStatus
    data class Error(val message: String) : ImportStatus
}

sealed interface SettingsEvent {
    data object LoggedOut : SettingsEvent
}

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val tokenStore: TokenStore,
    private val dataImportRepository: DataImportRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(
        SettingsState(
            username = tokenStore.username,
            displayName = tokenStore.displayName,
            email = tokenStore.email,
            isDarkTheme = tokenStore.isDarkTheme,
        )
    )
    val state: StateFlow<SettingsState> = _state.asStateFlow()

    private val _events = MutableSharedFlow<SettingsEvent>()
    val events: SharedFlow<SettingsEvent> = _events.asSharedFlow()

    fun toggleTheme() {
        val newValue = !_state.value.isDarkTheme
        tokenStore.isDarkTheme = newValue
        _state.update { it.copy(isDarkTheme = newValue) }
    }

    fun importFromServer() {
        if (_state.value.importStatus is ImportStatus.InProgress) return

        viewModelScope.launch {
            _state.update { it.copy(importStatus = ImportStatus.InProgress("Starting")) }
            try {
                val result = dataImportRepository.importFromServer { progress ->
                    _state.update {
                        it.copy(importStatus = ImportStatus.InProgress(
                            progress.phase, progress.current, progress.total
                        ))
                    }
                }
                _state.update { it.copy(importStatus = ImportStatus.Success(result)) }
            } catch (e: Exception) {
                _state.update {
                    it.copy(importStatus = ImportStatus.Error(e.message ?: "Import failed"))
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _events.emit(SettingsEvent.LoggedOut)
        }
    }
}
