package xyz.rigby3.lightweight

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import xyz.rigby3.lightweight.data.local.TokenStore
import xyz.rigby3.lightweight.data.repository.ExerciseRepository
import xyz.rigby3.lightweight.data.repository.SessionRepository
import javax.inject.Inject

sealed interface MainActivityUiState {
    data object Loading : MainActivityUiState
    data class Ready(
        val isLoggedIn: Boolean,
        val isDarkTheme: Boolean,
        val activeSessionId: Long?,
    ) : MainActivityUiState
}

@HiltViewModel
class MainActivityViewModel @Inject constructor(
    private val tokenStore: TokenStore,
    private val sessionRepository: SessionRepository,
    private val exerciseRepository: ExerciseRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow<MainActivityUiState>(MainActivityUiState.Loading)
    val uiState: StateFlow<MainActivityUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            val isLoggedIn = tokenStore.isLoggedIn
            val isDark = tokenStore.isDarkTheme

            val activeSessionId: Long? = if (isLoggedIn) {
                sessionRepository.getActive()?.id
            } else null

            _uiState.value = MainActivityUiState.Ready(
                isLoggedIn = isLoggedIn,
                isDarkTheme = isDark,
                activeSessionId = activeSessionId,
            )
        }

        // Safety timeout: dismiss splash after 3 seconds no matter what
        viewModelScope.launch {
            delay(3_000)
            if (_uiState.value is MainActivityUiState.Loading) {
                _uiState.value = MainActivityUiState.Ready(
                    isLoggedIn = tokenStore.isLoggedIn,
                    isDarkTheme = tokenStore.isDarkTheme,
                    activeSessionId = null,
                )
            }
        }

        // Fire-and-forget: seed default exercises
        viewModelScope.launch {
            if (tokenStore.isLoggedIn) {
                exerciseRepository.seedIfEmpty()
            }
        }
    }
}
