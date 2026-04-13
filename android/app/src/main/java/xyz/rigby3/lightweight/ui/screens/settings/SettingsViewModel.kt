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
import javax.inject.Inject

data class SettingsState(
    val username: String? = null,
    val isDarkTheme: Boolean = true,
)

sealed interface SettingsEvent {
    data object LoggedOut : SettingsEvent
}

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val tokenStore: TokenStore,
) : ViewModel() {

    private val _state = MutableStateFlow(
        SettingsState(
            username = tokenStore.username,
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

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _events.emit(SettingsEvent.LoggedOut)
        }
    }
}
