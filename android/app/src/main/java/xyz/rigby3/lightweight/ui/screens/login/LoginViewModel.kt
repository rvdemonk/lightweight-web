package xyz.rigby3.lightweight.ui.screens.login

import android.content.Context
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
import xyz.rigby3.lightweight.data.auth.GoogleSignInHelper
import xyz.rigby3.lightweight.data.repository.AuthRepository
import javax.inject.Inject

data class LoginState(
    val username: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
)

sealed interface LoginEvent {
    data object Success : LoginEvent
}

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val googleSignInHelper: GoogleSignInHelper,
) : ViewModel() {

    private val _state = MutableStateFlow(LoginState())
    val state: StateFlow<LoginState> = _state.asStateFlow()

    private val _events = MutableSharedFlow<LoginEvent>()
    val events: SharedFlow<LoginEvent> = _events.asSharedFlow()

    fun updateUsername(value: String) {
        _state.update { it.copy(username = value, error = null) }
    }

    fun updatePassword(value: String) {
        _state.update { it.copy(password = value, error = null) }
    }

    fun login() {
        val s = _state.value
        if (s.username.isBlank() || s.password.isBlank()) {
            _state.update { it.copy(error = "Username and password required") }
            return
        }
        if (s.isLoading) return

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                authRepository.login(s.username.trim(), s.password)
                _events.emit(LoginEvent.Success)
            } catch (e: Exception) {
                _state.update { it.copy(
                    isLoading = false,
                    error = "Login failed",
                ) }
            }
        }
    }

    fun googleSignIn(activityContext: Context) {
        if (_state.value.isLoading) return

        viewModelScope.launch {
            _state.update { it.copy(isLoading = true, error = null) }
            try {
                val credential = googleSignInHelper.getGoogleCredential(activityContext)
                authRepository.googleSignIn(credential.idToken, credential.displayName, credential.email)
                _events.emit(LoginEvent.Success)
            } catch (e: Exception) {
                _state.update { it.copy(
                    isLoading = false,
                    error = "Google sign-in failed",
                ) }
            }
        }
    }
}
