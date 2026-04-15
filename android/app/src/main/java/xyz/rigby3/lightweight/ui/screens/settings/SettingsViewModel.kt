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
import xyz.rigby3.lightweight.data.repository.SyncRepository
import javax.inject.Inject

data class SettingsState(
    val username: String? = null,
    val displayName: String? = null,
    val email: String? = null,
    val isDarkTheme: Boolean = true,
    val importStatus: ImportStatus = ImportStatus.Idle,
    val autoSyncEnabled: Boolean = false,
    val userId: Long = 0,
    val showSyncPreview: Boolean = false,
)

sealed interface ImportStatus {
    data object Idle : ImportStatus
    data class InProgress(val phase: String, val current: Int = 0, val total: Int = 0) : ImportStatus
    data class Success(val message: String) : ImportStatus
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
    private val syncRepository: SyncRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(
        SettingsState(
            username = tokenStore.username,
            displayName = tokenStore.displayName,
            email = tokenStore.email,
            isDarkTheme = tokenStore.isDarkTheme,
            autoSyncEnabled = tokenStore.autoSyncEnabled,
            userId = tokenStore.userId,
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

    fun sync() {
        if (_state.value.importStatus is ImportStatus.InProgress) return

        viewModelScope.launch {
            _state.update { it.copy(importStatus = ImportStatus.InProgress("Pushing local data")) }
            try {
                val result = syncRepository.sync { progress ->
                    _state.update {
                        it.copy(importStatus = ImportStatus.InProgress(
                            progress.phase, progress.current, progress.total
                        ))
                    }
                }
                val parts = mutableListOf<String>()
                if (result.pushed > 0) parts.add("pushed ${result.pushed}")
                if (result.skipped > 0) parts.add("skipped ${result.skipped} (already on server)")
                val msg = if (parts.isEmpty()) "Synced — all up to date"
                          else parts.joinToString(", ").replaceFirstChar { it.uppercase() }
                _state.update { it.copy(importStatus = ImportStatus.Success(msg)) }
            } catch (e: Exception) {
                _state.update {
                    it.copy(importStatus = ImportStatus.Error(e.message ?: "Sync failed"))
                }
            }
        }
    }

    fun toggleAutoSync() {
        val newValue = !_state.value.autoSyncEnabled
        tokenStore.autoSyncEnabled = newValue
        _state.update { it.copy(autoSyncEnabled = newValue) }
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
                val msg = "${result.exercises} exercises, ${result.templates} templates, " +
                          "${result.sessions} sessions, ${result.sets} sets"
                _state.update { it.copy(importStatus = ImportStatus.Success(msg)) }
            } catch (e: Exception) {
                _state.update {
                    it.copy(importStatus = ImportStatus.Error(e.message ?: "Import failed"))
                }
            }
        }
    }

    fun toggleSyncPreview() {
        _state.update { it.copy(showSyncPreview = !it.showSyncPreview) }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _events.emit(SettingsEvent.LoggedOut)
        }
    }
}
